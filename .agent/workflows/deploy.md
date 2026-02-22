---
description: Staging-first deployment workflow for safe production releases
---

# Staging-First Deployment Workflow

// turbo-all

## Branch Structure
- `develop` - Staging branch (auto-deploys to Vercel preview)
- `main` - Production branch (auto-deploys to production URL)

## Workflow Steps

### 1. Pre-Deploy Verification
```bash
# Core engine verification (53 assertions)
npm run test:engine

# Safety exploit scenario proofs (44 assertions)
npm run test:safety

# Full challenge lifecycle (74 assertions)
npm run test:lifecycle

# Type safety
npx tsc --noEmit
```

### 2. Schema Check
If you modified `src/db/schema.ts`, run the schema push **before deploying**:
```bash
npm run db:push
# Review the diff output — NEVER accept destructive changes without explicit approval
```

### 3. Commit and Push to Staging
```bash
git checkout develop
git add -A
git commit -m "feat: your change description"
git push origin develop
```

### 4. Run E2E Smoke Tests Against Staging
```bash
# Wait ~2 min for Vercel build, then run browser smoke tests
PLAYWRIGHT_BASE_URL=https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app \
  npm run test:e2e
```

### 5. Manual Staging Verification

Open the staging preview URL and verify each of these:

| # | Check | What to Look For |
|---|-------|-----------------|
| 1 | **Homepage loads** | No blank page, no console errors |
| 2 | **Sign in** | Login with test account → dashboard renders with correct balance |
| 3 | **Markets load** | Navigate to trade page → markets display, prices are not $0.00 |
| 4 | **Admin panel** | `/admin` loads, shows active account counts |
| 5 | **Browser console** | Open DevTools → Console → no uncaught errors or 500s |

### 6. Run Integration Tests Against Live DB
```bash
npm run test:lifecycle
npm run test:engine
npm run test:safety
```

**If any test fails, DO NOT promote to production. Fix the issue and redeploy to staging.**

### 7. Promote to Production
```bash
git checkout main
git merge develop
git push origin main
```

### 8. Post-Deploy Verification (Deep Health)
```bash
# Wait ~90s for Vercel build to complete, then run deep health verification.
# Pass the merge commit SHA to verify the correct code is deployed.
# Requires CRON_SECRET in .env.local for deep checks (DB, Sentry, worker, daily reset).
npm run test:deploy -- https://prop-firmx.vercel.app $(git rev-parse --short HEAD)
```

**All 10 checks must pass before proceeding:**
- Homepage + Login page serve (200)
- Deployed version matches expected SHA
- Database connected
- Sentry SDK initialized
- Worker heartbeat alive (< 120s)
- `startOfDayEquity` populated for all active accounts
- Cron status healthy
- System status healthy

**If any check fails, DO NOT proceed. Investigate immediately.**

### 9. Monitor for 10 Minutes
- **Sentry:** Check https://prop-firm-org.sentry.io → no new error spikes
- **Re-run verification:** `npm run test:deploy -- https://prop-firmx.vercel.app`
- **If error rate spikes:** Run emergency rollback immediately (see below)

### 10. Switch Back to Develop
```bash
git checkout develop
```

## Quick Reference
| Action | Command |
|--------|---------|
| Switch to staging | `git checkout develop` |
| Push to staging | `git push origin develop` |
| Promote to prod | `git checkout main && git merge develop && git push` |
| Post-deploy verify | `npm run test:deploy -- https://prop-firmx.vercel.app $(git rev-parse --short HEAD)` |
| Check current branch | `git branch` |

## Emergency Rollback
```bash
# If production has issues, revert the last commit
git checkout main
git revert HEAD
git push origin main
# Then verify the rollback worked:
npm run test:deploy -- https://prop-firmx.vercel.app
```

## Optional: Market Data Quality
```bash
# Only works when ingestion worker is running.
# Skip if worker is down — this is an infrastructure check, not a code gate.
npm run test:markets
```
