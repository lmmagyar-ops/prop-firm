import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const redis = new Redis(REDIS_URL);

async function publishMock() {
    const mockUpdate = {
        type: "price_change",
        asset_id: "test_asset_123",
        price: "0.99",
        timestamp: Date.now()
    };

    await redis.publish("market:prices", JSON.stringify(mockUpdate));
    console.log("Published mock update:", mockUpdate);
    redis.disconnect();
}

publishMock();
