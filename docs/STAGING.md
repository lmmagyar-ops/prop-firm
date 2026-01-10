# Staging Environment Guide

## Overview

This project uses a **three-environment workflow**:

```
Local (dev) → Staging (testing) → Production (live)
```

## Environment URLs

| Environment | URL | Branch | Purpose |
|-------------|-----|--------|---------|
| **Local** | `localhost:3000` | any | Development |
| **Staging** | `staging.propshot.com` or Vercel preview | `staging` or PR | Pre-production testing |
| **Production** | `propshot.com` | `main` | Live users |

## How Staging Works

### Option 1: Vercel Preview Deploys (Automatic)
Every pull request automatically gets a preview URL:
- Create PR → Vercel deploys to `pr-123-propshot.vercel.app`
- Test features on preview URL before merging
- All PR deployments use production environment variables by default

### Option 2: Dedicated Staging Branch (Recommended)
1. Create a `staging` branch in GitHub
2. Configure Vercel to deploy `staging` branch to `staging.propshot.com`
3. Push to `staging` to test before `main`

## Setting Up Staging Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Production | Staging |
|----------|------------|---------|
| `DATABASE_URL` | Production DB | Staging DB |
| `REDIS_URL` | Production Redis | Staging Redis |
| `NEXT_PUBLIC_ENV` | `production` | `staging` |
| `DEMO_MODE` | `false` | `true` |

### Option A: Use Same DB with Staging Flag
If you don't want a separate database:
- Set `DEMO_MODE=true` in staging
- Staging users see a "STAGING" banner
- Trades are flagged as test trades

### Option B: Separate Staging Database (Recommended)
1. Create a second Neon database (free tier)
2. Run migrations: `DATABASE_URL=<staging-url> npm run db:migrate`
3. Configure in Vercel staging environment

## Workflow

### Daily Development
```bash
# Work on feature
git checkout -b feature/my-feature

# Push to create PR
git push origin feature/my-feature

# Vercel auto-deploys preview
# Test on https://my-feature-propshot.vercel.app
```

### Pre-Release Testing
```bash
# Merge feature to staging
git checkout staging
git merge feature/my-feature
git push origin staging

# Test on staging.propshot.com
# Run E2E tests against staging
PLAYWRIGHT_BASE_URL=https://staging.propshot.com npx playwright test
```

### Production Deploy
```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main

# Vercel auto-deploys to production
```

## Staging Checklist

Before merging to production:

- [ ] All CI checks pass
- [ ] E2E tests pass on staging
- [ ] Manual smoke test on staging
- [ ] No console errors
- [ ] Trading flow works
- [ ] Risk limits enforced
