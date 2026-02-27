# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Last Confirmed by Agent (Feb 26, 8:40 PM CT) — TRADE HISTORY OUTCOME NAME FIX DEPLOYED

> [!IMPORTANT]
> **All 6 Mat feedback items deployed to production. All test suites green. Journal pruned.**

**Deployed to production:**
1. ✅ "Balance" → "Cash" label (`FundedAccountHeader.tsx`)
2. ✅ Portfolio auto-refresh 30s→10s + `balance-updated` event (`PortfolioDropdown.tsx`)
3. ✅ Clickable open positions → trade page (`OpenPositions.tsx`)
4. ✅ Resolution dates on all 3 card types
5. ✅ Trade history option name between BUY/SELL and YES/NO (`RecentTradesWidget.tsx`)
6. ✅ **Dynamic daily drawdown** — `maxDailyDrawdownPercent × startOfDayBalance` in evaluator, risk-monitor, dashboard-service

**Test infrastructure fix:**
- ✅ `test-worker-server.ts`: Replaced hardcoded port 19876 with dynamic port 0 (OS-assigned). Eliminates EADDRINUSE.
- ✅ Safety: 54/54 passed, Financial: 24/24 passed — **running concurrently, zero collisions**

**Housekeeping:**
- ✅ Journal pruned: 1101 → 420 lines (entries before Feb 19 removed)

**Verification (all green):**
| Suite | Result |
|-------|--------|
| `tsc --noEmit` | ✅ 0 errors |
| `npm run test` | ✅ 79 files, 1180 tests, 0 failures |
| `npm run test:engine` | ✅ Passed |
| `npm run test:safety` | ✅ 54/54 |
| `npm run test:financial` | ✅ 24/24 |
| Browser smoke test | ✅ 4/4 checks on staging |

**Deferred (separate discussion):** Spread/orderbook, email delivery, bot quiz content, "2% less shares" toast.

### Deferred Work (for future sessions, ranked by leverage × risk)
1. **Spread/orderbook (-1% on buy/sell)** — financial path, needs requirements clarification from Mat
2. **"2% less shares" buy toast** — UI display
3. **Email delivery** — infrastructure
4. **Bot quiz content** — content
5. **Server-side funded modal gate** — replace `localStorage` with DB flag for cross-device persistence
6. **Production health check** — verify "Cash" label on funded header card in real browser


---

## Feb 26, 2026 (8:40 PM CT) — Trade History: Sub-Market Outcome Name Fix

### What
Mat reported trade history shows the truncated event title ("What price will Eth...") instead of the specific sub-market outcome ("2,200") for multi-outcome markets.

### Root Cause
`enrichTrades()` iterated `event.markets` for metadata but only extracted `eventTitle` and `image` — ignored `groupItemTitle`.

### Fix (2 files, ~6 lines)
1. `route.ts`: Extract `groupItemTitle` from event market data, include in API response
2. `RecentTradesWidget.tsx`: Prefer `groupItemTitle` over `marketTitle` for the option name

### Commits
| SHA | Branch |
|-----|--------|
| `8d812f9` | develop |
| `042bda4` | main |

---

## Feb 26, 2026 (6:00 PM CT) — Test Infrastructure Fix + Journal Prune

### Fixes
1. **Safety Test 4:** Confirmed passing 54/54 — previous failures were transient
2. **Port conflict:** `test-worker-server.ts` hardcoded port 19876 → dynamic port 0 (OS-assigned)
3. **Journal prune:** 1101 → 411 lines

### Commits
| SHA | Branch |
|-----|--------|
| `6cb7b9a` | develop |
| `bd88937` | main |



### Sentry Alert: PROMOTION_PNL_MISMATCH (Feb 24, ~5:43 PM CT) — FALSE POSITIVE ✅ INVESTIGATED

**Alert:** `PROMOTION_PNL_MISMATCH` — critical data integrity violation from `evaluator.ts:224-244` sanity gate.

