# 🧪 Bug Fix Testing — Feb 7 Deploy

**For:** Mat  
**Time:** ~10 minutes  
**URL:** https://prop-firmx.vercel.app  

> Wait a few minutes after deploy for Vercel to finish building. You'll know it's live when the changes below are visible.

---

## ✅ Test 1: PWA Popup (1 min)

**Bug:** PWA "Add to Home Screen" popup was appearing on desktop.

1. Open the site on your **laptop/desktop** browser
2. Browse around for 30+ seconds
3. ✅ **PASS:** No install popup appears on desktop

> It should still appear on mobile if you want to double-check.

---

## ✅ Test 2: Balance Display (1 min)

**Bug:** Balance showed "(10k)" with no decimals.

1. Go to **Dashboard**
2. Look at the account selector in the top area
3. ✅ **PASS:** Balance shows as **$9,868.97** (or whatever your actual balance is — with 2 decimal places, NO "(10k)" label)

---

## ✅ Test 3: Trade History Location (1 min)

**Bug:** Trade History link was too prominent in the sidebar.

1. Look at the **sidebar** (left nav)
2. ✅ **PASS:** "Trade History" is in the **Settings section** (lower part), NOT in the main nav at the top

---

## ✅ Test 4: Eval Locking (2 min)

**Bug:** Clicking "Buy Evaluation" locked the Trade tab.

1. Go to **Trade** tab → confirm it works and shows markets
2. Now go to **Buy Evaluation** page
3. Click back on **Trade** tab
4. ✅ **PASS:** Trade tab still works — markets load, you can click on them. It's NOT locked/grayed out.

---

## ✅ Test 5: Admin Tab Names (1 min)

**Bug:** Admin sidebar tab names were unclear.

1. Go to `/admin`
2. Check the sidebar tabs
3. ✅ **PASS:** Tabs say **Overview, Risk Desk, Users, Analytics, Growth, Discounts** (not generic names)

---

## ✅ Test 6: Settings Page / Kraken ID (1 min)

**Bug:** Kraken ID field was showing on Settings page.

1. Go to **Settings**
2. Click through all tabs: **User Info, KYC, Address**
3. ✅ **PASS:** No "Kraken ID" field visible anywhere

---

## ✅ Test 7: Market Quality (2 min)

**Bug:** Stale/resolved markets were showing up. Sports markets appeared in Geopolitics tab.

1. Go to **Trade** tab
2. Browse the market cards
3. ✅ **PASS:** No markets with prices at 95%+ or 5%- (these are basically decided)
4. Click the **Sports** tab → should have sports markets only
5. Click the **Geopolitics** tab → should NOT have any sports teams (Warriors, Seahawks, etc.)
6. ✅ **PASS:** Categories look correct — no obvious crossover

---

## Results Checklist

| # | Test | ✅ or ❌ |
|---|------|---------|
| 1 | No PWA popup on desktop | |
| 2 | Balance shows 2 decimals, no "(10k)" | |
| 3 | Trade History in Settings section | |
| 4 | Trade tab not locked after visiting Buy Eval | |
| 5 | Admin tabs have clear names | |
| 6 | No Kraken ID in Settings | |
| 7 | No stale markets, correct categories | |

**If everything passes, we're good! 🎉**

**If something fails**, screenshot it and send to Les.
