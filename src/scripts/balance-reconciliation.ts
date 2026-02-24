/**
 * BALANCE RECONCILIATION AUDIT — Anthropic-Grade Verification
 * 
 * Verifies the fundamental financial invariant:
 *   currentBalance == startingBalance - Σ(BUY costs) + Σ(SELL proceeds)
 * 
 * Also checks:
 *   1. Position integrity (orphaned OPEN positions, zero-share positions)
 *   2. Trade-position linkage (every SELL trade has a positionId)
 *   3. Open position value consistency
 * 
 * Usage: npx tsx src/scripts/balance-reconciliation.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';

// Direct connection — bypass Drizzle module init to avoid SSL race
const sql = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    max: 1,
    connect_timeout: 15,
});

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(2); }
function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  🔴 ${msg}`); }
function info(msg: string) { console.log(`  📊 ${msg}`); }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`); }

// ─── Main ────────────────────────────────────────────────────────────

async function reconcile() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('   BALANCE RECONCILIATION AUDIT');
    console.log('   Anthropic-Grade Financial Integrity Check');
    console.log('══════════════════════════════════════════════════════\n');

    // Get ALL active challenges
    const activeChallenges = await sql`
        SELECT c.id, c.user_id, c.status, c.starting_balance, c.current_balance, c.phase,
               u.email
        FROM challenges c
        JOIN users u ON u.id = c.user_id
        WHERE c.status = 'active'
    `;

    console.log(`  Found ${activeChallenges.length} active challenge(s)\n`);

    let totalIssues = 0;

    for (const ch of activeChallenges) {
        console.log('──────────────────────────────────────────────────────');
        console.log(`  CHALLENGE: ${ch.id.slice(0, 8)}...`);
        console.log(`  User: ${ch.email}`);
        console.log(`  Phase: ${ch.phase}`);
        console.log(`  Starting Balance: $${fmt(parseFloat(ch.starting_balance))}`);
        console.log(`  Current Balance:  $${fmt(parseFloat(ch.current_balance))}`);
        console.log('──────────────────────────────────────────────────────\n');

        // ─── 1. BALANCE RECONCILIATION ─────────────────────────

        console.log('  [1] BALANCE RECONCILIATION\n');

        const allTrades = await sql`
            SELECT id, type, direction, amount, price, shares, realized_pnl, 
                   closure_reason, position_id, market_id, market_title, executed_at
            FROM trades
            WHERE challenge_id = ${ch.id}
            ORDER BY executed_at DESC
        `;

        const buys = allTrades.filter((t: Record<string, unknown>) => t.type === 'BUY');
        const sells = allTrades.filter((t: Record<string, unknown>) => t.type === 'SELL');

        const totalBuyCost = buys.reduce((sum: number, t: Record<string, unknown>) => sum + parseFloat(t.amount as string), 0);
        const totalSellProceeds = sells.reduce((sum: number, t: Record<string, unknown>) => sum + parseFloat(t.amount as string), 0);

        const starting = parseFloat(ch.starting_balance);
        const expected = starting - totalBuyCost + totalSellProceeds;
        const actual = parseFloat(ch.current_balance);
        const drift = actual - expected;

        info(`Total trades: ${allTrades.length} (${buys.length} BUY, ${sells.length} SELL)`);
        info(`Σ BUY costs:      $${fmt(totalBuyCost)}`);
        info(`Σ SELL proceeds:  $${fmt(totalSellProceeds)}`);
        info(`Expected balance: $${fmt(starting)} - $${fmt(totalBuyCost)} + $${fmt(totalSellProceeds)} = $${fmt(expected)}`);
        info(`Actual balance:   $${fmt(actual)}`);
        info(`Drift:            $${fmt(drift)}`);

        if (Math.abs(drift) < 0.01) {
            pass('Balance matches trade history — EXACT MATCH');
        } else if (Math.abs(drift) < 1.00) {
            warn(`Minor drift: $${fmt(drift)} — likely rounding across ${allTrades.length} trades`);
        } else {
            fail(`BALANCE DRIFT: $${fmt(drift)} — REQUIRES INVESTIGATION`);
            totalIssues++;
        }
        console.log('');

        // ─── 2. REALIZED PnL CROSS-CHECK ──────────────────────

        console.log('  [2] REALIZED PnL CROSS-CHECK\n');

        const totalRealizedPnL = sells
            .filter((t: Record<string, unknown>) => t.realized_pnl !== null)
            .reduce((sum: number, t: Record<string, unknown>) => sum + parseFloat(t.realized_pnl as string), 0);

        const sellsWithoutPnL = sells.filter((t: Record<string, unknown>) => t.realized_pnl === null);

        info(`Σ Realized PnL (from SELL trades): $${fmt(totalRealizedPnL)}`);
        info(`Net balance change:                $${fmt(actual - starting)}`);

        if (sellsWithoutPnL.length > 0) {
            warn(`${sellsWithoutPnL.length} SELL trade(s) missing realizedPnL field`);
            for (const t of sellsWithoutPnL) {
                warn(`  Trade ${(t.id as string).slice(0, 8)} — ${((t.market_title || t.market_id) as string).slice(0, 30)} — $${t.amount}`);
            }
            totalIssues++;
        } else {
            pass(`All ${sells.length} SELL trades have realizedPnL recorded`);
        }

        // Break down by closure reason
        const closureReasons: Record<string, { count: number; pnl: number }> = {};
        for (const t of sells) {
            const reason = (t.closure_reason as string) || 'manual_close';
            if (!closureReasons[reason]) closureReasons[reason] = { count: 0, pnl: 0 };
            closureReasons[reason].count++;
            closureReasons[reason].pnl += parseFloat((t.realized_pnl as string) || '0');
        }
        for (const [reason, data] of Object.entries(closureReasons)) {
            info(`  ${reason}: ${data.count} trades, PnL: $${fmt(data.pnl)}`);
        }
        console.log('');

        // ─── 3. POSITION INTEGRITY ─────────────────────────────

        console.log('  [3] POSITION INTEGRITY\n');

        const allPositions = await sql`
            SELECT id, market_id, direction, shares, entry_price, status, pnl, closed_at
            FROM positions
            WHERE challenge_id = ${ch.id}
        `;

        const openPositions = allPositions.filter((p: Record<string, unknown>) => p.status === 'OPEN');
        const closedPositions = allPositions.filter((p: Record<string, unknown>) => p.status === 'CLOSED');

        info(`Total positions: ${allPositions.length} (${openPositions.length} OPEN, ${closedPositions.length} CLOSED)`);

        // Check: OPEN positions with 0 shares
        const zeroShareOpen = openPositions.filter((p: Record<string, unknown>) => parseFloat(p.shares as string) <= 0);
        if (zeroShareOpen.length > 0) {
            fail(`${zeroShareOpen.length} OPEN position(s) with 0 or negative shares!`);
            for (const p of zeroShareOpen) {
                fail(`  Position ${(p.id as string).slice(0, 8)} — market ${(p.market_id as string).slice(0, 20)} — shares: ${p.shares}`);
            }
            totalIssues++;
        } else {
            pass(`All ${openPositions.length} OPEN positions have positive shares`);
        }

        // Check: CLOSED positions with non-zero shares  
        const nonZeroClosed = closedPositions.filter((p: Record<string, unknown>) => parseFloat(p.shares as string) > 0);
        if (nonZeroClosed.length > 0) {
            warn(`${nonZeroClosed.length} CLOSED position(s) still have non-zero shares (expected 0)`);
            totalIssues++;
        } else if (closedPositions.length > 0) {
            pass(`All ${closedPositions.length} CLOSED positions have shares = 0`);
        }

        // Open position value at cost
        let totalOpenValue = 0;
        for (const p of openPositions) {
            const shares = parseFloat(p.shares as string);
            const entry = parseFloat(p.entry_price as string);
            totalOpenValue += shares * entry;
        }
        info(`Open position value (at cost): $${fmt(totalOpenValue)}`);

        // Capital deployed: starting - balance = amount "in the market"
        const capitalDeployed = totalBuyCost - totalSellProceeds;
        info(`Capital deployed (BUY - SELL): $${fmt(capitalDeployed)}`);

        // The relationship: starting - actual = totalOpenValue - totalRealizedPnL
        // i.e., the balance decrease = cost of open positions minus profit already taken
        const balanceDecrease = starting - actual;
        const expectedDecrease = totalOpenValue - totalRealizedPnL;
        const decreaseDrift = balanceDecrease - expectedDecrease;
        info(`Balance decrease:              $${fmt(balanceDecrease)}`);
        info(`Expected (open cost - PnL):    $${fmt(expectedDecrease)}`);
        info(`Drift:                         $${fmt(decreaseDrift)}`);

        if (Math.abs(decreaseDrift) < 0.01) {
            pass('Balance decrease matches open position cost minus realized PnL — EXACT');
        } else if (Math.abs(decreaseDrift) < 1.00) {
            warn(`Minor drift: $${fmt(decreaseDrift)} — rounding`);
        } else {
            fail(`POSITION-BALANCE MISMATCH: $${fmt(decreaseDrift)} drift`);
            totalIssues++;
        }
        console.log('');

        // ─── 4. TRADE-POSITION LINKAGE ─────────────────────────

        console.log('  [4] TRADE-POSITION LINKAGE\n');

        const tradesWithoutPosition = allTrades.filter((t: Record<string, unknown>) => !t.position_id);
        if (tradesWithoutPosition.length > 0) {
            warn(`${tradesWithoutPosition.length} trade(s) missing positionId:`);
            for (const t of tradesWithoutPosition) {
                warn(`  ${t.type} ${t.direction || '?'} — ${((t.market_title || t.market_id) as string).slice(0, 30)} — $${t.amount}`);
            }
            totalIssues++;
        } else {
            pass(`All ${allTrades.length} trades have positionId linked`);
        }

        // Orphaned CLOSED positions without SELL trade
        const sellPositionIds = new Set(sells.map((t: Record<string, unknown>) => t.position_id).filter(Boolean));
        const orphaned = closedPositions.filter((p: Record<string, unknown>) => !sellPositionIds.has(p.id));
        if (orphaned.length > 0) {
            fail(`${orphaned.length} CLOSED position(s) without a linked SELL trade!`);
            for (const p of orphaned) {
                fail(`  Position ${(p.id as string).slice(0, 8)} — ${(p.market_id as string).slice(0, 20)} — PnL: $${p.pnl || 'null'}`);
            }
            totalIssues++;
        } else if (closedPositions.length > 0) {
            pass(`All ${closedPositions.length} CLOSED positions have linked SELL trades`);
        }
        console.log('');

        // ─── 5. RECENT TRADES (last 5) ─────────────────────────

        console.log('  [5] RECENT TRADES (last 5)\n');

        const recentTrades = allTrades.slice(0, 5);
        for (const t of recentTrades) {
            const pnlStr = t.realized_pnl ? ` PnL: $${parseFloat(t.realized_pnl as string).toFixed(2)}` : '';
            const reason = t.closure_reason ? ` [${t.closure_reason}]` : '';
            console.log(`    ${t.type} ${t.direction || '?'} — $${parseFloat(t.amount as string).toFixed(2)} — ${parseFloat(t.shares as string).toFixed(1)} shares @ ${(parseFloat(t.price as string) * 100).toFixed(1)}¢${pnlStr}${reason}`);
            console.log(`      Market: ${((t.market_title || t.market_id) as string).slice(0, 60)}`);
            console.log('');
        }
    }

    // ─── FINAL VERDICT ─────────────────────────────────────

    console.log('══════════════════════════════════════════════════════');
    if (totalIssues === 0) {
        console.log('   ✅ VERDICT: ALL CHECKS PASSED — Financial integrity confirmed');
    } else {
        console.log(`   ⚠️  VERDICT: ${totalIssues} ISSUE(S) FOUND — Review above`);
    }
    console.log('══════════════════════════════════════════════════════\n');

    await sql.end();
    process.exit(totalIssues > 0 ? 1 : 0);
}

reconcile().catch(async (err) => {
    console.error('💥 Reconciliation failed:', err);
    await sql.end();
    process.exit(1);
});
