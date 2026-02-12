/**
 * PRE-HANDOFF SMOKE TEST — "Will Mat Hit a Bug?"
 * 
 * Mints a valid NextAuth session token using AUTH_SECRET and the DB,
 * then verifies every API endpoint that dashboard components call
 * returns real data — not empty arrays, not $0.00 balances, not 429s.
 * 
 * This catches the entire class of bugs Mat has historically hit:
 *   - "No trades yet" when trades exist (empty array from 429)
 *   - "$0.00" balance when balance is non-zero (swallowed error)
 *   - Empty portfolio dropdown (positions fetch failed silently)
 * 
 * Usage:
 *   npm run test:handoff -- https://prop-firmx.vercel.app
 * 
 * Requires:
 *   - .env.local with DATABASE_URL (to look up the user)
 *   - AUTH_SECRET env var matching the production deployment
 *     (set via: AUTH_SECRET=prod-secret npm run test:handoff -- URL)
 *     If not set, falls back to .env.local AUTH_SECRET (works for local dev)
 * 
 * Read-only — no trades, no mutations, no DB writes.
 */

import { db } from '@/db';
import { users, challenges, trades, positions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { encode } from '@auth/core/jwt';

const BASE_URL = process.argv[2];
const HANDOFF_EMAIL = process.env.HANDOFF_EMAIL || 'l.m.magyar@gmail.com';

if (!BASE_URL) {
    console.error('❌ Usage: npm run test:handoff -- https://your-app.vercel.app');
    process.exit(1);
}

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
    console.error('❌ AUTH_SECRET not set. Pass it as an env var or ensure .env.local has it.');
    console.error('   AUTH_SECRET=your-prod-secret npm run test:handoff -- URL');
    process.exit(1);
}

// ── Test Infrastructure ─────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const warnings: string[] = [];

function assert(condition: boolean, msg: string) {
    if (condition) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.error(`  ❌ FAILED: ${msg}`); }
}

function warn(msg: string) {
    warnings.push(msg);
    console.log(`  ⚠️  ${msg}`);
}

interface TimedResponse {
    ok: boolean;
    status: number;
    body: string;
    json?: Record<string, unknown>;
    ms: number;
}

let sessionCookie = '';

async function authedFetch(path: string): Promise<TimedResponse> {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'PropFirm-HandoffSmoke/1.0',
                'Cookie': sessionCookie,
            },
            redirect: 'manual',
        });

        const body = await res.text();
        const ms = Date.now() - start;

        let json: Record<string, unknown> | undefined;
        try { json = JSON.parse(body); } catch { /* not JSON */ }

        return { ok: res.ok, status: res.status, body, json, ms };
    } catch (err) {
        return { ok: false, status: 0, body: String(err), ms: Date.now() - start };
    }
}

// ── Main Test ───────────────────────────────────────────────────────────────

