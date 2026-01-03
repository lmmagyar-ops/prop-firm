"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { PLANS } from "@/config/plans";
import { MarketTicker } from "@/components/MarketTicker";
import { Navbar } from "@/components/Navbar";
import { RulesTooltip } from "@/components/RulesTooltip";

// Particle Background Component
function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{
            x: number;
            y: number;
            dx: number;
            dy: number;
            size: number;
            opacity: number;
        }> = [];

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            const particleCount = Math.min(window.innerWidth / 10, 100);

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    dx: (Math.random() - 0.5) * 0.5,
                    dy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2,
                    opacity: Math.random() * 0.5 + 0.1
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(46, 129, 255, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach(p2 => {
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(46, 129, 255, ${0.1 * (1 - distance / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                });
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        const handleResize = () => init();
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none opacity-40"
        />
    );
}

export function LandingHero() {
    // Default to grinder (10k)
    const [selectedPlanKey, setSelectedPlanKey] = useState<keyof typeof PLANS>("grinder");
    const activePlan = PLANS[selectedPlanKey];

    // Helper to get plan by size for the selector buttons
    const planKeys = Object.keys(PLANS) as (keyof typeof PLANS)[];
    // Sort by price to ensure 5k -> 10k -> 25k order
    planKeys.sort((a, b) => PLANS[a].price - PLANS[b].price);

    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    return (
        <div className="relative min-h-[95vh] flex flex-col items-center justify-between overflow-hidden bg-[#050505] selection:bg-[#2E81FF]/30">
            <Navbar />

            <ParticleBackground />

            {/* Ambient Light Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[600px] bg-gradient-to-b from-[#2E81FF]/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2E81FF]/5 blur-[150px] rounded-full pointer-events-none animate-pulse-slow" />

            <div className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto px-4 pt-32 md:pt-48 flex-grow">

                {/* Main Headline */}
                <motion.div
                    style={{ y: y1, opacity }}
                    className="flex flex-col items-center text-center space-y-8 max-w-5xl"
                >
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-6xl md:text-8xl lg:text-[110px] leading-[0.85] font-black tracking-tighter text-white drop-shadow-2xl"
                    >
                        Trade with <br />
                        <span className="relative inline-block mt-2">
                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] via-cyan-300 to-[#2E81FF] animate-gradient-x bg-[length:200%_auto]">
                                Our Liquidity.
                            </span>
                            <span className="absolute inset-0 bg-[#2E81FF]/20 blur-[40px] z-0" />
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed max-w-2xl"
                    >
                        We provide the capital. You provide the edge. <br className="hidden md:block" />
                        <span className="text-white font-bold">Zero Personal Liability.</span> Keep up to 90% of profits.
                    </motion.p>
                </motion.div>

                {/* Interactive Plan Selector & CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="mt-16 w-full max-w-xl"
                >
                    <div className="bg-[#1A232E]/60 backdrop-blur-xl border border-[#2E3A52] p-2 rounded-[2rem] shadow-2xl ring-1 ring-white/5">
                        <div className="flex p-1 gap-2 mb-6 bg-[#0B0E14]/50 rounded-2xl border border-white/5 mx-2 mt-2">
                            {planKeys.map((key) => {
                                const plan = PLANS[key];
                                const sizeLabel = (plan.size / 1000) + "k";
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPlanKey(key)}
                                        className={`relative flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${selectedPlanKey === key
                                                ? "bg-[#2E81FF] text-white shadow-lg ring-1 ring-white/20"
                                                : "text-zinc-500 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        ${sizeLabel}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col items-center px-6 pb-6 space-y-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white tracking-tighter">${activePlan.price}</span>
                                <span className="text-zinc-500 font-medium">/ one-time fee</span>
                            </div>

                            <Link href={`/signup?intent=buy_evaluation&tier=${activePlan.id}&price=${activePlan.price}`} className="w-full">
                                <div className="group relative w-full">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-[#2E81FF] to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-500 animate-pulse" />
                                    <Button
                                        size="lg"
                                        className="relative w-full h-14 text-lg font-black rounded-full bg-[#2E81FF] hover:bg-[#2563EB] text-white border-none shadow-[0_0_20px_rgba(46,129,255,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        START CHALLENGE <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </Link>

                            <RulesTooltip />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Ticker integration at bottom */}
            <div className="relative z-20 w-full mt-auto border-t border-white/5 bg-[#050505]/80 backdrop-blur-sm">
                <MarketTicker />
            </div>
        </div>
    );
}
