"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ShieldAlert,
    Activity,
    Users,
    Fingerprint,
    Crosshair,
    Zap,
    Rocket,
    BarChart3,
    Eye,
    AlertTriangle,
    Lock,
    BookOpen,
    Sun,
    ClipboardCheck,
    Siren,
    GitFork,
    Crown,
    Skull,
    RefreshCcw,
    CheckCircle2,
    Shield
} from "lucide-react";

export default function MasterDocPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-24">

            {/* --- Hero Section --- */}
            <div className="relative border-b border-white/10 pb-8 overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 blur-[100px] rounded-full h-64 w-64 -z-10 pointer-events-none" />
                <Badge variant="outline" className="bg-white/5 text-zinc-400 border-white/10 mb-4 tracking-widest font-mono text-[10px] uppercase">
                    Classified: Internal Eyes Only
                </Badge>
                <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
                    The Operating System
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
                    A comprehensive guide to the <span className="text-indigo-400">Command Center</span>.
                    Manage risk, analyze flow, and scale acquisition from a single interface.
                </p>
            </div>

            <div className="relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/20 via-white/5 to-transparent hidden lg:block" />
                <Badge className="bg-zinc-100 text-black hover:bg-white mb-6">Part I: System Architecture</Badge>
            </div>

            {/* --- 1. Mission Control --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="01"
                    title="Mission Control"
                    icon={Activity}
                    color="text-primary"
                    desc="Global System Monitoring"
                />
                <div className="grid md:grid-cols-2 gap-6">
                    <FeatureCard
                        title="The Golden Ratio"
                        desc="The most critical metric: Revenue vs. Liability."
                        icon={BarChart3}
                        color="bg-primary/10 text-primary"
                    >
                        Keep the <span className="text-primary">Golden Ratio</span> above 1.5. If it drops below,
                        the system is taking on too much exposure relative to income.
                    </FeatureCard>
                    <FeatureCard
                        title="Live Pulse"
                        desc="Real-time WebSocket feed."
                        icon={Zap}
                        color="bg-amber-500/10 text-amber-400"
                    >
                        The <span className="text-amber-400">Global Feed</span> shows every trade as it happens.
                        Watch for "Whale Splashes" (orders {'>'} $1,000).
                    </FeatureCard>
                </div>
            </section>

            {/* --- 2. Risk Desk --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="02"
                    title="Risk Desk"
                    icon={AlertTriangle}
                    color="text-red-400"
                    desc="Exposure & Liability Management"
                />
                <div className="prose prose-invert max-w-none text-zinc-400 mb-4">
                    <p>The Risk Desk is where we prevent blowups. Our job is to balance the book.</p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-8 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -z-10" />
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Crosshair className="h-5 w-5 text-red-500" /> The "Kill Switch" Protocol
                    </h3>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li className="flex gap-3 items-start">
                            <span className="text-red-500 font-mono">01</span>
                            <span>Monitor the <strong>Outcome Exposure Heatmap</strong>. If one bar turns bright red, we are over-exposed.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-red-500 font-mono">02</span>
                            <span>Use the <strong>"Leverage Cap"</strong> to drastically reduce max position size on volatile assets.</span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* --- 3. Traders Desk --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="03"
                    title="Traders Desk"
                    icon={Users}
                    color="text-emerald-400"
                    desc="Profiling & Classification"
                />
                <div className="grid md:grid-cols-3 gap-6">
                    <FeatureCard
                        title="DNA Scanner"
                        desc="Holographic Radar Chart"
                        icon={Fingerprint}
                        color="bg-emerald-500/10 text-emerald-400"
                    >
                        Visualizes a trader's <span className="text-emerald-400">Risk Appetite</span> vs <span className="text-emerald-400">Skill</span>.
                        Look for wide "Skill" spikes.
                    </FeatureCard>
                    <FeatureCard
                        title="Trader Segmentation"
                        desc="Risk bracketing."
                        icon={Users}
                        color="bg-zinc-800 text-zinc-400"
                    >
                        <strong>Standard Pool</strong>: 98% of users.<br />
                        <strong>High Risk</strong>: Profitable traders (Limit Leverage).
                    </FeatureCard>
                    <FeatureCard
                        title="Challenge Status"
                        desc="Phase 1 / Phase 2"
                        icon={Eye}
                        color="bg-purple-500/10 text-purple-400"
                    >
                        Track progress bars. Funded traders are marked with a <span className="text-purple-400">Neon Glow</span>.
                    </FeatureCard>
                </div>
            </section>

            {/* --- 4. Security Desk --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="04"
                    title="Security Desk"
                    icon={Lock}
                    color="text-orange-400"
                    desc="Forensics & Cheat Detection"
                />
                <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-6">
                    <h3 className="font-bold text-orange-400 text-lg mb-2">Latency Arbitrage Scanner</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                        The "Kill Zone" (0-200ms) is strictly forbidden. Traders entering immediately after news events
                        are exploiting feed latency.
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 bg-black/40 p-3 rounded border border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span>{"<"} 50ms (Likely Bot)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span>50-300ms (Suspicious)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>{">"} 300ms (Human)</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 5. Analytics Desk --- */}
            <section className="space-y-6">
                <SectionHeader
                    number="05"
                    title="Analytics Desk"
                    icon={BarChart3}
                    color="text-rose-400"
                    desc="Revenue & Retention"
                />
                <div className="grid md:grid-cols-2 gap-6">
                    <FeatureCard
                        title="Retention Cohorts"
                        desc="Deep Blue Heatmap"
                        icon={Users}
                        color="bg-rose-500/10 text-rose-400"
                    >
                        Darker cells = Higher retention. Focus on the <span className="text-rose-400">Month 1 Drop-off</span>.
                        If this exceeds 40%, check onboarding.
                    </FeatureCard>
                    <FeatureCard
                        title="Re-Purchase Velocity"
                        desc="Rage Trade Detection"
                        icon={Zap}
                        color="bg-amber-500/10 text-amber-400"
                    >
                        Tracks how fast a failed trader buys a new challenge.
                        <br />
                        <span className="text-amber-400">Legacy Stat:</span> 60% re-buy within 1 hour.
                    </FeatureCard>
                </div>
            </section>

            {/* ========================================================================================== */}
            {/* --- PART II: STANDARD OPERATING PROCEDURES --- */}
            {/* ========================================================================================== */}

            <div className="pt-12 relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />
                <Badge className="bg-zinc-100 text-black hover:bg-white mb-8">Part II: Operating Procedures</Badge>

                {/* --- 6. Morning Review --- */}
                <section className="space-y-6 mb-16">
                    <SectionHeader
                        number="06"
                        title="Morning Review Protocol"
                        icon={Sun}
                        color="text-yellow-400"
                        desc="Daily 08:00 AM Checklist"
                    />
                    <Card className="bg-zinc-900/60 border-yellow-500/20 shadow-2xl">
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5">
                                <ChecklistItem
                                    text="Golden Ratio Check: Ensure Revenue > 1.5x Liability."
                                    desc="If < 1.5, halt marketing and widen spreads."
                                />
                                <ChecklistItem
                                    text="Nightly Ops Scan"
                                    desc="Check for 'Ghost Trades' during the 02:00-06:00 AM low-liquidity window."
                                />
                                <ChecklistItem
                                    text="Payout Queue Clearance"
                                    desc="Review and process all pending payouts > $1,000."
                                />
                                <ChecklistItem
                                    text="Whale Watch"
                                    desc="Tag new deposits > $5,000 as VIP."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* --- 7. Defcon Protocols --- */}
                <section className="space-y-6 mb-16">
                    <SectionHeader
                        number="07"
                        title="Defcon Risk Levels"
                        icon={Siren}
                        color="text-red-500"
                        desc="Volatility Response Matrix"
                    />
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="bg-green-900/10 border-green-500/20">
                            <CardHeader>
                                <Badge className="w-fit bg-green-500/20 text-green-400 mb-2 border-0">DEFCON 5</Badge>
                                <CardTitle className="text-base">Normal Ops</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-zinc-400">
                                100% Simulated Flow.<br />
                                Standard Spreads.<br />
                                Normal Liquidity.
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-900/10 border-orange-500/20">
                            <CardHeader>
                                <Badge className="w-fit bg-orange-500/20 text-orange-400 mb-2 border-0">DEFCON 3</Badge>
                                <CardTitle className="text-base">Choppy Market</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-zinc-400">
                                <span className="text-white">Widen Spreads 50%</span> on volatile pairs.<br />
                                Cap Leverage at 1:50.
                            </CardContent>
                        </Card>
                        <Card className="bg-red-900/10 border-red-500/50 relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                            <CardHeader>
                                <Badge className="w-fit bg-red-500 text-white mb-2 border-0">DEFCON 1</Badge>
                                <CardTitle className="text-base text-red-100">CRISIS</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-red-200/70 relative z-10">
                                Force <strong>"Close Only"</strong> mode.<br />
                                Halt New Positions.<br />
                                Suspend Withdrawals.
                            </CardContent>
                        </Card>
                    </div>
                </section>


                {/* --- 8. Financial Ops --- */}
                <section className="space-y-6 mb-16">
                    <SectionHeader
                        number="08"
                        title="Payout Decision Tree"
                        icon={GitFork}
                        color="text-purple-400"
                        desc="Anti-Fraud Flowchart"
                    />
                    <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-8 backdrop-blur-md">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm relative">
                            {/* Connector Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -z-10 hidden md:block" />

                            <StepNode number="1" title="IP Match" color="blue" icon={Fingerprint}>
                                Same Country?
                            </StepNode>
                            <StepNode number="2" title="DNA Scan" color="purple" icon={Activity}>
                                Skill Score Consistent?
                            </StepNode>
                            <StepNode number="3" title="Arb Check" color="orange" icon={Crosshair}>
                                No 0ms trades?
                            </StepNode>
                            <StepNode number="✅" title="Approve" color="green" icon={CheckCircle2}>
                                Process Payout
                            </StepNode>
                        </div>
                    </div>
                </section>

                {/* --- 9. Retention Ops --- */}
                <section className="space-y-6 mb-16">
                    <SectionHeader
                        number="09"
                        title="Retention Operations"
                        icon={Crown}
                        color="text-amber-400"
                        desc="Whale Hunting & Zombie Resurrection"
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                        <FeatureCard
                            title="The Whale Hunter"
                            desc="VIP Treatment Protocol"
                            icon={Crown}
                            color="bg-amber-500/10 text-amber-400"
                        >
                            <strong>Trigger:</strong> Users tagged "Sniper" with {'>'}$10k Deposits.<br />
                            <strong>Action:</strong> Manually upgrade to <span className="text-amber-400">Same-Day Payouts</span>.<br />
                            <strong>Script:</strong> "We noticed your sharp trading. We've unlocked VIP withdrawals for you."
                        </FeatureCard>
                        <FeatureCard
                            title="Zombie Resurrection"
                            desc="Churn Reversal"
                            icon={Skull}
                            color="bg-rose-500/10 text-rose-400"
                        >
                            <strong>Trigger:</strong> User fails challenge & misses "Rage Trade" window (24h inactive).<br />
                            <strong>Action:</strong> Auto-send "One-Time 20% Off" code.<br />
                            <strong>Stats:</strong> Reactivates 15% of dead leads.
                        </FeatureCard>
                    </div>
                </section>
            </div>


            {/* --- 10. Growth Desk (The Manual) --- */}
            <div className="relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />
                <Badge className="bg-zinc-100 text-black hover:bg-white mb-8">Part III: Growth Playbook</Badge>

                <section className="space-y-8">
                    <div className="flex items-center gap-2 mb-6">
                        {/* <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">OPERATING MANUAL v1.0</Badge> */}
                    </div>

                    <div className="space-y-8">
                        {/* 10.1 Influencer ROI */}
                        <div className="space-y-4">
                            <SectionHeader number="10.1" title="Influencer ROI: Finding the Signal" icon={Rocket} color="text-purple-400" />
                            <div className="prose prose-invert max-w-none text-zinc-300">
                                <p>
                                    Most prop firms make the mistake of valuing <strong>Volume</strong> over <strong>Quality</strong>.
                                    A YouTuber who sends you 10,000 signups is <em>useless</em> if they all chargeback or win significantly more than they lose (Toxic Flow).
                                </p>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-lg">
                                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4" /> Warning: Simulated Toxic Traffic
                                </h4>
                                <p className="text-sm text-zinc-300">
                                    If you see an influencer in the leaderboard with <span className="text-red-400 font-mono">Negative Net Revenue</span>,
                                    it means their audience is consistently beating the house. <strong>Cancel their contract immediately.</strong>
                                </p>
                            </div>
                        </div>

                        {/* 10.2 Market Hooks */}
                        <div className="space-y-4">
                            <SectionHeader number="10.2" title='Market Hooks: "The First Bet"' icon={Crosshair} color="text-cyan-400" />
                            <div className="prose prose-invert max-w-none text-zinc-300">
                                <p>
                                    Users rarely sign up for the platform itself. They sign up to trade a <strong>Specific Event</strong>.
                                    The "Market Hooks" chart visualizes exactly which event triggered the signup.
                                </p>
                            </div>
                            <div className="md:grid md:grid-cols-2 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                                    <h5 className="text-zinc-400 text-sm mb-1 uppercase tracking-wider">Metric</h5>
                                    <p className="text-xl text-white font-medium">LTV Multiplier</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                                    <h5 className="text-zinc-400 text-sm mb-1 uppercase tracking-wider">Insight</h5>
                                    <p className="text-sm text-zinc-400">Crypto Traders last 3x longer than Politics Traders.</p>
                                </div>
                            </div>
                        </div>

                        {/* 10.3 Discount War Room */}
                        <div className="space-y-4">
                            <SectionHeader number="10.3" title="Discount War Room" icon={Zap} color="text-yellow-400" />
                            <div className="prose prose-invert max-w-none text-zinc-300">
                                <p>
                                    Discounts are a drug. Used correctly, they boost growth. Used poorly, they destroy margin.
                                </p>
                            </div>
                            <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-lg">
                                <h4 className="font-bold text-green-400 mb-1">The Golden Rule</h4>
                                <p className="text-sm text-zinc-300">
                                    Only increase the discount if the <span className="text-green-400">Revenue Area</span> spikes significantly.
                                    If Revenue stays flat while discounts increase, you are hitting <strong>Saturation</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                </section>
            </div>
        </div>
    );
}

