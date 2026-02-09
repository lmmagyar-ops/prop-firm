# 🧪 Mat's Testing Guide — Evaluation Flow

**URL:** https://prop-firmx.vercel.app
**Goal:** Make sure the full evaluation flow works — from buying a challenge, to trading, to passing or failing.

---

## Before You Start

- Use Google Chrome (desktop, not phone)
- Log in with your account, or create a new one
- Have this doc open on the side so you can check things off

---

## Test 1: Buy an Evaluation

1. Go to the **Buy Evaluation** page (sidebar → "Buy Evaluation")
2. Pick the **Scout ($5K)** tier — it's the cheapest at $79
3. Complete the checkout
4. After purchase, you should land on the **Dashboard**
5. ✅ **Check:** Dashboard shows your balance as **$5,000.00**
6. ✅ **Check:** You see "Active Challenge" or similar at the top
7. ✅ **Check:** The sidebar "Trade" link is clickable (not locked)

> **Screenshot anything that looks wrong or confusing.**

---

## Test 2: Make Your First Trade (BUY YES)

1. Click **Trade** in the sidebar
2. Browse the markets — pick any one that interests you (politics, sports, whatever)
3. Click on a market to open it
4. In the trade panel on the right:
   - Make sure **YES** is selected
   - Enter **$25** as your trade amount
   - Click the **Buy** button
5. ✅ **Check:** You get a success message (green), not an error (red)
6. ✅ **Check:** Your balance dropped by ~$25
7. Go back to **Dashboard**
8. ✅ **Check:** You see the position listed under "Open Positions"
9. ✅ **Check:** The position shows a P&L value (could be +$0.XX or -$0.XX — both are fine)

---

## Test 3: Make a NO Trade

1. Go back to **Trade**, pick a different market
2. This time click **NO** instead of YES
3. Enter **$25** and buy
4. ✅ **Check:** Trade succeeds (no errors)
5. ✅ **Check:** Dashboard shows 2 open positions now

---

## Test 4: Close a Position (SELL)

1. On the **Dashboard**, find your Open Positions
2. Click the **Close** button on one of your positions
3. ✅ **Check:** Position disappears from Open Positions
4. ✅ **Check:** Your balance changed (went up or down depending on price movement)
5. ✅ **Check:** The trade shows up in your Trade History

---

## Test 5: Try Some Edge Cases

These should all be **blocked** by the system (you should see an error message, not a crash):

### 5a. Spend more than you have
1. Try to place a trade for **$6,000** (more than your $5K starting balance)
2. ✅ **Check:** You get an error message like "Insufficient balance" — NOT a blank screen or crash

### 5b. Tiny trade
1. Try to place a trade for **$0.50** (very small amount)
2. ✅ **Check:** Either it works or you get a clean error — no crash

### 5c. Multiple trades on the same market
1. Already have a YES position on a market? Try buying YES again on the same one
2. ✅ **Check:** It should add to your position (not error out)

---

## Test 6: Check the Dashboard Numbers

1. Go to **Dashboard** and look at everything carefully:
   - ✅ **Balance** — does the number make sense given your trades?
   - ✅ **Equity** — should be close to your balance ± open position P&L
   - ✅ **Drawdown bars** — should show a percentage (not 0% unless you're exactly breakeven)
   - ✅ **Days Remaining** — should show how many days left in your challenge
   - ✅ **Profit Target** — should show 10% ($500 for the Scout tier)

---

## Test 7: Verification Pass (Admin Side)

> **This part needs Les to help or give you admin access**

1. If your account has made enough profit to hit the 10% target ($500 on Scout)...
2. The system should automatically mark your challenge as **PASSED**
3. ✅ **Check:** Dashboard changes to show "Funded Account" instead of "Active Challenge"
4. ✅ **Check:** You can still trade (funded accounts can keep trading)

---

## What to Report

For anything that looks off, note:

1. **What you did** (which button you clicked, what you typed)
2. **What you expected** to happen
3. **What actually happened** (screenshot if possible)
4. **The market name** if it was a trading issue

Drop these in the Google Doc or text Les directly.

---

## Quick Reference — What the Numbers Mean

| Term | Meaning |
|------|---------|
| **Balance** | Your cash (money not in positions) |
| **Equity** | Balance + value of all open positions |
| **Drawdown** | How much you've lost from your starting balance |
| **Max Drawdown** | The most you're allowed to lose (8% = $400 on $5K) |
| **Daily Drawdown** | Max loss allowed in a single day (4-5%) |
| **Profit Target** | How much profit you need to pass (10% = $500 on $5K) |

---

*Last updated: Feb 9, 2026*
