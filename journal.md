# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 4, 2026 (11:55 AM CT) — PRODUCTION INCIDENT: Risk Monitor Blind

> [!CAUTION]
> **INCIDENT:** `market:prices:all` was EMPTY in production Redis. Risk monitor heartbeat was active, but with no prices, the fail-closed guard silently skipped ALL challenge checks. Mat's funded account breached 133.4% daily drawdown — undetected.

| Root Cause | Detail |
|------------|--------|
| **WS price stream down** | `market:prices:all` had TTL -2 (expired). WS not reconnecting after deploy. |
| **No fallback** | `batchFetchPrices()` only checked `market:prices:all`. When empty, returned 0 prices → fail-closed guard skipped every challenge. |
| **Silent failure** | The guard logged an error but no alert. Risk monitor appeared "healthy" via heartbeat. |

| Fix | File |
|-----|------|
| **Order book fallback** — `batchFetchPrices()` now falls back to `market:orderbooks` (REST poller, 1,986 tokens, `last_trade_price`). Logs warning on fallback, error on unrecoverable gaps. | `risk-monitor.ts` |

**Commits:** `c4c4c3b` (crypto markets), `d7577f7` (merge to main), `4500534` (hotfix). Push #3 used under production-broken exception.
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

#### 1. Deploy 1-Hour Crypto Markets (HIGH LEVERAGE — code complete, needs staging test)

Code is done (see Mar 4 entry). Before deploying:
- Push to `develop`, verify ingestion logs show "Fetching hourly crypto markets..."
- Confirm hourly markets appear under Crypto category on trade page
- Test trade > 1% of balance on hourly market → should be blocked
- Test normal market trade → still allows 5%

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

### Feb 26, 2026 — Security Fixes + Test Infrastructure

- Auth fail-open fix on 3 financial paths (dashboard, trade, challenges)
- DB error handling (503 + clean UI instead of raw 500s)
- `isMultiOutcome` undefined fix
- Test port conflict fix (hardcoded → dynamic)

---

### Feb 24, 2026 — PROMOTION_PNL_MISMATCH Sentry Alert (FALSE POSITIVE ✅)

Mat's challenge triggered the sanity gate during funded promotion. Timing window between `BalanceManager.credit()` and trade record query caused natural divergence for large single-trade PnL swings. Self-corrected on next evaluation cycle. No code fix needed.

---

*(Entries prior to Feb 24 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*
