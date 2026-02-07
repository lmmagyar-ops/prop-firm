# 🧪 Trading Engine Smoke Test

**Time:** ~15 minutes  
**When to run:** Before every deploy, or anytime you want confidence the engine works.

---

## Before You Start

- Log in at your production URL
- Have an **active challenge** (any tier)
- Note your **starting balance**

---

## Test 1: Buy YES → Sell YES (5 min)

1. **Pick any active market** with a price between 20¢–80¢ (avoid extreme prices)
2. **Click YES → Buy $10**
3. ✅ Verify:
   - Balance dropped by ~$10
   - Position appears in "Live Positions"
   - Trade shows in "Trade History" as BUY
4. **Go back to the same market → Click SELL** (close the position)
5. ✅ Verify:
   - Balance went back up (minus spread cost — expect to lose $0.50–$2)
   - Position disappears from "Live Positions"
   - Trade shows in "Trade History" as SELL with a PnL value

---

## Test 2: Buy NO → Sell NO (5 min)

6. **Pick a different market** → **Click NO → Buy $10**
7. ✅ Verify: Balance dropped, position shows as NO direction
8. **Close the NO position** (Sell)
9. ✅ Verify: Same as above — balance recovered, position gone, PnL shown

---

## Test 3: Rejection Check (2 min)

10. **Try to buy more than your balance** (e.g. type $99,999)
11. ✅ Verify: You get an error message, balance stays the same
12. **Try buying > $500 on a single market** (the 5% risk limit on a $10K account)
13. ✅ Verify: Risk limit error, balance unchanged

---

## Test 4: Admin Panel (3 min)

14. Go to `/admin` → **Traders** tab
15. ✅ Verify: Your trades from Tests 1-3 appear here with **real PnL values** (not $0)
16. Go to **Activity** feed
17. ✅ Verify: Activity feed shows your recent trades (not empty)

---

## What "Pass" Looks Like

| Check | Expected |
|-------|----------|
| BUY deducts balance | Exact dollar amount |
| SELL returns proceeds | Within ~$2 of original (spread cost) |
| PnL shows in trade history | Small negative number (spread) |
| Position appears/disappears | Real-time |
| Rejection errors work | Balance unchanged |
| Admin sees real PnL | Non-zero values |
| Admin activity feed has data | Shows your trades |

---

## If Something Fails

| Symptom | Likely Cause |
|---------|-------------|
| Balance doesn't change after BUY | Challenge might not be `active` |
| Position doesn't close | Refresh the page and retry |
| Admin shows $0 PnL | Schema fix not deployed — run `git pull` + redeploy |
| Activity feed empty | Same — `positionId` fix not deployed yet |
| "Market unavailable" error | Market may have been removed from Polymarket — try a different one |

---

## Automated Version

For the automated equivalent of this test (runs against the real DB + Redis):

```bash
npm run test:engine    # 32 assertions across 7 phases
```

This covers everything above plus edge cases (partial close, add-to-position) and balance invariants.
