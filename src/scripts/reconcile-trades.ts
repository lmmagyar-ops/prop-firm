/**
 * RECONCILIATION CHECK — Position Close Invariant Verifier
 * 
 * Detects orphaned CLOSED positions that don't have a linked SELL trade record.
 * This catches the exact bug class from the PnL Audit (Feb 13, 2026):
 * positions closed without trade records → invisible PnL in trade history.
 * 
 * INVARIANT: Every CLOSED position MUST have at least one SELL trade
 * with a matching positionId. Violations indicate a code path that
 * closes positions without recording the trade.
 * 
 * Exit codes:
 *   0 = All positions have linked SELL trades (healthy)
 *   1 = Orphaned positions found (action required)
 * 
 * Usage: npx tsx src/scripts/reconcile-trades.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '@/db';
import { positions, trades, challenges, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

async function reconcile() {
    console.log('\n🔍 ═══════════════════════════════════════════════');
    console.log('   RECONCILIATION CHECK — Position Close Invariant');
    console.log('   ═══════════════════════════════════════════════\n');

    // Query: find all CLOSED positions that lack a SELL trade with matching positionId
    const orphaned = await db.execute(sql`
        SELECT 
            p.id AS position_id,
            p.market_id,
            p.direction,
            p.shares,
            p.pnl,
            p.status,
            p.closed_at,
            p.challenge_id,
            c.user_id,
            u.email
        FROM positions p
        JOIN challenges c ON c.id = p.challenge_id
        JOIN users u ON u.id = c.user_id
        WHERE p.status = 'CLOSED'
        AND NOT EXISTS (
            SELECT 1 FROM trades t
            WHERE t.position_id = p.id
            AND t.type = 'SELL'
        )
        ORDER BY p.closed_at DESC
    `);

    const rows = orphaned.rows || orphaned;
    const count = Array.isArray(rows) ? rows.length : 0;

    if (count === 0) {
        console.log('  ✅ 0 orphaned positions found');
        console.log('  All CLOSED positions have linked SELL trade records.\n');

        // Print summary stats
        const totalClosed = await db.execute(sql`
            SELECT COUNT(*) as count FROM positions WHERE status = 'CLOSED'
        `);
        const totalSells = await db.execute(sql`
            SELECT COUNT(*) as count FROM trades WHERE type = 'SELL'
        `);
        const closedCount = (totalClosed.rows || totalClosed)[0]?.count || 0;
        const sellCount = (totalSells.rows || totalSells)[0]?.count || 0;
        console.log(`  📊 Total CLOSED positions: ${closedCount}`);
        console.log(`  📊 Total SELL trades: ${sellCount}`);
        console.log('\n═══════════════════════════════════════════════');
        console.log('   RESULT: HEALTHY — No violations detected');
        console.log('═══════════════════════════════════════════════\n');
        process.exit(0);
    }

    console.log(`  🔴 ${count} ORPHANED POSITIONS FOUND:\n`);
    for (const row of (rows as Record<string, unknown>[])) {
        console.log(`  Position: ${String(row.position_id).slice(0, 8)}...`);
        console.log(`    User:      ${row.email}`);
        console.log(`    Market:    ${String(row.market_id).slice(0, 30)}...`);
        console.log(`    Direction: ${row.direction}`);
        console.log(`    Shares:    ${row.shares}`);
        console.log(`    PnL:       $${row.pnl || 'null'}`);
        console.log(`    Closed:    ${row.closed_at}`);
        console.log('');
    }

    console.log('═══════════════════════════════════════════════');
    console.log(`   RESULT: ${count} VIOLATIONS — Action required`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n  Root cause: A code path closed these positions without');
    console.log('  creating SELL trade records. Check the 4 closure paths:');
    console.log('    1. Manual SELL (trade.ts)');
    console.log('    2. Market settlement (settlement.ts)');
    console.log('    3. Breach/pass liquidation (risk-monitor.ts)');
    console.log('    4. Funded transition (evaluator.ts)\n');

    process.exit(1);
}

reconcile().catch(err => {
    console.error('💥 Reconciliation failed:', err);
    process.exit(1);
});
