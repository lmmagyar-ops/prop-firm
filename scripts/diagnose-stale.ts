/**
 * Diagnose stale positions — check why settlement isn't catching resolved markets.
 * Usage: npx tsx scripts/diagnose-stale.ts
 */
import { db } from '../src/db/index.js';
import { positions, challenges } from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function diagnose() {
    console.log('\n🔍 DIAGNOSING STALE POSITIONS\n');

    // 1. Get all open positions
    const openPos = await db.query.positions.findMany({
        where: eq(positions.status, 'OPEN'),
        columns: { id: true, marketId: true, direction: true, shares: true, entryPrice: true, challengeId: true }
    });

    console.log(`Found ${openPos.length} open positions`);
    console.log('Unique markets:', [...new Set(openPos.map(p => p.marketId))].length);

    // 2. For each unique market, check Gamma API directly
    const uniqueMarkets = [...new Set(openPos.map(p => p.marketId))];

    for (const marketId of uniqueMarkets) {
        const pos = openPos.filter(p => p.marketId === marketId);
        console.log(`\n--- Market: ${marketId.slice(0, 20)}...`);
        console.log(`    Positions: ${pos.length} (${pos.map(p => `${p.direction} ${p.shares}@${p.entryPrice}`).join(', ')})`);

        // Check Gamma API
        try {
            const url = `https://gamma-api.polymarket.com/markets?clob_token_ids=${marketId}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const markets = await res.json();

            if (!Array.isArray(markets) || markets.length === 0) {
                console.log(`    ⚠️  NOT FOUND in Gamma API — Oracle fallback will return isResolved=false`);
                continue;
            }

            const m = markets[0];
            console.log(`    Question: ${m.question || 'N/A'}`);
            console.log(`    Closed: ${m.closed} | Archived: ${m.archived} | Accepting orders: ${m.accepting_orders}`);
            console.log(`    UMA status: ${m.uma_resolution_status || 'N/A'} | Resolved: ${m.resolved}`);
            console.log(`    Outcome prices: ${m.outcomePrices || 'N/A'}`);
            console.log(`    Outcomes: ${m.outcomes || 'N/A'}`);

            // Determine if our code would detect resolution
            const isClosed = m.closed === true || m.archived === true;
            const umaResolved = m.uma_resolution_status === 'resolved';
            const notAccepting = m.accepting_orders === false;

            let priceResolved = false;
            if (m.outcomePrices) {
                try {
                    const prices = JSON.parse(m.outcomePrices);
                    const yes = parseFloat(prices[0]);
                    const no = parseFloat(prices[1]);
                    priceResolved = yes >= 0.95 || no >= 0.95;
                } catch { }
            }

            const wouldSettle = isClosed || umaResolved || (notAccepting && priceResolved);
            console.log(`    🎯 Would our code settle? ${wouldSettle ? '✅ YES' : '❌ NO'}`);
            if (!wouldSettle) {
                console.log(`       Reasons: closed=${isClosed}, umaResolved=${umaResolved}, notAccepting=${notAccepting}, priceResolved=${priceResolved}`);
            }
        } catch (e: any) {
            console.log(`    ❌ API error: ${e.message}`);
        }
    }

    process.exit(0);
}

diagnose().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
