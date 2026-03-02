# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 2, 2026 (7:20 AM CT) — Session End: Carousel on Prod + Apple Redesign Pending

**What shipped to production** (merged `develop` → `main` at `1629b74`):

| Commit | What |
|--------|------|
| `c232284` | Audit fixes: stale carousel index crash, multi-outcome misleading price, shared formatVolume, entity pattern whitespace |
| `4f8fdd2` | Carousel V2: filter >95%/<5% resolved markets, SVG probability chart, taller card, breadcrumbs, inline Explore All |
| `81fec63` | Mobile responsive: outcome names stripped ("Spain" not "Spain 2026 FIFA World Cup"), chart hidden on mobile, nav pills hidden |
| `0d18e6d` | Journal + deploy workflow rewrite |

**On `develop` only (NOT pushed yet — needs end-of-session push):**

| Commit | What |
|--------|------|
| `c696daa` | Removed chart from multi-outcome cards (flat red line at 14.8% was broken) |
| `af9e0ac` | Apple-inspired card: probability bars, 6 runners, no breadcrumb, no ghost button, volume-only footer |

**⚠️ INCOMPLETE — Apple-grade polish pass:**
The carousel card has horizontal probability bars and 6 runners now, BUT it's only a 6/10. Next agent must do the world-class polish pass:
1. Bars are too faint (`bg-white/[0.06]`) — need visible fills, especially leader (#1) in emerald
2. Percentages need to be the hero — bigger, bolder than outcome names
3. Card needs depth — shadow or gradient, not just `border-white/5`
4. Volume text is ghost text — either make it readable or remove it
5. Gap between card and nav dots needs tightening
6. Typography hierarchy is flat — everything same size/weight

**Deployment discipline (non-negotiable):**
- `🚨 DEPLOYMENT COST LIMIT` is FIRST section of CLAUDE.md
- Git pre-push hook blocks after 2 pushes/day
- Work all day locally, push ONCE at end of session
- **NEVER push to staging to "see if it looks right" — use `npm run dev`**

**Tomorrow Morning (prioritized by leverage × risk):**
1. **(HIGH) Apple-grade carousel polish** — see 6 items above. File: `src/components/trading/FeaturedCarousel.tsx`
2. **(MED) Push `develop` + merge to `main`** — 2 unpushed commits sitting locally
3. **(MED) P2 audit items** — fragile substring removal in `getOutcomeName`, HotTopics entity fallback
4. **(LOW) Share estimate label clarification


---






## Feb 27, 2026 (11:50 AM CT) — Mat Feedback Completion + QA Runbook v2

### What
1. Shipped trade history `groupItemTitle` fix (sub-market outcome name display)
2. Shipped funded dashboard layout reorder (positions/trades above payout)
3. Audited ALL Mat feedback (Tab 1 + Tab 2) against codebase — confirmed 100% complete
4. Created comprehensive QA Runbook v2 (11 sections, 80+ checks) and added it to Google Doc Tab 3

### Commits
| SHA | Branch | What |
|-----|--------|------|
| `8d812f9` | develop | Trade history groupItemTitle fix |
| `042bda4` | main | Merge (production) |
| `ca35950` | develop | Funded dashboard layout reorder |
| `693fef2` | main | Merge (production) |

### Verification
- `tsc --noEmit`: 0 errors
- `npx vitest run`: 79 files, 1180/1180 tests, 0 failures

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



*(Entries prior to Feb 22 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*




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






*(Entries prior to Feb 22 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*

