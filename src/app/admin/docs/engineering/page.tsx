"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Code2,
    Database,
    Server,
    Shield,
    Zap,
    GitBranch,
    Activity,
    Cpu,
    Layers,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Lock,
    BarChart3,
    Terminal,
    Workflow,
    Timer,
    Globe,
    Wallet,
    TrendingUp,
    FileCode,
    Bug,
    Rocket,
    Gauge
} from "lucide-react";

export default function EngineeringDocPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-24">

            {/* --- Hero Section --- */}
            <div className="relative border-b border-white/10 pb-8 overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-emerald-500/10 blur-[100px] rounded-full h-64 w-64 -z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-12 bg-blue-500/10 blur-[100px] rounded-full h-48 w-48 -z-10 pointer-events-none" />

                <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 tracking-widest font-mono text-[10px] uppercase">
                        v38.1 Production Ready
                    </Badge>
                    <Badge variant="outline" className="bg-white/5 text-zinc-400 border-white/10 tracking-widest font-mono text-[10px] uppercase">
                        316/316 Tests Passing
                    </Badge>
                </div>

                <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
                    Engineering Master Manual
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
                    The <span className="text-emerald-400">source of truth</span> for platform architecture,
                    risk engine logic, and cross-provider integration patterns.
                </p>
            </div>

            {/* --- Quick Stats --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickStat icon={Cpu} label="Stack" value="Next.js 16 + Turbopack" />
                <QuickStat icon={Database} label="Database" value="PostgreSQL + Drizzle" />
                <QuickStat icon={Zap} label="Cache" value="Redis (ioredis)" />
                <QuickStat icon={Shield} label="Auth" value="NextAuth.js v5" />
            </div>

            {/* --- Table of Contents --- */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-zinc-400" />
                        Documentation Sections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <TOCSection
                            sections={[
                                { num: "01", title: "System Architecture", icon: Server },
                                { num: "02", title: "Evaluation Engine", icon: Activity },
                                { num: "03", title: "Ingestion Pipeline", icon: RefreshCw },
                                { num: "04", title: "Security & Integrity", icon: Lock },
                                { num: "05", title: "Operations & Deployment", icon: Rocket },
                            ]}
                        />
                        <TOCSection
                            sections={[
                                { num: "06", title: "Audit Registry", icon: FileCode },
                                { num: "07", title: "Performance Patterns", icon: Gauge },
                                { num: "08", title: "Terminal Design", icon: Terminal },
                                { num: "09", title: "Execution Ledger", icon: Wallet },
                                { num: "10", title: "Production Hardening", icon: Shield },
                            ]}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ====================== PART I: ARCHITECTURE ====================== */}
            <div className="relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent hidden lg:block" />
                <Badge className="bg-emerald-500 text-black hover:bg-emerald-400 mb-6">Part I: System Architecture</Badge>
            </div>

            {/* --- 1. System Architecture --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="01"
                    title="System Architecture"
                    icon={Server}
                    color="text-emerald-400"
                    desc="High-Frequency Simulated Trading Platform"
                />

                {/* Core Flow Diagram */}
                <Card className="bg-zinc-900/60 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-300 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" /> Data Flow Architecture
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-black/40 p-6 rounded-lg border border-white/5 font-mono text-xs overflow-x-auto">
                            <pre className="text-zinc-400">
                                {`┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Polymarket  │────▶│   Ingestion  │────▶│    Redis     │
│    API       │     │   Service    │     │  (PubSub)    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
┌──────────────┐     ┌──────────────┐     ┌──────▼───────┐
│    Kalshi    │────▶│   Ingestion  │────▶│  WebSocket   │
│    API       │     │   Service    │     │   Server     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
┌──────────────────────────────────────────────────────────┐
│                      Next.js API                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  RiskEngine │   │  Evaluator  │   │  BalanceMgr │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
└──────────────────────────────┬───────────────────────────┘
                               │
                        ┌──────▼───────┐
                        │  PostgreSQL  │
                        │   (Drizzle)  │
                        └──────────────┘`}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Execution Path */}
                <div className="grid md:grid-cols-2 gap-6">
                    <FeatureCard
                        title="Atomic Execution Path"
                        desc="6-Step Trade Fulfillment"
                        icon={Workflow}
                        color="bg-emerald-500/10 text-emerald-400"
                    >
                        <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                            <li><span className="text-zinc-300">Validation</span> - Price check against Redis</li>
                            <li><span className="text-zinc-300">Context</span> - Explicit challengeId + userId</li>
                            <li><span className="text-zinc-300">Risk Check</span> - Atomic RiskEngine validation</li>
                            <li><span className="text-zinc-300">VWAP Calc</span> - Order book walking</li>
                            <li><span className="text-zinc-300">Ledger TX</span> - Position + Balance update</li>
                            <li><span className="text-zinc-300">Evaluation</span> - Phase transition check</li>
                        </ol>
                    </FeatureCard>

                    <FeatureCard
                        title="Batch Redis Execution"
                        desc="N+1 Query Elimination"
                        icon={Zap}
                        color="bg-amber-500/10 text-amber-400"
                    >
                        <div className="space-y-2 text-zinc-400">
                            <p><code className="text-amber-400">getBatchPrices</code> - Multi-asset price fetch</p>
                            <p><code className="text-amber-400">getBatchMarketTitles</code> - O(1) title resolution</p>
                            <div className="mt-4 bg-black/40 p-3 rounded border border-white/5">
                                <div className="flex justify-between text-xs">
                                    <span>20-position portfolio:</span>
                                    <span><span className="text-red-400 line-through">~1.2s</span> → <span className="text-green-400">&lt;15ms</span></span>
                                </div>
                            </div>
                        </div>
                    </FeatureCard>
                </div>
            </section>

            {/* --- 2. Evaluation Engine --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="02"
                    title="Evaluation Engine"
                    icon={Activity}
                    color="text-blue-400"
                    desc="Risk Management & Performance Tracking"
                />

                <Card className="bg-zinc-900/60 border-blue-500/20">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-blue-400" /> The Equity Formula
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-white/5 font-mono text-sm">
                            <p className="text-blue-400">Equity = Cash Balance + Σ(Position Values)</p>
                            <p className="text-zinc-500 mt-2 text-xs">Where Position Value = shares × basis_price</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
                                <h4 className="font-medium text-emerald-400 mb-2">YES Basis</h4>
                                <code className="text-xs text-zinc-400">basis = YES_price</code>
                            </div>
                            <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-lg">
                                <h4 className="font-medium text-rose-400 mb-2">NO Basis</h4>
                                <code className="text-xs text-zinc-400">basis = 1 - YES_price</code>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rule Enforcement Hierarchy */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" /> Rule Enforcement Hierarchy
                    </h3>
                    <div className="space-y-3">
                        <RuleItem
                            level="HARD FAIL"
                            color="red"
                            title="Time Limit Expiry"
                            desc="Date.now() > challenge.endsAt triggers immediate failure"
                        />
                        <RuleItem
                            level="HARD FAIL"
                            color="red"
                            title="Max Drawdown"
                            desc="Trailing (Eval) or Static (Funded) drawdown breach"
                        />
                        <RuleItem
                            level="PENDING"
                            color="orange"
                            title="Daily Loss Limit"
                            desc="Recoverable until UTC 00:00 reset"
                        />
                        <RuleItem
                            level="SUCCESS"
                            color="green"
                            title="Profit Target"
                            desc="Evaluation only: Triggers phase transition to funded"
                        />
                        <RuleItem
                            level="HARD BLOCK"
                            color="red"
                            title="Arbitrage Detection"
                            desc="Blocks trades that would create risk-free arb positions (binary or multi-runner)"
                        />
                    </div>
                </div>

                {/* Tiered Position Limits */}
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-200">Tiered Position Limits</CardTitle>
                        <CardDescription>Max open positions by account size</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <TierCard tier="$5K" limit={10} />
                            <TierCard tier="$10K" limit={15} />
                            <TierCard tier="$25K" limit={20} />
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* ====================== PART II: SECURITY ====================== */}
            <div className="pt-12 relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-orange-500/20 to-transparent hidden lg:block" />
                <Badge className="bg-orange-500 text-black hover:bg-orange-400 mb-8">Part II: Security & Integrity</Badge>
            </div>

            {/* --- 4. Security Section --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="04"
                    title="Security & Integrity"
                    icon={Lock}
                    color="text-orange-400"
                    desc="Race Conditions, Fail-Closed Principles"
                />

                <div className="grid md:grid-cols-2 gap-6">
                    <FeatureCard
                        title="Pessimistic Row Locking"
                        desc="Race Condition Protection"
                        icon={Lock}
                        color="bg-orange-500/10 text-orange-400"
                    >
                        <code className="text-xs text-zinc-400">SELECT FOR UPDATE</code> on challenges table during trade execution. Serializes concurrent risk validations.
                    </FeatureCard>

                    <FeatureCard
                        title="Directional Identity"
                        desc="Hedging Collapse Prevention"
                        icon={Shield}
                        color="bg-purple-500/10 text-purple-400"
                    >
                        Positions keyed by <code className="text-purple-400">(challengeId, marketId, direction)</code>. Prevents opposite bets from incorrectly merging.
                    </FeatureCard>

                    <FeatureCard
                        title="Fail-Closed Principles"
                        desc="Missing Data = Rejection"
                        icon={AlertCircle}
                        color="bg-red-500/10 text-red-400"
                    >
                        Any missing risk parameter in database JSONB results in immediate trade rejection. No defaults, no assumptions.
                    </FeatureCard>

                    <FeatureCard
                        title="Navigation Guardrails"
                        desc="Server-Steered Locking"
                        icon={Shield}
                        color="bg-blue-500/10 text-blue-400"
                    >
                        Failed/passed accounts have restricted routes. <code className="text-blue-400">cursor-not-allowed</code> and div wrappers instead of Link anchors.
                    </FeatureCard>

                    <FeatureCard
                        title="Arbitrage Detector"
                        desc="Risk-Free Profit Prevention"
                        icon={AlertCircle}
                        color="bg-pink-500/10 text-pink-400"
                    >
                        Blocks trades creating arb positions: YES/NO on same market, or all outcomes in multi-runner events. <code className="text-pink-400">ArbitrageDetector.ts</code>
                    </FeatureCard>
                </div>
            </section>

            {/* ====================== PART III: PRODUCTION ====================== */}
            <div className="pt-12 relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent hidden lg:block" />
                <Badge className="bg-indigo-500 text-white hover:bg-indigo-400 mb-8">Part III: Production Readiness (v37+)</Badge>
            </div>

            {/* --- 11. Production Hardening --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="11"
                    title="Production Readiness"
                    icon={Rocket}
                    color="text-indigo-400"
                    desc="CI/CD, Security, Monitoring"
                />

                {/* CI Pipeline */}
                <Card className="bg-zinc-900/60 border-indigo-500/20">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-indigo-400" /> CI/CD Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <PipelineStep step="1" title="Quality" desc="TypeScript + ESLint" status="check" />
                            <div className="hidden md:block h-0.5 flex-1 bg-zinc-800" />
                            <PipelineStep step="2" title="Test" desc="316 Unit Tests" status="check" />
                            <div className="hidden md:block h-0.5 flex-1 bg-zinc-800" />
                            <PipelineStep step="3" title="Build" desc="next build" status="check" />
                            <div className="hidden md:block h-0.5 flex-1 bg-zinc-800" />
                            <PipelineStep step="4" title="Deploy" desc="Vercel" status="rocket" />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                    <FeatureCard
                        title="Rate Limiting"
                        desc="middleware.ts"
                        icon={Timer}
                        color="bg-rose-500/10 text-rose-400"
                    >
                        100 req/min throttle on all API routes. In-memory tracking with security headers (CSP, X-Frame-Options).
                    </FeatureCard>

                    <FeatureCard
                        title="Auth Guards"
                        desc="auth-guard.ts"
                        icon={Lock}
                        color="bg-green-500/10 text-green-400"
                    >
                        <code className="text-xs text-green-400">requireAuth</code>, <code className="text-xs text-green-400">validateOwnership</code>, <code className="text-xs text-green-400">requireActiveChallenge</code>
                    </FeatureCard>

                    <FeatureCard
                        title="Sentry Monitoring"
                        desc="Error Tracking"
                        icon={Bug}
                        color="bg-purple-500/10 text-purple-400"
                    >
                        Client + Server + Edge configs with Session Replay and 10% trace sampling.
                    </FeatureCard>
                </div>

                {/* Test Suite Status */}
                <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-400 text-lg">All Tests Passing</h3>
                                <p className="text-zinc-500 text-sm">316 comprehensive tests across 23 files</p>
                            </div>
                        </div>
                        <div className="font-mono text-4xl text-green-400">100%</div>
                    </div>

                    {/* Test Suite Breakdown */}
                    <div className="grid md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-green-500/10">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Financial Critical (84 tests)</h4>
                            <TestStat label="Challenge Risk Rules" count={16} />
                            <TestStat label="Payout Logic & Edge Cases" count={44} />
                            <TestStat label="Balance Tracking" count={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Trading Engine (133 tests)</h4>
                            <TestStat label="Trade Execution" count="~40" />
                            <TestStat label="Market Data & Risk" count="~50" />
                            <TestStat label="Integration Flows" count="~43" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Security & Auth (51 tests)</h4>
                            <TestStat label="Auth Guards & Admin" count={16} />
                            <TestStat label="2FA Flow" count={11} />
                            <TestStat label="API Endpoints" count={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Gamification (48 tests)</h4>
                            <TestStat label="Leaderboard & Privacy" count={17} />
                            <TestStat label="Achievements & Badges" count={31} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Automation</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                <span>Auto-run on file changes</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                <span>GitHub Actions ready</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                <span>Pre-commit hooks optional</span>
                            </div>
                        </div>
                    </div>

                    {/* Test Commands Reference */}
                    <div className="mt-6 pt-6 border-t border-green-500/10">
                        <h4 className="text-sm font-medium text-zinc-300 mb-3">Quick Commands</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            <code className="text-xs bg-black/40 px-3 py-2 rounded border border-white/5 text-zinc-400">
                                npm test
                            </code>
                            <span className="text-xs text-zinc-500 flex items-center">Watch mode (development)</span>
                            <code className="text-xs bg-black/40 px-3 py-2 rounded border border-white/5 text-zinc-400">
                                npm test -- --run
                            </code>
                            <span className="text-xs text-zinc-500 flex items-center">Single run (CI/CD)</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Footer --- */}
            <div className="border-t border-white/10 pt-8 mt-12">
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">v38.2</Badge>
                        <span>Last updated: Jan 2, 2025</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>Prop Firm Engineering</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---

function QuickStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-sm font-medium text-zinc-200">{value}</div>
        </div>
    );
}

