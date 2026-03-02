---
description: Staging-first deployment workflow for safe production releases
---

# Deployment Workflow

## ⚠️ COST CONTEXT
Every push to `main` or `develop` triggers a Vercel build (~2 min each).
The Vercel Pro plan includes limited build minutes. In Feb 2026, 464 builds
caused a $43 overage that **took production down for 4 hours**.

## The ONE Rule

**Push ONCE per session. At the END of the session. Not in the middle.**

Work all day → commit locally → verify locally → push once → done.

The only exception is a mission-critical hotfix (prod is broken).

## Workflow

### 1. WORK LOCALLY ALL SESSION
Commit as often as you want. Git commits are free. Git pushes are not.

Verify everything with the local dev server:
// turbo
```
npm run dev
```

Type-check and run tests:
// turbo
```
npx tsc --noEmit && npx vitest run tests/ --reporter=dot 2>&1 | tail -5
```

Use the browser agent on `http://localhost:3000` to verify UI. Do NOT push
to staging just to "see if it looks right". That's lazy and expensive.

### 2. END-OF-SESSION: Push to develop
When you're done for the day, push everything at once:
// turbo
```
git push origin develop
```

Wait for Vercel to build staging, then do a final browser smoke test:
`https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app`

### 3. Merge to main (ONE production deployment)
Only after staging looks good:
```
git checkout main && git merge develop --no-edit && git push origin main && git checkout develop
```

### 4. Post-deploy verification
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/cron/status" | python3 -mjson.tool
```

### 5. Railway worker changes
If `src/workers/ingestion.ts` was modified, Railway auto-deploys from `main`. Verify:
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/markets/events" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Events: {len(d)}')"
```

## Summary: Max 2 Builds Total

| Build | When | Branch |
|---|---|---|
| 1 | End of session | `develop` (staging) |
| 2 | After staging verified | `main` (production) |

Journal-only or docs-only commits: **batch with the next code push**. Never push alone.

## When to Push Mid-Session (Exceptions)

Only if ALL of these are true:
1. Production is broken RIGHT NOW
2. Users are affected
3. The fix cannot wait until end of session

Everything else waits.
