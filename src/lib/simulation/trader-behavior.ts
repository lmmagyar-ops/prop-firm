/**
 * Trader Behavior Simulation
 * 
 * Models realistic trader decision-making and trade execution.
 * Different archetypes (skilled, average, degen) have different behaviors.
 */

import { TraderArchetype, FIRM_CONFIG } from './config';

export interface Trader {
    id: string;
    archetype: TraderArchetype;
    archetypeName: 'skilled' | 'average' | 'degen';
    balance: number;
    startingBalance: number;
    highWaterMark: number;
    trades: Trade[];
    tradingDays: Set<string>;
    violations: string[];
    isActive: boolean;
}

export interface Trade {
    id: string;
    timestamp: Date;
    market: string;
    direction: 'YES' | 'NO';
    amount: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    balance: number;
}

/**
 * Generate a trader with specified archetype
 */
export function generateTrader(
    id: string,
    archetype: TraderArchetype,
    archetypeName: 'skilled' | 'average' | 'degen'
): Trader {
    return {
        id,
        archetype,
        archetypeName,
        balance: FIRM_CONFIG.startingBalance,
        startingBalance: FIRM_CONFIG.startingBalance,
        highWaterMark: FIRM_CONFIG.startingBalance,
        trades: [],
        tradingDays: new Set(),
        violations: [],
        isActive: true,
    };
}

/**
 * Decide whether to make a trade and what trade to make
 */
export function decideTrade(trader: Trader, day: number): boolean {
    const { avgTradesPerDay } = trader.archetype;

    // Random number of trades per day (Poisson-like distribution)
    const targetTrades = Math.max(0, Math.round(avgTradesPerDay + (Math.random() - 0.5) * 2));
    const currentDayTrades = trader.trades.filter(t =>
        t.timestamp.toDateString() === new Date(day).toDateString()
    ).length;

    return currentDayTrades < targetTrades;
}

/**
 * Generate a trade based on trader's archetype
 */
export function generateTrade(trader: Trader, tradeId: string, day: number): Trade {
    const { winRate, riskTolerance, positionSizeMultiplier } = trader.archetype;

    // Calculate position size based on risk tolerance
    const basePositionSize = trader.balance * riskTolerance;
    const positionSize = basePositionSize * positionSizeMultiplier;
    const amount = Math.min(positionSize, trader.balance * 0.5); // Max 50% of balance per trade

    // Determine if trade wins (based on win rate)
    const isWin = Math.random() < winRate;

    // Random entry price (prediction markets: 0.01 to 0.99)
    const entryPrice = 0.2 + Math.random() * 0.6; // Skew toward middle (0.2 - 0.8)

    // Calculate exit price based on win/loss
    let exitPrice: number;
    if (isWin) {
        // Winner: price moves in favorable direction (5-20% move)
        const priceMove = 0.05 + Math.random() * 0.15;
        exitPrice = Math.min(0.99, entryPrice + priceMove);
    } else {
        // Loser: price moves against (5-20% move)
        const priceMove = 0.05 + Math.random() * 0.15;
        exitPrice = Math.max(0.01, entryPrice - priceMove);
    }

    // Calculate shares bought and P&L
    const shares = amount / entryPrice;
    const exitValue = shares * exitPrice;
    const pnl = exitValue - amount;

    const timestamp = new Date(day);
    timestamp.setHours(9 + Math.random() * 7); // Random time 9am-4pm

    return {
        id: tradeId,
        timestamp,
        market: `market-${Math.floor(Math.random() * 100)}`,
        direction: Math.random() > 0.5 ? 'YES' : 'NO',
        amount,
        entryPrice,
        exitPrice,
        pnl,
        balance: trader.balance + pnl,
    };
}

/**
 * Execute a trade and update trader state
 */
export function executeTrade(trader: Trader, trade: Trade): void {
    trader.trades.push(trade);
    trader.balance = trade.balance;

    // Update high water mark
    if (trader.balance > trader.highWaterMark) {
        trader.highWaterMark = trader.balance;
    }

    // Track trading day
    const dayKey = trade.timestamp.toDateString();
    trader.tradingDays.add(dayKey);
}

/**
 * Calculate current drawdown
 */
export function calculateDrawdown(trader: Trader): number {
    return (trader.highWaterMark - trader.balance) / trader.highWaterMark;
}

/**
 * Calculate daily P&L
 */
export function calculateDailyPnL(trader: Trader, day: Date): number {
    const dayKey = day.toDateString();
    const dayTrades = trader.trades.filter(t => t.timestamp.toDateString() === dayKey);

    if (dayTrades.length === 0) return 0;

    const startBalance = dayTrades[0].balance - dayTrades[0].pnl;
    const endBalance = dayTrades[dayTrades.length - 1].balance;

    return endBalance - startBalance;
}

/**
 * Calculate daily loss percentage
 */
export function calculateDailyLossPercent(trader: Trader, day: Date): number {
    const dayPnL = calculateDailyPnL(trader, day);
    if (dayPnL >= 0) return 0; // No loss

    return Math.abs(dayPnL) / trader.startingBalance;
}

/**
 * Get trader statistics
 */
export function getTraderStats(trader: Trader) {
    const totalTrades = trader.trades.length;
    const winningTrades = trader.trades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    const totalPnL = trader.balance - trader.startingBalance;
    const returnPercent = (totalPnL / trader.startingBalance) * 100;

    const avgTrade = totalTrades > 0
        ? trader.trades.reduce((sum, t) => sum + t.pnl, 0) / totalTrades
        : 0;

    return {
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        winRate,
        totalPnL,
        returnPercent,
        avgTrade,
        currentBalance: trader.balance,
        currentDrawdown: calculateDrawdown(trader),
        tradingDays: trader.tradingDays.size,
    };
}
