# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 3, 2026 (12:05 PM CT) — LOCAL CHANGES, NOT YET DEPLOYED

**Shipped but UNVERIFIED by user:**

| Change | File |
|--------|------|
| **Activity tracking moved into DB transaction** — `recordTradingDay` was fire-and-forget; Vercel serverless killed background query → Sentry error. Now atomic with trade. | `trade.ts` |
| **checkConsistency downgraded** — `.catch()` uses `logger.warn` instead of `logger.error`. | `trade.ts` |
| **Order book engine tests** — 24 pure function tests: `invertOrderBook`, `isBookDead`, `buildSyntheticOrderBook`, `calculateImpact`. | `tests/lib/order-book-engine.test.ts` [NEW] |
| **ChallengeManager tests** — 9 tests: DB writes, status filtering, failure handling. | `tests/lib/challenge-manager.test.ts` [NEW] |
| **Close route tests** — 9 behavioral tests: auth, ownership, evaluator, idempotency. | `tests/api/close-route.test.ts` [NEW] |
| **Financial chaos tests** — 35 adversarial/boundary tests. Found 3 NaN edge cases documented in-test. | `tests/financial-chaos.test.ts` [NEW] |
| **Property-based math** — 25 fast-check invariant tests: direction symmetry (YES+NO=1), inversion symmetry, impact monotonicity, tier monotonicity, portfolio additivity. | `tests/property-based-math.test.ts` [NEW] |
| **Mocking mirage deleted** — 9 fake `expect(401).toBe(401)` tests removed. | `tests/api/trade-endpoints.test.ts` [DELETED] |

**Verification:** `tsc --noEmit` clean, 85/85 test files (1,299 passed — up from 1,206, +93 net).

**Previous deploy (Mar 3 12:30 AM):** Production `26b438e` — phase-aware balance reconstruction, formula consistency audit. User-verified ✅.

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

#### 1. Execute the 200-Test Gap Fill Plan (HIGH LEVERAGE)
Current: 1,206 tests. Target: ~1,400. The plan is fully scoped — see `task.md` artifact from previous conversation. Four phases:

| Phase | Tests | What |
|-------|-------|------|
| **Property-based math** | ~50 | Install `fast-check`. Invariant tests for `position-utils`, `order-book-engine`, drawdown formulas. |
| **API contracts + error paths** | ~60 | Close route (15), dashboard route (10), discount routes (10), auth edge cases (10), response shape contracts (15). |
| **Chaos/failure injection** | ~40 | Redis down mid-trade, DB failure mid-transaction, NaN/corrupt price feeds, concurrent double-execution. |
| **Targeted integration gaps** | ~50 | ChallengeManager DB writes, order-book inversion, funded-rules tier logic, cross-system invariants. |

#### 2. Quick Wins (if short on time)
1. **Close API route tests** — auth, ownership, idempotency, phase field, evaluator await
2. **ChallengeManager tests** — create/fail DB writes
3. **Order book inversion** — empty books, single-entry, bid/ask crossing

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
