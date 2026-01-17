---
description: Staging-first deployment workflow for safe production releases
---

# Staging-First Deployment Workflow

## Branch Structure
- `develop` - Staging branch (auto-deploys to Vercel preview)
- `main` - Production branch (auto-deploys to production URL)

## Workflow Steps

### 1. Make Changes on Develop
```bash
# Ensure you're on develop
git checkout develop

# Make your changes, then commit
git add -A
git commit -m "feat: your change description"

# Push to staging
git push origin develop
```

### 2. Test on Staging
- Vercel auto-generates a preview URL for the `develop` branch
- Preview URL pattern: `prop-firmx-git-develop-*.vercel.app`
- Also visible in Vercel dashboard under Deployments

### 3. Promote to Production
```bash
# After testing on staging, merge to main
git checkout main
git merge develop
git push origin main
```

### 4. Verify Production
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
