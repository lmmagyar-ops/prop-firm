---
description: Mandatory financial consistency verification after any trading, PnL, risk, or dashboard UI changes
---

# Financial Consistency Verification

> **Origin:** Mat's Feb 2026 bug report exposed that functional tests ("does it work?") missed financial accuracy issues ("are the numbers right?"). This workflow closes that gap.

## When to Run (MANDATORY)

Run this workflow after **ANY** changes to:
- Trading logic (`src/lib/trade.ts`, `src/lib/trading/*`)
- PnL calculation or display (`position-utils.ts`, `dashboard-service.ts`)
- Risk engine rules or error messages (`src/lib/risk.ts`)
- Dashboard components (`src/components/dashboard/*`)
- Portfolio/positions UI (`OpenPositions.tsx`, `PortfolioPanel.tsx`, `PortfolioDropdown.tsx`)
- Trade modal or order form (`src/components/trading/*`)

## Step 1: Run API-Level Financial Tests

// turbo
```bash
npm run test:financial
```

This runs `verify-financial-consistency.ts` which tests 6 phases:
1. **Share Count Consistency** — trade response shares = DB position shares
2. **PnL Calculation Consistency** — `calculatePositionMetrics()` matches `getPortfolioValue()`
3. **Sell PnL Cross-Check** — sell trade PnL = closed position PnL = trade history PnL
4. **Entry Price Spread Audit** — reports slippage, checks entry within order book bounds
5. **Risk Limit Boundaries** — tests over-limit blocking and error message accuracy
6. **Equity Cross-Check** — dashboard equity path matches risk engine equity path

**Expected:** All assertions pass (exit code 0). If any fail, fix before proceeding.

## Step 2: Run Core Engine Tests (Regression Check)

// turbo
```bash
npm run test:engine
```

Confirm the financial changes didn't break the core 53-assertion trade engine suite.

## Step 3: Browser-Level Visual Checks (Manual)

If your changes affect **UI display** (not just backend logic), perform these checks using the browser tool on the **staging** preview URL:

### 3a. PnL Sign Verification
1. Open Dashboard → Open Positions table
2. For each position showing a loss: verify the PnL column shows a **minus sign** (not a plus)
3. For positions showing gain: verify **plus sign** or green color

### 3b. Cross-Widget Equity Sync
1. Note the equity value shown on the **Dashboard** (main panel)
2. Click the portfolio dropdown in the **top-right nav bar**
3. Compare equity values — they must match (within $1 for polling delay)

### 3c. Profit Target Display
1. Check the profit target widget on Dashboard
2. For a $5K account: should show **$5,500** (floor target equity), not just "$500"
3. Should follow the same format as drawdown floors

### 3d. Trade Modal → Toast Consistency
1. Open a trade modal, note the estimated shares before clicking Buy
2. After buy, check the success toast/notification
3. Compare share counts — they must match

## Step 4: Document Results

If all pass, note in `journal.md`:
```
**Financial verification:** ✅ All N assertions passed, browser checks clean
```

If any fail, investigate using the Number Discrepancy Audit Protocol in CLAUDE.md before deploying.
