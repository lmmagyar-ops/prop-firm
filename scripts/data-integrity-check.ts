#!/usr/bin/env node
/**
 * Data Integrity Check Script
 * 
 * Checks for orphaned and inconsistent data:
 * - Positions without valid challenges
 * - Trades referencing deleted positions
 * - Challenges with impossible states
 * - Users with orphaned data
 * 
 * Usage: npx tsx scripts/data-integrity-check.ts
 */

import { db } from '../src/db';
import { positions, trades, challenges, users, payouts } from '../src/db/schema';
import { eq, and, isNull, not, inArray, sql, desc } from 'drizzle-orm';
import { safeParseFloat } from '../src/lib/safe-parse';

interface IntegrityIssue {
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    entityId: string;
    description: string;
    suggestedFix?: string;
}

interface IntegrityReport {
    issues: IntegrityIssue[];
    stats: {
        totalUsers: number;
        totalChallenges: number;
        totalPositions: number;
        totalTrades: number;
    };
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

async function checkDataIntegrity(): Promise<IntegrityReport> {
    console.log('=== Data Integrity Check ===\n');

    const report: IntegrityReport = {
        issues: [],
        stats: {
            totalUsers: 0,
            totalChallenges: 0,
            totalPositions: 0,
            totalTrades: 0,
        },
        summary: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
        },
    };

    // Get counts
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [challengesCount] = await db.select({ count: sql<number>`count(*)` }).from(challenges);
    const [positionsCount] = await db.select({ count: sql<number>`count(*)` }).from(positions);
    const [tradesCount] = await db.select({ count: sql<number>`count(*)` }).from(trades);

    report.stats.totalUsers = Number(usersCount.count);
    report.stats.totalChallenges = Number(challengesCount.count);
    report.stats.totalPositions = Number(positionsCount.count);
    report.stats.totalTrades = Number(tradesCount.count);

    console.log('Stats:');
    console.log(`  Users: ${report.stats.totalUsers}`);
    console.log(`  Challenges: ${report.stats.totalChallenges}`);
    console.log(`  Positions: ${report.stats.totalPositions}`);
    console.log(`  Trades: ${report.stats.totalTrades}`);
    console.log('');

    // ========================================
    // CHECK 1: Positions without valid challenges
    // ========================================
    console.log('Checking for orphaned positions...');
    const allPositions = await db.query.positions.findMany();
    const allChallengeIds = new Set(
        (await db.select({ id: challenges.id }).from(challenges)).map(c => c.id)
    );

    for (const pos of allPositions) {
        if (!pos.challengeId) {
            report.issues.push({
                type: 'ORPHANED_POSITION',
                severity: 'HIGH',
                entityId: pos.id,
                description: `Position has no challengeId`,
                suggestedFix: 'Delete or reassign position',
            });
        } else if (!allChallengeIds.has(pos.challengeId)) {
            report.issues.push({
                type: 'ORPHANED_POSITION',
                severity: 'HIGH',
                entityId: pos.id,
                description: `Position references deleted challenge ${pos.challengeId}`,
                suggestedFix: 'Delete position',
            });
        }
    }

    // ========================================
    // CHECK 2: Trades referencing deleted positions
    // ========================================
    console.log('Checking for orphaned trades...');
    const allTrades = await db.query.trades.findMany();
    const allPositionIds = new Set(allPositions.map(p => p.id));

    for (const trade of allTrades) {
        if (trade.positionId && !allPositionIds.has(trade.positionId)) {
            report.issues.push({
                type: 'ORPHANED_TRADE',
                severity: 'MEDIUM',
                entityId: trade.id,
                description: `Trade references deleted position ${trade.positionId}`,
                suggestedFix: 'Delete trade or set positionId to null',
            });
        }
    }

    // ========================================
    // CHECK 3: Challenges with impossible states
    // ========================================
    console.log('Checking for invalid challenge states...');
    const allChallenges = await db.query.challenges.findMany();

    for (const challenge of allChallenges) {
        const balance = safeParseFloat(challenge.currentBalance);
        const startingBalance = safeParseFloat(challenge.startingBalance);

        // Negative balance
        if (balance < 0) {
            report.issues.push({
                type: 'INVALID_BALANCE',
                severity: 'CRITICAL',
                entityId: challenge.id,
                description: `Challenge has negative balance: $${balance.toFixed(2)}`,
                suggestedFix: 'Investigate trade history and correct balance',
            });
        }

        // Active challenge with passed status
        if (challenge.status === 'passed' && challenge.phase === 'challenge') {
            report.issues.push({
                type: 'INVALID_STATE',
                severity: 'MEDIUM',
                entityId: challenge.id,
                description: `Challenge has status 'passed' but is still in 'challenge' phase`,
                suggestedFix: 'Promote to verification phase or correct status',
            });
        }

        // Failed but has active positions
        if (challenge.status === 'failed') {
            const openPositions = allPositions.filter(
                p => p.challengeId === challenge.id && p.status === 'OPEN'
            );
            if (openPositions.length > 0) {
                report.issues.push({
                    type: 'FAILED_WITH_OPEN_POSITIONS',
                    severity: 'MEDIUM',
                    entityId: challenge.id,
                    description: `Failed challenge has ${openPositions.length} open positions`,
                    suggestedFix: 'Close all positions for failed challenge',
                });
            }
        }

        // Balance significantly higher than starting (potential bug or exploit)
        if (balance > startingBalance * 3) {
            report.issues.push({
                type: 'SUSPICIOUS_BALANCE',
                severity: 'LOW',
                entityId: challenge.id,
                description: `Balance ($${balance.toFixed(2)}) is 3x+ starting balance ($${startingBalance.toFixed(2)})`,
                suggestedFix: 'Review for potential exploit or data corruption',
            });
        }

        // NaN or Infinity in balance
        if (!Number.isFinite(balance)) {
            report.issues.push({
                type: 'INVALID_BALANCE',
                severity: 'CRITICAL',
                entityId: challenge.id,
                description: `Challenge has NaN or Infinity balance`,
                suggestedFix: 'Reset balance from trade history',
            });
        }
    }

