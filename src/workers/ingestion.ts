/**
 * Ingestion Worker - Production Hardened
 * 
 * Institutional-grade reliability patterns:
 * - Global error handlers (prevent crash on unhandled rejections)
 * - Graceful shutdown (SIGTERM/SIGINT handling)
 * - Redis retry with exponential backoff
 * - WebSocket error containment
 * - Health heartbeat for zombie detection
 * - Memory bounds for collections
 */

// Logger must be imported BEFORE global error handlers that reference it
import { createLogger } from "../lib/logger";
const logger = createLogger("Ingestion");

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLERS - Must be first! Prevents process crash.
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err: Error) => {
    logger.error('[FATAL] Uncaught Exception:', err.message);
    if (err.stack) logger.error(err.stack);
    // Don't exit - keep running in degraded mode
});

process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error('[FATAL] Unhandled Rejection:', message);
    if (reason instanceof Error && reason.stack) {
        logger.error(reason.stack);
    }
});

import WebSocket from "ws";
import * as dotenv from "dotenv";
import Redis from "ioredis";
import { LeaderElection } from "./leader-election";
import { RiskMonitor } from "./risk-monitor";
import { startHealthServer } from "./health-server";
import { getCategories, sanitizeText, cleanOutcomeName, isSpamMarket } from "./market-classifier";
import { pruneResolvedMarkets, checkPriceDrift } from "./market-integrity";
import { MIN_MARKET_VOLUME } from "../config/trading-constants";
import { settleResolvedPositions } from "../lib/settlement";

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// EXTERNAL API TYPES - Loose interfaces for Polymarket Gamma API responses
// These allow extra fields to handle API changes gracefully
// ═══════════════════════════════════════════════════════════════════════════

/** Market data from Polymarket Gamma API (both standalone and within events) */
interface PolymarketMarket {
    id?: string;
    question: string;
    slug?: string;
    volume?: string;
    volume24hr?: number;
    outcomePrices?: string; // JSON string array
    clobTokenIds?: string;  // JSON string array
    outcomes?: string;      // JSON string array
    closed?: boolean;
    archived?: boolean;
    category?: string;
    tags?: string[];
    image?: string;
    accepting_orders?: boolean;
    groupItemTitle?: string;
    [key: string]: unknown; // Allow extra fields
}

/** Event data from Polymarket Gamma API */
interface PolymarketEvent {
    id?: string;
    slug: string;
    title?: string;
    markets?: PolymarketMarket[];
    volume24hr?: number;
    createdAt?: string;
    tags?: string[];
    image?: string;
    [key: string]: unknown; // Allow extra fields
}

/** Processed sub-market for internal use */
interface ProcessedSubMarket {
    id: string;
    question: string;
    outcomes: string[];
    price: number;
    volume: number;
    groupItemTitle?: string;
    resolved?: boolean;
}

/** Processed event for Redis storage */
interface ProcessedEvent {
    id: string;
    title?: string;
    slug: string;
    description?: string;
    image?: string;
    volume: number;
    volume24hr?: number;
    createdAt?: string;
    categories: string[];
    markets: ProcessedSubMarket[];
    isMultiOutcome?: boolean;
}

/** WebSocket price message from Polymarket CLOB */
interface WebSocketPriceMessage {
    asset_id?: string;
    price?: string;
    [key: string]: unknown;
}

/** Binary market format for Redis storage (market:active_list) */
interface StoredBinaryMarket {
    id: string;
    question: string;
    description?: string;
    image?: string;
    volume: number;
    outcomes: string[];
    end_date?: string;
    categories: string[];
    basePrice: number;
    closed?: boolean;
    accepting_orders?: boolean;
}

/** Order book data from Polymarket CLOB API */
interface OrderBook {
    bids?: Array<{ price: string; size: string }>;
    asks?: Array<{ price: string; size: string }>;
    [key: string]: unknown;
}

const CLOB_WS_URL = "wss://ws-live-data.polymarket.com";

// Force-include keywords: Events matching these will ALWAYS be fetched regardless of volume ranking
const FORCE_INCLUDE_KEYWORDS = [
    "portugal",
    "presidential",
    "uk election",
    "germany",
    "france",
    "macron",
    "starmer",
    "bitcoin",
    "ethereum",
    "super bowl",
    "nba",
    "trump",
    "gaza",
    "ukraine",
    "china",
    "taiwan"
];

class IngestionWorker {
    private ws: WebSocket | null = null;
    private redis: Redis;
    private reconnectInterval = 5000;
    private readonly RECONNECT_BASE = 5000;
    private readonly RECONNECT_MAX = 60000;
    private activeTokenIds: string[] = [];
    private leaderElection: LeaderElection;
    private riskMonitor: RiskMonitor;
    private isLeader = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private wsPingInterval: NodeJS.Timeout | null = null;  // WebSocket keep-alive
    private isShuttingDown = false;


