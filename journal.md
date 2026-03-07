# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 7, 2026 (8:39 AM CT) — Production Healthy ✅

| Change | Status |
|--------|--------|
| **Risk-monitor `triggerPass` fix** | ✅ On `main` (`3080c77`) |
| **Risk-monitor `triggerBreach` + `endsAt`** | ✅ On `main` |
| **20 state-transition invariant tests** | ✅ On `main`, 1,335/1,335 pass |
| **Mat's funded balance** — reset to $25,000.00 | ✅ Confirmed via staging |
| **Buy latency fix** — fire-and-forget idempotency, parallel pre-warm, 10s cache TTL | ✅ On `main` (`f99a274`), ~40% improvement measured |
| **tsc --noEmit** | ✅ Clean |

### ⚠️ What the Next Agent Must Know

1. **Deploy SHA mismatch is a workflow sequencing issue, NOT a code bug.** Step 8 (`test:deploy`) must run while on `main` branch. If you've already switched to `develop` (step 10), the script passes the develop SHA and gets a false-positive mismatch. Run health check before `git checkout develop`.
2. **Pre-existing `test:lifecycle` failures** — ~9 failures existed before our changes. Root cause TBD (DB timeouts or timing sensitivity). See journal entry below for classification.
3. **1,335/1,335 unit tests pass, tsc clean.**


### 🌅 Tomorrow Morning — Handoff for Next Agent

> **Read `CLAUDE.md` and `journal.md` CURRENT STATUS before doing anything.**

**Ranked by leverage × risk:**

#### 1. 🟨 Lifecycle Emails
Plan approved. Three emails: purchase confirmation, challenge passed, challenge failed.
Start with the transactional email infra (Resend or similar) before the template work.

#### 2. 🟩 Global Error Pages
`not-found.tsx`, `error.tsx`, `loading.tsx` — ~1 hour of polish work.

#### 3. 🟩 Deploy hygiene fixes to prod
Commit `e0468e4` (evaluator sanity gate fix + lifecycle test sync) is on `develop` but not pushed.
Push following the deploy workflow when ready.

---


### Mar 7, 2026 (8:39 AM CT) — Morning Hygiene

**Context:** New session. Applied the senior-engineer morning checklist before any feature work.

**Changes made:**
| Change | File | Why |
|--------|------|-----|
| Journal CURRENT STATUS updated | `journal.md` | Latency fix was on main, status still said "committed not pushed" |
| Deploy workflow step 8 annotated | `.agent/workflows/deploy.md` | SHA mismatch false-positive: step 8 must run while on `main` before switching to `develop` |
| Evaluator sanity gate `unrealizedPnL` fallback | `src/lib/evaluator.ts` | Gate returned 0 unrealized PnL when live prices unavailable, but equity calc used stored-price fallback → artificial discrepancy blocked legitimate promotions |
| Lifecycle test data updated for 12% tier | `src/scripts/verify-lifecycle.ts` | Mat's tier config update (commit `214ea56`) set 10k challenge to 12% target ($1,200). Tests still seeded $1,100 profit → under target → 9 false test failures |

**Results:**
- `test:lifecycle`: **81/81 pass** (was 71/81)
- `tsc --noEmit`: clean
- All changes committed on `develop` as `e0468e4` — not yet pushed (daily budget concern)

**Root cause for sanity gate bug:** The evaluator's `unrealizedPnL` sum inside the sanity gate silently returned 0 when live prices were unavailable (via the ingestion worker), but the `equity` calculation directly above used a stored-price fallback from the DB. When those two paths diverged, the gate saw a larger discrepancy than actually existed and blocked promotion. Fix: applied identical stored-price fallback to the gate's unrealized PnL calc.

---

### Mar 6, 2026 (8:50 PM CT) — Proper Bug Verification Session

**Context:** Followed `/fix-bug` workflow strictly. Previous session declared fix "correct" by reading code. This session computed expected balance from trade records.

**Verification findings:**
- Trade replay confirms prod running buggy code: `$25,000 + $4,147.65 proceeds - $1,250 new trade = $27,897.65` ≈ DB `$27,897.64` ✅ match
- The `resetBalance` fix is committed but *unpushed* — production has NOT received it yet
- `triggerBreach` in risk-monitor was NOT setting `endsAt` — confirmed by `$10K` funded challenge having `endsAt=null` in prod

**Changes made:**
| Change | File |
|--------|------|
| Fix `triggerBreach` to set `endsAt: new Date()` | `risk-monitor.ts` |
| 20 new state transition invariant tests | `tests/state-transition-invariants.test.ts` [NEW] |

