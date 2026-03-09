# MIGRATION_PLAN.md — Prisma Postgres → Direct Neon

## Overview
This document describes the cutover from Prisma Postgres® (managed, via `db.prisma.io`) to a direct Neon connection (`neon.tech`), enabling the `@neondatabase/serverless` neon-http driver and eliminating TCP idle connection errors permanently.

**Status:** Branch `feat/neon-http-direct` is fully validated. Awaiting production cutover window.

---

## Why We're Doing This

| Current (postgres.js + Prisma Accelerate) | Target (neon-http + Direct Neon) |
|---|---|
| 581 TLSWrap idle TCP errors/week | 0 (stateless HTTPS per query) |
| Persistent TCP pool, kills after ~30s idle | No connection to kill |
| Requires postgres.js workaround (`max:1, idle_timeout:20s`) | No workaround needed |
| `db.prisma.io` proxy — added latency | Direct Neon — lower latency |

---

## Prerequisites (Before Day-Of)

- [ ] `pg_dump` / `psql` installed locally: `brew install postgresql@16`
- [ ] Vercel CLI installed: `npm i -g vercel` and logged in (`vercel login`)
- [ ] `PRISMA_URL` exported — value from `.env.local` `DATABASE_URL`
- [ ] `NEON_DIRECT_URL` exported — value from Neon console (project: `prop-firm-direct`)
- [ ] Notify any active traders (maintenance window, ~20 min)
- [ ] Confirm no pending payouts or positions being settled

---

## Cutover Steps (Day-Of)

> **Estimated time:** 15–20 minutes end-to-end

### 1. Set environment variables
```bash
export PRISMA_URL="postgres://c34f4290...@db.prisma.io:5432/postgres?sslmode=require"
export NEON_DIRECT_URL="postgresql://neondb_owner:npg_l2RHzFMTrG3K@ep-royal-lab-adny4asz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2. Run the migration script
```bash
bash scripts/migrate-to-neon-direct.sh
```

The script does the following (in order):
1. `pg_dump` backup to `/tmp/prop-firm-backup-TIMESTAMP.sql`
2. `drizzle-kit push` schema to direct Neon DB
3. `psql` restore data
4. Row count verification on `users`, `challenges`, `trades`, `positions`, `audit_logs`
5. `vercel env rm DATABASE_URL production` + `vercel env add DATABASE_URL production`
6. `vercel --prod --yes` (redeploy)

**Fails closed on step 4:** If any table row count doesn't match, the script exits before touching Vercel.

### 3. Merge the feature branch
```bash
git checkout main
git merge feat/neon-http-direct
git push origin main
```

### 4. Verify production
```bash
curl https://prop-firmx.vercel.app/api/system/status
# Expected: {"status":"healthy",...}
```

---

## Rollback (if anything goes wrong)

Production DATABASE_URL is only updated in Vercel **after** the row count check passes. If the deployment fails or you see errors:

```bash
# 1. Restore the Prisma Postgres URL in Vercel
vercel env rm DATABASE_URL production --yes
echo "$PRISMA_URL" | vercel env add DATABASE_URL production

# 2. Redeploy the LAST KNOWN GOOD commit (main before the merge)
vercel --prod --yes
```

The Prisma Postgres database is **not modified** during migration — it remains the authoritative source until step 5.

---

## Post-Migration Cleanup

Once stable for 48+ hours:
- [ ] Cancel Prisma Postgres subscription (or downgrade to free tier)
- [ ] Remove `PRISMA_DATABASE_URL` from Vercel env vars
- [ ] Delete `scripts/migrate-to-neon-direct.sh` (no longer needed)
- [ ] Archive `prop-firm-backup-*.sql` to S3/cold storage
