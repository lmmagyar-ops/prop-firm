import { WebSocketServer } from "ws";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const PORT = parseInt(process.env.WS_PORT || "3001");

const wss = new WebSocketServer({ port: PORT });
const redisSubscriber = new Redis(REDIS_URL);
const redisPublisher = new Redis(REDIS_URL); // For other interactive events if needed

// Subscribe to market prices and admin events
redisSubscriber.subscribe("market:prices", "admin:events", (err, count) => {
    if (err) {
        console.error("[WS Server] Failed to subscribe: %s", err.message);
    } else {
        console.log(`[WS Server] Subscribed to ${count} channel(s). Listening for updates...`);
    }
});

redisSubscriber.on("message", (channel, message) => {
    // Broadcast to all connected clients
    // We can add filtering logic here later (e.g. only send to clients viewing that market)
    // For MVP/Sim, broadcast to all.
    if (channel === "market:prices") {
        wss.clients.forEach((client) => {
            if (client.readyState === 1) { // OPEN
                client.send(message);
            }
        });
    } else if (channel === "admin:events") {
        // Broadcast admin events (e.g. new trade, risk alert)
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
});

wss.on("connection", (ws) => {
    console.log("[WS Server] Client connected");

    ws.send(JSON.stringify({ type: "WELCOME", message: "Connected to Prop Firm Real-Time Feed" }));

    ws.on("error", console.error);

    ws.on("close", () => {
        console.log("[WS Server] Client disconnected");
    });
});

console.log(`[WS Server] WebSocket Server running on port ${PORT}`);
