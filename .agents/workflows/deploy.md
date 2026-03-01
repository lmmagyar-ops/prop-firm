---
description: Staging-first deployment workflow for safe production releases
---

# Deployment Workflow

## ⚠️ COST CONTEXT
Every push to `main` or `develop` triggers a Vercel build (~2 min each).
The Vercel Pro plan includes limited build minutes. In Feb 2026, 464 builds
caused a $43 overage that **took production down for 4 hours**.

## Rules

### 1. VERIFY LOCALLY — NOT BY PUSHING TO STAGING
Before ANY push, run these locally:
// turbo
```
npx tsc --noEmit && npx vitest run tests/ --reporter=dot 2>&1 | tail -5
```

If you need to verify the UI, run the dev server locally:
// turbo
```
npm run dev
```

**DO NOT push to `develop` just to see if something works on staging.**
Push only when you are confident the code is correct.

### 2. COMMIT LOCALLY, PUSH ONCE
You may make as many local git commits as needed. But you only get
**ONE push to `develop`** per session. That push should contain all
your batched work.

**❌ Wrong:** commit → push → fix → push → fix → push (3 builds)
**✅ Right:** commit → commit → commit → verify locally → push once (1 build)

### 3. Verify staging after your ONE push
// turbo
```
git push origin develop
```

Wait for Vercel to build staging, then browser smoke test staging URL:
`https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app`

### 4. Merge to main (ONE deployment)
```
git checkout main && git merge develop --no-edit && git push origin main && git checkout develop
```

### 5. Post-deploy verification
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/cron/status" | python3 -mjson.tool
```

### 6. Railway worker changes
If `src/workers/ingestion.ts` was modified, the Railway worker also needs
a restart. Railway auto-deploys from `main` — verify with:
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/markets/events" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Events: {len(d)}')"
```

## Summary: Max 2 Builds Per Session
1. One `develop` push (staging build) — after ALL local verification passes
2. One `main` merge (production build) — after staging smoke test passes

That's it. No exceptions unless there's a critical hotfix.

Journal-only or docs-only commits should be **batched with the next code push**, not pushed separately.