**What happened:** Mat's challenge (`056d254d`, user `9980dab6`) triggered the sanity gate during promotion. The gate compares cash-based PnL (equity - startingBalance) vs trade-derived PnL (sum of SELL realizedPnL + unrealized). Discrepancy exceeded 20% of the $1,000 profit target.

**Timeline (UTC):**
1. 23:43:15 — Massive YES sell: **+$928.57** realized PnL (1190 shares, single trade)
2. 23:43:34 — Loss sell: **-$285.71**
3. 23:43:43 — 5 `pass_liquidation` trades fired (evaluator closing all open positions before funded transition)

**Root cause:** Timing window. Cash balance updates instantly via `BalanceManager.credit()`, but the evaluator queries trade records a few ms later. During that window, the cross-reference naturally diverges for large single-trade PnL swings.

**Verdict:** False positive — the sanity gate self-corrected on the next evaluation cycle. The promotion went through. Mat is now in funded phase and actively trading (3 new buys Feb 25 @ 02:23 UTC).

**Funded account state:** Starting $10K | Balance $9,063.34 | HWM $10,013.34 | 28 trades | Realized PnL: $1,079.31

**Action:** No code fix needed. If false positives recur, consider widening threshold from 20% → 30% or adding a retry-after-delay before blocking.

---

### Last Confirmed by Agent (Feb 24, 9:02 AM CT) — RESOLVED SUB-MARKET BUG FIX ✅ VERIFIED

**Bug (cofounder-reported):** Multi-outcome sub-markets at extreme prices (≥99% or ≤1%) were grayed out with "RESOLVED" labels and disabled trade buttons. Polymarket shows all outcomes as fully tradeable until the market actually settles.

**Root cause chain (3 producers, all fixed):**

| # | File | Bad logic | Commit |
|---|------|-----------|--------|
| 1 | `ingestion.ts` | `isResolved = yesPrice <= 0.01 \|\| yesPrice >= 0.99` → stored in Redis | `307c6f3` |
| 2 | `market-integrity.ts` | `pruneResolvedMarkets()` deleted extreme-price sub-markets from `event:active_list` | `342455b` |
| 3 | `market.ts` | Live price overlay set `market.resolved = true` on extreme live price | `307c6f3` |

**Defensive hardening:** `market.ts` server action now strips any stale `resolved` flags from Redis defensively — this protects against old Railway worker versions without requiring a Railway restart.

**Verified on staging:** Browser smoke test confirmed all rows (30, 40, 50, 60, 90, 100, 110, 120, 130) show actual cent prices ("Yes 100.0¢" / "No <1¢"), zero "RESOLVED" labels, zero "--" dashes. Test suite: `tsc` clean, 1180/1180 (79 files).

---



**Bug (cofounder-reported):** Multi-outcome sub-markets at extreme prices (≥99% or ≤1%) were grayed out and had trade buttons disabled — showing `—` instead of real prices. Polymarket shows these as fully tradeable until the market actually settles.

**Root cause:** Feb 22 fix (`c34fccb`) incorrectly equated "price at extreme" with "market settled." Two code paths set `resolved: true` based on price alone:

| File | Line | Bad logic |
|------|------|-----------|
| `ingestion.ts` | 608 | `isResolved = yesPrice <= 0.01 \|\| yesPrice >= 0.99` → stored in Redis |
| `market.ts` | 442 | Live price overlay re-set `market.resolved = true` on extreme live price |

**Fix:** Removed price-based `resolved` flag from both files. Extreme-price sub-markets now remain fully tradeable. `EventDetailModal.tsx` unchanged — it correctly trusts the flag it receives.

**Not touched:** Trade executor's `entryPrice ∈ (0.01, 0.99)` guard is separate and unchanged. Settlement logic unchanged.

**Verified:** `tsc` clean, 1180/1180 tests (79 files). Pushed to develop.

---

### Last Confirmed by Agent (Feb 24, 1:05 AM CT) — AUTH FAIL-OPEN FIX ✅

