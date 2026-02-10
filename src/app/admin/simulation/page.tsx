'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { runMonteCarloSimulation, generateSummaryReport, exportToCSV, type MonteCarloResults, type SimulationRun } from '@/lib/simulation/monte-carlo';
import { calculateRealWorldProjection, type AttritionConfig } from '@/lib/simulation/attrition-model';
import { compareAllTiers, exportTierComparisonCSV, type MultiTierComparison, type TierAnalysisResult } from '@/lib/simulation/multi-tier-analysis';
import { FIRM_CONFIG, type FirmConfig } from '@/lib/simulation/config';

interface RealWorldModelTabProps {
    traderCount: number;
    setTraderCount: Dispatch<SetStateAction<number>>;
    evalMultiplier: number;
    setEvalMultiplier: Dispatch<SetStateAction<number>>;
    evaluationPassRate: number;
    setEvaluationPassRate: Dispatch<SetStateAction<number>>;
    fundedToPayoutRate: number;
    setFundedToPayoutRate: Dispatch<SetStateAction<number>>;
    firstPayoutCap: number;
    setFirstPayoutCap: Dispatch<SetStateAction<number>>;
    challengeFee: number;
    setChallengeFee: Dispatch<SetStateAction<number>>;
    payoutSplit: number;
    setPayoutSplit: Dispatch<SetStateAction<number>>;
    runSimulation: () => void;
    results: ReturnType<typeof calculateRealWorldProjection> | null;
}

interface MonteCarloTabProps {
    iterations: number;
    setIterations: Dispatch<SetStateAction<number>>;
    traderCount: number;
    setTraderCount: Dispatch<SetStateAction<number>>;
    challengeFee: number;
    setChallengeFee: Dispatch<SetStateAction<number>>;
    maxDrawdown: number;
    setMaxDrawdown: Dispatch<SetStateAction<number>>;
    profitTarget: number;
    setProfitTarget: Dispatch<SetStateAction<number>>;
    payoutSplit: number;
    setPayoutSplit: Dispatch<SetStateAction<number>>;
    runSimulation: () => void;
    isRunning: boolean;
    results: MonteCarloResults | null;
    handleExportCSV: () => void;
    handleExportReport: () => void;
}

interface MultiTierTabProps {
    traderCount: number;
    setTraderCount: Dispatch<SetStateAction<number>>;
    evalMultiplier: number;
    setEvalMultiplier: Dispatch<SetStateAction<number>>;
    runAnalysis: () => void;
    results: MultiTierComparison | null;
    handleExportCSV: () => void;
}