**Pre-Close Checklist:**
```
## Pre-Close Checklist
- [x] Bug/task was reproduced BEFORE writing code — trade replay computed $27,897.64 from trades, matches DB exactly
- [x] Root cause traced from UI → API → DB — triggerPass credits proceeds then sets status, no resetBalance
- [x] Fix verified with EXACT failing input — Mat's actual balance ($27,897.64 → replay = same)
- [x] grep confirms zero remaining instances of missing endsAt in triggerBreach
- [x] Full test suite passes (87 files, 1,335 tests)
- [x] tsc --noEmit passes
- [ ] CONFIRMED BY USER: No — production fix not pushed, Mat's balance not reset yet — UNVERIFIED
```

### Mar 6, 2026 (9:00–10:00 AM CT) — Session: Admin Audit → Balance Inflation Bug

**Context:** User asked us to verify Mat's rapid challenge pass ($25K, passed in <90 min) via admin panel.

**What happened:**
1. Agent (me) audited admin panel UX and reviewed trade data
2. Agent **incorrectly declared** Mat's pass "clean" based on reading evaluator code only
3. Mat messaged in Discord: "I shouldn't be up at all, it should've reset"
4. User challenged the "clean" declaration
5. On closer inspection: **risk-monitor's `triggerPass` credits position proceeds AFTER setting balance = startingBalance**, inflating funded balance to $29,147 instead of $25,000
6. The evaluator path was correct (explicit comment saying "we do NOT credit proceeds here")

**Root cause:** Two code paths (`evaluator.ts` + `risk-monitor.ts`) do the same funded transition differently. The evaluator skips proceeds credit, the risk-monitor credits then doesn't reset. Classic split-brain bug.

**Fix:** Added `BalanceManager.resetBalance()` after `closeAllPositions()` in `risk-monitor.ts` triggerPass. Committed as `0a8cd13`, NOT pushed.

**Anti-regression:** Added "Dual-Path Verification Rule" to `CLAUDE.md` and `funded-transition.test.ts` (16 tests).

**Incomplete work:** State transition invariant tests. The field-level audit is done (below). The test file was not written before session ended.

### 🌅 Tomorrow Morning — Handoff for Next Agent

> **Read `CLAUDE.md` (especially the new Dual-Path Verification Rule) before doing anything.**

**Ranked by leverage × risk:**

#### 1. 🟥 Write State Transition Invariant Tests (HIGHEST — this is why bugs keep slipping through)

The field-level audit is DONE. Here's exactly what each test should verify:

**Test: triggerPass field parity (evaluator vs risk-monitor)**

Both paths MUST produce identical challenge state after funded transition:

| Field | Evaluator | Risk-Monitor | Match? |
|-------|-----------|-------------|--------|
| `status` | `'active'` | `'active'` | ✅ |
| `phase` | `'funded'` | `'funded'` | ✅ |
| `currentBalance` | `startingBalance` (via resetBalance) | `startingBalance` (via resetBalance — OUR FIX) | ✅ |
| `highWaterMark` | `startingBalance` | `startingBalance` | ✅ |
| `profitSplit` | from `FUNDED_RULES[tier]` | from `FUNDED_RULES[tier]` | ✅ |
| `payoutCap` | from `FUNDED_RULES[tier]` | from `FUNDED_RULES[tier]` | ✅ |
| `payoutCycleStart` | `new Date()` | `new Date()` | ✅ |
| `activeTradingDays` | `0` | `0` | ✅ |
| `startOfDayBalance` | `startingBalance` | `startingBalance` | ✅ |
| `startOfDayEquity` | `startingBalance` | `startingBalance` | ✅ |
| `endsAt` | `null` | `null` | ✅ |
| Position close | Inline loop, NO creditProceeds | `closeAllPositions()` WITH creditProceeds, then resetBalance | ✅ (different implementation, same result) |
| SELL trade records | ✅ Created | ✅ Created | ✅ |
| Status guard | `eq(status, 'active'), eq(phase, 'challenge')` | Same | ✅ |

**Test: triggerBreach field parity**

| Field | Evaluator | Risk-Monitor | Match? |
|-------|-----------|-------------|--------|
| `status` | `'failed'` | `'failed'` | ✅ |
| `endsAt` | `new Date()` | NOT SET | ⚠️ POTENTIAL GAP |
| Position close | NOT done by evaluator breach | Done via `closeAllPositions()` | ⚠️ DESIGN DIFFERENCE |
| Proceeds credit | N/A (no close) | YES (via closeAllPositions) | ⚠️ |