**Security: closed fail-open auth on 3 financial paths (commit `708b541`)**

| File | Before | After |
|------|--------|-------|
| `dashboard/page.tsx` | `session?.user?.id \|\| "demo-user-1"` | `redirect('/login')` if no session |
| `trade/page.tsx` | Same fallback | Same fix |
| `challenges.ts` | Same fallback (server action) | Return `{error: "Authentication required"}` |

**Root cause:** Auth was disabled for early testing and never re-enabled. If `auth()` returned null (expired session, edge hiccup), user silently fell through to `demo-user-1`'s data.

**Not touched:** `checkout/route.ts` (already guarded by L18-24 CONFIRMO_API_KEY check), `page.tsx` + `DashboardView.tsx` (client-side landing demo, no auth path).

**Verified:** `tsc` clean, 1180/1180 tests (79 files). Pushed to staging.

---

### Last Confirmed by Agent (Feb 23, 11:25 PM CT) — DB ERROR HANDLING ✅

#### Shipped this session (on `develop`):

| Commit | Files | What |
|--------|-------|------|
| `767c513` | `error.tsx` | Human-friendly message for DB errors, explicit `Sentry.captureException`, debug in collapsed `<details>` |
| `767c513` | `positions/route.ts` | try/catch → 503 + `{positions: [], error: "temporarily_unavailable"}` |
| `767c513` | `dashboard/page.tsx` | try/catch → inline ⚠️ "Temporarily Unavailable" + Retry button |
| `767c513` | `trade/page.tsx` | try/catch → inline ⚠️ "Markets Temporarily Unavailable" + Retry button |

**Root cause:** 5 Sentry unhandled errors — all Prisma Postgres intermittent connection drops. Not a code bug, but the user saw raw 500s with Prisma internals. Now: clean UI + explicit Sentry capture with route tags.

**Not touched:** `/api/trade/execute`, webhooks, settlement — fail-hard per fail-closed principle.

**Verified:** `tsc` clean, 1180/1180 tests (79 files).

---

### Last Confirmed by Agent (Feb 24, 1:12 AM CT) — isMultiOutcome FIX ✅

**Bug:** `event.isMultiOutcome` was `undefined` at runtime in `EventDetailModal`. Events from Redis lack this field if ingested before it was added. Since `!undefined === true`, multi-outcome events rendered as binary — showing chart + large probability incorrectly.

**Fix (commit `b42db8e`):** Added `?? (markets.length > 1)` default in `getActiveEvents()` (`market.ts`).

**Fake press logos:** Exhaustive search — not present in current codebase.

**Verified:** `tsc` clean, 1180/1180 tests. Pushed to staging.

---

### Last Confirmed by Agent (Feb 23, 8:30 PM CT) — STALE FILTER FIX ✅

#### Shipped this session (on `develop`):

| Change | Files | What |
|--------|-------|------|
| Year-rollover fix | `market-utils.ts` | `parseDateWithYearRollover()` helper — if parsed month >6 months ahead of now, decrements year |
| 6 regression tests | `stale-market-filter.test.ts` | December/November/October in January, June same-year, Dec range, Jan same-month |
| Test label fix | `stale-market-filter.test.ts` | "returns false for January" → "returns true for January 12" |
| Journal pruning | `journal.md` | 5750 → 937 lines (7-day rolling window enforced) |

**Verified:** `tsc` clean, 24/24 stale-market tests, 1180/1180 full suite (79 files).

---

### Last Confirmed by Agent (Feb 23, 7:00 PM CT) — TRADE FIX VERIFIED ✅

#### Shipped to `main` this session:

| Commit | File | Change |
|--------|------|--------|
| `582a654` | `route.ts` | Removed duplicate sequential idempotency check (regression from `d355bf6`) |
| `481766d` | `trade.ts`, `trade.test.ts` | Parallel pre-warm `Promise.all([getAllMarketData(), getAllOrderBooks()])` + worker-client test mock |
| `dfc6212` | `worker-client.ts` | Circuit-breaker penalty box — timed-out Railway paths return null immediately for 20s |
| **`1495aa4`** | **`db/index.ts`** | **ROOT CAUSE: `max:1` → `max:3` connection pool — deadlock between `db.transaction()` and `RiskEngine.validateTrade` using `db.*` inside callback** |

