import { db } from "../src/db";
import { users } from "../src/db/schema";
import { ChallengeManager } from "../src/lib/challenges";
import { TradeExecutor } from "../src/lib/trade";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const redis = new Redis(REDIS_URL);

async function verifyTradingEngine() {
    try {
        console.log("🚀 Starting Trading Engine Verification...");

        // 1. Create Test User
        const email = `test_trader_${Date.now()}@example.com`;
        const [user] = await db.insert(users).values({
            name: "Test Trader",
            email,
            emailVerified: new Date(),
        }).returning();
        console.log(`✅ Created User: ${user.id} (${user.email})`);

        // 2. Create Challenge
        const challenge = await ChallengeManager.createChallenge(user.id);
        console.log(`✅ Created Challenge: ${challenge.id} (Balance: $${challenge.currentBalance})`);

        // 3. Inject Mock Price
        const assetId = "test_asset_VERIFY";
        const price = "0.50";
        await redis.set(`market:price:${assetId}`, JSON.stringify({
            price,
            asset_id: assetId,
            timestamp: Date.now()
        }));
        console.log(`✅ Injected Mock Price for ${assetId}: $${price}`);

        // 4. Execute BUY
        // Buy $1000 worth. Price 0.50. Slippage 0.5% -> ExPrice 0.5025. Shares ~1990
        const buyAmount = 1000;
        console.log(`🔄 Executing BUY order for $${buyAmount}...`);
        const buyTrade = await TradeExecutor.executeTrade(user.id, challenge.id, assetId, "BUY", buyAmount);
        console.log(`✅ BUY Filled! Price: ${buyTrade.price}, Shares: ${buyTrade.shares}`);

        // 5. Verify Position
        // Fetch challenge again to see balance
        const updatedChallenge = await ChallengeManager.getActiveChallenge(user.id);
        console.log(`💰 New Balance: $${updatedChallenge?.currentBalance} (Expected ~$9000)`);

        // 6. Execute SELL
        // Price moves up to 0.60!
        const newPrice = "0.60";
        await redis.set(`market:price:${assetId}`, JSON.stringify({
            price: newPrice,
            asset_id: assetId,
            timestamp: Date.now()
        }));
        console.log(`📈 Price moved to $${newPrice}`);

        console.log(`🔄 Executing SELL order for $500 worth (Notional)... wait. TradeExecutor takes Amount ($).`);
        // We need to support selling by Shares or Amount. 
        // MVP TradeExecutor takes 'amount' in USD. 
        // If I want to sell half my position? 
        // User says "Sell $500". 
        // $500 / 0.60 (Bid) = 833 shares
        const sellAmount = 600; // Sell $600 worth
        const sellTrade = await TradeExecutor.executeTrade(user.id, challenge.id, assetId, "SELL", sellAmount);
        console.log(`✅ SELL Filled! Price: ${sellTrade.price}, Shares Sold: ${sellTrade.shares}`);

        const finalChallenge = await ChallengeManager.getActiveChallenge(user.id);
        console.log(`💰 Final Balance: $${finalChallenge?.currentBalance}`);

        console.log("🎉 Verification Complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyTradingEngine();
