/**
 * Stress Test Scenarios
 * 
 * Black swan events, whale traders, and disaster scenarios.
 * Test firm survival under extreme conditions.
 */

import { generateTrader, Trader } from './trader-behavior';
import { runChallenge, ChallengeResult } from './challenge-simulator';
import { calculateCashFlow } from './cash-flow';
import { TRADER_ARCHETYPES, FirmConfig } from './config';
import { createLogger } from '@/lib/logger';
const logger = createLogger('StressTests');

export interface StressScenario {
    name: string;
    description: string;
    traders: Trader[];
    expectedRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface StressTestResult {
    scenario: StressScenario;
    challengeResults: ChallengeResult[];
    cashFlow: ReturnType<typeof calculateCashFlow>;
    verdict: 'SURVIVES' | 'AT_RISK' | 'INSOLVENT';
    details: string;
}

/**
 * Scenario 1: Winner's Curse
 * All skilled traders join at once (worst case for firm)
 */
export function generateWinnersCurseScenario(count: number = 100): StressScenario {
    const traders: Trader[] = [];

    // 100% skilled traders (nightmare scenario)
    for (let i = 0; i < count; i++) {
        traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
    }

    return {
        name: 'Winner\'s Curse',
        description: `${count} skilled traders join simultaneously. Pass rate expected: 8-12%`,
        traders,
        expectedRisk: 'CRITICAL',
    };
}

/**
 * Scenario 2: Whale Trader Attack
 * A single extremely skilled trader with perfect execution
 */
export function generateWhaleAttackScenario(): StressScenario {
    const traders: Trader[] = [];

    // Create "whale" archetype (godmode trader)
    const whaleArchetype = {
        winRate: 0.85, // 85% win rate (nearly perfect)
        riskTolerance: 0.03,
        avgTradesPerDay: 10,
        positionSizeMultiplier: 1.2,
    };

    // 1 whale + 99 normal traders
    traders.push(generateTrader('whale-1', whaleArchetype, 'skilled'));

    for (let i = 0; i < 33; i++) {
        traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
    }
    for (let i = 0; i < 33; i++) {
        traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
    }
    for (let i = 0; i < 33; i++) {
        traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
    }

    return {
        name: 'Whale Trader Attack',
        description: '1 godmode trader (85% win rate) with 99 normal traders',
        traders,
        expectedRisk: 'MODERATE',
    };
}

/**
 * Scenario 3: Black Swan Market Conditions
 * Extreme volatility causes all traders to hit profit target faster
 */
export function generateBlackSwanScenario(count: number = 100): StressScenario {
    const traders: Trader[] = [];

    // Enhanced archetypes (easier market conditions)
    const skilledBlackSwan = { ...TRADER_ARCHETYPES.skilled, winRate: 0.75 };
    const averageBlackSwan = { ...TRADER_ARCHETYPES.average, winRate: 0.60 };
    const degenBlackSwan = { ...TRADER_ARCHETYPES.degen, winRate: 0.45 };

    const skilledCount = Math.floor(count * 0.25);
    const averageCount = Math.floor(count * 0.50);
    const degenCount = count - skilledCount - averageCount;

    for (let i = 0; i < skilledCount; i++) {
        traders.push(generateTrader(`skilled-${i}`, skilledBlackSwan, 'skilled'));
    }
    for (let i = 0; i < averageCount; i++) {
        traders.push(generateTrader(`average-${i}`, averageBlackSwan, 'average'));
    }
    for (let i = 0; i < degenCount; i++) {
        traders.push(generateTrader(`degen-${i}`, degenBlackSwan, 'degen'));
    }

    return {
        name: 'Black Swan Event',
        description: `Extreme volatility boosts all win rates by +10-15%. Expected pass rate: 8-15%`,
        traders,
        expectedRisk: 'HIGH',
    };
}

/**
 * Scenario 4: Copy Trading Ring
 * 50 traders follow the same expert (all pass or all fail together)
 */
export function generateCopyTradingScenario(): StressScenario {
    const traders: Trader[] = [];

    // Leader (skilled)
    const leader = generateTrader('leader', TRADER_ARCHETYPES.skilled, 'skilled');
    traders.push(leader);

    // 49 copiers (same skill as leader)
    for (let i = 0; i < 49; i++) {
        traders.push(generateTrader(`copier-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
    }

    // 50 normal traders for baseline
    for (let i = 0; i < 17; i++) {
        traders.push(generateTrader(`normal-skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
    }
    for (let i = 0; i < 17; i++) {
        traders.push(generateTrader(`normal-average-${i}`, TRADER_ARCHETYPES.average, 'average'));
    }
    for (let i = 0; i < 16; i++) {
        traders.push(generateTrader(`normal-degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
    }

    return {
        name: 'Copy Trading Ring',
        description: '50 traders copy the same expert. Clustered risk.',
        traders,
        expectedRisk: 'HIGH',
    };
}

/**
 * Scenario 5: Economic Recession
 * Prediction markets dry up, lower volume = harder to hit profit target
 */
export function generateRecessionScenario(count: number = 100): StressScenario {
    const traders: Trader[] = [];

    // Degraded archetypes (harder trading environment)
    const skilledRecession = { ...TRADER_ARCHETYPES.skilled, winRate: 0.55, avgTradesPerDay: 2 };
    const averageRecession = { ...TRADER_ARCHETYPES.average, winRate: 0.45, avgTradesPerDay: 3 };
    const degenRecession = { ...TRADER_ARCHETYPES.degen, winRate: 0.30, avgTradesPerDay: 6 };

    const skilledCount = Math.floor(count * 0.25);
    const averageCount = Math.floor(count * 0.50);
    const degenCount = count - skilledCount - averageCount;

    for (let i = 0; i < skilledCount; i++) {
        traders.push(generateTrader(`skilled-${i}`, skilledRecession, 'skilled'));
    }
    for (let i = 0; i < averageCount; i++) {
        traders.push(generateTrader(`average-${i}`, averageRecession, 'average'));
    }
    for (let i = 0; i < degenCount; i++) {
        traders.push(generateTrader(`degen-${i}`, degenRecession, 'degen'));
    }

    return {
        name: 'Economic Recession',
        description: 'Low market volume reduces win rates by -5-10%. Expected pass rate: 1-2%',
        traders,
        expectedRisk: 'LOW', // Good for firm (fewer winners)
    };
}

/**
 * Scenario 6: Coordinated Attack
 * Discord group coordinates to all pass at once
 */
export function generateCoordinatedAttackScenario(count: number = 200): StressScenario {
    const traders: Trader[] = [];

    // 200 skilled traders all joining at once
    for (let i = 0; i < count; i++) {
        traders.push(generateTrader(`attacker-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
    }

    return {
        name: 'Coordinated Attack',
        description: `${count} skilled traders join simultaneously via Discord coordination`,
        traders,
        expectedRisk: 'CRITICAL',
    };
}

/**
 * Run stress test on a scenario
 */
export function runStressTest(
    scenario: StressScenario,
    firmConfig: FirmConfig
): StressTestResult {
    logger.info(`\n🔥 STRESS TEST: ${scenario.name}`);
    logger.info(`   ${scenario.description}`);
    logger.info(`   Traders: ${scenario.traders.length}`);
    logger.info(`   Expected Risk: ${scenario.expectedRisk}`);

    // Run challenges
    const challengeResults = scenario.traders.map(trader =>
        runChallenge(trader, firmConfig.maxChallengeDays)
    );

    // Calculate cash flow
    const cashFlow = calculateCashFlow(challengeResults, scenario.traders);

    // Determine verdict
    let verdict: StressTestResult['verdict'];
    if (cashFlow.netCashFlow >= 0) {
        verdict = 'SURVIVES';
    } else if (cashFlow.netCashFlow >= -50000) {
        verdict = 'AT_RISK';
    } else {
        verdict = 'INSOLVENT';
    }

    const passRate = (challengeResults.filter(r => r.outcome === 'PASS').length / challengeResults.length) * 100;

    const details = `Pass rate: ${passRate.toFixed(1)}% | Net: $${Math.round(cashFlow.netCashFlow).toLocaleString()} | Verdict: ${verdict}`;

    logger.info(`   ${details}\n`);

    return {
        scenario,
        challengeResults,
        cashFlow,
        verdict,
        details,
    };
}

/**
 * Run all stress tests
 */
export function runAllStressTests(firmConfig: FirmConfig): StressTestResult[] {
    logger.info('🔥 RUNNING ALL STRESS TESTS...\n');

    const scenarios = [
        generateWinnersCurseScenario(100),
        generateWhaleAttackScenario(),
        generateBlackSwanScenario(100),
        generateCopyTradingScenario(),
        generateRecessionScenario(100),
        generateCoordinatedAttackScenario(200),
    ];

    const results = scenarios.map(scenario => runStressTest(scenario, firmConfig));

    logger.info('✅ STRESS TESTS COMPLETE\n');

    return results;
}

/**
 * Generate stress test report
 */
export function generateStressTestReport(results: StressTestResult[]): string {
    const survives = results.filter(r => r.verdict === 'SURVIVES').length;
    const atRisk = results.filter(r => r.verdict === 'AT_RISK').length;
    const insolvent = results.filter(r => r.verdict === 'INSOLVENT').length;

    let report = `
STRESS TEST REPORT
==================
Total Scenarios Tested: ${results.length}

SURVIVAL SUMMARY
----------------
✅ Survives: ${survives}/${results.length}
⚠️  At Risk: ${atRisk}/${results.length}
❌ Insolvent: ${insolvent}/${results.length}

SCENARIO DETAILS
----------------
`;

    results.forEach((result, index) => {
        const icon = result.verdict === 'SURVIVES' ? '✅' : result.verdict === 'AT_RISK' ? '⚠️' : '❌';
        report += `
${index + 1}. ${icon} ${result.scenario.name}
   ${result.scenario.description}
   ${result.details}
`;
    });

    report += `
OVERALL VERDICT
---------------
${insolvent === 0
            ? '✅ ROBUST - Firm survives all tested scenarios'
            : insolvent <= 2
                ? '⚠️ VULNERABLE - Some disaster scenarios cause insolvency'
                : '❌ FRAGILE - Firm fails under most stress conditions'}

RECOMMENDATION
--------------
${insolvent === 0
            ? 'Current rules appear resilient. Continue monitoring real-world performance.'
            : insolvent <= 2
                ? 'Consider tightening rules or building capital reserves to handle black swan events.'
                : 'CRITICAL: Current rules will not survive adverse conditions. Immediate adjustments required.'}
  `.trim();

    return report;
}
