# Post-Mortem: Phantom Daily PnL Display Bug
**Date:** 2026-02-20  
**Severity:** P2 — Incorrect financial data displayed to users (no money moved)  
**Status:** Resolved — commit `dd9e25e` on `develop`

---

## What Happened

The dashboard displayed a phantom daily profit to users — in the specific case that triggered this report, +$1,932.43 Today was shown when the real daily cash movement was approximately $0.

The number was not fabricated or random. It was a real calculation that produced a structurally wrong answer because two values with the same units (dollars) but different meanings were subtracted from each other.

---

## Impact

- **Who:** Any user with open positions on their active challenge.
- **What they saw:** A daily PnL figure that overstated their real daily performance by the full mark-to-market value of their open positions.
- **Duration:** Unknown — the mismatch was introduced when the position valuation system was added to equity calculation. It was not present in the earliest version of the platform (when equity = cash only).
- **Financial impact:** None. No money moved. No risk calculations were affected. The risk engine's daily drawdown limit remained correct throughout (see Root Cause section).
- **Decision impact:** Unknown. A user seeing +$1,932 of phantom daily gain could perceive their trading performance as better than it was. For a prop trading platform where financial feedback integrity is the product, this matters.

---

## Timeline

| Time | Event |
|------|-------|
| Unknown | `positions` feature added; equity changed from `cash` to `cash + positionValue` in `getDashboardData` |
| Unknown | `getEquityStats` formula `dailyPnL = equity - startOfDayBalance` introduced — correct when equity = cash, incorrect after positions were added |
| 2026-02-20 ~20:13 CT | User notices "+$1,932.43 Today" on production dashboard and flags it |
| 2026-02-20 ~20:23 CT | Investigation begins |
| 2026-02-20 ~20:48 CT | Root cause confirmed, fix approach decided |
| 2026-02-20 ~20:52 CT | Code changes complete, tsc clean, all 1132 tests pass |
| 2026-02-20 ~20:57 CT | DB migration applied, commit `dd9e25e` pushed to `develop` |

---

## Root Cause

The `daily-reset` cron snapshots `challenge.currentBalance` (cash) as `startOfDayBalance` at midnight.

The dashboard service computes `equity = cashBalance + totalPositionValue` (cash + open positions).

`getEquityStats()` then computed:

```
dailyPnL = equity - startOfDayBalance
         = (cash + positionValue) - cash_at_midnight
         = positionValue   ← phantom gain
```

This is a **semantic unit mismatch**: `equity` and `startOfDayBalance` both represent dollars but represent fundamentally different things. No type system caught it. No existing test exercised a scenario with both an open position *and* a non-trivial `startOfDayBalance`.

The risk engine's daily drawdown calculation (`startOfDayBalance - equity`) also uses `startOfDayBalance`, but in the *opposite* direction — it measures how far equity has fallen below the cash floor. This calculation is correct and safe, because losing position value correctly reduces equity below the floor. The risk engine was unaffected.

---

## Contributing Factors

**1. Incremental evolution without re-validation**  
`startOfDayBalance` was designed when equity = cash. When positions were added and equity evolved to `cash + positionValue`, the snapshot mechanism was not updated. The mismatch was created by addition, not deletion — making it invisible to a reviewer looking for regressions.

**2. No integration test at the cron ↔ display boundary**  
Every layer had unit tests. The cron has tests. `getEquityStats` has tests. But no test ran the full scenario: *open a position → simulate midnight snapshot → assert the displayed daily PnL.* The bug lived at the seam between tested systems.

**3. Audits catch code, not assumptions**  
Every audit confirmed "this code is correct given its inputs." None randomized the inputs and asked "what if `startOfDayBalance` and `equity` mean different things?" The assumption was implicit, widely shared among agent sessions, and never made testable.

**4. Plausible-looking formula**  
`equity - startOfDayBalance` reads correctly in English. It *is* correct — but only if both values represent the same concept of "account value." The code was defensible in isolation.

---

## Fix

Three parts, shipped as one commit (`dd9e25e`):

**1. Schema** — Added `startOfDayEquity` (nullable decimal) to `challenges` table. This column stores true equity (cash + live position mark-to-market) at midnight. `startOfDayBalance` (cash-only) is intentionally preserved for the risk engine.

**2. Cron** — `daily-reset` now fetches open positions and their live prices (falling back to stored `currentPrice` if Redis is cold), computes equity, and stores it as `startOfDayEquity` alongside the existing `startOfDayBalance` snapshot.

**3. Display** — `getEquityStats()` now uses `startOfDayEquity` for `dailyPnL`. Returns `null` when the column is absent (all pre-migration accounts until the first midnight cron run). `LiveEquityDisplay` renders `— Today` for null rather than a wrong number.

---

## What We Are NOT Doing

- Patching `startOfDayBalance` — it is correct for its purpose (risk engine daily drawdown floor)
- Backfilling `startOfDayEquity` for existing rows — the `— Today` display for one cycle is safer than a backfill with stale/estimated prices

---

## Prevention

**Immediate:** A regression test now asserts the null-safe contract: "challenge with open positions + no `startOfDayEquity` → `dailyPnL` is null." This would have caught the original bug the moment positions were introduced.

**Structural (Burst 2):** A `financial-display-boundary.test.ts` suite will document and pin every value that flows from DB state to user display. Given a single known DB fixture, it will assert equity, totalPnL, dailyPnL, drawdownUsage, dailyDrawdownUsage, and profitProgress. Each new financial display field must be added to this fixture.

**Process:** Any change that touches how `equity` is computed must also update the financial boundary test fixture. This makes the "same units, different meaning" class of bug a test failure, not a code review miss.

---

## Action Items

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Ship the fix | Agent | ✅ `dd9e25e` |
| 2 | Write financial display boundary test suite | Agent | 🔲 Burst 2 |
| 3 | Audit `FundedRiskMeters` daily loss display — uses `currentBalance` not `equity`; may understate daily loss when positions are open | Agent | 🔲 Flagged |
| 4 | Review admin analytics routes for `currentBalance` vs `equity` confusion | Agent | 🔲 Flagged |

---

## What Good Looks Like

A senior engineer at a company with genuine financial data integrity requirements would:

1. Never store a snapshot that represents one concept (`cash`) and then compare it against a value that has evolved to represent a different concept (`equity`) without updating the snapshot.
2. Write boundary tests that exercise the full path from "known DB state" to "value shown to user" — not just formula correctness in isolation.
3. When a concept evolves (equity = cash → equity = cash + positions), search for every downstream consumer of the old concept and validate them.

The code we now have embodies point 1. Burst 2 embodies point 2. Point 3 is an ongoing discipline, not a one-time fix.
