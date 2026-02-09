"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const process = useScrollReveal();
  const details = useScrollReveal();
  const cta = useScrollReveal();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [email]);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Organic ambient glow — embedded, not a blob */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, var(--accent-glow) 0%, transparent 55%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* ───── Header ───── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "color-mix(in srgb, var(--background) 85%, transparent)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image src="/icon.svg" alt="Predictions Firm" width={28} height={28} priority />
            <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              Predictions Firm
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ThemeToggle />
            <a href="#waitlist" className="btn-primary">
              Join Waitlist
            </a>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section style={{ paddingTop: "180px", paddingBottom: "120px", paddingLeft: "24px", paddingRight: "24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h1
            className="animate-fade-in-up"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.2rem)",
              marginBottom: "28px",
              textAlign: "center",
            }}
          >
            Prove your edge.{" "}
            <span style={{ color: "var(--accent)" }}>Earn your account.</span>
          </h1>

          <p
            className="animate-fade-in-up delay-1"
            style={{
              color: "var(--text-secondary)", fontSize: "17px", lineHeight: 1.7,
              textAlign: "center", maxWidth: "520px", margin: "0 auto 48px",
            }}
          >
            The first evaluation platform for prediction market traders.
            Demonstrate your skill on real Polymarket &amp; Kalshi data —
            earn up to 90% of your performance.
          </p>

          {/* Email form */}
          <div
            id="waitlist"
            className="animate-fade-in-up delay-2"
            style={{ maxWidth: "400px", margin: "0 auto", scrollMarginTop: "120px" }}
          >
            {status === "success" ? (
              <div
                style={{
                  padding: "20px 24px", borderRadius: "10px", textAlign: "center",
                  border: "1px solid rgba(0,230,160,0.15)", background: "rgba(0,230,160,0.03)",
                }}
              >
                <p style={{ color: "var(--accent)", fontWeight: 500, fontSize: "15px", marginBottom: "4px" }}>
                  You&apos;re on the list.
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                  We&apos;ll email you when evaluations open.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="input-email"
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-primary"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {status === "loading" ? "..." : "Join"}
                  </button>
                </div>
                {status === "error" && (
                  <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>{message}</p>
                )}
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "10px", textAlign: "center", opacity: 0.5 }}>
                  Free to join · No spam
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ───── Process ───── */}
      <section
        ref={process.ref}
        style={{
          padding: "100px 24px",
          borderTop: "1px solid var(--border)",
          position: "relative", zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <p
            className={process.isVisible ? "animate-fade-in-up" : "opacity-0"}
            style={{
              fontSize: "13px", fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em", color: "var(--text-secondary)",
              marginBottom: "48px",
            }}
          >
            How it works
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
            {[
              {
                n: "01",
                t: "Pick your evaluation",
                d: "Choose a $5K, $10K, or $25K simulated account. One fee, one evaluation.",
              },
              {
                n: "02",
                t: "Trade real market data",
                d: "Execute positions on live Polymarket and Kalshi events. Hit your 10–12% target within the drawdown limits.",
              },
              {
                n: "03",
                t: "Qualify and earn",
                d: "Pass the evaluation, get a performance account, and earn up to 90% payouts. Bi-weekly.",
              },
            ].map((item, i) => (
              <div
                key={item.n}
                className={process.isVisible ? "animate-fade-in-up" : "opacity-0"}
                style={{ animationDelay: `${0.1 + i * 0.1}s`, display: "flex", gap: "20px", alignItems: "baseline" }}
              >
                <span
                  style={{
                    fontSize: "12px", fontWeight: 500,
                    color: "var(--accent)", opacity: 0.6,
                    fontVariantNumeric: "tabular-nums", flexShrink: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {item.n}
                </span>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "6px" }}>{item.t}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.7 }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Details ───── */}
      <section
        ref={details.ref}
        style={{
          padding: "100px 24px",
          borderTop: "1px solid var(--border)",
          position: "relative", zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <p
            className={details.isVisible ? "animate-fade-in-up" : "opacity-0"}
            style={{
              fontSize: "13px", fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em", color: "var(--text-secondary)",
              marginBottom: "48px",
            }}
          >
            Platform
          </p>

          <div
            className={details.isVisible ? "animate-fade-in-up delay-1" : "opacity-0"}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 40px" }}
          >
            {[
              { t: "Real data", d: "Live Polymarket and Kalshi prices. Politics, sports, technology, economics." },
              { t: "One evaluation", d: "No multi-phase process. Pass once and you're qualified." },
              { t: "90% payouts", d: "Industry-leading split from day one. Bi-weekly withdrawals." },
              { t: "Risk controls", d: "Drawdown limits, daily loss caps, exposure rules, liquidity checks." },
              { t: "200+ markets", d: "Eight categories. Elections, sports, Fed decisions, current events." },
              { t: "Clear rules", d: "Published targets, known drawdowns, no hidden conditions." },
            ].map((item) => (
              <div key={item.t}>
                <h3 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>{item.t}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.7 }}>{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section
        ref={cta.ref}
        style={{
          padding: "100px 24px",
          borderTop: "1px solid var(--border)",
          position: "relative", zIndex: 1,
        }}
      >
        <div
          className={cta.isVisible ? "animate-fade-in-up" : "opacity-0"}
          style={{ maxWidth: "400px", margin: "0 auto", textAlign: "center" }}
        >
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500, marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Ready to start?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "28px" }}>
            Join the waitlist. We&apos;ll let you know when evaluations open.
          </p>
          <a href="#waitlist" className="btn-primary">
            Join Waitlist
          </a>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "40px 24px 32px",
          position: "relative", zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              gap: "32px", marginBottom: "32px", flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "260px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Image src="/icon.svg" alt="Predictions Firm" width={20} height={20} />
                <span style={{ fontWeight: 600, fontSize: "13px" }}>Predictions Firm</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.7 }}>
                Skill evaluation for prediction market traders.
              </p>
            </div>

            <div style={{ display: "flex", gap: "40px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "10px", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                  Contact
                </p>
                <a
                  href="mailto:contact@predictionsfirm.com"
                  style={{ color: "var(--text-secondary)", fontSize: "12px", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  contact@predictionsfirm.com
                </a>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "10px", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                  Legal
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {["Terms", "Privacy", "Refunds"].map((label) => (
                    <a
                      key={label}
                      href={`/${label.toLowerCase()}`}
                      style={{ color: "var(--text-secondary)", fontSize: "12px", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimers */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "10px", lineHeight: 1.8, opacity: 0.7 }}>
              <p style={{ marginBottom: "8px" }}>
                <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>Chapman & Privatt Ltd</strong> — registered in England and Wales. 41 Limeharbour, London, UK E14 9TS.
              </p>
              <p style={{ marginBottom: "8px" }}>
                Evaluation fees are non-refundable once your assessment has begun. Unused evaluations may be refunded within 14 days per UK consumer law.
              </p>
              <p style={{ marginBottom: "8px" }}>
                Prediction market trading involves substantial risk. Past performance does not indicate future results. Evaluations simulate trading using third-party data and do not constitute financial advice. 18+.
              </p>
              <p style={{ marginBottom: "8px" }}>
                Predictions Firm provides skills evaluation only. Not a broker, exchange, or financial institution. We do not hold client funds. Not a gambling service. Payouts reflect demonstrated skill in simulated environments using public market data.
              </p>
              <p style={{ opacity: 0.5, marginTop: "12px" }}>
                © {new Date().getFullYear()} Chapman & Privatt Ltd
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
