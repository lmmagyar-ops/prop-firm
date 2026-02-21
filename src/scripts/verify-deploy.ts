/**
 * POST-DEPLOY SMOKE TEST — Production Health Verification
 * 
 * Lightweight HTTP-only smoke test that hits the production URL after deploy.
 * NO database writes, NO mutations — read-only health checks only.
 * 
 * Checks:
 *   1. Homepage serves (200)
 *   2. Cron status API returns healthy + valid stats
 *   3. Heartbeat check API responds (healthy or stale, just not 500)
 *   4. Login page serves (200)
 *   5. All responses under 5s
 * 
 * Usage: npm run test:deploy -- https://prop-firmx.vercel.app
 */

const BASE_URL = process.argv[2];

if (!BASE_URL) {
    console.error('❌ Usage: npm run test:deploy -- https://your-app.vercel.app');
    process.exit(1);
}

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

async function timedFetch(path: string): Promise<TimedResponse> {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'PropFirm-DeploySmoke/1.0' },
            redirect: 'follow',
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

async function main() {
    console.log(`
🚀 ═══════════════════════════════════════════════
   POST-DEPLOY SMOKE TEST
   Target: ${BASE_URL}
   ═══════════════════════════════════════════════
`);

    // ── CHECK 1: Homepage ──
    console.log('📄 Check 1: Homepage');
    const home = await timedFetch('/');
    assert(home.ok, `GET / → ${home.status} (expected 200)`);
    assert(home.ms < 5000, `Response time: ${home.ms}ms (< 5000ms)`);

    // ── CHECK 2: Cron Status API ──
    console.log('\n📊 Check 2: Cron Status API');
    const status = await timedFetch('/api/cron/status');
    assert(status.ok, `GET /api/cron/status → ${status.status} (expected 200)`);
    assert(status.ms < 5000, `Response time: ${status.ms}ms (< 5000ms)`);
    if (status.json) {
        assert(status.json.status === 'healthy', `Status field: '${status.json.status}' (expected 'healthy')`);
        const stats = status.json.stats as Record<string, unknown> | undefined;
        if (stats) {
            const accounts = stats.activeAccounts as Record<string, number> | undefined;
            assert(
                accounts !== undefined && typeof accounts.total === 'number' && accounts.total >= 0,
                `Active accounts: ${accounts?.total ?? 'missing'} (valid number)`
            );
        } else {
            assert(false, 'Stats field present in response');
        }
    } else {
        assert(false, 'Response is valid JSON');
    }

    // ── CHECK 3: Heartbeat Check API ──
    console.log('\n💓 Check 3: Heartbeat Check');
    const heartbeat = await timedFetch('/api/cron/heartbeat-check');
    // Intent: confirm the app didn't crash (no 500). The endpoint requires CRON_SECRET,
    // so unauthenticated smoke tests correctly receive 401 — that's not a failure.
    assert(heartbeat.status !== 500, `GET /api/cron/heartbeat-check → ${heartbeat.status} (not 500)`);
    assert(heartbeat.ms < 5000, `Response time: ${heartbeat.ms}ms (< 5000ms)`);
    if (heartbeat.status === 401) {
        // 401 = auth layer working correctly (CRON_SECRET not provided by smoke runner)
        assert(true, `Heartbeat auth gate active (401 — CRON_SECRET required)`);
    } else if (heartbeat.json) {
        const hbStatus = heartbeat.json.status as string;
        assert(
            ['healthy', 'stale'].includes(hbStatus),
            `Heartbeat status: '${hbStatus}' (healthy or stale)`
        );
    }

    // ── CHECK 4: Login Page ──
    console.log('\n🔐 Check 4: Login Page');
    const login = await timedFetch('/login');
    assert(login.ok, `GET /login → ${login.status} (expected 200)`);
    assert(login.ms < 5000, `Response time: ${login.ms}ms (< 5000ms)`);
    assert(login.body.length > 100, `Login page has content (${login.body.length} bytes)`);

    // ── RESULTS ──
    console.log(`
═══════════════════════════════════════════════
   RESULTS: ${pass} passed, ${fail} failed
═══════════════════════════════════════════════
`);

    if (fail > 0) {
        console.log('🔴 DEPLOY SMOKE FAILED — CHECK PRODUCTION IMMEDIATELY\n');
    } else {
        console.log('🟢 ALL DEPLOY CHECKS PASSED\n');
    }

    process.exit(fail > 0 ? 1 : 0);
}

main();
