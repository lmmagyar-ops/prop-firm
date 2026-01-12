# Trading Profit Display Issue - Investigation & Fixes

## Issue Description
User reported that after buying an evaluation and executing a trade, the position immediately shows 78% profit.

## Root Cause Analysis

### 1. Price Display Bug (FIXED)
**Location**: `/src/components/dashboard/OpenPositions.tsx` lines 80-83

**Problem**: Prices are stored as decimals (0.0-1.0 representing probability percentages) but were being displayed without conversion to cents.

**Example**:
- Entry price stored as: `0.22` (22% probability)
- Displayed as: `0.22¢` (WRONG)
- Should display as: `22¢` (CORRECT)

**Fix Applied**: Multiply prices by 100 before displaying:
```typescript
{(pos.entryPrice * 100).toFixed(2)}¢
{(pos.currentPrice * 100).toFixed(2)}¢
```

### 2. Missing Price Update Mechanism (ADDRESSED)
**Problem**: The `currentPrice` field in the positions table is set to `entryPrice` when a position is created, but there's no mechanism to update it with live market prices.

**Impact**: Without price updates, P&L calculations use stale prices, potentially showing incorrect profit/loss.

**Fix Applied**: 
- Created `/scripts/update-position-prices.ts` to periodically fetch latest prices from Redis and update positions
- Ensured both trade execution paths (`/lib/trade.ts` and `/api/trade/execute/route.ts`) properly initialize `currentPrice` to `entryPrice`

### 3. P&L Calculation
**Location**: `/src/lib/dashboard-service.ts` line 124

**Formula**:
```typescript
const unrealizedPnL = (current - entry) * shares;
```

**How 78% Profit Could Occur**:
If `currentPrice` is somehow set to a value significantly higher than `entryPrice`:

Example scenario:
- User buys at entry price: `0.22` (22¢)
- Shares purchased for $100: `100 / 0.22 = 454.54` shares
- If `currentPrice` becomes `1.0` (100¢ - max payout):
  - P&L = `(1.0 - 0.22) * 454.54 = 0.78 * 454.54 = $354.54`
  - ROI = `354.54 / 100 = 354%` (not 78%)

- If `currentPrice` becomes `0.39` (39¢):
  - P&L = `(0.39 - 0.22) * 454.54 = 0.17 * 454.54 = $77.27`
  - ROI = `77.27 / 100 = 77%` ≈ 78% ✓

**Likely Cause**: The `currentPrice` field is being set to an incorrect value (possibly through manual database manipulation, a bug in price updates, or test data).

## Fixes Applied

1. ✅ **Fixed price display** in `OpenPositions.tsx` to show correct cent values
2. ✅ **Ensured `currentPrice` initialization** in both trade execution paths
3. ✅ **Created price update script** to keep positions synchronized with market prices

## Recommended Next Steps

1. **Implement automated price updates**: Set up a cron job or background worker to run `/scripts/update-position-prices.ts` every 30-60 seconds

2. **Verify database state**: Check the actual `currentPrice` values in the database for existing positions:
   ```sql
   SELECT id, marketId, entryPrice, currentPrice, shares, 
          (CAST(currentPrice AS DECIMAL) - CAST(entryPrice AS DECIMAL)) * CAST(shares AS DECIMAL) as unrealizedPnL
   FROM positions 
   WHERE status = 'OPEN';
   ```

3. **Add validation**: Ensure `currentPrice` values are within reasonable bounds (0.01 to 0.99 for prediction markets)

4. **Monitor price sources**: Verify that Redis is being populated with correct market prices from the data ingestion pipeline

## Testing

To verify the fix:
1. Create a new evaluation
2. Execute a trade
3. Verify that:
   - Entry price displays correctly (e.g., "22¢" not "0.22¢")
   - Current price displays correctly
   - P&L is $0.00 immediately after trade (since current = entry)
4. Run the price updater script
5. Verify P&L updates based on real market price changes
