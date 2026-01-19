/**
 * User Investigation Script
 * 
 * Usage:
 * DATABASE_URL="..." npx tsx scripts/investigate-users.ts mattasa1m@gmail.com sliponchain@gmail.com
 * 
 * This provides forensic details about user accounts for debugging trading issues.
 */

import { db } from "../src/db";
import { users, challenges, positions, trades } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function investigateUser(email: string) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔍 INVESTIGATING: ${email}`);
    console.log("=".repeat(60));

    // 1. Find user
    const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
        console.log(`❌ USER NOT FOUND: ${email}`);
        return;
    }

    console.log(`\n👤 USER FOUND:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || user.displayName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);

    // 2. Get all challenges
    const userChallenges = await db.query.challenges.findMany({
        where: eq(challenges.userId, user.id),
        orderBy: [desc(challenges.startedAt)],
    });

    console.log(`\n📊 CHALLENGES: ${userChallenges.length} total`);

    for (const challenge of userChallenges) {
        const startingBalance = parseFloat(challenge.startingBalance);
        const currentBalance = parseFloat(challenge.currentBalance);
        const pnl = currentBalance - startingBalance;

        // Calculate drawdown metrics
        const maxDrawdownFloor = startingBalance * (1 - 0.08); // 8% floor
        const distanceToFloor = currentBalance - maxDrawdownFloor;
        const drawdownPercent = ((startingBalance - currentBalance) / startingBalance * 100).toFixed(2);

        console.log(`\n   📁 Challenge: ${challenge.id.slice(0, 8)}...`);
        console.log(`      Status: ${challenge.status.toUpperCase()} | Phase: ${challenge.phase}`);
        console.log(`      Starting Balance: $${startingBalance.toLocaleString()}`);
        console.log(`      Current Balance: $${currentBalance.toLocaleString()}`);
        console.log(`      P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        console.log(`      Drawdown: ${drawdownPercent}%`);
        console.log(`      8% Floor: $${maxDrawdownFloor.toLocaleString()}`);
        console.log(`      Distance to Floor: $${distanceToFloor.toFixed(2)}`);

        // CRITICAL: Check if breached
        if (currentBalance <= maxDrawdownFloor) {
            console.log(`      ⛔ DRAWDOWN BREACH - TRADING BLOCKED`);
        } else if (distanceToFloor < 100) {
            console.log(`      ⚠️  WARNING: Very close to drawdown limit`);
        }

        // 3. Get positions for this challenge
        const challengePositions = await db.query.positions.findMany({
            where: eq(positions.challengeId, challenge.id),
        });

        const openPositions = challengePositions.filter(p => p.status === 'OPEN');
        const closedPositions = challengePositions.filter(p => p.status === 'CLOSED');

        console.log(`      Positions: ${openPositions.length} OPEN, ${closedPositions.length} CLOSED`);

        if (openPositions.length > 0) {
            console.log(`      Open Positions:`);
            for (const pos of openPositions) {
                console.log(`        - ${pos.direction} ${parseFloat(pos.shares).toFixed(2)} shares @ ${parseFloat(pos.entryPrice).toFixed(4)} (market: ${pos.marketId.slice(0, 12)}...)`);
            }
        }

        // 4. Get recent trades
        const challengeTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challenge.id),
            orderBy: [desc(trades.executedAt)],
        });

        console.log(`      Trades: ${challengeTrades.length} total`);

        if (challengeTrades.length > 0) {
            console.log(`      Last 3 Trades:`);
            for (const trade of challengeTrades.slice(0, 3)) {
                console.log(`        - ${trade.type} $${parseFloat(trade.amount).toFixed(2)} @ ${parseFloat(trade.price).toFixed(4)} (${trade.executedAt?.toISOString()})`);
            }
        }
    }

    // Summary diagnosis
    console.log(`\n🩺 DIAGNOSIS:`);

    const activeChallenge = userChallenges.find(c => c.status === 'active');
    if (!activeChallenge) {
        console.log(`   ❌ NO ACTIVE CHALLENGE - User cannot trade`);
    } else {
        const currentBalance = parseFloat(activeChallenge.currentBalance);
        const startingBalance = parseFloat(activeChallenge.startingBalance);
        const floor = startingBalance * 0.92; // 8% drawdown limit

        if (currentBalance <= floor) {
            console.log(`   ⛔ DRAWDOWN BREACH: Balance $${currentBalance.toFixed(2)} is at or below floor $${floor.toFixed(2)}`);
            console.log(`   → RECOMMENDED ACTION: Reset challenge or fund new account`);
        } else {
            console.log(`   ✅ Account is tradeable. Balance: $${currentBalance.toFixed(2)}, Floor: $${floor.toFixed(2)}`);
        }
    }
}

async function main() {
    const emails = process.argv.slice(2);

    if (emails.length === 0) {
        console.log("Usage: DATABASE_URL=\"...\" npx tsx scripts/investigate-users.ts email1@example.com email2@example.com");
        process.exit(1);
    }

    for (const email of emails) {
        await investigateUser(email);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Investigation complete.");
    process.exit(0);
}

main().catch(console.error);