function TOCSection({ sections }: { sections: { num: string; title: string; icon: any }[] }) {
    return (
        <div className="space-y-2">
            {sections.map((s) => (
                <div key={s.num} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-zinc-600 font-mono text-sm">{s.num}</span>
                    <s.icon className="h-4 w-4 text-zinc-500" />
                    <span className="text-zinc-300 text-sm">{s.title}</span>
                </div>
            ))}
        </div>
    );
}

function SectionHeader({ number, title, icon: Icon, color, desc }: any) {
    return (
        <div className="flex items-start gap-4 border-b border-white/5 pb-4">
            <span className="text-4xl font-black text-zinc-800 tracking-tighter select-none">{number}</span>
            <div>
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${color}`}>
                    <Icon className="h-6 w-6" /> {title}
                </h2>
                {desc && <p className="text-zinc-500 mt-1">{desc}</p>}
            </div>
        </div>
    );
}

function FeatureCard({ title, desc, children, icon: Icon, color }: any) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base font-medium text-zinc-200">
                    <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {title}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-zinc-400 leading-relaxed">
                    {children}
                </div>
            </CardContent>
        </Card>
    );
}

function RuleItem({ level, color, title, desc }: { level: string; color: string; title: string; desc: string }) {
    const colors: any = {
        red: "bg-red-500/20 text-red-400 border-red-500/30",
        orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        green: "bg-green-500/20 text-green-400 border-green-500/30",
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-black/20 rounded border border-white/5">
            <Badge className={`${colors[color]} border text-[10px] font-mono`}>{level}</Badge>
            <div>
                <span className="font-medium text-zinc-200">{title}</span>
                <span className="text-zinc-500 ml-2">— {desc}</span>
            </div>
        </div>
    );
}

function TierCard({ tier, limit }: { tier: string; limit: number }) {
    return (
        <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-zinc-200">{tier}</div>
            <div className="text-3xl font-mono text-emerald-400 my-2">{limit}</div>
            <div className="text-xs text-zinc-500">max positions</div>
        </div>
    );
}

function PipelineStep({ step, title, desc, status }: { step: string; title: string; desc: string; status: "check" | "rocket" }) {
    return (
        <div className="flex flex-col items-center text-center bg-zinc-900/60 p-4 rounded-xl border border-white/5 min-w-[120px]">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${status === "check" ? "bg-green-500/20 text-green-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                {status === "check" ? <CheckCircle2 className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
            </div>
            <h4 className="font-medium text-white text-sm">{title}</h4>
            <p className="text-xs text-zinc-500">{desc}</p>
        </div>
    );
}

function TestStat({ label, count }: { label: string; count: number | string }) {
    return (
        <div className="flex items-center justify-between text-xs bg-black/20 px-3 py-2 rounded border border-white/5">
            <span className="text-zinc-400">{label}</span>
            <span className="font-mono text-green-400">{count}</span>
        </div>
    );
}