// --- Components ---

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
    )
}

function FeatureCard({ title, desc, children, icon: Icon, color }: any) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-medium text-zinc-200">
                    <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {title}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-zinc-400 leading-relaxed">
                    {children}
                </p>
            </CardContent>
        </Card>
    )
}

function ChecklistItem({ text, desc }: { text: string, desc: string }) {
    return (
        <div className="flex gap-4 p-4 hover:bg-white/5 items-start group">
            <div className="pt-1">
                <div className="w-5 h-5 rounded border border-zinc-600 bg-transparent group-hover:border-yellow-500 transition-colors flex items-center justify-center">
                    {/* Checkbox visual only */}
                </div>
            </div>
            <div>
                <p className="font-medium text-zinc-200">{text}</p>
                <p className="text-sm text-zinc-500">{desc}</p>
            </div>
        </div>
    )
}

function StepNode({ number, title, children, color, icon: Icon }: any) {
    const colors: any = {
        blue: "bg-primary border-primary",
        purple: "bg-purple-500 border-purple-400",
        orange: "bg-orange-500 border-orange-400",
        green: "bg-green-500 border-green-400",
    }

    return (
        <div className="flex flex-col items-center text-center z-10 bg-zinc-950 p-4 rounded-xl border border-white/10 shadow-xl w-full md:w-48">
            <div className={`w-10 h-10 rounded-full ${colors[color]} flex items-center justify-center text-white font-bold mb-3 shadow-lg border-2`}>
                {Number(number) ? number : <Icon className="h-5 w-5" />}
            </div>
            <h4 className="font-bold text-white mb-1">{title}</h4>
            <p className="text-xs text-zinc-500">{children}</p>
        </div>
    )
}
