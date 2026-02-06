#!/usr/bin/env node
/**
 * Position Reconciliation Script
 * 
 * Validates all positions against their trade history.
 * Reports mismatches in shares, entry prices, and P&L.
 * 
 * Usage: npx tsx scripts/reconcile-positions.ts
 */

import { db } from '../src/db';
import { positions, trades, challenges, users } from '../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeParseFloat } from '../src/lib/safe-parse';

interface PositionMismatch {
    positionId: string;
    marketId: string;
    field: string;
    stored: number;
    calculated: number;
    difference: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ReconciliationReport {
    totalPositions: number;
    openPositions: number;
    closedPositions: number;
    mismatches: PositionMismatch[];
    orphanedPositions: string[];
    summary: {
        sharesMismatches: number;
        entryPriceMismatches: number;
        pnlMismatches: number;
    };
}

async function reconcilePositions(): Promise<ReconciliationReport> {
    console.log('=== Position Reconciliation Script ===\n');
    console.log('Fetching all positions...\n');

    const report: ReconciliationReport = {
        totalPositions: 0,
        openPositions: 0,
        closedPositions: 0,
        mismatches: [],
        orphanedPositions: [],
        summary: {
            sharesMismatches: 0,
            entryPriceMismatches: 0,
            pnlMismatches: 0,
        },
    };

    // Fetch all positions
    const allPositions = await db.query.positions.findMany({
        orderBy: [desc(positions.openedAt)],
    });

    report.totalPositions = allPositions.length;
    console.log(`Found ${allPositions.length} positions\n`);

    for (const position of allPositions) {
        if (position.status === 'OPEN') {
            report.openPositions++;
        } else {
            report.closedPositions++;
        }

        // Check if position has a valid challenge
        if (!position.challengeId) {
            report.orphanedPositions.push(position.id);
            continue;
        }

        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, position.challengeId),
        });

        if (!challenge) {
            report.orphanedPositions.push(position.id);
            continue;
        }

        // Fetch all trades for this position
        const positionTrades = await db.query.trades.findMany({
            where: eq(trades.positionId, position.id),
            orderBy: [desc(trades.executedAt)],
        });

        if (positionTrades.length === 0) {
            // Position with no trades is suspicious but not necessarily wrong
            // (could be a legacy position)
            continue;
        }

        // Calculate expected values from trades
        let totalShares = 0;
        let totalCost = 0;
        let realizedPnL = 0;

        for (const trade of positionTrades) {
            const tradeShares = safeParseFloat(trade.shares);
            const tradePrice = safeParseFloat(trade.price);
            const tradeAmount = safeParseFloat(trade.amount);

            if (trade.type === 'BUY') {
                totalShares += tradeShares;
                totalCost += tradeAmount;
            } else if (trade.type === 'SELL') {
                totalShares -= tradeShares;
                realizedPnL += safeParseFloat(trade.realizedPnL);
            }
        }

        const expectedEntryPrice = totalShares > 0 ? totalCost / totalShares : 0;

        // Compare stored vs calculated values
        const storedShares = safeParseFloat(position.shares);
        const storedEntryPrice = safeParseFloat(position.entryPrice);
        const storedPnL = safeParseFloat(position.pnl);

        // Tolerance for floating point comparison
        const SHARES_TOLERANCE = 0.01;
        const PRICE_TOLERANCE = 0.0001;
        const PNL_TOLERANCE = 0.01;

        // Check shares
        if (Math.abs(storedShares - totalShares) > SHARES_TOLERANCE) {
            report.mismatches.push({
                positionId: position.id,
                marketId: position.marketId,
                field: 'shares',
                stored: storedShares,
                calculated: totalShares,
                difference: storedShares - totalShares,
                severity: Math.abs(storedShares - totalShares) > 10 ? 'HIGH' : 'MEDIUM',
            });
            report.summary.sharesMismatches++;
        }

        // Check entry price (only for open positions with shares)
        if (position.status === 'OPEN' && totalShares > 0 && storedShares > 0) {
            if (Math.abs(storedEntryPrice - expectedEntryPrice) > PRICE_TOLERANCE) {
                report.mismatches.push({
                    positionId: position.id,
                    marketId: position.marketId,
                    field: 'entryPrice',
                    stored: storedEntryPrice,
                    calculated: expectedEntryPrice,
                    difference: storedEntryPrice - expectedEntryPrice,
                    severity: Math.abs(storedEntryPrice - expectedEntryPrice) > 0.05 ? 'HIGH' : 'LOW',
                });
                report.summary.entryPriceMismatches++;
            }
        }

        // Check realized P&L for closed positions
        if (position.status === 'CLOSED' && realizedPnL !== 0) {
            if (Math.abs(storedPnL - realizedPnL) > PNL_TOLERANCE) {
                report.mismatches.push({
                    positionId: position.id,
                    marketId: position.marketId,
                    field: 'pnl',
                    stored: storedPnL,
                    calculated: realizedPnL,
                    difference: storedPnL - realizedPnL,
                    severity: Math.abs(storedPnL - realizedPnL) > 10 ? 'HIGH' : 'MEDIUM',
                });
                report.summary.pnlMismatches++;
            }
        }
    }

    return report;
}

