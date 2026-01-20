# Risk Rules Specification

**Version**: 1.0  
**Last Updated**: 2026-01-20  
**Status**: Audited and Complete

---

## Summary

The risk engine enforces 9 layers of protection to prevent traders from excessive losses, market manipulation, and arbitrage exploitation. All rules are checked **twice** per trade:
1. **Early exit** before any processing
2. **Inside transaction** with row lock to prevent race conditions

---

## Rule Reference

| Rule | Name | Limit | Formula | Status |
|------|------|-------|---------|--------|
| **1** | Max Total Drawdown | 8% | `equity < startBalance * 0.92` | ✅ Active |
| **2** | Max Daily Drawdown | 4% | `equity < sodBalance * 0.96` | ✅ Active |
| **3** | Per-Event Exposure | 5% | `eventExposure + trade > startBalance * 0.05` | ✅ Active |
| **4** | Per-Category Exposure | 10% | `catExposure + trade > startBalance * 0.10` | ✅ Active |
| **5** | Volume-Tiered Limit | Tiered | See below | ✅ Active |
| **6** | Market Impact | 10% vol | `trade > volume * 0.10` | ⚠️ Shadowed |
| **7** | Minimum Volume | $100k | `volume < 100000` | ✅ Active |
| **8** | Max Open Positions | Tiered | See below | ✅ Active |
| **9** | Arbitrage Block | N/A | Cross-platform YES/NO hedge | ✅ Active |

---

## Detailed Rules

### RULE 1: Max Total Drawdown (8%)

**Purpose**: Prevent catastrophic account loss.

**Formula**: 
```
equityFloor = startBalance * 0.92
if (currentEquity - estimatedLoss < equityFloor) → BLOCK
```

**Notes**:
- Uses **equity** (cash + position value), not just cash balance
- Static floor based on starting balance (never changes)

---

### RULE 2: Max Daily Drawdown (4%)

**Purpose**: Prevent single-day blowups.

**Formula**:
```
dailyFloor = startOfDayBalance * 0.96
if (currentEquity - estimatedLoss < dailyFloor) → BLOCK
```

**Notes**:
- Uses **equity** (cash + position value)
- Floor resets at midnight UTC based on end-of-day balance

---

### RULE 3: Per-Event Exposure (5%)

**Purpose**: Prevent concentration risk in single events.

**Formula**:
```
maxPerEvent = startBalance * 0.05
eventExposure = sum of positions in all markets within same event
if (eventExposure + tradeAmount > maxPerEvent) → BLOCK
```

**Notes**:
- Event detection via `getEventInfoForMarket()` API
- Falls back to single-market check if event lookup fails
- Sibling markets (e.g., "Bitcoin dip" and "Bitcoin moon") are grouped

---

### RULE 4: Per-Category Exposure (10%)

**Purpose**: Prevent sector concentration.

**Categories**: Crypto, Politics, Geopolitics, Sports, Finance, Tech, Culture, World

**Formula**:
```
maxPerCategory = startBalance * 0.10
categoryExposure = sum of positions in category
if (categoryExposure + tradeAmount > maxPerCategory) → BLOCK
```

**Notes**:
- Categories inferred from market title if not provided by API
- Keyword matching in `inferCategoriesFromTitle()`

---

### RULE 5: Volume-Tiered Exposure

**Purpose**: Limit trades based on market liquidity.

| Volume Tier | Max Exposure |
|-------------|--------------|
| >$10M | 5% of balance |
| $1-10M | 2.5% of balance |
| $100k-1M | 2% of balance |
| <$100k | Blocked (RULE 7) |

**Notes**:
- Limits are per individual trade, not cumulative

---

### RULE 6: Market Impact (10% of Volume)

**Purpose**: Prevent market manipulation.

**Formula**:
```
maxImpact = marketVolume * 0.10
if (tradeAmount > maxImpact) → BLOCK
```

> ⚠️ **Note**: With current configuration, this rule is effectively **shadowed** by RULE 3. Per-event limit (5% = $1,250 on $25k) is always tighter than market impact limit (10% of $100k+ = $10k+).

---

### RULE 7: Minimum Volume Filter ($100k)

**Purpose**: Block illiquid markets.

**Formula**:
```
if (marketVolume < 100000) → BLOCK
```

---

### RULE 8: Max Open Positions (Tiered)

**Purpose**: Prevent over-diversification / excessive exposure.

| Account Size | Max Positions |
|--------------|---------------|
| ≥$25k | 20 |
| ≥$10k | 15 |
| ≥$5k | 10 |
| <$5k | 5 |

---

### RULE 9: Arbitrage Block

**Purpose**: Prevent risk-free profit extraction.

**Logic**: Detects and blocks trades that would create hedged YES/NO positions across platforms (Polymarket + Kalshi).

---

## Defensive Checks

### Market Data Unavailable

If `getMarketById()` returns null:
```
return { allowed: false, reason: "Market data unavailable. Please try again." }
```

### Zero Volume Warning

If `market.volume === 0`:
```
console.log("⚠️ WARNING: Market volume is $0 - possible data issue")
```

---

## Test Coverage

**File**: `src/lib/risk.test.ts`  
**Total Tests**: 13

| Rule | Test Coverage |
|------|---------------|
| RULE 1 | ✅ Max total drawdown exceeded |
| RULE 2 | ✅ Max daily drawdown exceeded |
| RULE 3 | ✅ Per-market/event exposure exceeded |
| RULE 4 | ✅ Category exposure exceeded |
| RULE 5 | ✅ Volume-tiered exposure limit |
| RULE 6 | ✅ Trade within market impact limit |
| RULE 7 | ✅ Market volume too low |
| RULE 8 | ✅ Max positions exceeded + tier tests |
| RULE 9 | (Tested via ArbitrageDetector) |
| Defensive | ✅ Market data unavailable |
