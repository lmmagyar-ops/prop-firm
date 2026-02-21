/**
 * POST-DEPLOY VERIFICATION — Production Health Gate
 * 
 * Catches the 3 failure modes that keep recurring:
 * 1. Deploy version mismatch — cron running old code (Feb 21)
 * 2. Sentry dead — SDK never initialized (Feb 7-16)
 * 3. Silent data corruption — startOfDayEquity null (Feb 21)
 * 
 * Also checks: DB connectivity, worker heartbeat, page serving.
 * 
 * Usage:
 *   npm run test:deploy -- https://prop-firmx.vercel.app
 *   npm run test:deploy -- https://prop-firmx.vercel.app e847d25
 * 
 * CRON_SECRET is loaded from .env for the health endpoint auth.
 */

import * as dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.argv[2];
const EXPECTED_SHA = process.argv[3]; // Optional: verify deployed version

if (!BASE_URL) {
    console.error('❌ Usage: npm run test:deploy -- https://your-app.vercel.app [expected-sha]');
    process.exit(1);
}

const CRON_SECRET = process.env.CRON_SECRET;
let pass = 0;
let fail = 0;

function assert(condition: boolean, msg: string) {
    if (condition) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.error(`  ❌ FAILED: ${msg}`); }
}

interface TimedResponse {
    ok: boolean;
    status: number;
    body: string;
    json?: Record<string, unknown>;
    ms: number;
}

async function timedFetch(path: string, withAuth = false): Promise<TimedResponse> {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    const headers: Record<string, string> = { 'User-Agent': 'PropFirm-DeployVerify/2.0' };
    if (withAuth && CRON_SECRET) {
        headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    try {
        const res = await fetch(url, { headers, redirect: 'follow' });
        const body = await res.text();
        const ms = Date.now() - start;

        let json: Record<string, unknown> | undefined;
        try { json = JSON.parse(body); } catch { /* not JSON */ }

        return { ok: res.ok, status: res.status, body, json, ms };
    } catch (err) {
        return { ok: false, status: 0, body: String(err), ms: Date.now() - start };
    }
}

async function main() {
    console.log(`
🚀 ═══════════════════════════════════════════════
   POST-DEPLOY VERIFICATION
   Target: ${BASE_URL}
   Expected SHA: ${EXPECTED_SHA || '(not specified)'}
   Auth: ${CRON_SECRET ? 'CRON_SECRET loaded' : '⚠️  No CRON_SECRET — health checks will be limited'}
   ═══════════════════════════════════════════════
`);

    // ── CHECK 1: Homepage serves ──
    console.log('📄 Check 1: Homepage');
    const home = await timedFetch('/');
    assert(home.ok, `GET / → ${home.status} (expected 200)`);
    assert(home.ms < 5000, `Response time: ${home.ms}ms (< 5000ms)`);

    // ── CHECK 2: Login page serves ──
    console.log('\n🔐 Check 2: Login Page');
    const login = await timedFetch('/login');
    assert(login.ok, `GET /login → ${login.status} (expected 200)`);

    // ── CHECK 3: Deep Health (requires CRON_SECRET) ──
    console.log('\n🔬 Check 3: Deep Health');
    const health = await timedFetch('/api/system/health', true);

    if (health.status === 401) {
        console.log('  ⚠️  Skipped — CRON_SECRET not set or incorrect');
    } else if (!health.ok) {
        assert(false, `GET /api/system/health → ${health.status} (expected 200)`);
    } else if (health.json) {
        const checks = health.json.checks as Record<string, unknown> | undefined;
        const version = health.json.version as string | null;

        // 3a: Version match
        if (EXPECTED_SHA && version) {
            assert(
                version === EXPECTED_SHA.slice(0, 7),
                `Deployed version: ${version} (expected: ${EXPECTED_SHA.slice(0, 7)})`
            );
        } else if (version) {
            console.log(`  ℹ️  Deployed version: ${version} (no expected SHA specified)`);
        } else {
            console.log('  ⚠️  Version: not available (local/non-Vercel deploy)');
        }

        if (checks) {
            // 3b: Database
            assert(checks.database === true, `Database: connected`);

            // 3c: Sentry
            assert(checks.sentry === true, `Sentry: SDK initialized`);

            // 3d: Worker heartbeat
            const heartbeat = checks.workerHeartbeat as { alive: boolean; ageSeconds: number | null } | undefined;
            if (heartbeat) {
                assert(heartbeat.alive, `Worker heartbeat: alive (${heartbeat.ageSeconds}s ago)`);
            } else {
                assert(false, `Worker heartbeat: data missing`);
            }

            // 3e: Daily reset integrity
            const daily = checks.dailyReset as { allEquityPopulated: boolean; nullCount: number; activeAccounts: number } | undefined;
            if (daily) {
                assert(
                    daily.allEquityPopulated,
                    `startOfDayEquity: ${daily.nullCount === 0 ? 'all populated' : `${daily.nullCount}/${daily.activeAccounts} NULL`}`
                );
            } else {
                assert(false, `Daily reset data: missing`);
            }
        }
    }

    // ── CHECK 4: Cron Status API ──
    console.log('\n📊 Check 4: Cron Status');
    const status = await timedFetch('/api/cron/status');
    assert(status.ok, `GET /api/cron/status → ${status.status} (expected 200)`);
    if (status.json) {
        assert(status.json.status === 'healthy', `Cron status: '${status.json.status}' (expected 'healthy')`);
    }

    // ── CHECK 5: System Status ──
    console.log('\n🔧 Check 5: System Status');
    const sysStatus = await timedFetch('/api/system/status');
    assert(sysStatus.ok, `GET /api/system/status → ${sysStatus.status} (expected 200)`);

    // ── RESULTS ──
    console.log(`
═══════════════════════════════════════════════
   RESULTS: ${pass} passed, ${fail} failed
═══════════════════════════════════════════════
`);

    if (fail > 0) {
        console.log('🔴 DEPLOY VERIFICATION FAILED — INVESTIGATE BEFORE PROCEEDING\n');
    } else {
        console.log('🟢 ALL DEPLOY CHECKS PASSED — PRODUCTION IS HEALTHY\n');
    }

    process.exit(fail > 0 ? 1 : 0);
}

main();