export default function SimulationPage() {
    const [activeTab, setActiveTab] = useState<'attrition' | 'monte-carlo' | 'multi-tier'>('attrition');
    const [isRunning, setIsRunning] = useState(false);

    // Monte Carlo state
    const [mcResults, setMcResults] = useState<MonteCarloResults | null>(null);
    const [iterations, setIterations] = useState(1000);

    // Real-World Attrition state
    const [attritionResults, setAttritionResults] = useState<ReturnType<typeof calculateRealWorldProjection> | null>(null);
    const [evalMultiplier, setEvalMultiplier] = useState(2.0);
    const [evaluationPassRate, setEvaluationPassRate] = useState(8);
    const [fundedToPayoutRate, setFundedToPayoutRate] = useState(3);
    const [firstPayoutCap, setFirstPayoutCap] = useState(10);

    // Multi-Tier Analysis state
    const [multiTierResults, setMultiTierResults] = useState<MultiTierComparison | null>(null);
    const [tierEvalMultiplier, setTierEvalMultiplier] = useState(2.0);

    // Shared configuration state
    const [traderCount, setTraderCount] = useState(1000);
    const [challengeFee, setChallengeFee] = useState(FIRM_CONFIG.challengeFee);
    const [maxDrawdown, setMaxDrawdown] = useState(FIRM_CONFIG.maxDrawdownPercent * 100);
    const [profitTarget, setProfitTarget] = useState(FIRM_CONFIG.profitTargetPercent * 100);
    const [payoutSplit, setPayoutSplit] = useState(FIRM_CONFIG.payoutSplit * 100);

    const runMonteCarloSim = async () => {
        setIsRunning(true);

        const config: FirmConfig = {
            ...FIRM_CONFIG,
            challengeFee,
            maxDrawdownPercent: maxDrawdown / 100,
            profitTargetPercent: profitTarget / 100,
            payoutSplit: payoutSplit / 100,
        };

        setTimeout(() => {
            const results = runMonteCarloSimulation({
                iterations,
                traderCount,
                firmConfig: config,
            });

            setMcResults(results);
            setIsRunning(false);
        }, 100);
    };

    const runAttritionSim = () => {
        const config: FirmConfig = {
            ...FIRM_CONFIG,
            challengeFee,
            maxDrawdownPercent: maxDrawdown / 100,
            profitTargetPercent: profitTarget / 100,
            payoutSplit: payoutSplit / 100,
        };

        const attritionConfig: AttritionConfig = {
            evalMultiplier,
            evaluationPassRate: evaluationPassRate / 100,
            fundedToPayoutRate: fundedToPayoutRate / 100,
            firstPayoutCapPercent: firstPayoutCap / 100,
            ongoingAttritionRate: 0.50,
        };

        const projection = calculateRealWorldProjection(traderCount, config, attritionConfig);
        setAttritionResults(projection);
    };

    const handleExportCSV = () => {
        if (!mcResults) return;

        const csv = exportToCSV(mcResults);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monte-carlo-${Date.now()}.csv`;
        a.click();
    };

    const handleExportReport = () => {
        if (!mcResults) return;

        const report = generateSummaryReport(mcResults);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation-report-${Date.now()}.txt`;
        a.click();
    };

    const runMultiTierAnalysis = () => {
        const comparison = compareAllTiers(traderCount, {
            evalMultiplier: tierEvalMultiplier,
        });
        setMultiTierResults(comparison);
    };

    const handleExportTierCSV = () => {
        if (!multiTierResults) return;

        const csv = exportTierComparisonCSV(multiTierResults);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `multi-tier-analysis-${Date.now()}.csv`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Business Simulation Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Real-world profitability projections and Monte Carlo stress testing
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('attrition')}
                        className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'attrition'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        💰 Real-World Model (NEW!)
                    </button>
                    <button
                        onClick={() => setActiveTab('monte-carlo')}
                        className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'monte-carlo'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🎲 Monte Carlo Simulation
                    </button>
                    <button
                        onClick={() => setActiveTab('multi-tier')}
                        className={`px-6 py-3 font-semibold transition-colors ${activeTab === 'multi-tier'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 Multi-Tier Analysis
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'multi-tier' ? (
                    <MultiTierTab
                        traderCount={traderCount}
                        setTraderCount={setTraderCount}
                        evalMultiplier={tierEvalMultiplier}
                        setEvalMultiplier={setTierEvalMultiplier}
                        runAnalysis={runMultiTierAnalysis}
                        results={multiTierResults}
                        handleExportCSV={handleExportTierCSV}
                    />
                ) : activeTab === 'attrition' ? (
                    <RealWorldModelTab
                        traderCount={traderCount}
                        setTraderCount={setTraderCount}
                        evalMultiplier={evalMultiplier}
                        setEvalMultiplier={setEvalMultiplier}
                        evaluationPassRate={evaluationPassRate}
                        setEvaluationPassRate={setEvaluationPassRate}
                        fundedToPayoutRate={fundedToPayoutRate}
                        setFundedToPayoutRate={setFundedToPayoutRate}
                        firstPayoutCap={firstPayoutCap}
                        setFirstPayoutCap={setFirstPayoutCap}
                        challengeFee={challengeFee}
                        setChallengeFee={setChallengeFee}
                        payoutSplit={payoutSplit}
                        setPayoutSplit={setPayoutSplit}
                        runSimulation={runAttritionSim}
                        results={attritionResults}
                    />
                ) : (
                    <MonteCarloTab
                        iterations={iterations}
                        setIterations={setIterations}
                        traderCount={traderCount}
                        setTraderCount={setTraderCount}
                        challengeFee={challengeFee}
                        setChallengeFee={setChallengeFee}
                        maxDrawdown={maxDrawdown}
                        setMaxDrawdown={setMaxDrawdown}
                        profitTarget={profitTarget}
                        setProfitTarget={setProfitTarget}
                        payoutSplit={payoutSplit}
                        setPayoutSplit={setPayoutSplit}
                        runSimulation={runMonteCarloSim}
                        isRunning={isRunning}
                        results={mcResults}
                        handleExportCSV={handleExportCSV}
                        handleExportReport={handleExportReport}
                    />
                )}
            </div>
        </div>
    );
}

// Real-World Model Tab Component
function RealWorldModelTab({ traderCount, setTraderCount, evalMultiplier, setEvalMultiplier, evaluationPassRate, setEvaluationPassRate, fundedToPayoutRate, setFundedToPayoutRate, firstPayoutCap, setFirstPayoutCap, challengeFee, setChallengeFee, payoutSplit, setPayoutSplit, runSimulation, results }: RealWorldModelTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Real-World Parameters</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Traders</label>
                            <input type="number" value={traderCount} onChange={(e) => setTraderCount(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="100" max="10000" step="100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Eval Multiplier (Re-buys)</label>
                            <input type="range" value={evalMultiplier} onChange={(e) => setEvalMultiplier(parseFloat(e.target.value))} className="w-full" min="1" max="4" step="0.25" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>1x</span>
                                <span className="font-semibold text-base">{evalMultiplier.toFixed(2)}x</span>
                                <span>4x</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">2x = baseline (cofounder data)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Pass Rate</label>
                            <input type="range" value={evaluationPassRate} onChange={(e) => setEvaluationPassRate(parseFloat(e.target.value))} className="w-full" min="4" max="15" step="0.5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>4%</span>
                                <span className="font-semibold">{evaluationPassRate}%</span>
                                <span>15%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Funded → Payout Rate</label>
                            <input type="range" value={fundedToPayoutRate} onChange={(e) => setFundedToPayoutRate(parseFloat(e.target.value))} className="w-full" min="1" max="10" step="0.5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>1%</span>
                                <span className="font-semibold">{fundedToPayoutRate}%</span>
                                <span>10%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">3% = baseline (50% attrition)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Payout Cap</label>
                            <input type="range" value={firstPayoutCap} onChange={(e) => setFirstPayoutCap(parseFloat(e.target.value))} className="w-full" min="5" max="20" step="1" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>5%</span>
                                <span className="font-semibold">{firstPayoutCap}%</span>
                                <span>20%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">10% = $1,000 for $10k account</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Challenge Rules</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fee ($)</label>
                            <input type="number" value={challengeFee} onChange={(e) => setChallengeFee(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="10" max="500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payout Split</label>
                            <input type="range" value={payoutSplit} onChange={(e) => setPayoutSplit(parseFloat(e.target.value))} className="w-full" min="60" max="90" step="5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>60%</span>
                                <span className="font-semibold">{payoutSplit}%</span>
                                <span>90%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={runSimulation} className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/80 transition">
                    Calculate Projection
                </button>
            </div>

            {/* Right Panel - Results */}
            <div className="lg:col-span-2 space-y-4">
                {!results ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Projection Yet</h3>
                        <p className="text-gray-500">Configure parameters and calculate</p>
                    </div>
                ) : (
                    <>
                        <div className={`bg-gradient-to-br ${results.cashFlow.netCashFlow > 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-lg shadow-lg p-8 text-white`}>
                            <div className="text-sm font-medium opacity-90 mb-2">Net Cash Flow</div>
                            <div className="text-6xl font-bold tabular-nums mb-2">${Math.round(results.cashFlow.netCashFlow).toLocaleString()}</div>
                            <div className="text-lg opacity-90">{results.cashFlow.profitMargin.toFixed(1)}% profit margin</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Revenue</div>
                                <div className="text-3xl font-bold text-gray-900 tabular-nums">${results.revenue.totalRevenue.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">{results.totalEvals.toLocaleString()} evals sold</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Total Payouts</div>
                                <div className="text-3xl font-bold text-gray-900 tabular-nums">${Math.round(results.payouts.totalPayoutLiability).toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">{results.funnel.firstPayouts} traders paid</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Profit/Trader</div>
                                <div className="text-3xl font-bold text-green-600 tabular-nums">${Math.round(results.cashFlow.profitPerTrader).toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">Per unique trader</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Eval Multiplier</div>
                                <div className="text-3xl font-bold text-primary tabular-nums">{(results.totalEvals / results.totalTraders).toFixed(2)}x</div>
                                <div className="text-xs text-gray-500 mt-1">Avg evals/trader</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Attrition Funnel</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Eval Attempts', value: results.totalEvals, pct: 100, color: 'bg-primary' },
                                    { label: 'Pass Evaluation', value: results.funnel.evaluationPasses, pct: (results.funnel.evaluationPasses / results.totalEvals) * 100, color: 'bg-green-600' },
                                    { label: 'Get First Payout', value: results.funnel.firstPayouts, pct: (results.funnel.firstPayouts / results.totalEvals) * 100, color: 'bg-yellow-600' },
                                    { label: 'Ongoing Survivors', value: results.funnel.ongoingTraders, pct: (results.funnel.ongoingTraders / results.totalEvals) * 100, color: 'bg-purple-600' },
                                ].map((item) => (
                                    <div key={item.label}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-700">{item.label}</span>
                                            <span className="font-semibold tabular-nums">{item.value.toLocaleString()} ({item.pct.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.pct}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`rounded-lg shadow p-6 ${results.cashFlow.profitMargin > 70 ? 'bg-green-50 border-2 border-green-500' : results.cashFlow.profitMargin > 50 ? 'bg-primary/5 border-2 border-primary' : results.cashFlow.profitMargin > 0 ? 'bg-yellow-50 border-2 border-yellow-500' : 'bg-red-50 border-2 border-red-500'}`}>
                            <h3 className="text-lg font-semibold mb-2">
                                {results.cashFlow.profitMargin > 70 ? '🚀 Highly Profitable' : results.cashFlow.profitMargin > 50 ? '✅ Profitable' : results.cashFlow.profitMargin > 0 ? '⚠️ Marginal' : '❌ Unprofitable'}
                            </h3>
                            <p className="text-gray-700">
                                {results.cashFlow.profitMargin > 70 ? `With ${results.cashFlow.profitMargin.toFixed(1)}% margins, scale aggressively!` : results.cashFlow.profitMargin > 50 ? `Solid ${results.cashFlow.profitMargin.toFixed(1)}% margins. Good balance.` : results.cashFlow.profitMargin > 0 ? `Only ${results.cashFlow.profitMargin.toFixed(1)}% margins. Consider adjustments.` : 'Unprofitable. Increase fees or reduce payout rates.'}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Monte Carlo Tab Component (simplified for brevity)
function MonteCarloTab({ iterations, setIterations, traderCount, setTraderCount, challengeFee, setChallengeFee, maxDrawdown, setMaxDrawdown, profitTarget, setProfitTarget, payoutSplit, setPayoutSplit, runSimulation, isRunning, results, handleExportCSV, handleExportReport }: MonteCarloTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Simulation Config</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Iterations</label>
                            <input type="number" value={iterations} onChange={(e) => setIterations(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="10" max="10000" step="10" />
                            <p className="text-xs text-gray-500 mt-1">{iterations >= 1000 ? 'High precision' : iterations >= 100 ? 'Standard' : 'Quick test'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Traders per Run</label>
                            <input type="number" value={traderCount} onChange={(e) => setTraderCount(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="10" max="10000" step="10" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Challenge Rules</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Challenge Fee ($)</label>
                            <input type="number" value={challengeFee} onChange={(e) => setChallengeFee(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="10" max="500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Drawdown (%)</label>
                            <input type="range" value={maxDrawdown} onChange={(e) => setMaxDrawdown(parseFloat(e.target.value))} className="w-full" min="4" max="15" step="0.5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>4%</span>
                                <span className="font-semibold">{maxDrawdown}%</span>
                                <span>15%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profit Target (%)</label>
                            <input type="range" value={profitTarget} onChange={(e) => setProfitTarget(parseFloat(e.target.value))} className="w-full" min="5" max="20" step="0.5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>5%</span>
                                <span className="font-semibold">{profitTarget}%</span>
                                <span>20%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payout Split (Trader %)</label>
                            <input type="range" value={payoutSplit} onChange={(e) => setPayoutSplit(parseFloat(e.target.value))} className="w-full" min="60" max="90" step="5" />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>60%</span>
                                <span className="font-semibold">{payoutSplit}%</span>
                                <span>90%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={runSimulation} disabled={isRunning} className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/80 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                    {isRunning ? 'Running...' : 'Run Simulation'}
                </button>
            </div>

            <div className="lg:col-span-2 space-y-4">
                {!results && !isRunning && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Simulation Run Yet</h3>
                        <p className="text-gray-500">Configure parameters and click "Run Simulation"</p>
                    </div>
                )}

                {isRunning && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Running {iterations.toLocaleString()} Simulations...</h3>
                        <p className="text-gray-500">This may take a few seconds</p>
                    </div>
                )}

                {results && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Avg Pass Rate</div>
                                <div className="text-3xl font-bold text-gray-900">{results.statistics.passRate.mean.toFixed(2)}%</div>
                                <div className="text-xs text-gray-500 mt-1">±{results.statistics.passRate.stdDev.toFixed(2)}%</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Avg Net Cash Flow</div>
                                <div className={`text-3xl font-bold tabular-nums ${results.statistics.netCashFlow.mean >= 0 ? 'text-green-600' : 'text-red-600'}`}>${Math.round(results.statistics.netCashFlow.mean).toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">±${Math.round(results.statistics.netCashFlow.stdDev).toLocaleString()}</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Insolvency Risk</div>
                                <div className={`text-3xl font-bold tabular-nums ${results.statistics.insolvencyProbability < 25 ? 'text-green-600' : results.statistics.insolvencyProbability < 50 ? 'text-yellow-600' : 'text-red-600'}`}>{results.statistics.insolvencyProbability.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500 mt-1">{results.runs.filter((r: SimulationRun) => r.netCashFlow < 0).length}/{results.runs.length} runs</div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="text-sm text-gray-600 mb-1">Break-Even Probability</div>
                                <div className={`text-3xl font-bold tabular-nums ${results.statistics.breakEvenProbability >= 75 ? 'text-green-600' : results.statistics.breakEvenProbability >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{results.statistics.breakEvenProbability.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500 mt-1">{results.runs.filter((r: SimulationRun) => r.netCashFlow >= 0).length}/{results.runs.length} runs</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Export Results</h3>
                            <div className="flex gap-4">
                                <button onClick={handleExportCSV} className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition">📊 Export CSV</button>
                                <button onClick={handleExportReport} className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition">📄 Export Report</button>
                            </div>
                        </div>

                        <div className={`rounded-lg shadow p-6 ${results.statistics.insolvencyProbability < 25 ? 'bg-green-50 border-2 border-green-500' : results.statistics.insolvencyProbability < 50 ? 'bg-yellow-50 border-2 border-yellow-500' : 'bg-red-50 border-2 border-red-500'}`}>
                            <h3 className="text-lg font-semibold mb-2">{results.statistics.insolvencyProbability < 25 ? '✅ Low Risk' : results.statistics.insolvencyProbability < 50 ? '⚠️ Moderate Risk' : '❌ High Risk'}</h3>
                            <p className="text-gray-700">{results.statistics.insolvencyProbability < 25 ? 'Configuration appears sustainable. Monitor over first 90 days.' : results.statistics.insolvencyProbability < 50 ? 'Consider tightening rules or increasing fees.' : 'Configuration likely unprofitable. Immediate adjustments recommended.'}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Multi-Tier Analysis Tab Component
function MultiTierTab({ traderCount, setTraderCount, evalMultiplier, setEvalMultiplier, runAnalysis, results, handleExportCSV }: MultiTierTabProps) {
    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Analysis Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Traders per Tier</label>
                        <input
                            type="number"
                            value={traderCount}
                            onChange={(e) => setTraderCount(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            min="100"
                            max="10000"
                            step="100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Eval Multiplier</label>
                        <input type="range"
                            value={evalMultiplier}
                            onChange={(e) => setEvalMultiplier(parseFloat(e.target.value))}
                            className="w-full"
                            min="1"
                            max="4"
                            step="0.25"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>1x</span>
                            <span className="font-semibold">{evalMultiplier.toFixed(2)}x</span>
                            <span>4x</span>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={runAnalysis}
                            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/80 transition"
                        >
                            Run Analysis
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            {!results ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Analysis Yet</h3>
                    <p className="text-gray-500">Configure parameters and run analysis</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                            <div className="text-sm opacity-90 mb-1">Best by Margin</div>
                            <div className="text-3xl font-bold">{results.bestByMargin}</div>
                        </div>
                        <div className="bg-gradient-to-br from-primary to-primary rounded-lg shadow p-6 text-white">
                            <div className="text-sm opacity-90 mb-1">Best by Absolute Profit</div>
                            <div className="text-3xl font-bold">{results.bestByAbsoluteProfit}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                            <div className="text-sm opacity-90 mb-1">Traders Analyzed</div>
                            <div className="text-3xl font-bold tabular-nums">{traderCount.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold">Tier Comparison</h2>
                            <button
                                onClick={handleExportCSV}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                            >
                                📊 Export CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payouts</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Trader</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.tiers.map((tier: TierAnalysisResult) => (
                                        <tr
                                            key={tier.tier}
                                            className={`hover:bg-gray-50 transition ${tier.tierLabel === results.bestByAbsoluteProfit ? 'bg-primary/5' : ''
                                                }`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-900">{tier.tierLabel}</span>
                                                    {tier.tierLabel === results.bestByAbsoluteProfit && (
                                                        <span className="ml-2 px-2 py-1 text-xs font-semibold text-primary bg-primary/15 rounded">Best</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 tabular-nums">${tier.challengeFee}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 tabular-nums">${tier.totalRevenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 tabular-nums">${tier.totalPayouts.toLocaleString()}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold tabular-nums ${tier.netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ${tier.netProfit.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 tabular-nums">{tier.profitMargin.toFixed(1)}%</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 tabular-nums">${tier.profitPerTrader.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {results.tiers.map((tier: TierAnalysisResult) => (
                            <div key={tier.tier} className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">{tier.tierLabel} Tier Details</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">Starting Balance</span>
                                        <span className="font-semibold tabular-nums">${tier.startingBalance.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">Max Drawdown</span>
                                        <span className="font-semibold tabular-nums">{tier.maxDrawdownPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">Profit Target</span>
                                        <span className="font-semibold tabular-nums">{tier.profitTargetPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="border-t border-gray-200 my-3"></div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">Break-even Traders</span>
                                        <span className="font-semibold tabular-nums">{tier.breakEvenTraders}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">First Payouts</span>
                                        <span className="font-semibold tabular-nums">{tier.firstPayoutTraders}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-sm">Ongoing Traders</span>
                                        <span className="font-semibold tabular-nums">{tier.ongoingTraders}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