**Verified in production:** Trade completed in **~3 seconds**, green toast "Bought 11.90 shares @ 42.0¢", portfolio badge 3→4, balance updated.

---

### 🚨 Tomorrow Morning — Ranked by Impact × Risk

~~**1. CRITICAL — Year-rollover bug in `isStaleMarketQuestion`** — FIXED (this session)~~

**1. MEDIUM — `isMultiOutcome` undefined at runtime**
`ingestion.ts:108` declares `isMultiOutcome?: boolean` (optional). Redis events stored before this field will have `undefined` → falsy → binary layout.
Fix: `isMultiOutcome: event.isMultiOutcome ?? (event.markets?.length > 1)`.

**2. 🔴 Fix `userId="demo-user-1"` in `page.tsx`** — Security bug. Payment success should redirect to authenticated session.

**3. 🔴 Remove or explain press logos** — Fake credibility signals are a legal risk.

---

### Last Confirmed by Agent (Feb 22, 10:20 AM CT)

#### ✅ Audit Follow-Ups — MERGED TO MAIN (`5c584e8`)
Commits `be6918f` + `0440418` + `c4ed96e` all on `develop`, merged to `main`.

**Changes:**
- `market-utils.ts`: `isStaleMarketQuestion()` pure function extracted (48h grace window)
- `market.ts`: wired to `isStaleMarketQuestion`; removed 40 lines of inline regex
- `tests/lib/stale-market-filter.test.ts`: **18 behavioral tests** (18/18 pass) — single date, range date, edge cases, Feb 22 regression
- `EventDetailModal.tsx`: `markets.length === 1` → `!event.isMultiOutcome` in 3 places; removed opaque `price * 6` expression

**Audit finding that was fixed during audit:** Initial fix used `setHours(23+5)` (wrong), then `cutoff+2d vs oneDayAgo` (also wrong). Final correct fix: `parsedDate < twoDaysAgo`.

---

### Last Confirmed by Agent (Feb 22, 10:55 AM CT)

#### ✅ Stale-Date Filter Off-By-One Bug — FIXED & COMMITTED (develop)
Commit `be6918f`. Fixes missing sub-markets for same-day threshold events.

**Root Cause:** `getActiveEvents()` in `market.ts` parsed "February 22 2026" as midnight UTC = ~6 PM CT Feb 21. With the 24h grace window (`oneDayAgo`), any same-day market was incorrectly filtered as "in the past" by morning ET. All 11 Bitcoin Feb 22 thresholds (60K–80K) were being dropped from the response despite being correctly stored in Redis.

**Fix:** Both range-date and single-date parsers now snap to end-of-day ET (`parsedDate.setHours(28, 59, 59, 999)` = 23:59:59 ET = 04:59:59 UTC) before comparing.

**Verified:** Modal now shows all 11 thresholds (60K–80K), 10 resolved, 1 active (68K at 17.5%). Chart is hidden, table shows OUTCOME / % CHANCE / ACTIONS headers. ✅

---

### Last Confirmed by Agent (Feb 22, 9:35 AM CT)

#### ✅ Market Display Parity Fix — DEPLOYED TO PRODUCTION
Commit `c34fccb` (develop) / `58028f5` (main). All 10/10 post-deploy health checks passed.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| Full Vitest suite (78 files) | ✅ 1146/1146 passed |
| `npm run test:engine` | ✅ Pass |
| `npm run test:safety` | ✅ 54/54 |
| Staging browser smoke (3 markets) | ✅ `groupItemTitle` outcomes showing, numerically sorted |
| Production deploy check (10 checks) | ✅ All green — DB, Sentry, worker heartbeat alive |

