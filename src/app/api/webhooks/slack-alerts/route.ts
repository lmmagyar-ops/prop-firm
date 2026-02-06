/**
 * Slack Alerts Webhook
 *
 * Receives admin events and sends Slack notifications for critical alerts.
 * Set SLACK_WEBHOOK_URL in environment for production.
 */

import { NextResponse } from "next/server";

interface SlackWebhookPayload {
    type: string;
    data: {
        count?: number;
        deviations?: Array<{
            title: string;
            cachedPrice: number;
            livePrice: number;
            deviationPercent: number;
        }>;
        reason?: string;
        timestamp?: string;
    };
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const payload = (await request.json()) as SlackWebhookPayload;
        const { type, data } = payload;

        // Only process specific event types
        const alertableEvents = [
            "PRICE_DEVIATION_DETECTED",
            "INGESTION_STALE",
            "CHALLENGE_FAILED",
            "PAYOUT_REQUESTED",
            // New critical alerts
            "CRITICAL_ALERT",
            "WARNING_ALERT",
            "INFO_ALERT",
        ];

        if (!alertableEvents.includes(type)) {
            return NextResponse.json({ status: "ignored", type });
        }


        // Build Slack message
        const message = buildSlackMessage(type, data);

        // Send to Slack (if webhook URL is configured)
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (webhookUrl) {
            await sendToSlack(webhookUrl, message);
            console.log(`[SlackAlerts] Sent ${type} alert to Slack`);
        } else {
            console.log(`[SlackAlerts] ${type} alert (Slack not configured):`, message.text);
        }

        return NextResponse.json({ status: "sent", type });

    } catch (error) {
        console.error("[SlackAlerts] Error:", error);
        return NextResponse.json({ error: "Failed to process alert" }, { status: 500 });
    }
}

interface SlackMessage {
    text: string;
    blocks?: Array<{
        type: string;
        text?: { type: string; text: string; emoji?: boolean };
        elements?: Array<{ type: string; text: string; emoji?: boolean }>;
    }>;
}

function buildSlackMessage(type: string, data: SlackWebhookPayload["data"]): SlackMessage {
    switch (type) {
        case "PRICE_DEVIATION_DETECTED":
            return {
                text: `🚨 Price Deviation Alert: ${data.count} markets have inaccurate prices`,
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: "🚨 Price Deviation Detected", emoji: true },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*${data.count} markets* have prices that deviate from live sources by >2%`,
                        },
                    },
                    ...(data.deviations || []).slice(0, 3).map(d => ({
                        type: "section" as const,
                        text: {
                            type: "mrkdwn" as const,
                            text: `• *${d.title.slice(0, 40)}*\n  Cached: ${(d.cachedPrice * 100).toFixed(1)}% | Live: ${(d.livePrice * 100).toFixed(1)}% | Δ ${(d.deviationPercent * 100).toFixed(1)}%`,
                        },
                    })),
                    {
                        type: "context",
                        elements: [
                            { type: "mrkdwn", text: `Detected at ${data.timestamp || new Date().toISOString()}` },
                        ],
                    },
                ],
            };

        case "INGESTION_STALE":
            return {
                text: "⚠️ Market Ingestion Stale: Price data is outdated",
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: "⚠️ Ingestion Stale", emoji: true },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "Market price data has not been updated recently. Check ingestion worker status.",
                        },
                    },
                ],
            };

        case "CHALLENGE_FAILED":
            return {
                text: `📉 Challenge Failed: ${data.reason}`,
            };

        case "PAYOUT_REQUESTED":
            return {
                text: `💰 Payout Requested: Review required`,
            };

        case "CRITICAL_ALERT":
            return {
                text: `🚨 CRITICAL: ${(data as { title?: string }).title || 'Unknown Alert'}`,
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: `🚨 ${(data as { title?: string }).title || 'Critical Alert'}`, emoji: true },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: (data as { message?: string }).message || 'No details provided',
                        },
                    },
                    {
                        type: "context",
                        elements: [
                            { type: "mrkdwn", text: `Timestamp: ${data.timestamp || new Date().toISOString()}` },
                        ],
                    },
                ],
            };

        case "WARNING_ALERT":
            return {
                text: `⚠️ WARNING: ${(data as { title?: string }).title || 'Unknown Warning'}`,
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: `⚠️ ${(data as { title?: string }).title || 'Warning'}`, emoji: true },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: (data as { message?: string }).message || 'No details provided',
                        },
                    },
                ],
            };

        case "INFO_ALERT":
            return {
                text: `ℹ️ ${(data as { title?: string }).title || 'Info'}: ${(data as { message?: string }).message || ''}`,
            };

        default:
            return {
                text: `[Propshot Alert] ${type}: ${JSON.stringify(data)}`,
            };
    }
}

async function sendToSlack(webhookUrl: string, message: SlackMessage): Promise<void> {
    const response = await fetch(webhookUrl, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
    });

    if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
    }
}
