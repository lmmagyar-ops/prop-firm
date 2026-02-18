/**
 * diagnose-equity.ts
 * 
 * Forensic diagnostic: replays the EXACT equity calculation the dashboard does,
 * but prints every intermediate value. Used to find the root cause of
 * "equity drops by full trade cost on BUY" (Mat's bug report, Feb 14 2026).
 * 
 * Usage: npx tsx src/scripts/diagnose-equity.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '@/db';
import { challenges, positions, trades, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MarketService } from '@/lib/market';
import { calculatePositionMetrics } from '@/lib/position-utils';
import { isValidMarketPrice } from '@/lib/price-validation';
import { normalizeRulesConfig } from '@/lib/normalize-rules';

function safeParseFloat(val: unknown): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
}

async function diagnose() {
    console.log('\n🔬 EQUITY FORENSIC DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════\n');

    // 1. Find all active challenges (we examine each)
    const activeChallenges = await db.query.challenges.findMany({
        where: eq(challenges.status, 'active')
    });

    console.log(`Found ${activeChallenges.length} active challenge(s)\n`);

    for (const challenge of activeChallenges) {
        // Get user info
        const user = await db.query.users.findFirst({
            where: eq(users.id, challenge.userId),
            columns: { email: true, displayName: true }
        });

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👤 User: ${user?.email || 'unknown'}`);
        console.log(`📋 Challenge: ${challenge.id.slice(0, 12)}...`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // 2. Raw DB values
        const cashBalance = safeParseFloat(challenge.currentBalance);
        const startingBalance = safeParseFloat(challenge.startingBalance);
        const hwm = safeParseFloat(challenge.highWaterMark);
        const sod = safeParseFloat(challenge.startOfDayBalance);

        console.log('📊 Challenge State (raw DB):');
        console.log(`   startingBalance:    $${startingBalance.toFixed(2)}`);
        console.log(`   currentBalance:     $${cashBalance.toFixed(2)}`);
        console.log(`   highWaterMark:      $${hwm.toFixed(2)}`);
        console.log(`   startOfDayBalance:  $${sod.toFixed(2)}`);
        console.log(`   rulesConfig:        ${JSON.stringify(challenge.rulesConfig)}`);

        // 3. Get open positions
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challenge.id),
                eq(positions.status, 'OPEN')
            ),
        });

        console.log(`\n📦 Open Positions: ${openPositions.length}`);

        // 4. Fetch live prices from Redis (exactly as dashboard does)
        const marketIds = openPositions.map(p => p.marketId);
        const [livePrices, marketTitles] = await Promise.all([
            marketIds.length > 0 ? MarketService.getBatchOrderBookPrices(marketIds) : Promise.resolve(new Map()),
            MarketService.getBatchTitles(marketIds),
        ]);

        // 5. Replay getPositionsWithPnL for each position
        let totalPositionValue = 0;
        let totalCostBasis = 0;

        for (const pos of openPositions) {
            const entry = safeParseFloat(pos.entryPrice);
            const shares = safeParseFloat(pos.shares);
            const sizeAmount = safeParseFloat(pos.sizeAmount);
            const storedCurrentPrice = safeParseFloat(pos.currentPrice || pos.entryPrice);
            const title = marketTitles.get(pos.marketId) || pos.marketId.slice(0, 16);
            const livePrice = livePrices.get(pos.marketId);

            console.log(`\n   ┌─ Position: ${title}`);
            console.log(`   │  ID:         ${pos.id.slice(0, 12)}...`);
            console.log(`   │  Direction:  ${pos.direction}`);
            console.log(`   │  Shares:     ${shares.toFixed(4)}`);
            console.log(`   │  EntryPrice: ${entry.toFixed(4)}`);
            console.log(`   │  SizeAmount: $${sizeAmount.toFixed(2)}`);
            console.log(`   │  StoredCurr: ${storedCurrentPrice.toFixed(4)}`);

            // Cost basis check: does shares * entry = sizeAmount?
            const impliedCost = shares * entry;
            console.log(`   │  shares×entry: $${impliedCost.toFixed(2)} (should ≈ sizeAmount $${sizeAmount.toFixed(2)}, diff: $${(impliedCost - sizeAmount).toFixed(2)})`);

            let rawPrice: number;
            let priceSource: string;
            let needsDirectionAdjustment: boolean;

            if (livePrice) {
                const parsed = safeParseFloat(livePrice.price);
                if (isValidMarketPrice(parsed)) {
                    rawPrice = parsed;
                    needsDirectionAdjustment = true;
                    priceSource = `Redis live (${livePrice.source || 'unknown'})`;
                } else {
                    rawPrice = storedCurrentPrice;
                    needsDirectionAdjustment = false;
                    priceSource = `Redis INVALID (${parsed}), fell back to stored`;
                }
            } else {
                rawPrice = storedCurrentPrice;
                needsDirectionAdjustment = false;
                priceSource = 'No Redis data, using stored';
            }

            console.log(`   │  LivePrice:  ${rawPrice.toFixed(4)} (${priceSource})`);

            let effectiveCurrentPrice: number;
            let positionValue: number;
            let unrealizedPnL: number;

            if (needsDirectionAdjustment) {
                const metrics = calculatePositionMetrics(shares, entry, rawPrice, pos.direction as 'YES' | 'NO');
                effectiveCurrentPrice = metrics.effectiveCurrentPrice;
                positionValue = metrics.positionValue;
                unrealizedPnL = metrics.unrealizedPnL;
                console.log(`   │  Adjusted:   ${effectiveCurrentPrice.toFixed(4)} (direction-adjusted from ${rawPrice.toFixed(4)})`);
            } else {
                effectiveCurrentPrice = rawPrice;
                positionValue = shares * effectiveCurrentPrice;
                unrealizedPnL = (effectiveCurrentPrice - entry) * shares;
                console.log(`   │  Adjusted:   ${effectiveCurrentPrice.toFixed(4)} (no adjustment needed)`);
            }

            console.log(`   │  PosValue:   $${positionValue.toFixed(2)}`);
            console.log(`   │  UnrlzdPnL:  $${unrealizedPnL.toFixed(2)}`);

            // THE KEY CHECK: is positionValue ≈ sizeAmount on a new trade?
            const valuationGap = positionValue - sizeAmount;
            if (Math.abs(valuationGap) > 1) {
                console.log(`   │  ⚠️  VALUATION GAP: $${valuationGap.toFixed(2)} (posValue - sizeAmount)`);
                console.log(`   │      This gap represents how much equity changes from opening this position`);
                console.log(`   │      Entry=${entry.toFixed(4)}, LiveEff=${effectiveCurrentPrice.toFixed(4)}, Diff=${(effectiveCurrentPrice - entry).toFixed(4)}`);
            }

            console.log(`   └─`);

            totalPositionValue += positionValue;
            totalCostBasis += sizeAmount;
        }

        // 6. Final equity calculation
        const equity = cashBalance + totalPositionValue;
        const naiveEquity = startingBalance; // What equity would be with no trades
        const totalUnrealizedPnL = totalPositionValue - totalCostBasis;

        console.log(`\n📈 EQUITY BREAKDOWN:`);
        console.log(`   Cash Balance:         $${cashBalance.toFixed(2)}`);
        console.log(`   Total Position Value: $${totalPositionValue.toFixed(2)}`);
        console.log(`   Total Cost Basis:     $${totalCostBasis.toFixed(2)}`);
        console.log(`   ──────────────────────────────`);
        console.log(`   EQUITY:               $${equity.toFixed(2)}`);
        console.log(`   Starting Balance:     $${startingBalance.toFixed(2)}`);
        console.log(`   Unrealized PnL:       $${totalUnrealizedPnL.toFixed(2)}`);

        // 7. Verify balance reconciliation
        // Cash should = startingBalance - sum(BUY amounts) + sum(SELL proceeds)
        const allTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challenge.id),
            orderBy: [desc(trades.executedAt)],
        });

        let recomputedCash = startingBalance;
        for (const t of allTrades) {
            const amt = safeParseFloat(t.amount);
            if (t.type === 'BUY') recomputedCash -= amt;
            else if (t.type === 'SELL') recomputedCash += amt;
        }

        const cashDrift = Math.abs(recomputedCash - cashBalance);
        console.log(`\n⚖️  BALANCE RECONCILIATION:`);
        console.log(`   Recomputed from trades: $${recomputedCash.toFixed(2)}`);
        console.log(`   Stored currentBalance:  $${cashBalance.toFixed(2)}`);
        console.log(`   Drift:                  $${cashDrift.toFixed(4)} ${cashDrift > 0.01 ? '🔴 DRIFT!' : '✅'}`);

        // 8. Drawdown analysis (Bug 1)
        const rawRules = challenge.rulesConfig as Record<string, unknown> | null;
        const normalized = normalizeRulesConfig(rawRules, startingBalance);
        const maxDrawdownStatic = normalized.maxDrawdown;
        const effectiveHWM = hwm > 0 ? hwm : startingBalance;
        const effectiveSOD = sod > 0 ? sod : startingBalance;
        const floor = startingBalance - maxDrawdownStatic;
        const dynamicDenominator = Math.max(0, effectiveSOD - floor);

        const drawdownAmountFromHWM = Math.max(0, effectiveHWM - equity);
        const staticUsage = (drawdownAmountFromHWM / maxDrawdownStatic) * 100;
        const dynamicUsage = dynamicDenominator > 0
            ? (drawdownAmountFromHWM / dynamicDenominator) * 100
            : 0;

        console.log(`\n📉 DRAWDOWN ANALYSIS (Bug 1):`);
        console.log(`   High Water Mark:       $${effectiveHWM.toFixed(2)}`);
        console.log(`   Start-of-Day Balance:  $${effectiveSOD.toFixed(2)}`);
        console.log(`   Floor:                 $${floor.toFixed(2)}`);
        console.log(`   Max Drawdown (static): $${maxDrawdownStatic.toFixed(2)}`);
        console.log(`   ──────────────────────────────`);
        console.log(`   Drawdown Amount:       $${drawdownAmountFromHWM.toFixed(2)} (HWM - equity)`);
        console.log(`   CURRENT display:       ${staticUsage.toFixed(2)}%  ($${drawdownAmountFromHWM.toFixed(2)} / $${maxDrawdownStatic.toFixed(2)})`);
        console.log(`   MAT'S formula:         ${dynamicUsage.toFixed(2)}%  ($${drawdownAmountFromHWM.toFixed(2)} / $${dynamicDenominator.toFixed(2)})`);
        console.log(`   Denominator diff:      $${(dynamicDenominator - maxDrawdownStatic).toFixed(2)}`);

        // 9. Show recent trades (last 5)
        const recentTrades = allTrades.slice(0, 5);
        console.log(`\n📜 Recent Trades (last ${recentTrades.length}):`);
        for (const t of recentTrades) {
            const title = marketTitles.get(t.marketId) || t.marketId.slice(0, 16);
            console.log(`   ${t.type} ${t.direction || 'YES'} $${safeParseFloat(t.amount).toFixed(2)} @ ${safeParseFloat(t.price).toFixed(4)} — ${title} (${t.executedAt?.toISOString().slice(0, 19)})`);
        }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('🔬 Diagnostic complete\n');

    process.exit(0);
}

diagnose().catch(err => {
    console.error('💥 FATAL:', err);
    process.exit(1);
});