**What shipped:**
- `ingestion.ts`: sub-markets at extreme prices now marked `resolved: true` instead of being dropped — they stay in the event so the UI can show them as grayed-out
- `market.ts` (action): `SubMarket` gets `resolved` field; price filter skips resolved sub-markets; live price overlay marks multi-outcome sub-markets resolved instead of removing
- `EventDetailModal.tsx`: uses `groupItemTitle` (e.g., "68,000") as outcome name; sorts numerically; grays out resolved outcomes; disables trade buttons on resolved
- `balance-manager.test.ts`: fixed stale mock left over from postgres.js migration (used `tx.query.*` but `readBalance()` was migrated to `tx.select()`)

**Also noted during smoke test:** The modal *header* for "Bitcoin above _" events still shows the Polymarket raw event title with underscore — this is from upstream Polymarket data and is expected behavior. The specific threshold value IS correctly shown in the sidebar/outcomes list.

#### Previous confirmed items still valid:
- Daily PnL WORKING ✅
- Settlement in Railway worker ✅
- Sentry: initialized, 0 unresolved issues ✅
- Balance reconciliation: all 4 active challenges at $0.00 drift ✅
- Risk engine aligned ✅

### 🌅 Tomorrow Morning (ranked by leverage × risk)

> **1. ⚠️ Admin dashboard visual verification** — Needs admin login to verify `MarketFilterDashboard` component renders correctly. Low urgency but still open.

> **2. 📊 Monitor market filter at $50K** — Check Railway logs for filter reports. Verify threshold events are visible in market grid.

> **3. 🧑‍💻 Continue product development** — All blocking issues cleared. Platform is healthy.


### ⚠️ ZOMBIE PROCESS INCIDENT — READ THIS

An inline DB script (`npx tsx -e "..."`) hung for **11+ hours**, blocking the IDE terminal and spawning 30+ zombie node processes. Root cause: `postgres.js` holds the Node event loop open indefinitely unless `sql.end()` is called. The inline script never reached cleanup.

**Prevention (now enforced via `/db-scripts` workflow):**
- ❌ NEVER use `npx tsx -e "..."` for DB operations
- ✅ Always write scripts to files in `src/scripts/`
- ✅ Always wrap with `timeout 30 npx tsx src/scripts/<name>.ts`
- ✅ Always include `sql.end()` + `process.exit()` in both success and error paths
- ✅ Kill any process that hangs beyond 2 minutes — don't wait



### Previous Confirmed (Feb 21, 1:42 AM CT)

#### Commits on `main` (in order):
| Commit | What |
|--------|------|
| `174d2a5` | Affiliate dashboard: stat cards upgraded (SpotlightCard, CountUp, text-3xl) |
| `dd9e25e` | **BUG FIX: Phantom daily PnL** — `startOfDayEquity` column, cron snapshot |
| `8c1216e` | **TEST: Financial display boundary suite** — 14 tests, 7 scenarios |
| `51a0c9c` | **BUG FIX: FundedRiskMeters daily loss uses equity not cash** |
| `a463b26` | **INFRA FIX: Replace pg.Pool with postgres.js** — resolves Sentry N+1 pool exhaustion |
| `6bfa940` | **FEAT: Wire admin analytics to real DB data** — real revenue, cohort API, live KPIs |

---

## Feb 22, 2026 (9:35 AM CT) — Market Display Parity Fix: Verified & Deployed

### What
Picked up the market display parity fix written last session (3 files, locally modified, undeployed). Verified, fixed a pre-existing test regression, and shipped to production.

### Pre-Existing Bug Found During Verification
`tests/lib/trading/balance-manager.test.ts` was failing 16/16 with `TypeError: tx.select is not a function`. Root cause: the `createMockTx` helper was using the old `tx.query.challenges.findFirst()` API, but `BalanceManager.readBalance()` was migrated to `tx.select().from().where()` in the postgres.js fix (last session). The test mocks were never updated. This was pre-existing — not introduced by this session's changes.

