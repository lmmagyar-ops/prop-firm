import { NextRequest } from "next/server";
import { getPrices } from "@/lib/worker-client";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Stream");

/**
 * SSE Endpoint for Real-Time Market Price Streaming
 * 
 * Frontend connects via EventSource, receives price updates every 1s.
 * 
 * COST OPTIMIZATION: Fetches from ingestion-worker's HTTP /prices endpoint
 * exclusively. No direct Redis connection. The worker reads Redis via
 * Railway's free private networking. This eliminates ~$87/month in egress.
 */

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();
    let interval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Send initial connection message
                controller.enqueue(encoder.encode(`data: {"status":"connected"}\n\n`));

                // Poll every 1 second
                interval = setInterval(async () => {
                    try {
                        const data = await getPrices();

                        if (data) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                        } else {
                            controller.enqueue(encoder.encode(`data: {"error":"worker_unavailable"}\n\n`));
                        }
                    } catch (err) {
                        logger.error('[MarketStream] Poll error:', err);
                        controller.enqueue(encoder.encode(`data: {"error":"poll_error"}\n\n`));
                    }
                }, 1000);

            } catch (err) {
                logger.error('[MarketStream] Failed to start stream:', err);
                controller.enqueue(encoder.encode(`data: {"error":"init_failed"}\n\n`));
                controller.close();
            }
        },

        cancel() {
            if (interval) clearInterval(interval);
            logger.info('[MarketStream] Client disconnected, cleaned up');
        }
    });

    // Handle client disconnect via abort signal
    request.signal.addEventListener('abort', () => {
        if (interval) clearInterval(interval);
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
