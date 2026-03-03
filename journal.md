# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 3, 2026 (12:30 AM CT) — DEPLOYED TO PRODUCTION ✅

**Pushed to `develop` and merged to `main` (`26b438e`). Staging verified via browser smoke test. User eyeballed staging.**

| Change | File |
|--------|------|
| **Phase-aware balance reconstruction** — Funded challenges now only replay post-transition trades. Detects boundary via last `pass_liquidation` trade. Eliminated `shares * price` recalculation in favor of stored `trade.amount`. | `balance-audit/route.ts` |
| **Same fix for CLI script** — Same phase-aware logic applied. | `verify-balances.ts` |
| **Today's Floor = equity − dailyLimit** — Mat reported incorrect value ($24K on $11K equity). Changed `startOfDayBalance - maxDailyDrawdown` → `equity - maxDailyDrawdown` in both funded and challenge risk meters. | `FundedRiskMeters.tsx`, `RiskMeters.tsx` |
| **Daily loss % bar: equity-corrected baseline** — Numerator used cash-only `startOfDayBalance`, denominator used equity-based SOD. Replaced `startOfDayBalance` prop with `dailyDrawdownBaseline` from `getFundedStats`. | `FundedRiskMeters.tsx`, `dashboard-service.ts`, `page.tsx` |
| **Formula consistency audit** — Grepped 50+ formula refs across 15 files. Risk engine (evaluator, risk-monitor, risk.ts) all consistent. Found/fixed 3 UI split-brains (above). No further mismatches. | Full audit in `walkthrough.md` |
| **Rounding fix** — Today's Floor and daily limit now display 2 decimal places (was showing 3). | `FundedRiskMeters.tsx` |

**Root cause:** Balance audit: reconstructed from *all* trade history, but `BalanceManager.resetBalance()` during funded transition resets to `startingBalance`. Formula bugs: Mar 2 Daily Drawdown Correction migrated risk engine to equity-based baselines, but UI components weren't swept in the same pass.

**Verification:** `tsc --noEmit` clean, 81/81 test files (1206 passed). Staging browser smoke test ✅. User-verified on staging ✅.

## Pre-Close Checklist
- [x] Bug/task was reproduced or understood BEFORE writing code
- [x] Root cause traced from Sentry → cron route → BalanceManager.resetBalance → evaluator transition
- [x] Fix verified with full test suite (1206 tests)
- [x] `grep` confirms no remaining `shares * price` recalculation in audit paths
- [x] Full test suite passes (1206)
- [x] tsc --noEmit passes
- [x] Staging browser smoke test passed
- [x] User eyeballed staging — confirmed correct
- [x] Deployed to production (`26b438e`)

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
