import { publishAdminEvent as workerPublish } from "./worker-client";

/**
 * Publish admin events via the ingestion-worker's HTTP API.
 * Replaces direct Redis pub/sub to eliminate TCP proxy egress.
 */
export async function publishAdminEvent(type: "NEW_TRADE" | "RISK_ALERT" | "CHALLENGE_FAILED" | "CHALLENGE_PASSED" | "CHALLENGE_FUNDED", data: Record<string, unknown>) {
    try {
        const success = await workerPublish(type, data);
        if (!success) {
            console.warn("[Events] Failed to publish admin event via worker, event dropped:", type);
        }
    } catch (error) {
        console.error("Failed to publish admin event:", error);
    }
}
