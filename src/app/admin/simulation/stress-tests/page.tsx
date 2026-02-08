'use client';

import { useState } from 'react';
import {
    runStressTest,
    generateWinnersCurseScenario,
    generateWhaleAttackScenario,
    generateBlackSwanScenario,
    generateCoordinatedAttackScenario,
    generateRecessionScenario,
    type StressTestResult,
    type StressScenario
} from '@/lib/simulation/stress-tests';
import { FIRM_CONFIG } from '@/lib/simulation/config';

type ScenarioKey =
    | 'market_crash'
    | 'winners_curse'
    | 'coordinated_attack'
    | 'black_swan'
    | 'fee_sensitivity'
    | 'drawdown_stress'
    | 'volume_surge';

interface Scenario {
    key: ScenarioKey;
    name: string;
    description: string;
    testFunction: () => StressTestResult;
}

const STRESS_SCENARIOS: Scenario[] = [
    {
        key: 'market_crash',
        name: '📉 Market Crash',
        description: '50% spike in trader volume during market volatility. Tests if infrastructure can handle sudden demand surge.',
        testFunction: () => runStressTest(generateRecessionScenario(150), FIRM_CONFIG),
    },
    {
        key: 'winners_curse',
        name: '💀 Winner\'s Curse',
        description: '100 highly skilled traders (70% win rate) attempt challenge. Tests if strict rules protect firm from expert traders.',
        testFunction: () => runStressTest(generateWinnersCurseScenario(100), FIRM_CONFIG),
    },
    {
        key: 'coordinated_attack',
        name: '💣 Coordinated Attack',
        description: '200 skilled traders coordinate to game the system. Tests vulnerability to organized exploitation.',
        testFunction: () => runStressTest(generateCoordinatedAttackScenario(200), FIRM_CONFIG),
    },
    {
        key: 'black_swan',
        name: '🌪️ Black Swan Event',
        description: 'Extreme market conditions: high volatility, low volume, wide spreads. Tests worst-case market dynamics.',
        testFunction: () => runStressTest(generateBlackSwanScenario(100), FIRM_CONFIG),
    },
    {
        key: 'fee_sensitivity',
        name: '💸 Fee Sensitivity',
        description: 'Fee drops to $99 while competitors undercut pricing. Tests if business model survives pricing pressure.',
        testFunction: () => {
            const lowerFeeConfig = { ...FIRM_CONFIG, challengeFee: 99 };
            return runStressTest(generateRecessionScenario(100), lowerFeeConfig);
        },
    },
    {
        key: 'drawdown_stress',
        name: '🎯 Drawdown Stress',
        description: 'Tests 15% drawdown limit (looser than current 10%). Validates if current rules are optimal.',
        testFunction: () => {
            const looserConfig = { ...FIRM_CONFIG, maxDrawdown: 0.15 };
            return runStressTest(generateRecessionScenario(100), looserConfig);
        },
    },
    {
        key: 'volume_surge',
        name: '📈 Volume Surge',
        description: '5,000 traders sign up in first month. Tests if firm can handle rapid scale-up profitably.',
        testFunction: () => runStressTest(generateWhaleAttackScenario(), FIRM_CONFIG),
    },
];

