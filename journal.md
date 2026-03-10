# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

---

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 10, 2026 (3:30 PM CT) — Live Execution Verified, Pre-Push Audit Complete

**5 commits on `develop`, NOT yet pushed.** User needs to push once to deploy.

| Item | Status |
|------|--------|
| **BUY trade** | ✅ VERIFIED — triple-source (UI/DB/API). $5 buy, 8.62 shares @ 58¢, all 3 match exactly |
| **SELL trade** | ✅ VERIFIED — sold @ 54¢, $4.65 proceeds. Cash math exact to the penny |
| **Checkout gate** | ✅ FIXED — frontend now checks `/api/challenge/active` before showing form (`4856a80`) |
| **Payout display** | ✅ FIXED — was hardcoded `$300.00` in JSX. Now dynamic from `getAvailableBalance()` (`4856a80`) |
| **Risk engine** | ✅ Drawdown bar and Today P&L update correctly after trades |
| **Challenge duration** | ✅ FIXED — backend API (`88e8538`) + all UI text 30→60 days (`1264642`) |
| **Start button redirect** | ✅ FIXED — was `/trade` (404), now `/dashboard/trade` (`1264642`) |
| **Confirmo invoice text** | ✅ FIXED — "Phase 1: Trading Challenge. 30 Days." → "60 Days." (`1264642`) |
| **Settlement cron** | ✅ Running every 10 min. 3 positions still awaiting Polymarket resolution |
| **Test suite** | ✅ 87 files, 1341 passed, 0 failed, 3 skipped |
| **Mobile** | ✅ 9.5/10 — all core flows usable at 390×844 |

### Unpushed Commits on `develop`

```
88e8538  fix: challenge duration 30→60 days (backend — API + activation)
22c05bc  docs: journal update with live execution test results
4856a80  fix: checkout gate + payout phantom $300
1264642  fix: stale 30-day duration refs + /trade redirect 404
812f097  docs: journal update with pre-push audit results
```

### ⚠️ What the Next Agent Must Know

1. **PUSH FIRST.** There are 5 commits on `develop` that are NOT deployed. Push to `develop`, then merge to `main` when ready.
2. **Vercel plan must remain Pro.** Never downgrade to Hobby — paid commercial product.
3. **`dbPool` vs `db`:** `db` = neon-http (stateless, all reads). `dbPool` = neon-serverless WebSocket (transactions only). Any new `tx.execute()` call must access `.rows[0]`, NOT `[0]` directly.
4. **Banner fix (`2c2217f`) is UNVERIFIED by Mat** — he hasn't triggered a daily breach since the fix.
5. **`npm run test` uses Vitest watch mode.** Always run `npm run test -- --run` or `npx vitest run` to get an exit.
6. **Neon branching is configured.** Preview deploys on `develop` use `ep-autumn-haze-adluhbxu`. Production uses `ep-royal-lab-adny4asz`.
7. **Settlement cron runs every 10 min.** If positions appear stale, check Vercel Cron logs first.
8. **3 open positions remain** from March 9 (unsettled — markets not yet resolved on Polymarket).
9. **MoonPay "Credit Card" option on checkout is UI-only.** No backend integration exists. Only Confirmo (crypto) actually processes payments.
10. **`ChallengeStats.tsx` is dead code** — not imported anywhere. Has hardcoded `$500 Daily Loss` and `5.0 Lots`. Safe to delete.
11. **Trade `action` column is not populated.** The schema has `type` (BUY/SELL), `action` doesn't exist. The `total` column is also not set during trade insert — only `amount`, `price`, `shares`.

### What Was Done Today (Root Cause Pattern)

Today's bugs all shared the same root cause: **placeholder/hardcoded values that were never wired to real data or config.** This is what happens when features ship with mock data and nobody walks the end-to-end flow as a paying user.

**What we found:**
- `$300.00` hardcoded in payout form JSX (never connected to `getAvailableBalance()`)
- `30 days` hardcoded in 5 locations (config says 60 everywhere)
- `/trade` redirect (page doesn't exist, must be `/dashboard/trade`)
- No frontend challenge gate on checkout (API blocked, but UX was terrible)
- Settlement cron was never added to `vercel.json` (found earlier today)
- `startOfDayEquity` was stale from a manual balance repair

**How we verified:**
- Executed a real BUY and SELL on production
- Cross-referenced every number across UI screenshots, DB queries, and API responses
- All 3 sources matched to the penny

---

## 🔜 Tomorrow Morning (ranked by leverage × risk)

1. **Push the 5 commits** — deploy to staging via `develop`, verify on preview URL, merge to `main`.
2. **Check 3 remaining positions** — query Polymarket to see if the March 9 markets have resolved. If yes, settlement cron will auto-close them.
3. **Verify banner fix with Mat** — needs a real daily drawdown breach to confirm `2c2217f` works.
4. **MoonPay integration decision** — credit card checkout is UI-only. Either wire it up or remove it to avoid confusing users.
5. **Clean up dead code** — `ChallengeStats.tsx` (unused), and audit for other orphaned components.
6. **FAQ page duration references** — check `/dashboard/faq` for any stale 30-day challenge references (separate from 30-day payout cycle which is correct).
