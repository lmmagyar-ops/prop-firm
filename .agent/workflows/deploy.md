---
description: Staging-first deployment workflow for safe production releases
---

# Staging-First Deployment Workflow

## Branch Structure
- `develop` - Staging branch (auto-deploys to Vercel preview)
- `main` - Production branch (auto-deploys to production URL)

## Workflow Steps

### 1. Pre-Deploy Verification
```bash
# Run the trade engine integration test BEFORE deploying
# This verifies the full BUY → SELL → PnL → Balance pipeline
# If this fails, DO NOT deploy — fix the issue first
npm run test:engine

# Run the market data quality audit
# Checks for duplicates, stale prices, encoding corruption, structural issues
npm run test:markets
```
// turbo

### 2. Make Changes on Develop
```bash
# Ensure you're on develop
git checkout develop

# Make your changes, then commit
git add -A
git commit -m "feat: your change description"

# Push to staging
git push origin develop
```

### 3. Run E2E Smoke Tests Against Staging
```bash
# Wait ~2 min for Vercel build, then run browser smoke tests
PLAYWRIGHT_BASE_URL=https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app \
  npm run test:e2e
```
// turbo

### 4. Manual Verification on Staging
- Preview URL: `https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app`
- Also visible in Vercel dashboard under Deployments

### 5. Promote to Production
```bash
# After testing on staging, merge to main
git checkout main
git merge develop
git push origin main
```

### 6. Verify Production
- Check https://prop-firmx.vercel.app
- Monitor Vercel deployment status

## Quick Reference
| Action | Command |
|--------|---------|
| Switch to staging | `git checkout develop` |
| Push to staging | `git push origin develop` |
| Promote to prod | `git checkout main && git merge develop && git push` |
| Check current branch | `git branch` |

## Emergency Rollback
```bash
# If production has issues, revert the last commit
git checkout main
git revert HEAD
git push origin main
```