export default function StressTestsPage() {
    const [selectedScenario, setSelectedScenario] = useState<ScenarioKey | null>(null);
    const [results, setResults] = useState<StressTestResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    // Helper functions to extract display values from StressTestResult
    const getPassRate = (result: StressTestResult) => {
        const passed = result.challengeResults.filter(r => r.outcome === 'PASS').length;
        return (passed / result.challengeResults.length) * 100;
    };

    const getTotalTraders = (result: StressTestResult) => result.challengeResults.length;

    const getPassed = (result: StressTestResult) => result.challengeResults.filter(r => r.outcome === 'PASS').length;

    const getFailed = (result: StressTestResult) => result.challengeResults.filter(r => r.outcome.startsWith('FAIL')).length;

    const runTest = (scenario: Scenario) => {
        setIsRunning(true);
        setSelectedScenario(scenario.key);

        // Simulate async execution for UX
        setTimeout(() => {
            const result = scenario.testFunction();
            setResults(result);
            setIsRunning(false);
        }, 500);
    };

    const exportResults = () => {
        if (!results || !selectedScenario) return;

        const data = {
            scenarioName: STRESS_SCENARIOS.find(s => s.key === selectedScenario)?.name,
            timestamp: new Date().toISOString(),
            ...results,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stress-test-${selectedScenario}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getVerdictColor = (verdict: string) => {
        if (verdict === 'SURVIVES') return 'text-green-400 bg-green-950/50 border-green-500/30';
        if (verdict === 'AT_RISK') return 'text-yellow-400 bg-yellow-950/50 border-yellow-500/30';
        return 'text-red-400 bg-red-950/50 border-red-500/30';
    };

    const getVerdictIcon = (verdict: string) => {
        if (verdict === 'SURVIVES') return '✅';
        if (verdict === 'AT_RISK') return '⚠️';
        return '❌';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Stress Test Suite
                    </h1>
                    <p className="text-slate-400">
                        Validate firm resilience against black swan events and extreme market conditions
                    </p>
                </div>

                {/* Scenario Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {STRESS_SCENARIOS.map((scenario) => (
                        <button
                            key={scenario.key}
                            onClick={() => runTest(scenario)}
                            disabled={isRunning}
                            className={`
                                p-6 rounded-xl border-2 text-left transition-all
                                ${selectedScenario === scenario.key
                                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/20'
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800/70'
                                }
                                ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            <div className="text-3xl mb-2">{scenario.name.split(' ')[0]}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {scenario.name.split(' ').slice(1).join(' ')}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {scenario.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Results Display */}
                {results && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Test Results</h2>
                            <button
                                onClick={exportResults}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Export JSON
                            </button>
                        </div>

                        {/* Verdict Badge */}
                        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 text-lg font-semibold mb-6 ${getVerdictColor(results.verdict)}`}>
                            <span>{getVerdictIcon(results.verdict)}</span>
                            <span>{results.verdict}</span>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-900/50 p-6 rounded-lg">
                                <div className="text-sm text-slate-400 mb-1">Pass Rate</div>
                                <div className="text-3xl font-bold text-white tabular-nums">
                                    {getPassRate(results).toFixed(1)}%
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-lg">
                                <div className="text-sm text-slate-400 mb-1">Net Cash Flow</div>
                                <div className={`text-3xl font-bold tabular-nums ${results.cashFlow.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${Math.round(results.cashFlow.netCashFlow).toLocaleString()}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-lg">
                                <div className="text-sm text-slate-400 mb-1">Traders</div>
                                <div className="text-3xl font-bold text-white tabular-nums">
                                    {getTotalTraders(results).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Trader Statistics</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Total Attempts</span>
                                        <span className="text-white font-mono">{getTotalTraders(results)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Passed Challenge</span>
                                        <span className="text-white font-mono">{getPassed(results)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Failed Challenge</span>
                                        <span className="text-white font-mono">{getFailed(results)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                                        <span className="text-slate-400">Pass Rate</span>
                                        <span className="text-white font-mono">{getPassRate(results).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Financial Impact</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Revenue</span>
                                        <span className="text-green-400 font-mono">${Math.round(results.cashFlow.revenue).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Payouts</span>
                                        <span className="text-red-400 font-mono">${Math.round(results.cashFlow.payoutLiability).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                                        <span className="text-slate-400 font-semibold">Net Cash Flow</span>
                                        <span className={`font-mono font-semibold ${results.cashFlow.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${Math.round(results.cashFlow.netCashFlow).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scenario Description */}
                        {selectedScenario && (
                            <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-300 mb-2">Scenario Details</h4>
                                <p className="text-sm text-slate-400">
                                    {STRESS_SCENARIOS.find(s => s.key === selectedScenario)?.description}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isRunning && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                        <p className="text-slate-400">Running stress test simulation...</p>
                    </div>
                )}

                {/* Initial State */}
                {!results && !isRunning && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                        <p className="text-slate-400 text-lg">Select a stress test scenario above to begin</p>
                    </div>
                )}
            </div>
        </div>
    );
}
