#!/usr/bin/env node
/**
 * Simulate Trading Days Script
 * 
 * This script fast-forwards the active trading days counter for a funded challenge
 * to enable testing of payout eligibility (which requires 5+ trading days).
 * 
 * Usage:
 *   node simulate-trading-days.mjs [challengeId] [days]
 *   node simulate-trading-days.mjs                  # Interactive mode
 * 
 * Examples:
 *   node simulate-trading-days.mjs                  # Shows all challenges, prompts for input
 *   node simulate-trading-days.mjs abc123 5         # Set challenge abc123 to 5 trading days
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        const challengeId = process.argv[2];
        const days = parseInt(process.argv[3]) || 5;

        if (!challengeId) {
            // Interactive mode: show all challenges
            const challenges = await client.query(`
        SELECT 
          id,
          phase,
          status,
          current_balance::numeric,
          starting_balance::numeric,
          active_trading_days,
          payout_cycle_start,
          started_at
        FROM challenges
        ORDER BY started_at DESC
        LIMIT 10
      `);

            if (challenges.rows.length === 0) {
                console.log('❌ No challenges found');
                return;
            }

            console.log('📋 Recent Challenges:\n');
            console.log('ID'.padEnd(40) + 'PHASE'.padEnd(15) + 'STATUS'.padEnd(12) + 'BALANCE'.padEnd(15) + 'TRADING DAYS');
            console.log('-'.repeat(95));

            for (const c of challenges.rows) {
                console.log(
                    c.id.substring(0, 36).padEnd(40) +
                    c.phase.padEnd(15) +
                    c.status.padEnd(12) +
                    `$${parseFloat(c.current_balance).toFixed(2)}`.padEnd(15) +
                    (c.active_trading_days || 0)
                );
            }

            console.log('\n📝 Usage: node simulate-trading-days.mjs <challenge_id> [days=5]');
            console.log('   Example: node simulate-trading-days.mjs ' + challenges.rows[0].id + ' 5');
            return;
        }

        // Update the challenge
        const result = await client.query(`
      UPDATE challenges 
      SET 
        active_trading_days = $1,
        payout_cycle_start = COALESCE(payout_cycle_start, NOW() - INTERVAL '${days} days')
      WHERE id = $2
      RETURNING id, phase, status, active_trading_days, payout_cycle_start
    `, [days, challengeId]);

        if (result.rows.length === 0) {
            console.log(`❌ Challenge ${challengeId} not found`);
            return;
        }

        const updated = result.rows[0];
        console.log('✅ Challenge updated successfully!\n');
        console.log(`   ID:               ${updated.id}`);
        console.log(`   Phase:            ${updated.phase}`);
        console.log(`   Status:           ${updated.status}`);
        console.log(`   Trading Days:     ${updated.active_trading_days}`);
        console.log(`   Payout Cycle:     ${updated.payout_cycle_start}`);

        // Check if eligible for payout
        if (updated.phase === 'funded' && updated.active_trading_days >= 5) {
            console.log('\n🎉 This challenge is now eligible for payout requests!');
        } else if (updated.phase !== 'funded') {
            console.log('\n⚠️  Note: Challenge is in ' + updated.phase + ' phase, not funded yet.');
        } else {
            console.log('\n⚠️  Need ' + (5 - updated.active_trading_days) + ' more trading days for payout eligibility.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
