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

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLERS - Must be first! Prevents process crash.
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err: Error) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
    // Don't exit - keep running in degraded mode
});

process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error('[FATAL] Unhandled Rejection:', message);
    if (reason instanceof Error && reason.stack) {
        console.error(reason.stack);
    }
});

import WebSocket from "ws";
import * as dotenv from "dotenv";
import Redis from "ioredis";
import { LeaderElection } from "./leader-election";
import { RiskMonitor } from "./risk-monitor";
import { startHealthServer } from "./health-server";

dotenv.config();

const CLOB_WS_URL = "wss://ws-live-data.polymarket.com";
// Gamma API Base: We append filters dynamically in fetchActiveMarkets
const GAMMA_API_URL = "https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume&descending=true";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";

class IngestionWorker {
    private ws: WebSocket | null = null;
    private redis: Redis;
    private reconnectInterval = 5000;
    private activeTokenIds: string[] = [];
    private leaderElection: LeaderElection;
    private riskMonitor: RiskMonitor;
    private isLeader = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isShuttingDown = false;

    // Memory bounds - prevent unbounded array/map growth
    private readonly MAX_ACTIVE_TOKENS = 2000;
    private readonly MAX_PRICE_BUFFER = 500;

    constructor() {
        if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            // Debug: Log actual env var values (port only, not password)
            const rawPort = process.env.REDIS_PORT;
            console.log(`[Ingestion] REDIS_HOST: ${process.env.REDIS_HOST}`);
            console.log(`[Ingestion] REDIS_PORT raw value: "${rawPort}" (type: ${typeof rawPort})`);

            // Defensive port parsing - handle NaN, empty, undefined
            let port = 6379; // Default fallback
            if (rawPort && rawPort.trim()) {
                const parsed = parseInt(rawPort.trim(), 10);
                if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
                    port = parsed;
                } else {
                    console.warn(`[Ingestion] Invalid REDIS_PORT "${rawPort}", using default 6379`);
                }
            } else {
                console.log(`[Ingestion] REDIS_PORT not set, using default 6379`);
            }