async function main() {
    console.log(`
🧪 ═══════════════════════════════════════════════
   PRE-HANDOFF SMOKE TEST
   "Will Mat hit a bug?"
   Target: ${BASE_URL}
   User:   ${HANDOFF_EMAIL}
   ═══════════════════════════════════════════════
`);

    // ── PHASE 0: Look up user in DB ──
    console.log('🔍 Phase 0: User lookup');
    const [user] = await db.select().from(users).where(eq(users.email, HANDOFF_EMAIL)).limit(1);

    if (!user) {
        console.error(`  ❌ User ${HANDOFF_EMAIL} not found in database`);
        process.exit(1);
    }
    console.log(`  ✅ Found user: ${user.name} (${user.id.slice(0, 8)}...)`);

    // ── PHASE 0b: Mint JWT session token ──
    console.log('\n🔐 Phase 0b: Minting session token');

    // NextAuth v5 uses the cookie name as the JWT salt
    // In production (HTTPS), the cookie name is "__Secure-authjs.session-token"
    // In development (HTTP), it's "authjs.session-token"
    const isSecure = BASE_URL.startsWith('https');
    const cookieName = isSecure
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token';

    const token = await encode({
        token: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            sub: user.id,
        },
        secret: AUTH_SECRET,
        salt: cookieName,
        maxAge: 60 * 60, // 1 hour is plenty for a smoke test
    });

    sessionCookie = `${cookieName}=${token}`;
    console.log(`  ✅ Token minted (${token.length} chars, cookie: ${cookieName})`);

    // Verify the token works
    const sessionRes = await authedFetch('/api/auth/session');
    if (sessionRes.json?.user) {
        const sessionUser = sessionRes.json.user as Record<string, unknown>;
        assert(true, `Session valid — server sees: ${sessionUser.email}`);
    } else {
        console.error(`  ❌ Session token not accepted by server`);
        console.error(`     This usually means AUTH_SECRET doesn't match production.`);
        console.error(`     Grab it from Vercel: vercel env pull .env.production`);
        console.error(`     Then: AUTH_SECRET=$(grep AUTH_SECRET .env.production | cut -d= -f2) npm run test:handoff -- ${BASE_URL}`);
        process.exit(1);
    }

    // ── PHASE 1: DB Data Presence ──
    console.log('\n📦 Phase 1: DB data presence (does the user have data?)');

    const userChallenges = await db.select().from(challenges)
        .where(eq(challenges.userId, user.id));
    assert(userChallenges.length > 0, `${userChallenges.length} challenge(s) in DB`);

    const activeChallenge = userChallenges.find(c => c.status === 'active');
    if (activeChallenge) {
        console.log(`     Active: ${activeChallenge.id.slice(0, 8)}... | $${activeChallenge.currentBalance}`);
    } else {
        warn('No active challenge — some API checks may return empty data');
    }

    const challengeId = activeChallenge?.id || userChallenges[0]?.id;

    if (challengeId) {
        const userTrades = await db.select().from(trades)
            .where(eq(trades.challengeId, challengeId))
            .limit(5);
        assert(userTrades.length > 0, `${userTrades.length}+ trade(s) in DB for this challenge`);

        const userPositions = await db.select().from(positions)
            .where(eq(positions.challengeId, challengeId));
        console.log(`     ${userPositions.filter(p => p.status === 'OPEN').length} open positions, ${userPositions.filter(p => p.status === 'CLOSED').length} closed`);
    }

    // ── PHASE 2: Authenticated API Checks ──
    console.log('\n🌐 Phase 2: Authenticated API checks (what Mat actually sees)');

    // CHECK 1: Challenges API (TopNavActions)
    console.log('\n  📋 Check 1: Challenges API (TopNavActions)');
    const challengesRes = await authedFetch('/api/challenges');
    assert(challengesRes.ok, `GET /api/challenges → ${challengesRes.status}`);
    assert(challengesRes.ms < 5000, `Response time: ${challengesRes.ms}ms`);
    assert(challengesRes.status !== 429, `Not rate limited`);

    if (challengesRes.json) {
        const apiChallenges = challengesRes.json.challenges as unknown[] | undefined
            || (Array.isArray(challengesRes.json) ? challengesRes.json : undefined);
        if (apiChallenges) {
            assert(apiChallenges.length > 0, `API returns ${apiChallenges.length} challenge(s) (DB has ${userChallenges.length})`);
        } else {
            assert(false, 'challenges field present in response');
        }
    }

    // CHECK 2: Balance API (PortfolioPanel)
    console.log('\n  💰 Check 2: Balance API (PortfolioPanel)');
    const balanceRes = await authedFetch('/api/user/balance');
    assert(balanceRes.ok, `GET /api/user/balance → ${balanceRes.status}`);
    assert(balanceRes.ms < 5000, `Response time: ${balanceRes.ms}ms`);
    assert(balanceRes.status !== 429, `Not rate limited`);

    if (balanceRes.json) {
        const bal = balanceRes.json.balance ?? balanceRes.json.currentBalance;
        if (bal !== undefined) {
            const balNum = parseFloat(String(bal));
            assert(!isNaN(balNum), `Balance: $${balNum.toFixed(2)}`);
            if (activeChallenge) {
                const dbBal = parseFloat(activeChallenge.currentBalance);
                assert(
                    Math.abs(balNum - dbBal) < 0.01,
                    `API balance ($${balNum.toFixed(2)}) matches DB ($${dbBal.toFixed(2)})`
                );
            }
        } else {
            assert(false, 'balance field present');
        }
    }

    // CHECK 3: Positions API (PortfolioPanel / PositionsTable / PortfolioDropdown)
    console.log('\n  📊 Check 3: Positions API (PortfolioPanel)');
    const positionsRes = await authedFetch('/api/trade/positions');
    assert(positionsRes.ok, `GET /api/trade/positions → ${positionsRes.status}`);
    assert(positionsRes.ms < 5000, `Response time: ${positionsRes.ms}ms`);
    assert(positionsRes.status !== 429, `Not rate limited`);

    if (positionsRes.json) {
        const apiPositions = positionsRes.json.positions as unknown[] | undefined
            || (Array.isArray(positionsRes.json) ? positionsRes.json : undefined);
        if (apiPositions) {
            assert(true, `Positions: ${apiPositions.length} returned`);
        } else {
            assert(false, 'positions field is an array');
        }
    }

    // CHECK 4: Trade History (TradeHistoryTable / RecentTradesWidget)
    console.log('\n  📜 Check 4: Trade History API (TradeHistoryTable)');
    const histParams = new URLSearchParams({ limit: '10' });
    if (challengeId) histParams.set('challengeId', challengeId);
    const historyRes = await authedFetch(`/api/trades/history?${histParams}`);
    assert(historyRes.ok, `GET /api/trades/history → ${historyRes.status}`);
    assert(historyRes.ms < 5000, `Response time: ${historyRes.ms}ms`);
    assert(historyRes.status !== 429, `Not rate limited`);

    if (historyRes.json) {
        const apiTrades = historyRes.json.trades as unknown[] | undefined;
        if (apiTrades) {
            assert(apiTrades.length > 0, `API returns ${apiTrades.length} trade(s)`);
        } else {
            assert(false, 'trades field is an array');
        }
    }

    // CHECK 5: Live Stats (LiveStatsBar)
    console.log('\n  📈 Check 5: Live Stats API');
    const statsRes = await authedFetch('/api/stats/live');
    assert(statsRes.status !== 500, `GET /api/stats/live → ${statsRes.status} (not 500)`);
    assert(statsRes.ms < 5000, `Response time: ${statsRes.ms}ms`);

    // CHECK 7: Dashboard renders
    console.log('\n  🖥️  Check 6: Dashboard page renders');
    const dashRes = await authedFetch('/dashboard');
    if (dashRes.status === 200) {
        assert(true, `GET /dashboard → 200`);
    } else if (dashRes.status === 302 || dashRes.status === 307) {
        const location = dashRes.body.includes('login') ? 'login' : 'other';
        assert(location !== 'login', `GET /dashboard → ${dashRes.status} (redirect to ${location})`);
    } else {
        assert(false, `GET /dashboard → ${dashRes.status} (expected 200)`);
    }

    // ── RESULTS ──
    console.log(`
═══════════════════════════════════════════════
   RESULTS: ${pass} passed, ${fail} failed${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ''}
═══════════════════════════════════════════════
`);

    if (warnings.length > 0) {
        console.log('⚠️  Warnings:');
        warnings.forEach(w => console.log(`   • ${w}`));
        console.log('');
    }

    if (fail > 0) {
        console.log('🔴 HANDOFF SMOKE FAILED — DO NOT HAND OFF TO MAT\n');
    } else {
        console.log('🟢 ALL CHECKS PASSED — SAFE TO HAND OFF\n');
    }

    process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('💥 Unhandled error:', err);
    process.exit(1);
});