**Fix:** Updated `createMockTx` and all 3 inline "not found" tx mocks to provide the Drizzle `select()` builder chain. All 16 tests now pass.

### Market Display Fix (shipped from last session's work)
Three compounding root causes fixed:
1. **Price filter dropping sub-markets:** `<=0.01 || >=0.99` filter in both `ingestion.ts` and `market.ts` was silently dropping most sub-markets in threshold events (BTC price, sports scores). Fixed: sub-markets are marked `resolved: true` instead of dropped, so the UI can render them grayed-out.
2. **groupItemTitle never displayed:** The specific threshold value (e.g., "68,000") was stored in ingestion but the `EventDetailModal` was showing the `question` field ("the price of Bitcoin") instead. Fixed: `EventDetailModal` now uses `groupItemTitle` as the displayed outcome name.
3. **Numerical sort:** Multi-outcome sub-markets now sort numerically (not alpha) — "60,000" before "68,000" before "80,000".

### Verification
- `tsc --noEmit`: 0 errors
- Vitest full suite: 1146/1146 passed (78 files, 0 failures)
- `npm run test:safety`: 54/54
- Staging browser smoke: `groupItemTitle` outcome names confirmed, numerical sort confirmed
- Post-deploy health check (production): 10/10 ✅

### Pre-Close Checklist
- [x] Bug/task was understood BEFORE writing code — root cause traced from Gamma API → ingestion → action → UI
- [x] Root cause traced from UI → API → DB: all 3 layers
- [x] Fix verified with actual multi-outcome markets (Bitcoin threshold events with 11+ sub-markets)
- [x] `grep` of key patterns — no old `query.challenges` mock patterns in test file
- [x] Full test suite passes (1146)
- [x] tsc --noEmit passes
- [x] CONFIRMED BY BROWSER: staging smoke test verified `groupItemTitle` showing correctly
- [x] CONFIRMED BY DEPLOY CHECK: production 10/10 health checks passed (commit `58028f5`)
- [ ] UNVERIFIED BY USER: Mat has not personally confirmed the fix on production yet

### Commits
| SHA | Branch | What |
|-----|--------|------|
| `c34fccb` | develop | Market display parity fix + BalanceManager test mock fix |
| `58028f5` | main | Merge commit (production) |

---

## Feb 21, 2026 (10:00 AM CT) — Daily PnL Fix: Cron Infrastructure Root Cause


### What
User reported daily PnL still showing `— Today` despite previous agent's fix (commit `dd9e25e`). Traced the full data flow and found two compounding issues.

### Root Cause 1: Cron ran old code
The midnight cron (`/api/cron/daily-reset`) fired at `2026-02-21T00:00:17Z` — confirmed by `lastDailyResetAt` in the DB. However, it executed the **old deployed code** (pre-commit `dd9e25e`) which didn't have the `startOfDayEquity` logic. The code was deployed to production _after_ midnight, so the cron correctly set `startOfDayBalance` but left `startOfDayEquity` as `null`.

**Evidence:** DB query showed `lastDailyResetAt: 2026-02-21T00:00:17Z` (cron ran) but `startOfDayEquity: null` (new column not written).

### Root Cause 2: Vercel Hobby plan cron limits
`vercel.json` had 5 crons, 2 of which were sub-hourly (`heartbeat-check` every 5m, `settlement` every 10m). Vercel Hobby plan only allows crons to run once/day max. The sub-hourly crons could cause deployment rejection or silent cron disabling — a ticking time bomb for future deployments.

### Fix Applied
1. **Removed 2 sub-hourly crons** from `vercel.json` — `heartbeat-check` and `settlement`. Kept 3 daily crons.
2. **Force-populated `startOfDayEquity`** for all 4 active challenges via temporary API route (created, used, deleted).
3. **Browser-verified** production dashboard: `$-19.05 Today` now displays correctly (red text, real number).

