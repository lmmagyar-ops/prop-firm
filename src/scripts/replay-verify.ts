/**
 * INDEPENDENT REPLAY VERIFICATION
 * Second-opinion check: replays trades chronologically to derive balance
 * instead of using the sum-based approach from the main audit.
 * 
 * Usage: npx tsx src/scripts/replay-verify.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    max: 1,
    connect_timeout: 15,
});

async function replay() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   INDEPENDENT REPLAY VERIFICATION');
    console.log('   (Chronological balance replay — different algorithm)');
    console.log('═══════════════════════════════════════════════════\n');

    const challenges = await sql`
        SELECT c.id, c.starting_balance, c.current_balance, c.phase, u.email
        FROM challenges c JOIN users u ON u.id = c.user_id
        WHERE c.status = 'active'
    `;

    let allGood = true;

    for (const ch of challenges) {
        const allTrades = await sql`
            SELECT type, amount, executed_at
            FROM trades WHERE challenge_id = ${ch.id}
            ORDER BY executed_at ASC
        `;

        // REPLAY: Start at startingBalance, apply each trade chronologically
        let balance = parseFloat(ch.starting_balance);

        for (const t of allTrades) {
            const amt = parseFloat(t.amount as string);
            if (t.type === 'BUY') {
                balance -= amt;
            } else if (t.type === 'SELL') {
                balance += amt;
            }
        }

        const expected = balance;
        const actual = parseFloat(ch.current_balance);
        const drift = Math.abs(expected - actual);
        const ok = drift < 0.01;

        console.log(`  ${ch.email} (${ch.phase})`);
        console.log(`    Trades replayed: ${allTrades.length}`);
        console.log(`    Replayed balance: $${expected.toFixed(2)}`);
        console.log(`    DB balance:       $${actual.toFixed(2)}`);
        console.log(`    Drift:            $${drift.toFixed(4)}`);
        console.log(`    ${ok ? '✅ MATCH' : '🔴 MISMATCH'}\n`);
        if (!ok) allGood = false;

        // SECOND INVARIANT: balance + openCost - realizedPnL == startingBalance
        const openPos = await sql`
            SELECT shares, entry_price FROM positions
            WHERE challenge_id = ${ch.id} AND status = 'OPEN'
        `;
        const openCost = openPos.reduce((s: number, p: Record<string, unknown>) =>
            s + parseFloat(p.shares as string) * parseFloat(p.entry_price as string), 0);

        const sellTrades = await sql`
            SELECT realized_pnl FROM trades
            WHERE challenge_id = ${ch.id} AND type = 'SELL'
        `;
        const realizedPnL = sellTrades.reduce((s: number, t: Record<string, unknown>) =>
            s + parseFloat((t.realized_pnl as string) || '0'), 0);

        const invariant = actual + openCost - realizedPnL;
        const startBal = parseFloat(ch.starting_balance);
        const invDrift = Math.abs(invariant - startBal);

        console.log(`    Invariant: balance + openCost - PnL = $${invariant.toFixed(2)} (expected $${startBal.toFixed(2)})`);
        console.log(`    ${invDrift < 0.01 ? '✅ INVARIANT HOLDS' : '🔴 INVARIANT BROKEN: drift $' + invDrift.toFixed(4)}\n`);
        if (invDrift >= 0.01) allGood = false;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log(`   ${allGood ? '✅ REPLAY CONFIRMS: Original audit results are correct' : '🔴 REPLAY FOUND DISCREPANCIES'}`);
    console.log('═══════════════════════════════════════════════════\n');

    await sql.end();
    process.exit(allGood ? 0 : 1);
}

replay().catch(async (e) => {
    console.error('💥 Replay failed:', e);
    await sql.end();
    process.exit(1);
});
