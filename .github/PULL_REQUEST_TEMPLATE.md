## Summary

<!-- What does this PR do? One sentence. -->

## Type of Change

- [ ] `fix:` Bug fix
- [ ] `feat:` New feature
- [ ] `perf:` Performance improvement
- [ ] `refactor:` Code change with no behavior change
- [ ] `docs:` Documentation only
- [ ] `chore:` Build, CI, dependencies
- [ ] `security:` Security patch

## Testing

- [ ] `npm run test:safety` passes (54 assertions)
- [ ] `npm run test:engine` passes (53 assertions)
- [ ] `npx tsc --noEmit` passes (zero type errors)
- [ ] `npm run lint` passes

<!-- For financial changes, also run: -->
- [ ] `npm run test:lifecycle` passes (81 assertions) _(financial changes only)_
- [ ] `npm run test:financial` passes _(financial changes only)_

## Financial Impact

<!-- Does this PR touch trade.ts, risk.ts, evaluator.ts, or BalanceManager.ts? -->
- [ ] No financial code changed
- [ ] Yes — I have verified both code paths (evaluator + risk-monitor)
- [ ] Yes — discrepancy is 0 in the audit endpoint after testing

## Root Cause (for bug fixes)

<!-- What systemic failure allowed this bug to exist? See ARCHITECTURE.md §Dual-Path Rule -->

## Screenshot / Verification

<!-- Required for any UI or financial change. "Tests pass" is not sufficient evidence. -->
