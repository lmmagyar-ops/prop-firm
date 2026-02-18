---
description: Mandatory bug fix workflow — trace from pixel to DB before writing any code
---

# /fix-bug — Bug Fix Workflow

> **Why this exists:** A market title bug was "fixed" 3 separate times by 3 different agents over 4 days. Each time, the agent fixed a service function that the UI didn't call. This workflow prevents that pattern.

## Before writing ANY code:

### 1. Reproduce the bug visually
// turbo
```bash
# Take a screenshot or note the exact bad output
# Example: "Market 10190976..." instead of "Bitcoin price on Feb 16?"
```

### 2. Grep for EVERY producer of the bad output
// turbo
```bash
# Search for the exact fallback string pattern, not function names
rg "slice\(0, 8\)" src/ --no-heading
rg "Market \$\{" src/ --no-heading
```
**Count the results. If there are N producers, you must fix N code paths — not 1.**

### 3. Trace backward from the pixel
Document the EXACT chain from UI component → API → service → data source:
```
[Component] → [fetch call] → [API route] → [service function] → [data source]
```

Example of what should have been traced:
```
RecentTradesWidget → apiFetch('/api/trades/history') → enrichTrades() → getAllMarketData() → Redis (NO DB fallback!)
OpenPositions      → dashboard SSR → getPositionsWithPnL() → getBatchTitles() → Redis + DB fallback ✅
```

### 4. Identify the canonical implementation
- Which code path has the most complete fallback chain?
- All other code paths should call the canonical one, not duplicate it

### 5. Write the fix
- Consolidate duplicates → single canonical function
- Fix the canonical function if it's also broken
- Add a regression test using the EXACT failing input

### 6. Verify with the FAILING input
- Use the specific input that was broken (e.g., the exact market ID)
- Don't just check "it looks fine" on a different input that happens to work
// turbo
```bash
npm run test
```

### 7. Browser verify the EXACT pixel that was wrong
- Take a screenshot of the same page/component where the bug was visible
- Confirm the specific bad output is gone

## Red flags that the fix is incomplete:
- [ ] You only modified ONE file but found the bad output in multiple files
- [ ] You verified with a different input than the one that was broken
- [ ] You fixed a service function but didn't check if the UI calls it
- [ ] The bad output string still appears in `rg` results after your fix

### 8. Complete the Pre-Close Checklist (MANDATORY)
Paste this in your journal entry and fill it out honestly:
```
## Pre-Close Checklist
- [ ] Bug/task was reproduced or understood BEFORE writing code
- [ ] Root cause was traced from UI → API → DB (not just the service layer)
- [ ] Fix was verified with the EXACT failing input (not a synthetic test trade)
- [ ] `grep` confirms zero remaining instances of the old pattern
- [ ] Full test suite passes (number: ____)
- [ ] tsc --noEmit passes
- [ ] CONFIRMED BY USER: _____ (or: "User has not tested — this is UNVERIFIED")
```

### 9. Update journal.md's `⚠️ CURRENT STATUS` section
- Add your fix to "Shipped But UNVERIFIED by User" with commit hash
- Do NOT mark it as confirmed unless the user explicitly says it works
- If you found new issues during the fix, add them to "Known Open Issues"