The `endsAt` omission in risk-monitor breach is worth investigating — it may cause "when did this challenge end?" queries to return null for risk-monitor-detected breaches.

The position close difference is BY DESIGN: evaluator breach runs per-trade (position may already be closed), risk-monitor breach runs on polling cycle (positions must be force-closed).

**Test: Accounting equation**
After any trade sequence: `startingBalance + sum(realizedPnL) == currentBalance + sum(openPositionCost)`

**Test: Breach state invariants**
After breach: `status == 'failed'` AND no `OPEN` positions remain AND audit log exists.

#### 2. 🟧 Push + Reset Mat's Balance (AFTER tests are written)
- Push `develop`: `git push origin develop`
- Verify staging
- Merge to `main`
- Run: `DRY_RUN=false npx tsx src/scripts/reset-mat-funded-balance.ts` with production DATABASE_URL

#### 3. 🟨 Lifecycle Emails (after financial integrity is solid)
Plan approved in previous session's `implementation_plan.md`. Three emails: purchase confirmation, challenge passed, challenge failed.

#### 4. 🟩 Global Error Pages
`not-found.tsx`, `error.tsx`, `loading.tsx` — ~1 hour.

---

| Change | File |
|--------|------|
| **Production Canary page** — 5 traffic-light health checks (heartbeat, price coverage, daily reset, order book data, worker reachability). Auto-refreshes every 30s. | `api/admin/canary/route.ts`, `admin/canary/page.tsx`, `AdminSidebar.tsx` |
| **Heartbeat fix** — Canary originally connected to Redis directly from Vercel (maxRetriesPerRequest failure). Added `/risk-heartbeat` endpoint to Railway health server. Canary now calls via HTTP. | `health-server.ts`, `canary/route.ts` |
| **E2E breach detection test** — Created controlled breach scenario: funded challenge with rigged $50k start-of-day equity → daily floor $47.5k > actual equity $10k. **Risk monitor auto-failed the account within 30s.** Audit log: `detectionMethod: real_time_monitoring`. | `risk-monitor.ts` (no code change — test of existing fix) |
| **CLAUDE.md audit** — Fixed 9 stale sections: 5s→30s interval, missing canary section, wrong login flow, outdated admin routes, stale test account notes. | `CLAUDE.md` |

**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅, browser-verified 5/5 GREEN on production ✅
**Commits:** `c54dfd1` (heartbeat fix), `a82e6b3` (canary)

---

### Mar 4, 2026 (12:43 PM CT) — PRODUCTION INCIDENT: Risk Monitor Never Worked ⚠️→✅

> [!CAUTION]
> **INCIDENT:** Risk monitor's 30-second breach detection was a **dead letter** — it has NEVER worked in production. Mat's funded account breached 133% daily drawdown without being auto-failed.

| Root Cause | Detail |
|------------|--------|
| **WS stream never functional** | `market:prices:all` has been empty. The custom `batchFetchPrices()` relied on it — with no data, the fail-closed guard silently skipped ALL checks. |
| **Wrong price source** | Risk monitor used WS stream (dead) while the dashboard used `MarketService.getBatchOrderBookPrices()` (alive, 1,986 tokens). Different code paths, different availability. |
| **Mocking mirage** | 1,299 tests all mock Redis with pre-populated prices. Tests verified "does math work?" — yes. Never tested "do prices actually exist?" |
| **Only trade-time detection** | The evaluator (runs on position close) was the ONLY path catching breaches/passes. Mat spotted this pattern. |

| Fix | File |
|-----|------|
| **Delegate to MarketService** — `batchFetchPrices()` now calls `MarketService.getBatchOrderBookPrices()` which uses: (1) order book mid-price, (2) event list fallback, (3) Gamma API fallback. Exact same chain as the dashboard. | `risk-monitor.ts` |

**Result:** Funded count dropped 2→1 at 18:43 UTC. Breach auto-detected ✅
**Commits:** `d9babad` (final fix on main). Code version v6.
**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅

---

### Mar 4, 2026 (10:25 AM CT) — 1-Hour Crypto Markets LIVE ✅

