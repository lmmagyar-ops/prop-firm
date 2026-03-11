# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

---

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 10, 2026 (7:00 PM CT) — Staging Deployed, 1 Local Commit Pending

**7 commits pushed to `develop` and deployed to staging.** 1 additional local commit (`e25d70b`) not yet pushed.

| Item | Status |
|------|--------|
| **Staging deploy** | ✅ 7 commits pushed (`80a20ff..093c78c`), Vercel staging build verified |
| **BUY/SELL trades** | ✅ VERIFIED — triple-source (UI/DB/API) on production |
| **Checkout gate** | ✅ Frontend checks `/api/challenge/active` before showing form |
| **Payout display** | ✅ Dynamic from `getAvailableBalance()` (was hardcoded $300) |
| **Challenge duration** | ✅ 60 days everywhere (backend + all UI text) |
| **Credit card checkout** | ✅ "Coming Soon" badge, crypto auto-selected (`e25d70b` — LOCAL ONLY) |
| **Dead code** | ✅ `ChallengeStats.tsx` deleted (`e25d70b` — LOCAL ONLY) |
| **FAQ 30-day refs** | ✅ Audited — all correct (payout/inactivity/affiliate, not duration) |
| **Test suite** | ✅ 87 files, 1341 passed, 0 failed |
| **Merge to `main`** | ❌ NOT YET — user chose to hold off, merge next session |

### ⚠️ What the Next Agent Must Know

1. **2 unpushed commits** on `develop`: `e25d70b` (checkout Coming Soon + ChallengeStats delete) and `7f22248` (journal). Push both, then merge `develop` → `main`.
2. **Staging is deployed** but `main` (production) hasn't been updated yet. The 7 pushed commits need to be merged.
3. **Vercel plan must remain Pro.** Never downgrade to Hobby.
4. **`dbPool` vs `db`:** `db` = neon-http (stateless). `dbPool` = neon-serverless WebSocket (transactions). `tx.execute()` → `.rows[0]`, NOT `[0]`.
5. **Banner fix (`2c2217f`)** is UNVERIFIED — needs real daily breach.
6. **`npm run test` uses Vitest watch mode.** Always use `--run` flag.
7. **3 open positions** from March 9 (markets not yet resolved on Polymarket).
8. **MoonPay** is not integrated. Credit card on checkout is UI-only with "Coming Soon" badge. See `payment_processor_analysis.md` in the Antigravity brain for the research.
9. **Paper MCP** added to `~/.gemini/antigravity/mcp_config.json`. Requires Paper Desktop app open with a file loaded. Uses `mcp-remote` bridge (`npx -y mcp-remote http://127.0.0.1:29979/mcp`). Restart Antigravity to pick it up.

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

1. **Push 2 local commits + merge `develop` → `main`** — `e25d70b` + `7f22248`. Push to `develop`, verify staging, merge to `main`.
2. **Check 3 remaining positions** — March 9 markets, settlement cron should auto-close if Polymarket resolved.
3. **Test Paper MCP** — restart Antigravity, open a Paper file, verify tools are available.
4. **Verify banner fix** — needs a real daily drawdown breach to confirm `2c2217f` works.
5. **PayoutsTab.tsx** — still references MoonPay as a provider option. Clean up when credit card decision is finalized.
