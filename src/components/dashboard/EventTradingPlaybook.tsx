"use client";

import { motion } from "framer-motion";
import { Newspaper, Scale, Crosshair, ArrowRight } from "lucide-react";

const STEPS = [
    {
        step: "01",
        title: "Spot The News",
        desc: "Breaking news creates opportunity. When the Fed speaks or elections shift, the market reacts instantly.",
        icon: Newspaper,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20"
    },
    {
        step: "02",
        title: "Check The Odds",
        desc: "Don't guess the price. Check the probability. If the market says 40% but reality says 80%, you have an edge.",
        icon: Scale,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20"
    },
    {
        step: "03",
        title: "Execute The Edge",
        desc: "Take the position. When reality catches up to your prediction, you get paid. Simple as that.",
        icon: Crosshair,
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20"
    }
];

export function EventTradingPlaybook() {
    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            {/* Header */}
            <div className="text-center mb-16 space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        How It Works
                    </div>

                    <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight leading-tight">
                        The Event Trading <span className="text-primary">Playbook.</span>
                    </h2>

                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
                        Forget complex technical analysis. Here is the 3-step framework to turning real-world knowledge into funded profits.
                    </p>
                </motion.div>
            </div>

            {/* Steps Grid */}
            <div className="grid md:grid-cols-3 gap-8 relative">
                {/* Connecting Line (Desktop Only) */}
                <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-primary/20 via-purple-500/20 to-green-500/20 -z-10 border-t border-dashed border-zinc-700/50" />

                {STEPS.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.2 }}
                        className="relative group"
                    >
                        <div className="relative bg-[#0E1217] border border-[#2E3A52] rounded-3xl p-8 hover:border-zinc-600 transition-colors h-full">
                            {/* Step Number */}
                            <div className="absolute top-6 right-8 text-4xl font-medium text-zinc-800/50 select-none group-hover:text-zinc-700/50 transition-colors">
                                {step.step}
                            </div>

                            {/* Icon */}
                            <div className={`w-16 h-16 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                <step.icon className={`w-8 h-8 ${step.color} stroke-[2px]`} />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                            <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                {step.desc}
                            </p>

                            {/* Arrow for next step (except last) */}
                            {i < STEPS.length - 1 && (
                                <div className="hidden md:flex absolute -right-4 top-[60px] z-20 w-8 h-8 bg-[#0E1217] border border-[#2E3A52] rounded-full items-center justify-center text-zinc-600">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
