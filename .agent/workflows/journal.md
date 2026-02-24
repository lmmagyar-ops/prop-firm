---
description: how to write and maintain journal.md entries
---

## Before Writing Anything

1. Run `view_file` on the full `journal.md` (KI artifact path) to read current state.
2. Identify entries older than 7 days from today's date. **Delete them** before writing new content — prune from the bottom upward. Old entries are not needed; the KI forensic history serves as the long-term record.
3. Check the `⚠️ CURRENT STATUS` block — it must be updated every session.

## Writing Rules

// turbo-all

4. **Never write more than ~40 lines in a single tool call.** The IDE truncates large tool call parameters silently before they execute. If an entry exceeds ~40 lines, split it into two sequential writes and confirm each diff before proceeding.
5. **Update `⚠️ CURRENT STATUS` last** — after all entries are written, do a final pass on the status table to reflect the session's outcomes.
6. **Chunk structure**: One `replace_file_content` per date block. Example split for a big session:
   - Write 1: Feb 15–16 entries
   - Write 2: Feb 18–19 entries  
   - Write 3: Feb 20–22 entries + CURRENT STATUS update

## Entry Format

```
## YYYY-MM-DD: Short Title

#### N. Sub-task Name [emoji]
**Summary**: One sentence.
- **Root cause / context**: ...
- **Fix**: ...
- **Commit**: `abc1234`
- **Tests**: X/X pass
```

## Pre-Close Checklist (paste into every entry before signing off)

```
## Pre-Close Checklist
- [ ] Bug/task was reproduced or understood BEFORE writing code
- [ ] Root cause was traced from UI → API → DB
- [ ] Fix was verified with the EXACT failing input
- [ ] `grep` confirms zero remaining instances of old pattern
- [ ] Full test suite passes (number: ____)
- [ ] tsc --noEmit passes
- [ ] CONFIRMED BY USER: _____ (or: "User has not tested — UNVERIFIED")
```
