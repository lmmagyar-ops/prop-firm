# Post-Mortem: Settlement Silent Failure
**Date:** 2026-03-09  
**Severity:** P1 (Financial integrity — no actual user impact)  
**Duration:** March 8, ~4 PM CT → March 9, 1:50 PM CT (21 hours)  
**Author:** Agent + Les Magyar  

---

## Summary

After migrating from Prisma to direct Neon on March 8, `settlement.ts` silently failed to credit trader balances when markets resolved. The settlement cron would run, close positions, insert SELL audit records, but **never update `currentBalance`**. The bug was masked because no markets resolved in the ~21 hour window.

---

## Timeline

| Time | Event |
|------|-------|
| Mar 8, ~4 PM CT | Neon migration deployed (`997c9ea`) — switched from `postgres.js` to `neon-http` + `neon-serverless` |
| Mar 8–9 | Settlement cron runs but no markets resolve → bug dormant |
| Mar 9, 1:30 PM CT | Test suite analysis reveals 29 failing tests from stale mocks |
| Mar 9, 1:40 PM CT | Root cause found: `tx.execute()` result access pattern broken |
| Mar 9, 1:50 PM CT | Fix committed, DB damage audit: 0 missed settlements |
| Mar 9, 1:57 PM CT | Production deploy complete, 11/11 health checks passed |

---

## Root Cause

`settlement.ts` used `dbPool.transaction()` to atomically lock, close, and credit positions. Inside the transaction, it used `tx.execute(sql\`SELECT ... FOR UPDATE\`)` to lock the position row.

**The old driver (`postgres.js`)** returned a plain array from `.execute()`:
```ts
// Old behavior (postgres.js):
const rows = await tx.execute(...);
// rows = [{ id: '...', status: 'OPEN' }, ...]
const locked = rows[0]; // ✅ worked
```

**The new driver (`neon-serverless`)** wraps the result:
```ts
// New behavior (neon-serverless):
const result = await tx.execute(...);
// result = { command: 'SELECT', rowCount: 1, rows: [...], fields: [...] }
const locked = result[0]; // ❌ undefined — indexing an object, not an array
```

With `locked === undefined`, the guard `if (!locked || locked.status !== 'OPEN')` was always `true`. The function returned early, skipping the balance update and SELL trade creation — always, for every settlement attempt.

---

## Why Tests Didn't Catch This

The `settlement.test.ts` was written as a real-DB integration test, which should have caught this. However:

1. The 29 failing tests from the Neon migration **included settlement tests** being masked by mock errors before reaching the real path
2. The settlement tests DO exercise the real `dbPool.transaction()` path — they failed with `expected 10000 to be close to 10500` immediately after the migration, but weren't investigated until March 9
3. The bug also surfaced in these tests once the mock issues were resolved

---

## Impact Assessment

- **Zero financial impact.** DB audit confirmed 0 positions settled via `market_settlement` between March 8–9.
- The settlement cron ran during this window but no Polymarket markets resolved in it.
- If a market had resolved: position would be marked `CLOSED`, SELL trade created, but `currentBalance` would remain unchanged — trader owed money would not receive it.

---

## Fix

```diff
// src/lib/settlement.ts
- const locked = (lockedRows as unknown as { id: string; status: string }[])?.[0];
+ // neon-serverless tx.execute() returns { rows: [...], rowCount, ... }, NOT a plain array
+ type NeonResult = { rows: { id: string; status: string }[] };
+ const locked = (lockedRows as unknown as NeonResult).rows?.[0];
```

---

## Follow-Up Actions

- [x] Fix deployed to production (`47f0d70`)
- [x] Settlement integration tests now pass (real DB, real transactions)
- [ ] **Add alerting:** If `positionsSettled === 0` but `positionsChecked > 0` for 2+ consecutive cron runs, fire Sentry alert
- [ ] **Audit `tx.execute()` usage across codebase** — any other call sites using the old plain-array cast?
- [ ] **Resolve pre-existing lifecycle test failure** — evaluator `reason` field returning `undefined` (separate issue, non-financial)

---

## Lessons Learned

1. **Driver migrations change result shapes.** After any DB driver swap, audit all `.execute()` call sites — raw query results are not abstracted by Drizzle and depend on the underlying driver's wire format.
2. **"No errors" ≠ "working correctly."** The settlement cron logged success lines but never mutated data. Add explicit balance-change assertions to post-settlement logging.
3. **Integration tests are the real gate.** The unit/mock tests passed fine post-migration; it was the real-DB integration tests that revealed the issue.