            console.log(`[Ingestion] Connecting to Redis via HOST/PORT/PASS config (port: ${port})...`);
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: port,
                password: process.env.REDIS_PASSWORD,
                tls: {}, // Required for Upstash
                // Institutional retry config
                retryStrategy: (times: number) => {
                    if (times > 20) {
                        console.error('[Redis] Max retries (20) exceeded');
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 500, 30000); // Max 30s backoff
                    console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableOfflineQueue: true,
                connectTimeout: 10000,
            });
        } else {
            const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
            console.log(`[Ingestion] Connecting to Redis via URL...`);
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
            console.error('[Redis] Connection error:', err.message);
        });
        this.redis.on('reconnecting', () => {
            console.log('[Redis] Attempting reconnection...');
        });
        this.redis.on('connect', () => {
            console.log('[Redis] Connected successfully');
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

            console.log(`[Ingestion] ${signal} received, shutting down gracefully...`);

            try {
                // 1. Stop accepting new work
                this.isLeader = false;

                // 2. Stop heartbeat
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = null;
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

                console.log('[Ingestion] Shutdown complete.');
                process.exit(0);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error('[Ingestion] Shutdown error:', message);
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
                console.error('[Heartbeat] Failed to write:', message);
            }
        }, 60000); // Every 60 seconds (was 30s)
    }

    /**
     * Start worker with leader election - only leader runs ingestion
     */
    private async startWithLeaderElection(): Promise<void> {
        this.isLeader = await this.leaderElection.tryBecomeLeader();

        if (this.isLeader) {
            console.log('[Ingestion] 🟢 This worker is the LEADER - starting ingestion...');
            // Start renewal and handle leadership loss
            this.leaderElection.startRenewal(() => {
                console.error('[Ingestion] 🔴 Lost leadership! Stopping ingestion...');
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
        const currentLeader = this.leaderElection.getCurrentLeader();
        console.log(`[Ingestion] 🟡 Entering STANDBY mode (waiting for leader to fail)...`);

        const standbyInterval = setInterval(async () => {
            const becameLeader = await this.leaderElection.tryBecomeLeader();
            if (becameLeader) {
                clearInterval(standbyInterval);
                console.log('[Ingestion] 🟢 Became leader! Starting ingestion...');
                this.isLeader = true;
                this.leaderElection.startRenewal(() => {
                    console.error('[Ingestion] 🔴 Lost leadership! Stopping ingestion...');
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

    /**
     * Get all applicable categories for a market
     * Returns array so markets can appear in multiple tabs (like Polymarket)
     * 
     * @param apiCategory - Legacy single category from API
     * @param question - Event title or market question (for keyword matching)
     * @param tags - Polymarket tags array (e.g., ['NFL', 'Bills vs Broncos'])
     * @param imageUrl - Event image URL (often contains sport identifiers)
     */
    private getCategories(apiCategory: string | null, question: string, tags?: string[], imageUrl?: string): string[] {
        const categories: string[] = [];
        const q = question.toLowerCase();
        const tagsLower = (tags || []).map(t => t.toLowerCase());
        const imageLower = (imageUrl || '').toLowerCase();

        // Map Polymarket's native category first
        const categoryMap: Record<string, string> = {
            'US-current-affairs': 'Politics',
            'Crypto': 'Crypto',
            'Sports': 'Sports',
            'NBA Playoffs': 'Sports',
            'Olympics': 'Sports',
            'Business': 'Business',
            'Tech': 'Tech',
            'Science': 'Science',
            'Pop-Culture': 'Culture',
            'Pop-Culture ': 'Culture',
            'NFTs': 'Crypto',
            'Coronavirus': 'World',
        };

        if (apiCategory && categoryMap[apiCategory]) {
            categories.push(categoryMap[apiCategory]);
        }

        // SPORTS DETECTION - Check multiple sources
        // 1. Check tags for sports identifiers
        const sportsTags = ['nfl', 'nba', 'nhl', 'mlb', 'ncaa', 'ufc', 'mma', 'soccer', 'football',
            'basketball', 'hockey', 'tennis', 'golf', 'esports', 'epl', 'premier league',
            'la liga', 'bundesliga', 'serie a', 'champions league', 'sports'];
        const hasSportsTag = tagsLower.some(tag => sportsTags.some(st => tag.includes(st)));

        // 2. Check image URL for sports identifiers (Polymarket uses /nfl.png, /nba.png, etc.)
        const sportsImagePatterns = ['/nfl', '/nba', '/nhl', '/mlb', '/ufc', '/soccer', '/sports', '/epl', '/premier'];
        const hasSportsImage = sportsImagePatterns.some(pattern => imageLower.includes(pattern));

        // 3. Check title keywords (existing logic, expanded)
        const hasSportsKeyword = (
            q.includes('nfl') || q.includes('nba') || q.includes('nhl') ||
            q.includes('mlb') || q.includes('ncaa') || q.includes('cfb') ||
            q.includes('cbb') || q.includes('ufc') || q.includes('mma') ||
            q.includes('super bowl') || q.includes('world cup') || q.includes('playoffs') ||
            q.includes('championship') || q.includes('world series') || q.includes('stanley cup') ||
            q.includes('champions league') || q.includes('ucl') || q.includes('mvp') ||
            q.includes('finals') || q.includes('tournament') ||
            q.includes('premier league') || q.includes('epl') || q.includes('la liga') ||
            q.includes('bundesliga') || q.includes('serie a') || q.includes('ligue 1') ||
            q.includes('fifa') || q.includes('soccer') ||
            // NFL Teams
            q.includes('bills') || q.includes('dolphins') || q.includes('patriots') || q.includes('jets') ||
            q.includes('ravens') || q.includes('bengals') || q.includes('browns') || q.includes('steelers') ||
            q.includes('broncos') || q.includes('chiefs') || q.includes('raiders') || q.includes('chargers') ||
            q.includes('cowboys') || q.includes('giants') || q.includes('eagles') || q.includes('commanders') ||
            q.includes('packers') || q.includes('vikings') || q.includes('49ers') || q.includes('seahawks') ||
            q.includes('texans') || q.includes('colts') || q.includes('titans') || q.includes('jaguars') ||
            q.includes('falcons') || q.includes('panthers') || q.includes('saints') || q.includes('buccaneers') ||
            q.includes('cardinals') || q.includes('rams') || q.includes('lions') || q.includes('bears') ||
            // NBA Teams
            q.includes('lakers') || q.includes('celtics') || q.includes('warriors') || q.includes('knicks') ||
            q.includes('nuggets') || q.includes('mavericks') || q.includes('thunder') || q.includes('heat') ||
            q.includes('bucks') || q.includes('76ers') || q.includes('suns') || q.includes('clippers') ||
            q.includes('jazz') || q.includes('pelicans') || q.includes('spurs') || q.includes('rockets') ||
            // Player names
            q.includes('jokic') || q.includes('lebron') || q.includes('curry') || q.includes('mahomes') ||
            q.includes('kelce') || q.includes('giannis') || q.includes('shai') || q.includes('tatum') ||
            q.includes('patrick mahomes') || q.includes('josh allen') || q.includes('lamar jackson') ||
            // Game patterns
            (q.includes(' vs ') && (q.includes('win') || q.includes('beat') || q.includes('game')))
        );

        if (hasSportsTag || hasSportsImage || hasSportsKeyword) {
            if (!categories.includes('Sports')) categories.push('Sports');
        }

        // US Politics (domestic)
        if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
            q.includes('president') || q.includes('congress') || q.includes('senate') ||
            q.includes('democrat') || q.includes('republican') || q.includes('doge ') ||
            q.includes('musk') || q.includes('elon') || q.includes('cabinet')) {
            if (!categories.includes('Politics')) categories.push('Politics');
        }

        // Geopolitics (international)
        if (q.includes('putin') || q.includes('ukraine') || q.includes('russia') ||
            q.includes('zelensky') || q.includes('nato') || q.includes('israel') ||
            q.includes('netanyahu') || q.includes('iran') || q.includes('china') ||
            q.includes('xi') || q.includes('ceasefire') || q.includes('war') ||
            q.includes('nuclear') || q.includes('maduro') || q.includes('venezuela') ||
            q.includes('kim jong') || q.includes('north korea') || q.includes('sanctions')) {
            if (!categories.includes('Geopolitics')) categories.push('Geopolitics');
        }

        // Crypto
        if (q.includes('bitcoin') || q.includes('btc') || q.includes('ethereum') ||
            q.includes('eth') || q.includes('crypto') || q.includes('solana') ||
            q.includes('xrp') || q.includes('tether') || q.includes('usdt')) {
            if (!categories.includes('Crypto')) categories.push('Crypto');
        }

        // Business/Finance
        if (q.includes('fed') || q.includes('recession') || q.includes('gdp') ||
            q.includes('stock') || q.includes('ceo') || q.includes('market cap') ||
            q.includes('ipo') || q.includes('earnings') || q.includes('s&p') ||
            q.includes('nasdaq') || q.includes('dow')) {
            if (!categories.includes('Business')) categories.push('Business');
        }

        // Tech
        if (q.includes('ai') || q.includes('openai') || q.includes('chatgpt') ||
            q.includes('google') || q.includes('apple') || q.includes('microsoft') ||
            q.includes('spacex') || q.includes('nvidia') || q.includes('tesla') ||
            q.includes('meta') || q.includes('amazon')) {
            if (!categories.includes('Tech')) categories.push('Tech');
        }

        // Culture (Entertainment, Pop Culture)
        if (q.includes('movie') || q.includes('oscar') || q.includes('grammy') ||
            q.includes('emmy') || q.includes('marvel') || q.includes('disney') ||
            q.includes('netflix') || q.includes('stranger things') || q.includes('kardashian') ||
            q.includes('celebrity') || q.includes('epstein') || q.includes('youtube') ||
            q.includes('tiktok') || q.includes('logan paul') || q.includes('mr beast') ||
            q.includes('avatar') || q.includes('star wars') || q.includes('album')) {
            if (!categories.includes('Culture')) categories.push('Culture');
        }

        // Default to Other if no categories matched
        if (categories.length === 0) {
            categories.push('Other');
        }

        return categories;
    }

    /**
     * Check if market is short-term spam (e.g., 5-minute crypto bets)
     */
    private isSpamMarket(question: string): boolean {
        const q = question.toLowerCase();

        // Specific Spam Checks
        if (q.includes('super bowl') && q.includes('cancelled')) return true;

        // Filter out "Up or Down" minute-by-minute markets
        if (q.includes('up or down') && (q.includes('am') || q.includes('pm') || q.includes('et'))) {
            return true;
        }

        // Generic "Cancelled" spam (often low quality)
        if (q.endsWith('cancelled?') || q.startsWith('cancelled:')) return true;

        return false;
    }

    /**
     * Clean up outcome names from raw API data
     * - Removes leading articles (the, a, an)
     * - Capitalizes first letter
     * - Trims whitespace
     */
    private cleanOutcomeName(name: string): string {
        let cleaned = name.trim();

        // Remove leading articles (case insensitive)
        cleaned = cleaned.replace(/^(the|a|an)\s+/i, '');

        // Capitalize first letter
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }

        return cleaned;
    }

    private async init() {
        await this.fetchFeaturedEvents(); // Fetch curated trending events first
        await this.fetchActiveMarkets(); // Then fetch remaining markets
        this.connectWS();
        this.startBookPolling();
    }

    /**
     * Fetch featured/curated events from Polymarket's Events API
     * These are the trending events displayed on Polymarket's homepage
     */
    private async fetchFeaturedEvents() {
        try {
            console.log("[Ingestion] Fetching High-Volume Events (Sorted by 24h Volume)...");

            // Primary query: high-volume active events sorted by recent activity
            const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100";
            const response = await fetch(url);
            const events = await response.json();

            if (!Array.isArray(events)) {
                console.error("[Ingestion] Invalid response from Events API");
                return;
            }

            // Secondary query: "breaking" tagged events to catch brand-new markets
            console.log("[Ingestion] Fetching breaking news markets...");
            const breakingUrl = "https://gamma-api.polymarket.com/events?tag=breaking&active=true&closed=false&limit=30";
            const breakingRes = await fetch(breakingUrl);
            const breakingEvents = await breakingRes.json();

            if (Array.isArray(breakingEvents)) {
                const seenSlugs = new Set(events.map((e: any) => e.slug));
                for (const be of breakingEvents) {
                    if (!seenSlugs.has(be.slug)) {
                        events.push(be);
                    }
                }
                console.log(`[Ingestion] Added ${breakingEvents.filter((be: any) => !seenSlugs.has(be.slug)).length} breaking events.`);
            }

            const processedEvents: any[] = [];
            const allEventTokenIds: string[] = [];
            const seenEventTitles = new Set<string>(); // Event-level deduplication

            for (const event of events) {
                try {
                    if (!event.markets || event.markets.length === 0) continue;

                    // Event-level deduplication by title (prevents duplicate "LeBron James" etc.)
                    const normalizedTitle = event.title.trim().toLowerCase();
                    if (seenEventTitles.has(normalizedTitle)) continue;
                    seenEventTitles.add(normalizedTitle);

                    // Process each market within the event
                    const subMarkets: any[] = [];
                    const seenQuestions = new Set<string>();
                    for (const market of event.markets) {
                        if (market.closed || market.archived) continue;

                        // Filter out spam sub-markets (e.g., "Super Bowl cancelled")
                        if (this.isSpamMarket(market.question)) continue;

                        const prices = JSON.parse(market.outcomePrices || '[]');

                        // Filter out empty prices
                        if (!prices || prices.length < 2) continue;

                        // Filter out "Individual [A-Z]" placeholders (confusing for users)
                        if (market.question.includes("Individual ") || market.question.includes("Someone else")) continue;

                        // Filter out "arch" prefix typos from Polymarket
                        if (market.question.startsWith("arch")) continue;

                        const clobTokens = JSON.parse(market.clobTokenIds || '[]');
                        const outcomes = JSON.parse(market.outcomes || '[]');

                        if (clobTokens.length === 0) continue;

                        // Deduplication: Don't show the same outcome twice (e.g. "Rick Rieder")
                        // Polymarket sometimes lists the same person twice with different IDs.
                        // We use a normalized version of the question as the key.
                        const normalizedQ = market.question.trim().toLowerCase();
                        if (seenQuestions.has(normalizedQ)) {
                            // If we already have this question, maybe keep the one with higher volume? 
                            // For now, simpler is creating less noise -> Skip duplicate.
                            continue;
                        }
                        seenQuestions.add(normalizedQ);

                        const tokenId = clobTokens[0];
                        const yesPrice = parseFloat(prices[0] || "0");

                        // Skip markets with truly 0% prices (exactly 0) - these are
                        // delisted or inactive. Keep low-probability markets (0.1%+).
                        if (yesPrice < 0.001) continue;

                        // Skip markets with exactly 50% price (±0.5%) - these are placeholder
                        // prices with no real trading activity (e.g., 2028 elections).
                        // Real markets almost never land exactly at 50%.
                        if (Math.abs(yesPrice - 0.5) < 0.005) continue;

                        allEventTokenIds.push(tokenId);

                        subMarkets.push({
                            id: tokenId,
                            question: this.cleanOutcomeName(market.question),
                            outcomes: outcomes,
                            price: Math.max(yesPrice, 0.01),
                            volume: parseFloat(market.volume || "0"),
                        });
                    }

                    if (subMarkets.length === 0) continue;

                    // Sort sub-markets by price descending (highest probability first)
                    subMarkets.sort((a, b) => b.price - a.price);

                    const categories = this.getCategories(null, event.title, event.tags, event.image);

                    processedEvents.push({
                        id: event.id || event.slug,
                        title: event.title,
                        slug: event.slug,
                        description: event.description,
                        image: event.image,
                        volume: event.volume || 0,
                        categories: categories,
                        markets: subMarkets,
                        isMultiOutcome: subMarkets.length > 1,
                    });
                } catch (e) {
                    // Skip invalid event
                }
            }

            // Store events in Redis
            await this.redis.set("event:active_list", JSON.stringify(processedEvents));
            console.log(`[Ingestion] Stored ${processedEvents.length} featured events (${allEventTokenIds.length} total markets).`);

            // Add event token IDs to active polling (with memory bounds)
            const combined = [...this.activeTokenIds, ...allEventTokenIds];
            this.activeTokenIds = combined.slice(0, this.MAX_ACTIVE_TOKENS);

        } catch (err) {
            console.error("[Ingestion] Failed to fetch featured events:", err);
        }
    }


    private async fetchActiveMarkets() {
        try {
            console.log("[Ingestion] Fetching Diverse Markets (Category-Balanced)...");

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const endDateMax = thirtyDaysFromNow.toISOString();

            // Fetch a large pool of active markets (high number to account for spam filtering)
            // Note: Removed end_date filter to get more variety
            const url = `https://gamma-api.polymarket.com/markets?limit=1000&active=true&closed=false`;
            console.log(`[Ingestion] Fetching pool of 1000 markets...`);

            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error("[Ingestion] Invalid response from Gamma API");
                return;
            }

            // Minimum volume threshold for liquidity protection
            const MIN_VOLUME = 50000; // $50k minimum

            const categoryCounts: Record<string, number> = {};
            const allMarkets: any[] = [];
            const seenIds = new Set<string>();

            for (const m of data) {
                try {
                    if (m.closed === true || m.archived === true) continue;

                    // Filter out spam markets (5-minute crypto bets)
                    if (this.isSpamMarket(m.question)) continue;

                    // LIQUIDITY FILTER: Minimum volume to prevent manipulation
                    const volume = parseFloat(m.volume || "0");
                    if (volume < MIN_VOLUME) continue;

                    const clobTokens = JSON.parse(m.clobTokenIds);
                    const outcomes = JSON.parse(m.outcomes);
                    const prices = JSON.parse(m.outcomePrices || '[]');

                    // Determine if this is a multi-outcome market
                    const isMultiOutcome = outcomes.length > 2;

                    if (isMultiOutcome) {
                        // MULTI-OUTCOME: Skip these here. They are handled by fetchFeaturedEvents.
                        // Exploding them into binary markets creates UI clutter (repetitive cards).
                        continue;
                    } else {
                        // BINARY MARKET: Process as before
                        const yesToken = clobTokens[0];
                        if (!yesToken || seenIds.has(yesToken)) continue;

                        const categories = this.getCategories(m.category, m.question, m.tags, m.image);

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
                                continue;
                            }

                            // Skip markets with exactly 50% price (±0.5%) - placeholder prices
                            // with no real trading activity. Real markets rarely hit exactly 50%.
                            if (Math.abs(yesPrice - 0.5) < 0.005) {
                                continue;
                            }

                            basePrice = Math.max(yesPrice, 0.01);
                        } catch { }

                        allMarkets.push({
                            id: yesToken,
                            question: this.cleanOutcomeName(m.question),
                            description: m.description,
                            image: m.image,
                            volume: m.volume,
                            outcomes: outcomes,
                            end_date: m.endDate,
                            categories: categories,
                            basePrice: basePrice,
                            closed: m.closed,
                            accepting_orders: m.accepting_orders
                        });
                    }
                } catch (e) {
                    // Skip invalid market
                }
            }

            // Store in Redis (with memory bounds)
            this.activeTokenIds = allMarkets.slice(0, this.MAX_ACTIVE_TOKENS).map(m => m.id);
            await this.redis.set("market:active_list", JSON.stringify(allMarkets));
            console.log(`[Ingestion] Stored ${allMarkets.length} diverse markets in Redis (tracking ${this.activeTokenIds.length} tokens).`);
            console.log(`[Ingestion] Category breakdown:`, categoryCounts);

        } catch (err) {
            console.error("[Ingestion] Failed to fetch markets:", err);
        }
    }

    // --- 1. WebSocket (Real-Time Price Ticks for UI) ---
    private connectWS() {
        if (this.activeTokenIds.length === 0) {
            setTimeout(() => this.init(), 5000);
            return;
        }

        console.log(`[Ingestion] WS Connecting...`);
        this.ws = new WebSocket(CLOB_WS_URL);

        this.ws.on("open", () => {
            console.log("[Ingestion] WS Connected.");
            this.subscribeWS();
        });

        this.ws.on("message", async (data) => {
            // Error containment - never let message processing crash the worker
            try {
                const parsed = JSON.parse(data.toString());
                await this.processMessage(parsed);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error("[WS] Message processing error:", message);
                // Don't re-throw - keep connection alive
            }
        });

        this.ws.on("close", () => {
            console.log("[Ingestion] WS Closed.");
            // Only reconnect if not shutting down
            if (!this.isShuttingDown) {
                console.log("[Ingestion] Reconnecting in 5s...");
                setTimeout(() => this.connectWS(), this.reconnectInterval);
            }
        });

        this.ws.on("error", (err) => {
            // Error handler MUST exist to prevent Node crash on WS errors
            console.error("[WS] Connection error:", err.message);
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
    private priceBuffer: Map<string, any> = new Map();
    private lastFlush: number = 0;
    private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds (was 1s - saves 80% Redis calls)

    private async processMessage(message: any) {
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
            // Batch all price updates into a single MSET command
            const pipeline = this.redis.pipeline();
            const allPrices: Record<string, any> = {};

            // Convert Map entries to array for compatibility
            const entries = Array.from(this.priceBuffer.entries());
            for (const entry of entries) {
                const [assetId, msg] = entry;
                allPrices[assetId] = msg;
                pipeline.set(`market:price:${assetId}`, JSON.stringify(msg));
            }

            // Single publish with all updates (UI can parse batch)
            pipeline.publish("market:prices", JSON.stringify(allPrices));

            await pipeline.exec();

            // Clear buffer after successful flush
            this.priceBuffer.clear();
        } catch (err) {
            console.error("[Ingestion] Flush error:", err);
        }
    }

    // --- 2. REST Polling (Order Books for Slippage Engine) ---
    private startBookPolling() {
        // Poll every 5 MINUTES - order books are for slippage estimation, not real-time
        // This reduces Redis calls from 1,272/min to ~7/5min = 84/hour = 2,016/day
        const BOOK_POLL_INTERVAL = 300000; // 5 minutes
        console.log(`[Ingestion] Starting Order Book Poller (${BOOK_POLL_INTERVAL / 1000}s interval)...`);

        // Initial fetch
        this.fetchAllOrderBooks();

        setInterval(() => this.fetchAllOrderBooks(), BOOK_POLL_INTERVAL);
    }

    private async fetchAllOrderBooks() {
        if (this.activeTokenIds.length === 0) return;

        const books: Record<string, any> = {};
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
                await this.redis.set('market:orderbooks', JSON.stringify(books));
                console.log(`[Ingestion] Updated ${Object.keys(books).length} order books (single key).`);
            } catch (err) {
                console.error("[Ingestion] Book write error:", err);
            }
        }
    }
}

new IngestionWorker();
