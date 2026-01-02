import { describe, it, expect } from 'vitest';

// Helper functions for balance and PnL tracking
// TODO: Move these to src/lib/balance-tracker.ts once implemented

function updateHighWaterMark(params: {
    currentHWM: number;
    newBalance: number;
}): number {
    const { currentHWM, newBalance } = params;
    return Math.max(currentHWM, newBalance);
}

function calculateBalanceAfterTrade(params: {
    previousBalance: number;
    tradePnL: number;
    fees: number;
}): number {
    const { previousBalance, tradePnL, fees } = params;
    return previousBalance + tradePnL - fees;
}

function calculatePositionPnL(params: {
    entryPrice: number;
    currentPrice: number;
    shares: number;
    direction: 'YES' | 'NO';
}): number {
    const { entryPrice, currentPrice, shares, direction } = params;

    if (direction === 'YES') {
        return (currentPrice - entryPrice) * shares;
    } else {
        // For NO positions, profit when price goes down
        return (entryPrice - currentPrice) * shares;
    }
}

function calculateRealizedPnL(params: {
    entryPrice: number;
    exitPrice: number;
    shares: number;
    direction: 'YES' | 'NO';
}): number {
    const { entryPrice, exitPrice, shares, direction } = params;

    if (direction === 'YES') {
        return (exitPrice - entryPrice) * shares;
    } else {
        return (entryPrice - exitPrice) * shares;
    }
}

// ===== TESTS =====

describe('High Water Mark Tracking', () => {
    it('updates HWM when balance exceeds previous high', () => {
        const hwm = updateHighWaterMark({
            currentHWM: 11000,
            newBalance: 11500,
        });
        expect(hwm).toBe(11500);
    });

    it('does not update HWM when balance decreases', () => {
        const hwm = updateHighWaterMark({
            currentHWM: 11500,
            newBalance: 11200,
        });
        expect(hwm).toBe(11500);
    });

    it('maintains HWM when balance stays the same', () => {
        const hwm = updateHighWaterMark({
            currentHWM: 10500,
            newBalance: 10500,
        });
        expect(hwm).toBe(10500);
    });

    it('correctly initializes HWM on first update', () => {
        const hwm = updateHighWaterMark({
            currentHWM: 10000, // Starting balance
            newBalance: 10300,
        });
        expect(hwm).toBe(10300);
    });
});

describe('Current Balance Updates', () => {
    it('recalculates balance after profitable trade', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000,
            tradePnL: 350,
            fees: 5,
        });
        expect(newBalance).toBe(10345);
    });

    it('handles negative PnL correctly', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000,
            tradePnL: -250,
            fees: 5,
        });
        expect(newBalance).toBe(9745);
    });

    it('deducts fees even on losing trades', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000,
            tradePnL: -100,
            fees: 10,
        });
        expect(newBalance).toBe(9890); // -100 PnL - 10 fees
    });

    it('handles zero PnL with fees', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000,
            tradePnL: 0,
            fees: 8,
        });
        expect(newBalance).toBe(9992);
    });

    it('handles large profitable trades', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000,
            tradePnL: 1500,
            fees: 15,
        });
        expect(newBalance).toBe(11485);
    });
});

describe('Position PnL Calculations', () => {
    it('calculates unrealized PnL for YES positions (profitable)', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.65,
            currentPrice: 0.72,
            shares: 1000,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(70, 1); // (0.72 - 0.65) * 1000
    });

    it('calculates unrealized PnL for YES positions (losing)', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.65,
            currentPrice: 0.60,
            shares: 1000,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(-50, 1); // (0.60 - 0.65) * 1000
    });

    it('calculates unrealized PnL for NO positions (profitable)', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.35,
            currentPrice: 0.28,
            shares: 1000,
            direction: 'NO',
        });
        expect(pnl).toBeCloseTo(70, 1); // (0.35 - 0.28) * 1000 (profit when price falls)
    });

    it('calculates unrealized PnL for NO positions (losing)', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.35,
            currentPrice: 0.42,
            shares: 1000,
            direction: 'NO',
        });
        expect(pnl).toBeCloseTo(-70, 1); // (0.35 - 0.42) * 1000 (loss when price rises)
    });

    it('handles zero PnL when price unchanged', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.50,
            currentPrice: 0.50,
            shares: 1000,
            direction: 'YES',
        });
        expect(pnl).toBe(0);
    });

    it('handles fractional share amounts', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.65,
            currentPrice: 0.75,
            shares: 1543.25,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(154.325, 2); // (0.75 - 0.65) * 1543.25
    });
});

describe('Realized PnL (Closed Positions)', () => {
    it('calculates realized PnL for closed YES position (profit)', () => {
        const pnl = calculateRealizedPnL({
            entryPrice: 0.65,
            exitPrice: 0.72,
            shares: 1000,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(70, 1);
    });

    it('calculates realized PnL for closed YES position (loss)', () => {
        const pnl = calculateRealizedPnL({
            entryPrice: 0.65,
            exitPrice: 0.58,
            shares: 1000,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(-70, 1);
    });

    it('calculates realized PnL for closed NO position (profit)', () => {
        const pnl = calculateRealizedPnL({
            entryPrice: 0.40,
            exitPrice: 0.30,
            shares: 2000,
            direction: 'NO',
        });
        expect(pnl).toBeCloseTo(200, 1); // (0.40 - 0.30) * 2000
    });

    it('calculates realized PnL for closed NO position (loss)', () => {
        const pnl = calculateRealizedPnL({
            entryPrice: 0.40,
            exitPrice: 0.48,
            shares: 2000,
            direction: 'NO',
        });
        expect(pnl).toBeCloseTo(-160, 1); // (0.40 - 0.48) * 2000
    });

    it('handles break-even trades', () => {
        const pnl = calculateRealizedPnL({
            entryPrice: 0.55,
            exitPrice: 0.55,
            shares: 1500,
            direction: 'YES',
        });
        expect(pnl).toBe(0);
    });
});

describe('Edge Cases & Precision', () => {
    it('handles very small price movements', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.5001,
            currentPrice: 0.5003,
            shares: 10000,
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(2, 1); // Very small but measurable profit
    });

    it('handles maximum position size', () => {
        const pnl = calculatePositionPnL({
            entryPrice: 0.60,
            currentPrice: 0.70,
            shares: 100000, // Large position
            direction: 'YES',
        });
        expect(pnl).toBeCloseTo(10000, 1); // (0.70 - 0.60) * 100000
    });

    it('correctly handles negative balances (should not happen but test anyway)', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 100,
            tradePnL: -200,
            fees: 5,
        });
        expect(newBalance).toBe(-105); // Account blown
    });

    it('handles decimal precision in balance calculations', () => {
        const newBalance = calculateBalanceAfterTrade({
            previousBalance: 10000.50,
            tradePnL: 123.75,
            fees: 3.25,
        });
        expect(newBalance).toBe(10121.00);
    });
});