async function printReport(report: ReconciliationReport): Promise<void> {
    console.log('=== Reconciliation Report ===\n');

    console.log(`Total Positions: ${report.totalPositions}`);
    console.log(`  Open: ${report.openPositions}`);
    console.log(`  Closed: ${report.closedPositions}`);
    console.log(`  Orphaned: ${report.orphanedPositions.length}\n`);

    console.log('=== Summary ===\n');
    console.log(`Shares Mismatches: ${report.summary.sharesMismatches}`);
    console.log(`Entry Price Mismatches: ${report.summary.entryPriceMismatches}`);
    console.log(`P&L Mismatches: ${report.summary.pnlMismatches}`);
    console.log(`Total Mismatches: ${report.mismatches.length}\n`);

    if (report.mismatches.length > 0) {
        console.log('=== Mismatches (sorted by severity) ===\n');

        // Sort by severity
        const sorted = report.mismatches.sort((a, b) => {
            const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        for (const mismatch of sorted) {
            const emoji = mismatch.severity === 'HIGH' ? '🔴' : mismatch.severity === 'MEDIUM' ? '🟡' : '🟢';
            console.log(`${emoji} [${mismatch.severity}] Position: ${mismatch.positionId.slice(0, 8)}...`);
            console.log(`   Market: ${mismatch.marketId.slice(0, 20)}...`);
            console.log(`   Field: ${mismatch.field}`);
            console.log(`   Stored: ${mismatch.stored.toFixed(4)}`);
            console.log(`   Calculated: ${mismatch.calculated.toFixed(4)}`);
            console.log(`   Difference: ${mismatch.difference.toFixed(4)}`);
            console.log('');
        }
    }

    if (report.orphanedPositions.length > 0) {
        console.log('=== Orphaned Positions ===\n');
        for (const id of report.orphanedPositions) {
            console.log(`  - ${id}`);
        }
        console.log('');
    }

    // Final verdict
    if (report.mismatches.length === 0 && report.orphanedPositions.length === 0) {
        console.log('✅ All positions reconciled successfully!\n');
    } else {
        const highSeverity = report.mismatches.filter(m => m.severity === 'HIGH').length;
        if (highSeverity > 0) {
            console.log(`⚠️  ${highSeverity} HIGH severity issues require immediate attention!\n`);
        } else {
            console.log('🟡 Some discrepancies found but no critical issues.\n');
        }
    }
}

async function main() {
    try {
        const report = await reconcilePositions();
        await printReport(report);
        process.exit(report.mismatches.some(m => m.severity === 'HIGH') ? 1 : 0);
    } catch (error) {
        console.error('Reconciliation failed:', error);
        process.exit(1);
    }
}

main();
