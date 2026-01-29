import { NextRequest } from "next/server";
import Redis from "ioredis";

/**
 * SSE Endpoint for Real-Time Market Price Streaming
 * 
 * Frontend connects via EventSource, receives price updates every 1s.
 * Falls back gracefully if Redis is unavailable.
 */

// Priority: REDIS_URL (Railway) > REDIS_HOST/PASSWORD (legacy Upstash) > localhost
function createRedisClient(): Redis {
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, {
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {},
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }
    return new Redis("redis://localhost:6380", {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
    });
}

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();
    let redis: Redis | null = null;
    let interval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                redis = createRedisClient();

                // Send initial connection message
                controller.enqueue(encoder.encode(`data: {"status":"connected"}\n\n`));

                // Poll Redis every 1 second and push updates
                interval = setInterval(async () => {
                    try {
                        const [kalshiData, polyData] = await Promise.all([
                            redis!.get('kalshi:active_list'),
                            redis!.get('event:active_list'),
                        ]);

                        const prices: Record<string, { price: string; title?: string }> = {};

                        // Parse Kalshi markets
                        if (kalshiData) {
                            const events = JSON.parse(kalshiData);
                            for (const event of events) {
                                for (const market of event.markets || []) {
                                    prices[market.id] = {
                                        price: market.price?.toString() || "0.50",
                                        title: market.title || event.title,
                                    };
                                }
                            }
                        }

                        // Parse Polymarket markets
                        if (polyData) {
                            const events = JSON.parse(polyData);
                            for (const event of events) {
                                for (const market of event.markets || []) {
                                    prices[market.id] = {
                                        price: market.price?.toString() || "0.50",
                                        title: market.title || event.title,
                                    };
                                }
                            }
                        }

                        const payload = JSON.stringify({
                            prices,
                            timestamp: Date.now(),
                            count: Object.keys(prices).length,
                        });

                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                    } catch (err) {
                        console.error('[MarketStream] Redis poll error:', err);
                        controller.enqueue(encoder.encode(`data: {"error":"redis_error"}\n\n`));
                    }
                }, 1000); // 1 second interval

            } catch (err) {
                console.error('[MarketStream] Failed to start stream:', err);
                controller.enqueue(encoder.encode(`data: {"error":"init_failed"}\n\n`));
                controller.close();
            }
        },

        cancel() {
            // Cleanup on client disconnect
            if (interval) clearInterval(interval);
            if (redis) redis.disconnect();
            console.log('[MarketStream] Client disconnected, cleaned up');
        }
    });

    // Handle client disconnect via abort signal
    request.signal.addEventListener('abort', () => {
        if (interval) clearInterval(interval);
        if (redis) redis.disconnect();
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
