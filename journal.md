# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

---

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 10, 2026 (2:30 PM CT) — Live Execution Test Results

| Item | Status |
|------|--------|
| **BUY trade** | ✅ VERIFIED — $5 buy, 8.62 shares @ 58¢. UI, DB, API all match exactly |
| **SELL trade** | ✅ VERIFIED — sold @ 54¢, $4.65 proceeds. Cash math exact to the penny |
| **Checkout flow** | ✅ FIXED — added frontend gate via `/api/challenge/active` (`4856a80`) |
| **Payout flow** | ✅ FIXED — hardcoded $300 replaced with real data, zero-profit banner (`4856a80`) |
| **Risk engine** | ✅ Drawdown bar and Today P&L updated after trade |
| **Challenge duration** | ✅ FIXED — backend (`88e8538`) + all UI text 30→60 days (`1264642`) |
| **StartChallengeButton** | ✅ FIXED — was redirecting to `/trade` (404), now `/dashboard/trade` (`1264642`) |
| **Settlement cron** | ✅ Running. 3 positions still waiting for Polymarket resolution |
| **Test suite** | ✅ 1341 passed, 0 failed |
| **Mobile** | ✅ 9.5/10 — all flows usable at 390×844 |

### ⚠️ What the Next Agent Must Know

1. **Vercel plan must remain Pro.** Never downgrade to Hobby — paid commercial product.
2. **`dbPool` vs `db`:** `db` = neon-http (stateless, all reads). `dbPool` = neon-serverless WebSocket (transactions only). Any new `tx.execute()` call must access `.rows[0]`, NOT `[0]` directly.
3. **Banner fix (`2c2217f`) is UNVERIFIED by Mat** — he hasn't triggered a daily breach since the fix.
4. **`npm run test` uses Vitest watch mode.** Always run `npm run test -- --run` or `npx vitest run` to get an exit.
5. **Neon branching is configured.** Preview deploys on `develop` use `ep-autumn-haze-adluhbxu`. Production uses `ep-royal-lab-adny4asz`.
6. **Settlement cron now runs every 10 min.** If positions appear stale, check Vercel Cron logs first.
7. **3 open positions remain** from March 9 (unsettled — markets not yet resolved on Polymarket).
8. **Checkout frontend doesn't enforce single-challenge gate.** API blocks, but user sees payment form first.
9. **Payout UI shows $300 when no profit exists.** Trace the `AvailableBalanceCard` data source.

---

## 🔜 Tomorrow Morning (ranked by leverage × risk)

1. **Fix checkout frontend gate** — add active-challenge check before navigating to `/checkout`. Small fix, high UX impact.
2. **Fix payout $300 phantom display** — trace where the `$300` comes from in `AvailableBalanceCard`. Backend is correct.
3. **Check 3 remaining positions** — are the March 9 markets resolved on Polymarket?
4. **Commit `88e8538` needs to be pushed** — challenge duration fix is on `develop`, not yet deployed.
5. **Verify banner fix with Mat** — needs a real daily drawdown breach to confirm.