    // Memory bounds - prevent unbounded array/map growth
    private readonly MAX_ACTIVE_TOKENS = 2000;
    private readonly MAX_PRICE_BUFFER = 500;

    constructor() {
        if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            // Debug: Log actual env var values (port only, not password)
            const rawPort = process.env.REDIS_PORT;
            logger.info(`[Ingestion] REDIS_HOST: ${process.env.REDIS_HOST}`);
            logger.info(`[Ingestion] REDIS_PORT raw value: "${rawPort}" (type: ${typeof rawPort})`);

            // Defensive port parsing - handle NaN, empty, undefined
            let port = 6379; // Default fallback
            if (rawPort && rawPort.trim()) {
                const parsed = parseInt(rawPort.trim(), 10);
                if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
                    port = parsed;
                } else {
                    logger.warn(`[Ingestion] Invalid REDIS_PORT "${rawPort}", using default 6379`);
                }
            } else {
                logger.info(`[Ingestion] REDIS_PORT not set, using default 6379`);
            }

            logger.info(`[Ingestion] Connecting to Redis via HOST/PORT/PASS config (port: ${port})...`);
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: port,
                password: process.env.REDIS_PASSWORD,
                tls: {}, // TLS for Railway Redis
                // Institutional retry config
                retryStrategy: (times: number) => {
                    if (times > 20) {
                        logger.error('[Redis] Max retries (20) exceeded');
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 500, 30000); // Max 30s backoff
                    logger.info(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableOfflineQueue: true,
                connectTimeout: 10000,
            });
        } else {
            const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
            logger.info(`[Ingestion] Connecting to Redis via URL...`);
            this.redis = new Redis(REDIS_URL, {
                retryStrategy: (times: number) => {
                    if (times > 20) return null;
                    return Math.min(times * 500, 30000);
                },
                maxRetriesPerRequest: 3,
                enableOfflineQueue: true,
                connectTimeout: 10000,
            });
        }

        // Redis connection monitoring
        this.redis.on('error', (err) => {
            logger.error('[Redis] Connection error:', err.message);
        });
        this.redis.on('reconnecting', () => {
            logger.info('[Redis] Attempting reconnection...');
        });
        this.redis.on('connect', () => {
            logger.info('[Redis] Connected successfully');
        });

        // Initialize leader election
        this.leaderElection = new LeaderElection(this.redis);

        // Initialize risk monitor (checks all challenges for breaches every 5s)
        this.riskMonitor = new RiskMonitor(this.redis);

        // Start health server for Railway health checks
        startHealthServer(this.redis, {
            port: parseInt(process.env.HEALTH_PORT || '3001', 10),
            workerId: process.env.RAILWAY_REPLICA_ID || 'local',
            isLeaderFn: () => this.isLeader,
        });

        // Register graceful shutdown handlers
        this.registerShutdownHandlers();

        // Start heartbeat for zombie detection
        this.startHeartbeat();

        this.startWithLeaderElection();
    }

    /**
     * Register signal handlers for graceful shutdown
     */
    private registerShutdownHandlers(): void {
        const shutdown = async (signal: string) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`[Ingestion] ${signal} received, shutting down gracefully...`);

            try {
                // 1. Stop accepting new work
                this.isLeader = false;

                // 2. Stop heartbeat
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = null;
                }

                // 2b. Stop WebSocket ping interval
                if (this.wsPingInterval) {
                    clearInterval(this.wsPingInterval);
                    this.wsPingInterval = null;
                }

                // 3. Close WebSocket cleanly
                if (this.ws) {
                    this.ws.close(1000, 'Shutdown');
                    this.ws = null;
                }


                // 4. Stop risk monitor
                this.riskMonitor.stop();

                // 5. Flush any buffered prices
                await this.flushPriceBuffer();

                // 6. Release leader lock
                await this.leaderElection.releaseLock();

                // 7. Close Redis connection
                await this.redis.quit();

                logger.info('[Ingestion] Shutdown complete.');
                process.exit(0);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error('[Ingestion] Shutdown error:', message);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    /**
     * Start health heartbeat for zombie detection
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.redis.set(
                    'ingestion:heartbeat',
                    JSON.stringify({
                        timestamp: Date.now(),
                        workerId: process.env.RAILWAY_REPLICA_ID || 'local',
                        isLeader: this.isLeader,
                        activeTokens: this.activeTokenIds.length,
                        priceBufferSize: this.priceBuffer.size,
                    }),
                    'EX', 120 // Expires in 120s
                );
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error('[Heartbeat] Failed to write:', message);
            }
        }, 60000); // Every 60 seconds (was 30s)
    }

    /**
     * Start worker with leader election - only leader runs ingestion
     */
    private async startWithLeaderElection(): Promise<void> {
        this.isLeader = await this.leaderElection.tryBecomeLeader();

        if (this.isLeader) {
            logger.info('[Ingestion] 🟢 This worker is the LEADER - starting ingestion...');
            // Start renewal and handle leadership loss
            this.leaderElection.startRenewal(() => {
                logger.error('[Ingestion] 🔴 Lost leadership! Stopping ingestion...');
                this.isLeader = false;
                this.ws?.close();
                this.ws = null;
                this.riskMonitor.stop(); // Stop risk monitoring when losing leadership
                // Re-enter standby mode
                this.enterStandbyMode();
            });
            this.init();
            this.riskMonitor.start(); // Start risk monitoring when becoming leader
        } else {
            this.enterStandbyMode();
        }
    }

    /**
     * Enter standby mode - poll for leader failure
     */
    private enterStandbyMode(): void {
        logger.info(`[Ingestion] 🟡 Entering STANDBY mode (waiting for leader to fail)...`);

        const standbyInterval = setInterval(async () => {
            const becameLeader = await this.leaderElection.tryBecomeLeader();
            if (becameLeader) {
                clearInterval(standbyInterval);
                logger.info('[Ingestion] 🟢 Became leader! Starting ingestion...');
                this.isLeader = true;
                this.leaderElection.startRenewal(() => {
                    logger.error('[Ingestion] 🔴 Lost leadership! Stopping ingestion...');
                    this.isLeader = false;
                    this.ws?.close();
                    this.ws = null;
                    this.riskMonitor.stop(); // Stop risk monitoring when losing leadership
                    this.enterStandbyMode();
                });
                this.init();
                this.riskMonitor.start(); // Start risk monitoring when becoming leader
            }
        }, 10000); // Check every 10s
    }

    private async init() {
        logger.info('[Ingestion] 🚀 CODE VERSION: 2026-02-06-v4 (supá bowl encoding fix)');
        await this.fetchFeaturedEvents(); // Fetch curated trending events first
        await this.fetchActiveMarkets(); // Then fetch remaining markets
        await pruneResolvedMarkets(this.redis); // Prune any resolved markets immediately
        this.connectWS();
        this.startBookPolling();

        // PARITY FIX: Re-fetch market lists every 5 minutes
        // Without this, new markets never appear and resolved ones linger until worker restart.
        // Both Redis keys have 600s TTL, so 5-min re-fetch keeps them alive.
        const MARKET_REFRESH_INTERVAL = 300000; // 5 minutes
        setInterval(async () => {
            try {
                logger.info('[Ingestion] 🔄 Periodic market refresh...');
                await this.fetchFeaturedEvents();
                await this.fetchActiveMarkets();
                await pruneResolvedMarkets(this.redis); // Prune after every refresh
                // Re-subscribe WebSocket to include any new token IDs
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.subscribeWS();
                }
            } catch (err) {
                logger.error('[Ingestion] Periodic refresh failed:', err);
            }
        }, MARKET_REFRESH_INTERVAL);

        // PRICE DRIFT CHECK: Spot-check cached vs live prices every 5 minutes
        // Offset by 2.5 min from market refresh to avoid API contention
        const DRIFT_CHECK_INTERVAL = 300000; // 5 minutes
        const DRIFT_CHECK_OFFSET = 150000;   // 2.5 minute offset
        setTimeout(() => {
            // Run first check after offset
            checkPriceDrift(this.redis);
            // Then repeat on interval
            setInterval(async () => {
                try {
                    await checkPriceDrift(this.redis);
                } catch (err) {
                    logger.error('[Ingestion] Price drift check failed:', err);
                }
            }, DRIFT_CHECK_INTERVAL);
        }, DRIFT_CHECK_OFFSET);

        // SETTLEMENT CHECK: Detect resolved markets and credit winnings every 5 minutes.
        // Previously a Vercel Cron (removed for Hobby plan compliance).
        // Offset by 1 min from market refresh to spread API load.
        // The settlement function is idempotent (FOR UPDATE + status check).
        const SETTLEMENT_INTERVAL = 300000; // 5 minutes
        const SETTLEMENT_OFFSET = 60000;    // 1 minute offset
        setTimeout(() => {
            settleResolvedPositions()
                .then(r => logger.info(`[Settlement] Initial scan: ${r.positionsSettled}/${r.positionsChecked} settled`))
                .catch(err => logger.error('[Settlement] Initial scan failed:', err));
            setInterval(async () => {
                try {
                    const result = await settleResolvedPositions();
                    if (result.positionsSettled > 0) {
                        logger.info(`[Settlement] ✅ ${result.positionsSettled} positions settled, PnL: $${result.totalPnLSettled.toFixed(2)}`);
                    }
                } catch (err) {
                    logger.error('[Settlement] Periodic settlement failed:', err);
                }
            }, SETTLEMENT_INTERVAL);
        }, SETTLEMENT_OFFSET);
    }

    /**
     * Fetch featured/curated events from Polymarket's Events API
     * These are the trending events displayed on Polymarket's homepage
     */
    private async fetchFeaturedEvents() {
        try {
            logger.info("[Ingestion] Fetching High-Volume Events (Sorted by 24h Volume)...");

            // Primary query: high-volume active events sorted by recent activity
            // Increased limit from 100 to 250 for broader coverage of important events
            const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=250";
            const response = await fetch(url);
            const events = await response.json();

            if (!Array.isArray(events)) {
                logger.error("[Ingestion] Invalid response from Events API");
                return;
            }

            // Secondary query: "breaking" tagged events to catch brand-new markets
            logger.info("[Ingestion] Fetching breaking news markets...");
            const breakingUrl = "https://gamma-api.polymarket.com/events?tag=breaking&active=true&closed=false&limit=30";
            const breakingRes = await fetch(breakingUrl);
            const breakingEvents = await breakingRes.json();

            if (Array.isArray(breakingEvents)) {
                const seenSlugs = new Set(events.map((e: PolymarketEvent) => e.slug));
                for (const be of breakingEvents as PolymarketEvent[]) {
                    if (!seenSlugs.has(be.slug)) {
                        events.push(be);
                    }
                }
                logger.info(`[Ingestion] Added ${(breakingEvents as PolymarketEvent[]).filter((be) => !seenSlugs.has(be.slug)).length} breaking events.`);
            }

            // Tertiary query: Force-include important events that may not be in top volume
            // This ensures events like Portugal election are always fetched
            logger.info("[Ingestion] Fetching force-include events by keyword...");
            const existingSlugs = new Set(events.map((e: PolymarketEvent) => e.slug));
            let forceIncludedCount = 0;

            for (const keyword of FORCE_INCLUDE_KEYWORDS) {
                try {
                    // Search by title via the events endpoint
                    const keywordUrl = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=20&title_like=${encodeURIComponent(keyword)}`;
                    const keywordRes = await fetch(keywordUrl);
                    const keywordEvents = await keywordRes.json();

                    if (Array.isArray(keywordEvents)) {
                        for (const ke of keywordEvents) {
                            if (!existingSlugs.has(ke.slug)) {
                                events.push(ke);
                                existingSlugs.add(ke.slug);
                                forceIncludedCount++;
                            }
                        }
                    }
                } catch {
                    // Silent fail for individual keyword fetches
                }
            }
            logger.info(`[Ingestion] Force-included ${forceIncludedCount} additional events by keyword.`);

            const processedEvents: ProcessedEvent[] = [];
            const allEventTokenIds: string[] = [];
            const seenEventTitles = new Set<string>(); // Event-level deduplication
            const featuredReport = { total: 0, closed: 0, endDate: 0, spam: 0, noPrices: 0, placeholder: 0, archPrefix: 0, noTokens: 0, duplicate: 0, priceBounds: 0, volume: 0, survived: 0 };

            for (const event of events) {
                try {
                    if (!event.markets || event.markets.length === 0) continue;

                    // Guard against missing title
                    if (!event.title) continue;

                    // Event-level deduplication by title (prevents duplicate "LeBron James" etc.)
                    const normalizedTitle = event.title.trim().toLowerCase();
                    if (seenEventTitles.has(normalizedTitle)) continue;
                    seenEventTitles.add(normalizedTitle);

                    // Process each market within the event
                    const subMarkets: ProcessedSubMarket[] = [];
                    const seenQuestions = new Set<string>();
                    const fr = { total: 0, closed: 0, endDate: 0, spam: 0, noPrices: 0, placeholder: 0, archPrefix: 0, noTokens: 0, duplicate: 0, priceBounds: 0, volume: 0, survived: 0 };
                    for (const market of event.markets) {
                        fr.total++;
                        if (market.closed || market.archived) { fr.closed++; continue; }

                        /* eslint-disable @typescript-eslint/no-explicit-any */
                        if ((market as Record<string, any>).endDate) {
                            const endDate = new Date((market as Record<string, any>).endDate);
                            if (endDate.getTime() < Date.now()) { fr.endDate++; continue; }
                        }
                        /* eslint-enable @typescript-eslint/no-explicit-any */

                        // Filter out spam sub-markets (e.g., "Super Bowl cancelled")
                        if (isSpamMarket(market.question)) { fr.spam++; continue; }

                        const prices = JSON.parse(market.outcomePrices || '[]');

                        // Filter out empty prices
                        if (!prices || prices.length < 2) { fr.noPrices++; continue; }

                        // Filter out "Individual [A-Z]" placeholders (confusing for users)
                        if (market.question.includes("Individual ") || market.question.includes("Someone else")) { fr.placeholder++; continue; }

                        // Filter out "arch" prefix typos from Polymarket
                        if (market.question.startsWith("arch")) { fr.archPrefix++; continue; }

                        const clobTokens = JSON.parse(market.clobTokenIds || '[]');
                        const outcomes = JSON.parse(market.outcomes || '[]');

                        if (clobTokens.length === 0) { fr.noTokens++; continue; }

                        // Deduplication: Don't show the same outcome twice (e.g. "Rick Rieder")
                        // Polymarket sometimes lists the same person twice with different IDs.
                        // Use CLEANED name for deduplication (not raw question) to catch
                        // duplicates like "Will Khamenei..." vs "Khamenei will..."
                        const cleanedName = cleanOutcomeName(sanitizeText(market.question));
                        const normalizedQ = cleanedName.toLowerCase();
                        if (seenQuestions.has(normalizedQ)) {
                            fr.duplicate++;
                            continue;
                        }
                        seenQuestions.add(normalizedQ);

                        const tokenId = clobTokens[0];
                        const complementToken = clobTokens.length > 1 ? clobTokens[1] : null;
                        const yesPrice = parseFloat(prices[0] || "0");

                        // POLYMARKET PARITY: Mark extreme-price sub-markets as resolved
                        // instead of dropping them. In threshold events (BTC prices, scores),
                        // sub-markets at 99%+ are informational context, not stale.
                        // Users see them in the modal; trade executor blocks execution.
                        const isResolved = yesPrice <= 0.01 || yesPrice >= 0.99;
                        if (isResolved) { fr.priceBounds++; }

                        // NOTE: 50% filter removed here — the server action layer
                        // (market.ts getActiveEvents) has a smarter volume-aware version
                        // that checks 50% price + low volume together, which avoids
                        // dropping legitimate new markets near 50%.

                        allEventTokenIds.push(tokenId);

                        // DUAL-TOKEN FIX: Store complement mapping (YES→NO)
                        // Critical for markets where liquidity is on the NO token
                        if (complementToken) {
                            await this.redis.hset('market:complements', tokenId, complementToken);
                        }

                        const marketVolume = parseFloat(market.volume || "0");

                        // VOLUME FILTER: Skip sub-markets below the configurable threshold.
                        // Exempt resolved sub-markets — their volume is irrelevant for display.
                        if (!isResolved && marketVolume < MIN_MARKET_VOLUME) { fr.volume++; continue; }

                        fr.survived++;
                        subMarkets.push({
                            id: tokenId,
                            question: cleanOutcomeName(sanitizeText(market.question)),
                            outcomes: outcomes,
                            price: yesPrice,
                            volume: marketVolume,
                            groupItemTitle: market.groupItemTitle || undefined,
                            resolved: isResolved || undefined,
                        });
                    }
                    if (fr.total > 0) {
                        logger.info(`[Ingestion] Filter report (${event.title?.slice(0, 30)}): total=${fr.total} closed=${fr.closed} endDate=${fr.endDate} spam=${fr.spam} noPrices=${fr.noPrices} placeholder=${fr.placeholder} priceBounds=${fr.priceBounds} volume=${fr.volume} duplicate=${fr.duplicate} survived=${fr.survived}`);
                        // Aggregate into pipeline-level report
                        for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
                            featuredReport[key] += fr[key];
                        }
                    }

                    if (subMarkets.length === 0) continue;

                    // Filter out player prop sub-markets from "Team vs. Team" events
                    // Polymarket sometimes bundles player props (e.g., "AJ Green: Points O/U 11.5")
                    // under game events, which creates confusing mixed cards.
                    const titleLower = (event.title || '').toLowerCase();
                    const isVsEvent = titleLower.includes(' vs ') || titleLower.includes(' vs. ');
                    let filteredSubMarkets = subMarkets;

                    if (isVsEvent && subMarkets.length > 2) {
                        const playerPropPatterns = [
                            /points o\/u/i, /assists o\/u/i, /rebounds o\/u/i,
                            /passing yards/i, /rushing yards/i, /receiving yards/i,
                            /touchdowns/i, /three-pointers/i, /3-pointers/i,
                            /strikeouts/i, /home runs/i, /hits o\/u/i,
                            /saves o\/u/i, /shots on goal/i, /goals o\/u/i,
                        ];

                        const gameLevelMarkets = subMarkets.filter(m => {
                            const q = m.question.toLowerCase();
                            const isPlayerProp = playerPropPatterns.some(p => p.test(q));
                            return !isPlayerProp;
                        });

                        // Only filter if we still have at least 2 game-level markets
                        if (gameLevelMarkets.length >= 2) {
                            filteredSubMarkets = gameLevelMarkets;
                        }
                    }

                    // Sort sub-markets by price descending (highest probability first)
                    filteredSubMarkets.sort((a, b) => b.price - a.price);

                    // Determine if this is a "high volume" event (top 15 by 24h volume = Breaking)
                    // Events are already sorted by volume24hr descending, so index determines rank
                    const eventIndex = events.indexOf(event);
                    const isHighVolume = eventIndex < 15;

                    const categories = getCategories(
                        null,
                        event.title,
                        event.tags,
                        event.image,
                        {
                            createdAt: event.createdAt,
                            volume24hr: event.volume24hr,
                            isHighVolume
                        }
                    );

                    processedEvents.push({
                        id: event.id || event.slug,
                        title: sanitizeText(event.title),
                        slug: event.slug,
                        description: event.description,
                        image: event.image,
                        volume: event.volume || 0,
                        volume24hr: event.volume24hr || 0,
                        createdAt: event.createdAt,
                        categories: categories,
                        markets: filteredSubMarkets,
                        isMultiOutcome: filteredSubMarkets.length > 1,
                    });
                } catch (e) {
                    // Log errors for debugging instead of silently skipping
                    logger.error(`[Ingestion] Error processing event ${event?.title || event?.slug || 'unknown'}:`, e);
                }
            }

            // Store events in Redis
            await this.redis.set("event:active_list", JSON.stringify(processedEvents), 'EX', 600);
            await this.redis.set("filter:report:featured", JSON.stringify({ ...featuredReport, updatedAt: new Date().toISOString() }), 'EX', 600);
            logger.info(`[Ingestion] Stored ${processedEvents.length} featured events (${allEventTokenIds.length} total markets). Filter: ${featuredReport.total} checked, ${featuredReport.survived} survived.`);

            // Add event token IDs to active polling (with memory bounds)
            const combined = [...this.activeTokenIds, ...allEventTokenIds];
            this.activeTokenIds = combined.slice(0, this.MAX_ACTIVE_TOKENS);

        } catch (err) {
            logger.error("[Ingestion] Failed to fetch featured events:", err);
        }
    }


    private async fetchActiveMarkets() {
        try {
            logger.info("[Ingestion] Fetching Diverse Markets (Category-Balanced)...");

            // Fetch a large pool of active markets (high number to account for spam filtering)
            // Note: Removed end_date filter to get more variety
            const url = `https://gamma-api.polymarket.com/markets?limit=1000&active=true&closed=false`;
            logger.info(`[Ingestion] Fetching pool of 1000 markets...`);

            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data)) {
                logger.error("[Ingestion] Invalid response from Gamma API");
                return;
            }

            // Volume threshold — imported from trading-constants.ts (single source of truth)
            // Previously hardcoded at $50K, now matches the risk engine's $100K threshold

            const categoryCounts: Record<string, number> = {};
            const allMarkets: StoredBinaryMarket[] = [];
            const seenIds = new Set<string>();

            const bfr = { total: 0, closed: 0, endDate: 0, spam: 0, volume: 0, multiOutcome: 0, duplicate: 0, stalePrice: 0, placeholderPrice: 0, nearResolved: 0, survived: 0 };

            for (const m of data) {
                try {
                    bfr.total++;
                    if (m.closed === true || m.archived === true) { bfr.closed++; continue; }

                    // STALE MARKET PRUNING: Skip markets whose end_date has passed
                    if (m.endDate) {
                        const endDate = new Date(m.endDate);
                        if (endDate.getTime() < Date.now()) { bfr.endDate++; continue; }
                    }

                    // Filter out spam markets (5-minute crypto bets)
                    if (isSpamMarket(m.question)) { bfr.spam++; continue; }

                    // LIQUIDITY FILTER: Minimum volume to prevent manipulation
                    const volume = parseFloat(m.volume || "0");
                    if (volume < MIN_MARKET_VOLUME) { bfr.volume++; continue; }

                    const clobTokens = JSON.parse(m.clobTokenIds);
                    const outcomes = JSON.parse(m.outcomes);
                    const prices = JSON.parse(m.outcomePrices || '[]');

                    // Determine if this is a multi-outcome market
                    const isMultiOutcome = outcomes.length > 2;

                    if (isMultiOutcome) {
                        bfr.multiOutcome++;
                        continue;
                    } else {
                        // BINARY MARKET: Process as before
                        const yesToken = clobTokens[0];
                        const noToken = clobTokens.length > 1 ? clobTokens[1] : null;
                        if (!yesToken || seenIds.has(yesToken)) { bfr.duplicate++; continue; }

                        // DUAL-TOKEN FIX: Store complement mapping
                        if (noToken) {
                            await this.redis.hset('market:complements', yesToken, noToken);
                        }

                        const categories = getCategories(m.category, m.question, m.tags, m.image);

                        for (const cat of categories) {
                            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                        }

                        seenIds.add(yesToken);

                        let basePrice = 0.5;
                        try {
                            const yesPrice = parseFloat(prices[0]);
                            const noPrice = parseFloat(prices[1]);

                            // Skip stale markets where both prices are 0 or near-0
                            if (yesPrice < 0.001 && noPrice < 0.001) {
                                bfr.stalePrice++;
                                continue;
                            }

                            // Skip markets with exactly 50% price (±0.5%) - placeholder prices
                            // with no real trading activity. Real markets rarely hit exactly 50%.
                            if (Math.abs(yesPrice - 0.5) < 0.005) {
                                bfr.placeholderPrice++;
                                continue;
                            }

                            basePrice = Math.max(yesPrice, 0.01);

                            // NEAR-RESOLVED FILTER: Skip markets where outcome is effectively decided
                            // YES >= 95% or YES <= 5% means the market is too close to resolution
                            if (yesPrice >= 0.95 || yesPrice <= 0.05) {
                                bfr.nearResolved++;
                                continue;
                            }
                        } catch (e) {
                            logger.warn('[Ingestion] Price parse failed for market, using default', { id: m.conditionId, error: String(e) });
                        }

                        bfr.survived++;
                        allMarkets.push({
                            id: yesToken,
                            question: cleanOutcomeName(m.question),
                            description: m.description,
                            image: m.image,
                            volume: volume,
                            outcomes: outcomes,
                            end_date: m.endDate,
                            categories: categories,
                            basePrice: basePrice,
                            closed: m.closed,
                            accepting_orders: m.accepting_orders
                        });
                    }
                } catch (e) {
                    logger.warn('[Ingestion] Skipped invalid market', { error: String(e) });
                }
            }
            logger.info(`[Ingestion] Filter report (binary): total=${bfr.total} closed=${bfr.closed} endDate=${bfr.endDate} spam=${bfr.spam} volume=${bfr.volume} multiOutcome=${bfr.multiOutcome} duplicate=${bfr.duplicate} stalePrice=${bfr.stalePrice} placeholderPrice=${bfr.placeholderPrice} nearResolved=${bfr.nearResolved} survived=${bfr.survived}`);

            // Volume distribution of surviving markets
            const volumeDist = { under50k: 0, '50k_100k': 0, '100k_500k': 0, '500k_1m': 0, over1m: 0 };
            for (const m of allMarkets) {
                const v = m.volume;
                if (v < 50_000) volumeDist.under50k++;
                else if (v < 100_000) volumeDist['50k_100k']++;
                else if (v < 500_000) volumeDist['100k_500k']++;
                else if (v < 1_000_000) volumeDist['500k_1m']++;
                else volumeDist.over1m++;
            }

            // Persist filter report + volume distribution to Redis
            await this.redis.set('filter:report:binary', JSON.stringify({ ...bfr, volumeDistribution: volumeDist, updatedAt: new Date().toISOString() }), 'EX', 600);

            // Store in Redis
            await this.redis.set("market:active_list", JSON.stringify(allMarkets), 'EX', 600);

            // MERGE binary market IDs with existing event token IDs (don't overwrite!)
            // This ensures order books are fetched for BOTH event markets AND binary markets
            const binaryTokenIds = allMarkets.map(m => m.id);
            const combined = [...new Set([...this.activeTokenIds, ...binaryTokenIds])]; // Dedupe
            this.activeTokenIds = combined.slice(0, this.MAX_ACTIVE_TOKENS);

            logger.info(`[Ingestion] Stored ${allMarkets.length} diverse markets in Redis.`);
            logger.info(`[Ingestion] Tracking ${this.activeTokenIds.length} total tokens for order books (events + binary).`);
            logger.info(`[Ingestion] Category breakdown:`, categoryCounts);

        } catch (err) {
            logger.error("[Ingestion] Failed to fetch markets:", err);
        }
    }

    // --- 1. WebSocket (Real-Time Price Ticks for UI) ---
    private connectWS() {
        if (this.activeTokenIds.length === 0) {
            setTimeout(() => this.init(), 5000);
            return;
        }

        // Clear any existing ping interval
        if (this.wsPingInterval) {
            clearInterval(this.wsPingInterval);
            this.wsPingInterval = null;
        }

        logger.info(`[Ingestion] WS Connecting...`);
        this.ws = new WebSocket(CLOB_WS_URL);

        this.ws.on("open", () => {
            logger.info("[Ingestion] WS Connected.");
            // Reset backoff on successful connection
            this.reconnectInterval = this.RECONNECT_BASE;
            this.subscribeWS();

            // Start ping/pong keep-alive - prevents server from closing idle connections
            // Polymarket servers typically close connections after ~60s of inactivity
            this.wsPingInterval = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.ping();  // WebSocket protocol ping
                }
            }, 30000);  // Ping every 30 seconds
        });

        this.ws.on("pong", () => {
            // Server responded to our ping - connection is alive
            // Just silently acknowledge, no logging needed
        });

        this.ws.on("message", async (data) => {
            // Error containment - never let message processing crash the worker
            try {
                const parsed = JSON.parse(data.toString());
                await this.processMessage(parsed);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error("[WS] Message processing error:", message);
                // Don't re-throw - keep connection alive
            }
        });

        this.ws.on("close", () => {
            // Clear ping interval on disconnect
            if (this.wsPingInterval) {
                clearInterval(this.wsPingInterval);
                this.wsPingInterval = null;
            }

            // Exponential backoff: 5s → 10s → 20s → 40s → 60s max
            const delay = this.reconnectInterval;
            this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.RECONNECT_MAX);
            logger.info(`[Ingestion] WS Closed. Reconnecting in ${delay / 1000}s...`);
            // Only reconnect if not shutting down
            if (!this.isShuttingDown) {
                setTimeout(() => this.connectWS(), delay);
            }
        });

        this.ws.on("error", (err) => {
            // Error handler MUST exist to prevent Node crash on WS errors
            logger.error("[WS] Connection error:", err.message);
            // Close will be triggered automatically, which will trigger reconnect
        });
    }


    private subscribeWS() {
        const payload = {
            type: "subscribe",
            channels: [{ name: "price", token_ids: this.activeTokenIds }]
        };
        this.ws?.send(JSON.stringify(payload));
    }

    // Price update batching to reduce Redis commands
    private priceBuffer: Map<string, WebSocketPriceMessage> = new Map();
    private lastFlush: number = 0;
    // PARITY FIX: 5s interval for near-real-time price display
    // ~17,280 flushes/day — each flush is 2 Redis commands (SET + PUBLISH), well within limits
    private readonly FLUSH_INTERVAL_MS = 5000;

    private async processMessage(message: WebSocketPriceMessage | WebSocketPriceMessage[]) {
        const msgs = Array.isArray(message) ? message : [message];

        // Buffer all price updates
        for (const msg of msgs) {
            if (msg.asset_id && msg.price) {
                this.priceBuffer.set(msg.asset_id, msg);
            }
        }

        // Memory bounds check - force flush if buffer too large
        if (this.priceBuffer.size >= this.MAX_PRICE_BUFFER) {
            await this.flushPriceBuffer();
            this.lastFlush = Date.now();
            return;
        }

        // Throttle flushes to once per second
        const now = Date.now();
        if (now - this.lastFlush >= this.FLUSH_INTERVAL_MS && this.priceBuffer.size > 0) {
            await this.flushPriceBuffer();
            this.lastFlush = now;
        }
    }

    private async flushPriceBuffer() {
        if (this.priceBuffer.size === 0) return;

        try {
            // COST OPTIMIZATION: Store ALL prices in SINGLE key instead of 322 individual keys
            // This reduces Redis commands from 323/flush to just 2/flush (SET + PUBLISH)
            const allPrices: Record<string, WebSocketPriceMessage> = {};

            // Convert Map entries to object
            const entries = Array.from(this.priceBuffer.entries());
            for (const entry of entries) {
                const [assetId, msg] = entry;
                allPrices[assetId] = msg;
            }

            // Single SET with all prices (1 command instead of 322!)
            await this.redis.set('market:prices:all', JSON.stringify(allPrices), 'EX', 600);

            // Single publish for real-time UI updates
            await this.redis.publish('market:prices', JSON.stringify(allPrices));

            // Clear buffer after successful flush
            this.priceBuffer.clear();
        } catch (err) {
            logger.error('[Ingestion] Flush error:', err);
        }
    }

    // --- 2. REST Polling (Order Books for Slippage Engine) ---
    private startBookPolling() {
        // Poll every 5 MINUTES - order books are for slippage estimation, not real-time
        // This reduces Redis calls from 1,272/min to ~7/5min = 84/hour = 2,016/day
        const BOOK_POLL_INTERVAL = 300000; // 5 minutes
        logger.info(`[Ingestion] Starting Order Book Poller (${BOOK_POLL_INTERVAL / 1000}s interval)...`);

        // Initial fetch
        this.fetchAllOrderBooks();

        setInterval(() => this.fetchAllOrderBooks(), BOOK_POLL_INTERVAL);
    }

    private async fetchAllOrderBooks() {
        if (this.activeTokenIds.length === 0) return;

        const books: Record<string, OrderBook> = {};
        const BATCH_SIZE = 10; // Parallel fetch limit to avoid rate limiting

        // Fetch in batches to avoid overwhelming Polymarket API
        for (let i = 0; i < this.activeTokenIds.length; i += BATCH_SIZE) {
            const batch = this.activeTokenIds.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(async (tokenId) => {
                    const res = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
                    if (!res.ok) return null;
                    return { tokenId, book: await res.json() };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    books[result.value.tokenId] = result.value.book;
                }
            }
        }

        // Store ALL order books in SINGLE Redis key (1 call instead of 318)
        if (Object.keys(books).length > 0) {
            try {
                await this.redis.set('market:orderbooks', JSON.stringify(books), 'EX', 600);
                logger.info(`[Ingestion] Updated ${Object.keys(books).length} order books (single key).`);
            } catch (err) {
                logger.error("[Ingestion] Book write error:", err);
            }
        }
    }
}

new IngestionWorker();
