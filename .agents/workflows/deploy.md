---
description: Staging-first deployment workflow for safe production releases
---

# Deployment Workflow

## ⚠️ COST CONTEXT
Every push to `main` or `develop` triggers a Vercel build (~2 min each).
The Vercel Pro plan includes limited build minutes. In Feb 2026, 464 builds
caused a $43 overage that **took production down for 4 hours**.

## Rules

### 1. NEVER merge to `main` after every fix
Batch all changes on `develop`. Only merge to `main` **once per session**,
after ALL changes are verified together on staging.

**❌ Wrong:** fix → merge → fix → merge → fix → merge (3 builds)
**✅ Right:** fix → fix → fix → verify staging → merge once (1 build)

### 2. Verify staging BEFORE merging to main
// turbo
```
git push origin develop
```

Wait for Vercel to build staging, then browser smoke test staging URL:
`https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app`

### 3. Merge to main (ONE deployment)
```
git checkout main && git merge develop --no-edit && git push origin main && git checkout develop
```

### 4. Post-deploy verification
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/cron/status" | python3 -mjson.tool
```

### 5. Railway worker changes
If `src/workers/ingestion.ts` was modified, the Railway worker also needs
a restart. Railway auto-deploys from `main` — verify with:
// turbo
```
curl -s "https://prop-firmx.vercel.app/api/markets/events" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Events: {len(d)}')"
```

## Summary: Max 2 Builds Per Session
1. One `develop` push (staging build)
2. One `main` merge (production build)

That's it. No exceptions unless there's a critical hotfix.
