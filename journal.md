# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

---

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 10, 2026 (8:00 AM CT) — Housekeeping Session

| Item | Status |
|------|--------|
| **Production** | ✅ Healthy — `c264d57` live |
| **Test suite** | ✅ 87 files, 1337 passed, 0 failed, 3 skipped |
| **ARCHITECTURE.md DB section** | ✅ Updated — was stale (referenced Prisma Postgres, postgres.js, db.prisma.io) |
| **Dead migration scripts** | ✅ Deleted (`migrate-data.ts`, `migrate-to-neon-direct.sh`, `MIGRATION_PLAN.md`) |
| **Vitest watch mode issue** | ✅ Diagnosed — `npm run test` hangs because Vitest defaults to watch mode. Use `npm run test -- --run` |
| **Journal pruned** | ✅ Entries older than 7 days removed |
| **Neon branching** | ✅ `develop` branch created (`ep-autumn-haze-adluhbxu`), Vercel `DATABASE_URL` scoped to Preview + `develop` |

### ⚠️ What the Next Agent Must Know

1. **Vercel plan must remain Pro.** Never downgrade to Hobby — paid commercial product.
2. **`dbPool` vs `db`:** `db` = neon-http (stateless, all reads). `dbPool` = neon-serverless WebSocket (transactions only). Any new `tx.execute()` call must access `.rows[0]`, NOT `[0]` directly.
3. **Banner fix (`2c2217f`) is UNVERIFIED by Mat** — he hasn't triggered a daily breach since the fix.
4. **`npm run test` uses Vitest watch mode.** Always run `npm run test -- --run` or `npx vitest run` to get an exit. The test script is `"test": "vitest"` (no `--run` flag).
5. **Neon branching is configured.** Preview deploys on `develop` use `ep-autumn-haze-adluhbxu` (Neon `develop` branch). Production uses `ep-royal-lab-adny4asz` unchanged.

---

## 🔜 Today's Priorities (ranked by leverage × risk)

### ~~PRIORITY 1 — Set Up Neon Branching for Preview Deployments~~ ✅ DONE
Neon `develop` branch created from `production`. Vercel `DATABASE_URL` scoped to Preview + `develop` branch. No auto-delete. Endpoint: `ep-autumn-haze-adluhbxu`.

### PRIORITY 2 — Check Sentry for TLSWrap Error Rate
Go to Sentry → Issues → filter `TLSWrap` and `Failed query`. The 581/week TLS drop errors should be at or near zero since March 8. If any new ones appear, investigate immediately. If count = 0, mark done.

### PRIORITY 3 — Verify Neon PITR Backup (30 min)
We're fully on Neon with no tested restore procedure. Neon console → `prop-firm-direct` → Settings → confirm PITR is enabled. Note the retention window. Document restore procedure in ARCHITECTURE.md.

---
