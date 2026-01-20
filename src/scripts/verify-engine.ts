import 'dotenv/config'; // Load env vars
import { db } from '@/db';
import { users, challenges, positions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { TRADING_CONFIG } from '@/config/trading';
import { createLogger } from '@/lib/logger';
import Redis from 'ioredis';

const logger = createLogger('EngineVerification');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function runVerification() {
    console.log('\n🧪 STARTING ENGINE VERIFICATION (GOLDEN PATH)...\n');

    // 0. SEED MARKET DATA (Redis)
    const MARKET_ID = '21742633140121905979720502385255162663563053022834833784511119623297328612769';
    const TEST_PRICE = "0.50";

    logger.info('Seeding Redis with mock market data...', { marketId: MARKET_ID });
    await redis.set(`market:price:${MARKET_ID}`, JSON.stringify({
        asset_id: MARKET_ID,
        price: TEST_PRICE,
        timestamp: Date.now()
    }));

    await redis.set(`market:book:${MARKET_ID}`, JSON.stringify({
        bids: [{ price: "0.49", size: "10000" }, { price: "0.48", size: "5000" }],
        asks: [{ price: "0.51", size: "10000" }, { price: "0.52", size: "5000" }]
    }));

    // 1. SETUP: Ensure User & Active Challenge Exists
    const TEST_USER_ID = 'verify-bot-' + Date.now();
    logger.info('Creating Test User context...', { userId: TEST_USER_ID });

    try {
        // A. Create User
        await db.insert(users).values({
            id: TEST_USER_ID,
            email: `verify-${Date.now()}@test.com`,
            name: 'Verification Bot',
            role: 'client',
        });

        // B. Create Challenge
        const INITIAL_BALANCE = 10000;
        const [challenge] = await db.insert(challenges).values({
            userId: TEST_USER_ID,
            status: 'active',
            phase: 'challenge',
            rulesConfig: { maxDailyLoss: 500, maxDrawdown: 1000 },
            startingBalance: INITIAL_BALANCE.toString(),
            currentBalance: INITIAL_BALANCE.toString(),
            startedAt: new Date(),
        }).returning();

        logger.info('Test Environment Ready', { challengeId: challenge.id, balance: INITIAL_BALANCE });

        // 2. EXECUTE BUY
        const TRADE_AMOUNT = 100;
        logger.info(`👉 ACTION: BUY $${TRADE_AMOUNT} of ${MARKET_ID.substring(0, 10)}...`);


        const buyTrade = await TradeExecutor.executeTrade(TEST_USER_ID, challenge.id, MARKET_ID, 'BUY', TRADE_AMOUNT);
        // @ts-ignore
        logger.info('Buy Executed', { tradeId: buyTrade.id, price: buyTrade.price, shares: buyTrade.shares });

        // 3. ASSERT: BALANCE DEDUCTED
        const challengeAfterBuy = await db.query.challenges.findFirst({ where: eq(challenges.id, challenge.id) });
        const expectedBalance = INITIAL_BALANCE - TRADE_AMOUNT;
        const actualBalance = parseFloat(challengeAfterBuy!.currentBalance);

        if (Math.abs(actualBalance - expectedBalance) > 0.01) {
            throw new Error(`❌ BALANCE CHECK FAILED: Expected $${expectedBalance}, Got $${actualBalance}`);
        }
        logger.info('✅ ASSERTION PASSED: Balance Deducted Correctly');

        // 4. ASSERT: POSITION CREATED
        const position = await db.query.positions.findFirst({
            where: eq(positions.challengeId, challenge.id)
        });

        if (!position || position.status !== 'OPEN') {
            throw new Error('❌ POSITION CHECK FAILED: Position not found or not open');
        }
        logger.info('✅ ASSERTION PASSED: Position Created', { positionId: position.id });

        // 5. EXECUTE SELL (Close Position)
        logger.info('👉 ACTION: SELL (Closing Position)...');
        // We sell the notional amount we bought? No, executeTrade handles logic. 
        // If we want to close FULL position, we typically send side="SELL" and amount=currentValue or some logic.
        // But our TradeExecutor currently takes 'amount' which is dollar amount to trade. 
        // Logic check: verify-engine needs to know how to close.
        // If we look at existing `executeTrade`, selling logic delegates to `PositionManager.reducePosition`.
        // Let's assume we sell partial or full. For verifying engine integrity, let's Sell HALF.

        const SELL_AMOUNT = TRADE_AMOUNT / 2; // Sell $50 worth (roughly, assuming price stability for split second)
        // Wait a small moment to ensure timestamps differ if needed
        await new Promise(r => setTimeout(r, 100));

        const sellTrade = await TradeExecutor.executeTrade(TEST_USER_ID, challenge.id, MARKET_ID, 'SELL', SELL_AMOUNT);
        // @ts-ignore
        logger.info('Sell Executed', { tradeId: sellTrade.id, sharesSold: sellTrade.shares });

        // 6. ASSERT: PROCEEDS CREDITED
        const challengeAfterSell = await db.query.challenges.findFirst({ where: eq(challenges.id, challenge.id) });
        // Proceeds depend on price, but we can check it's > balanceAfterBuy
        const balanceAfterSell = parseFloat(challengeAfterSell!.currentBalance);

        if (balanceAfterSell <= actualBalance) {
            throw new Error(`❌ PROCEEDS CHECK FAILED: Balance did not increase after sell. Pre: ${actualBalance}, Post: ${balanceAfterSell}`);
        }
        logger.info(`✅ ASSERTION PASSED: Proceeds Credited ($${(balanceAfterSell - actualBalance).toFixed(2)})`);

        console.log('\n✨ 🟢 GOLDEN PATH VERIFICATION PASSED SUCCESSFULLY ✨\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 🔴 VERIFICATION FAILED\n', error);
        process.exit(1);
    }
}

runVerification();