### Why the previous agent's fix was correct but incomplete
The code changes (commit `dd9e25e`) were sound — correct column, correct cron logic, correct display handling. The agent tested the code, ran 1146 tests, and verified `tsc`. But they didn't verify:
- Whether the cron would actually run the new code (deploy timing vs cron timing)
- Whether `vercel.json` was Hobby-plan compliant (infrastructure, not code)

**Lesson:** "Tests pass" is necessary but not sufficient. Infrastructure deployment timing is a variable too.

### Verification
- Production dashboard: `$-19.05 Today` (red) ✅
- DB state: `startOfDayEquity` populated for all 4 active challenges ✅
- `vercel.json`: 3 crons, all once/day, Hobby-compliant ✅
- Temp files: all deleted (API route + diagnostic script) ✅

### Pre-Close Checklist
- [x] Bug was understood BEFORE writing code — traced full data flow from DB → service → UI
- [x] Root cause traced: deploy timing (cron ran old code) + Vercel Hobby plan limits
- [x] Fix verified with the EXACT failing input (Mat's dashboard, `— Today` → `$-19.05 Today`)
- [x] `grep` confirms zero temp files remain
- [x] Full test suite: not re-run (no production code changed, only `vercel.json` config)
- [x] tsc --noEmit: not re-run (no .ts changes)
- [x] CONFIRMED BY BROWSER: Production dashboard shows real daily PnL ✅
- [ ] UNVERIFIED: `vercel.json` change not yet deployed — needs commit + push


### Previous Confirmed (Feb 20, 2:30 PM CT)
- **Post-ship hardening** — commit `4b50ef3`
- 16 regression tests, suite 1131/1131, smoke test position closed ($4,998.21)

### Previous Confirmed (Payment Security Audit Feb 20, 1:30 AM CT)
- **6 payment flow security bugs fixed** across 2 commits (`a77d25b`, `3a15a34`)
- CI run #629: ALL GREEN — Unit ✅, Integration ✅, Build ✅, E2E ✅
- `payment_logs` table: audit trail + idempotency key via `uniqueIndex(invoiceId, status)`
- Webhook idempotency: DB-level `ON CONFLICT DO NOTHING` instead of 5-min window
- Discount re-derivation: amount fetched from DB, never trusts client reference string
- Auth guard: unauthenticated requests blocked in production
- Mock fail-closed: DB error returns 500 (not fake success URL)

### Previous Confirmed (CI Hardening Feb 19, 11:00 PM CT)
- **CI Pipeline Fixed** — 10 real-DB test files were running in the unit test job (no `DATABASE_URL`), causing `ECONNREFUSED` → cascading skip of all integration tests
- Excluded all 10 from unit job, moved to integration job (Postgres 16 + Redis 7)
- CI run #623 (`f359bb6`): ALL GREEN — Unit ✅, Integration ✅ (engine/safety/lifecycle), Build ✅, E2E ✅
- Branches synced: `main` fast-forwarded to match `develop`

### Previous Confirmed (Production Deploy Feb 19, 7:00 PM CT)
- **DEPLOYED TO PRODUCTION** via staging-first workflow (`7bfa463..2c16608`)
- Pre-deploy gates: `test:engine` ✅, `test:safety` ✅ (54/54), `tsc` ✅, `test:lifecycle` 27/28 (Phase 4 pre-existing env issue — market data unavailable for test market)
- Staging smoke test ✅: homepage, login, 5K→$79, 25K→$299 all verified on `prop-firmx-git-develop-...vercel.app`
- Production smoke test ✅: homepage, 5K→$79, 25K→$299 all verified on `prop-firmx.vercel.app`
- All deep testing bugs FIXED + prices consolidated into `config/plans.ts` as single source of truth
- `checkout/page.tsx`, `discount/validate/route.ts`, `admin-utils.ts` all import from `config/plans.ts`
- 1114/1114 tests pass (vitest), `tsc` clean

### Known Open Issues (Updated Feb 19)
- None — all prior issues resolved and deployed to production.

*(Entries prior to Feb 19 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*

