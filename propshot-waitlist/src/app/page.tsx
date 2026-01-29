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
          <Image src="/logo.svg" alt="Propshot" width={160} height={40} priority />
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
            The World&apos;s First
            <br />
            <span className="text-[#29AF73]">Prediction Market</span> Prop Firm
          </h1>

          <p className="text-xl md:text-2xl text-[#a1a1a1] mb-12 max-w-2xl mx-auto opacity-0 animate-fade-in animate-delay-1">
            A skill-based evaluation platform for prediction market traders.
            Demonstrate your abilities, access funded trading opportunities.
          </p>

          {/* Email Capture Form */}
          <div id="waitlist" className="max-w-md mx-auto opacity-0 animate-fade-in animate-delay-2">
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

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Pass the Challenge",
                description: "Prove your trading skills by meeting our profit targets while managing risk.",
              },
              {
                step: "02",
                title: "Get Funded",
                description: "Once you pass, trade with our capital. Accounts from $5,000 to $25,000.",
              },
              {
                step: "03",
                title: "Get Rewarded",
                description: "Successful traders receive up to 90% of their trading gains. Bi-weekly payouts.",
              },
            ].map((item, i) => (
              <div key={i} className="card text-center">
                <div className="text-[#29AF73] text-sm font-medium mb-4">{item.step}</div>
                <h3 className="text-xl mb-3">{item.title}</h3>
                <p className="text-[#a1a1a1]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Propshot */}
      <section className="py-20 px-6 bg-[var(--card-bg)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-center mb-16">Why Propshot?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Trade Prediction Markets",
                description: "Access Polymarket and Kalshi through our professional trading platform.",
              },
              {
                title: "No Personal Capital at Risk",
                description: "Trade with our money. Your only investment is the evaluation fee.",
              },
              {
                title: "Performance-Based Rewards",
                description: "Successful traders receive up to 90% of their gains. Fair and transparent.",
              },
              {
                title: "Professional Tools",
                description: "Real-time data, advanced risk management, and institutional-grade execution.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 bg-[#29AF73] rounded-full mt-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg mb-2">{item.title}</h3>
                  <p className="text-[var(--text-secondary)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl mb-8">About Propshot</h2>
          <p className="text-[var(--text-secondary)] text-lg mb-8">
            Propshot is the world&apos;s first proprietary trading firm dedicated to prediction markets.
            Our mission is to empower skilled traders by providing them with the capital and tools
            they need to succeed in this emerging asset class.
          </p>
          <p className="text-[var(--text-secondary)]">
            We prioritise transparency, risk management, and trader success. Whether you&apos;re new to
            prediction markets or an experienced trader, Propshot provides a supportive environment
            for long-term growth.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl mb-6">Ready to Get Started?</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join our waitlist and be the first to know when we launch.
          </p>
          <a href="#waitlist" className="btn-primary inline-block">
            Join the Waitlist
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Logo & About */}
            <div className="md:col-span-2">
              <Image src="/logo.svg" alt="Propshot" width={140} height={35} className="mb-4" />
              <p className="text-[#a1a1a1] text-sm mb-4">
                An evaluation platform for prediction market traders seeking funded opportunities.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <p className="text-[#a1a1a1] text-sm">
                <a href="mailto:contact@propshot.com" className="hover:text-[#29AF73] transition-colors">
                  contact@propshot.com
                </a>
              </p>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#a1a1a1]">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Risk Disclosure</a></li>
              </ul>
            </div>
          </div>

          {/* Company Registration & Disclaimer */}
          <div className="border-t border-white/5 pt-8">
            <div className="text-[#a1a1a1] text-xs space-y-4">
              <p>
                <strong className="text-[#f5f5f5]">Propshot Ltd</strong> is a company registered in England and Wales.
                Company Number: [PLACEHOLDER].
                Registered Address: [PLACEHOLDER ADDRESS, CITY, POSTCODE, UK].
              </p>
              <p>
                <strong>Risk Disclosure:</strong> Trading prediction markets involves substantial risk of loss and is not suitable
                for all investors. Past performance is not indicative of future results. The evaluation challenges
                simulate trading conditions but do not guarantee future success. Please trade responsibly and only
                risk capital you can afford to lose.
              </p>
              <p>
                Propshot does not provide investment advice, tax advice, or legal advice. We are not a broker,
                exchange, or financial institution. All trading is conducted through third-party platforms.
              </p>
              <p className="pt-4">
                © {new Date().getFullYear()} Propshot Ltd. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