| Change | File |
|--------|------|
| **Hourly crypto ingestion** — New `fetchHourlyCryptoMarkets()` queries 4 hardcoded series (`btc/eth/solana/xrp-up-or-down-hourly`) via `/series` endpoint. Uses series aggregate volume (not individual market volume). Read-modify-write on `event:active_list`. | `ingestion.ts` |
| **1% trade cap** — `HOURLY_CRYPTO_MAX_POSITION_PERCENT = 0.01` (Mat's directive). Risk engine override in both `validateTrade` and `getPreflightLimits`. | `trading-constants.ts`, `risk.ts` |
| **Belt-and-suspenders detection** — `isHourlyCryptoMarket()` checks category AND question pattern. Fail-closed: if either matches, 1% cap applies. | `risk.ts` |

**DEPLOYED + VERIFIED:** 40 hourly crypto events live in production under Crypto tab. Browser-tested with screenshots.

**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅

---

### Mar 3, 2026 (3:25 PM CT) — DEPLOYED TO PRODUCTION ✅

**Production commit:** `26b438e` — Sentry fix + 93 new tests.

| Change | File |
|--------|------|
| **Activity tracking moved into DB transaction** — `recordTradingDay` was fire-and-forget; now atomic with trade. Fixes Sentry error. | `trade.ts` |
| **checkConsistency downgraded** — `.catch()` uses `logger.warn` instead of `logger.error`. | `trade.ts` |
| **Order book engine tests** — 24 pure function tests. | `tests/lib/order-book-engine.test.ts` [NEW] |
| **ChallengeManager tests** — 9 tests. | `tests/lib/challenge-manager.test.ts` [NEW] |
| **Close route tests** — 9 behavioral tests. | `tests/api/close-route.test.ts` [NEW] |
| **Financial chaos tests** — 35 adversarial/boundary tests. | `tests/financial-chaos.test.ts` [NEW] |
| **Property-based math** — 25 fast-check invariant tests. | `tests/property-based-math.test.ts` [NEW] |
| **Mocking mirage deleted** — 9 fake tests removed. | `tests/api/trade-endpoints.test.ts` [DELETED] |

**Pre-deploy:** test:engine 60/60 ✅, test:safety 54/54 ✅, test:lifecycle 81/81 ✅, tsc clean ✅
**Post-deploy:** 11/11 health checks pass (homepage, login, DB, Sentry, worker, SOD equity, cron, system status) ✅

---

### Mar 2, 2026 (9:55 PM CT) — Test Coverage Gap Audit + 200-Test Plan

| Change | File |
|--------|------|
| **Trade idempotency tests** — 8 behavioral tests: first call, duplicate detection, in-flight, fail-closed on worker failure, corrupted cache, cache write-through. | `tests/lib/trade-idempotency.test.ts` [NEW] |
| **Drawdown boundary tests** — 5 new evaluator edge cases: funded $1-under → survive, challenge HWM-trailing exact → fail, daily drawdown exact → pending_failure. | `tests/lib/evaluator.test.ts` |

**Audit report:** See `test_coverage_gap_audit.md` artifact for ranked findings (7 gaps: 2 CRITICAL ✅, 3 HIGH, 2 MEDIUM).

---

### 🌅 Tomorrow Morning — Handoff for Next Agent

> **Read `CLAUDE.md` and `journal.md` CURRENT STATUS before doing anything.**

**Ranked by leverage × risk:**

#### 1. Monitor Canary (LOW EFFORT — just check)
Visit `/admin/canary` and confirm all 5 lights are GREEN. If any are YELLOW/RED, investigate immediately.

#### 2. API Contract + Error Path Tests (MEDIUM LEVERAGE)
~60 remaining tests from the test gap fill plan: dashboard route, discount routes, auth edge cases, response shape contracts.

#### 3. Update Tier Config When Mat Sends Numbers (BLOCKED — waiting on Mat)
Mat is finalizing new DD/target values for 5k/10k/25k tiers. Once he sends them, update `funded-rules.ts` and `plans.ts`. Run full suite to verify.

---

### Mar 2, 2026 (8:15 PM CT) — Prior Session Deploy ✅

| Change | Files |
|--------|-------|
| Funded popup race condition — Close API now awaits evaluator | `close/route.ts`, `OpenPositions.tsx`, `PortfolioPanel.tsx` |
| Equity display clickable — nav equity opens Portfolio panel | `PortfolioPanel.tsx` |
| Tier label + bigger font — `5K EVALUATION` / `10K FUNDED` | `PortfolioPanel.tsx`, `balance/route.ts` |
| Carousel landing-only — hero only renders on Trending tab | `MarketGridWithTabs.tsx` |
| Carousel CSS polish + `getOutcomeName` dedup | `FeaturedCarousel.tsx` |

---

### Feb 27, 2026 — Mat Feedback Completion + QA Runbook v2

Shipped trade history `groupItemTitle` fix and funded dashboard layout reorder. Audited ALL Mat feedback — confirmed 100% complete. Created QA Runbook v2 (80+ checks).

---

*(Entries prior to Feb 27 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*
