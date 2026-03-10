# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

---

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 10, 2026 (1:45 PM CT) — Financial Hardening + Launch Readiness

| Item | Status |
|------|--------|
| **Production** | ✅ Healthy — `80a20ff` live, 10/10 deploy checks |
| **Test suite** | ✅ 87 files, 1341 passed, 0 failed, 3 skipped |
| **Financial invariants** | ✅ `hardInvariant()` always throws on money paths (`ada65c9`) |
| **DB CHECK constraints** | ✅ 7 constraints block NaN/Infinity at Postgres level (`24b18e7`) |
| **NaN root cause** | ✅ Fixed `calculateImpact` 0/0 division + 4 regression tests (`0453a73`) |
| **Balance repair** | ✅ `a59d8d5e` corrected to `$24,610.33` (post-settlement). Audit: 6/6 HEALTHY |
| **Settlement cron** | ✅ Added to `vercel.json` at `*/10` — was NEVER scheduled before! (`80a20ff`) |
| **SODEquity repair** | ✅ `a59d8d5e` was `$946.43` → `$24,610.33`. Dashboard now shows `+$0.00 Today` |
| **Route redirects** | ✅ `/markets` → `/dashboard/trade`, `/settings` → `/dashboard/settings` |
| **Balance audit cron** | ✅ Bumped from daily to every 6 hours |

### ⚠️ What the Next Agent Must Know

1. **Vercel plan must remain Pro.** Never downgrade to Hobby — paid commercial product.
2. **`dbPool` vs `db`:** `db` = neon-http (stateless, all reads). `dbPool` = neon-serverless WebSocket (transactions only). Any new `tx.execute()` call must access `.rows[0]`, NOT `[0]` directly.
3. **Banner fix (`2c2217f`) is UNVERIFIED by Mat** — he hasn't triggered a daily breach since the fix.
4. **`npm run test` uses Vitest watch mode.** Always run `npm run test -- --run` or `npx vitest run` to get an exit.
5. **Neon branching is configured.** Preview deploys on `develop` use `ep-autumn-haze-adluhbxu`. Production uses `ep-royal-lab-adny4asz`.
6. **Settlement cron now runs every 10 min.** If positions appear stale, check Vercel Cron logs first.
7. **3 open positions remain** from March 9 (unsettled — markets not yet resolved on Polymarket).

---

## 🔜 Tomorrow Morning (ranked by leverage × risk)

1. **Check 3 remaining open positions** — are the March 9 markets resolved now? If so, settlement will auto-close them.
2. **Full end-to-end trade flow test** — buy a position, watch it update, sell it. Verify PnL, balance, trade history.
3. **Payouts flow** — verify the payout request system works for funded accounts.
4. **Stripe/checkout flow** — verify a new user can purchase an evaluation.
5. **Mobile responsiveness check** — can users trade on phone?
