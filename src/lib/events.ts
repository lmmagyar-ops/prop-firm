
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";

// Use a singleton pattern or global to avoid too many connections in serverless envs (Next.js)
// But for this long-running/node context, a new instance is fine, 
// though Next.js hot-reloading might create many.
// Simple instantiation for now.
const publisher = new Redis(REDIS_URL);

export async function publishAdminEvent(type: "NEW_TRADE" | "RISK_ALERT" | "CHALLENGE_FAILED" | "CHALLENGE_PASSED", data: any) {
    try {
        const payload = JSON.stringify({ type, data });
        await publisher.publish("admin:events", payload);
    } catch (error) {
        console.error("Failed to publish admin event:", error);
    }
}
