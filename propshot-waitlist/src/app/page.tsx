"use client";

import { useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list! We'll be in touch soon.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen grid-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="Predictions Firm" width={40} height={40} priority />
            <span className="text-lg font-semibold leading-tight">Predictions<br />Firm</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="#waitlist" className="btn-primary text-sm px-6 py-3">
              Join Waitlist
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl mb-6 opacity-0 animate-fade-in">
            <span className="text-[#29AF73]">Funded Predictions</span>
          </h1>

          <p className="text-xl md:text-2xl text-[#a1a1a1] mb-12 max-w-2xl mx-auto opacity-0 animate-fade-in animate-delay-1">
            A simulated evaluation platform built on live prediction market data.
            <br className="hidden md:block" />
            Trade in our demo environment, follow strict risk rules, and earn performance-based rewards.
          </p>

          {/* Email Capture Form */}
          <div id="waitlist" className="max-w-md mx-auto opacity-0 animate-fade-in animate-delay-2 scroll-mt-32">
            {status === "success" ? (
              <div className="card text-center">
                <div className="w-16 h-16 bg-[#29AF73]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#29AF73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl mb-2">You&apos;re on the list!</h3>
                <p className="text-[#a1a1a1]">We&apos;ll notify you when we launch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-email"
                  required
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary w-full"
                >
                  {status === "loading" ? "Joining..." : "Join the Waitlist"}
                </button>
                {status === "error" && (
                  <p className="text-[#AD2A3D] text-sm">{message}</p>
                )}
                <p className="text-sm text-[#a1a1a1]">
                  Be the first to know when we launch. No spam, ever.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl mb-8">What is this?</h2>
          <p className="text-[var(--text-secondary)] text-lg">
            Funded Predictions lets traders prove forecasting skill in a simulated environment using real-time prediction market prices. Users purchase access to evaluation accounts with clear profit targets, drawdown limits, and exposure rules. Traders who meet the requirements may qualify for funded simulation accounts and performance-based payouts under our internal rules.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Logo & About */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/icon.svg" alt="Predictions Firm" width={32} height={32} />
                <span className="font-semibold leading-tight">Predictions<br />Firm</span>
              </div>
              <p className="text-[#a1a1a1] text-sm mb-4">
                An evaluation platform for prediction market traders seeking funded opportunities.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <p className="text-[#a1a1a1] text-sm">
                <a href="mailto:contact@predictionsfirm.com" className="hover:text-[#29AF73] transition-colors">
                  contact@predictionsfirm.com
                </a>
              </p>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#a1a1a1]">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/refund" className="hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Company Registration & Disclaimer */}
          <div className="border-t border-white/5 pt-8">
            <div className="text-[#a1a1a1] text-xs space-y-4">
              <p>
                <strong className="text-[#f5f5f5]">Chapman & Privatt Ltd</strong> is a company registered in England and Wales.
                Registered Address: 41 Limeharbour, London, UK E14 9TS.
              </p>
              <p>
                <strong>Refund Policy:</strong> Evaluation fees are non-refundable once your challenge period has begun.
                Unused evaluations may be refunded within 14 days of purchase. Contact us at contact@predictionsfirm.com for refund requests.
              </p>
              <p>
                <strong>Risk Disclosure:</strong> Trading prediction markets involves substantial risk of loss and is not suitable
                for all individuals. Past performance is not indicative of future results. The evaluation challenges
                simulate trading conditions and do not guarantee future success. You must be 18 years or older to use our services.
              </p>
              <p>
                Predictions Firm provides skills evaluation services only. We do not provide investment advice, tax advice, or legal advice.
                We are not a broker, exchange, or financial institution. This is not gambling. All trading on funded accounts
                is conducted through regulated third-party platforms.
              </p>
              <p className="pt-4">
                © {new Date().getFullYear()} Chapman & Privatt Ltd. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