    // ========================================
    // CHECK 4: Users with challenges but no user record
    // ========================================
    console.log('Checking for challenges without users...');
    const allUserIds = new Set(
        (await db.select({ id: users.id }).from(users)).map(u => u.id)
    );

    for (const challenge of allChallenges) {
        if (challenge.userId && !allUserIds.has(challenge.userId)) {
            report.issues.push({
                type: 'ORPHANED_CHALLENGE',
                severity: 'HIGH',
                entityId: challenge.id,
                description: `Challenge references deleted user ${challenge.userId}`,
                suggestedFix: 'Delete challenge',
            });
        }
    }

    // ========================================
    // CHECK 5: Positions with invalid prices
    // ========================================
    console.log('Checking for invalid position prices...');
    for (const pos of allPositions) {
        const entryPrice = safeParseFloat(pos.entryPrice);
        const shares = safeParseFloat(pos.shares);

        if (entryPrice <= 0 || entryPrice >= 1) {
            report.issues.push({
                type: 'INVALID_ENTRY_PRICE',
                severity: pos.status === 'OPEN' ? 'HIGH' : 'MEDIUM',
                entityId: pos.id,
                description: `Position has invalid entry price: ${entryPrice}`,
                suggestedFix: 'Recalculate from trade history',
            });
        }

        if (shares <= 0 && pos.status === 'OPEN') {
            report.issues.push({
                type: 'INVALID_SHARES',
                severity: 'HIGH',
                entityId: pos.id,
                description: `Open position has zero or negative shares: ${shares}`,
                suggestedFix: 'Close position or recalculate shares',
            });
        }

        if (!Number.isFinite(shares) || !Number.isFinite(entryPrice)) {
            report.issues.push({
                type: 'NAN_POSITION',
                severity: 'CRITICAL',
                entityId: pos.id,
                description: `Position has NaN/Infinity in shares or entry price`,
                suggestedFix: 'Recalculate from trade history or delete',
            });
        }
    }

    // Count by severity
    for (const issue of report.issues) {
        report.summary[issue.severity.toLowerCase() as keyof typeof report.summary]++;
    }

    return report;
}

async function printReport(report: IntegrityReport): Promise<void> {
    console.log('\n=== Integrity Report ===\n');

    console.log('Summary:');
    console.log(`  🔴 Critical: ${report.summary.critical}`);
    console.log(`  🟠 High: ${report.summary.high}`);
    console.log(`  🟡 Medium: ${report.summary.medium}`);
    console.log(`  🟢 Low: ${report.summary.low}`);
    console.log(`  Total Issues: ${report.issues.length}\n`);

    if (report.issues.length === 0) {
        console.log('✅ No integrity issues found!\n');
        return;
    }

    // Group by type
    const byType = report.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<string, IntegrityIssue[]>);

    console.log('=== Issues by Type ===\n');

    for (const [type, issues] of Object.entries(byType)) {
        const emoji = issues[0].severity === 'CRITICAL' ? '🔴' :
            issues[0].severity === 'HIGH' ? '🟠' :
                issues[0].severity === 'MEDIUM' ? '🟡' : '🟢';

        console.log(`${emoji} ${type} (${issues.length} issues):`);

        // Show first 5
        for (const issue of issues.slice(0, 5)) {
            console.log(`   - ${issue.entityId.slice(0, 8)}...: ${issue.description}`);
        }

        if (issues.length > 5) {
            console.log(`   ... and ${issues.length - 5} more`);
        }
        console.log('');
    }

    // Critical issues get special attention
    const criticals = report.issues.filter(i => i.severity === 'CRITICAL');
    if (criticals.length > 0) {
        console.log('⚠️  CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION:\n');
        for (const issue of criticals) {
            console.log(`   ${issue.type}: ${issue.entityId}`);
            console.log(`   ${issue.description}`);
            console.log(`   Fix: ${issue.suggestedFix}`);
            console.log('');
        }
    }
}

async function main() {
    try {
        const report = await checkDataIntegrity();
        await printReport(report);

        // Exit with error code if critical issues found
        const exitCode = report.summary.critical > 0 ? 2 :
            report.summary.high > 0 ? 1 : 0;
        process.exit(exitCode);
    } catch (error) {
        console.error('Integrity check failed:', error);
        process.exit(1);
    }
}

main();
