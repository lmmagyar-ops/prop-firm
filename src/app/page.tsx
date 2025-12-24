"use client";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { LandingHero } from "@/components/dashboard/LandingHero";
import { LandingContent } from "@/components/dashboard/LandingContent";
import { useEffect, useState } from "react";

export default function Page() {
  const [balance, setBalance] = useState<number | null>(null);

  // Check URL params for payment success to simulate "Account Created"
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes("payment=success")) {
      setBalance(10000); // Simulate Instant Funding
    }
  }, []);

  // 1. FUNDED USER VIEW
  if (balance !== null) {
    return <DashboardView initialBalance={balance} userId="demo-user-1" />;
  }

  // 2. LANDING / TEASER VIEW
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">

      {/* Background Layer (Blurred Dashboard) */}
      <div className="fixed inset-0 z-0 opacity-40 blur-sm scale-[1.02] pointer-events-none">
        <DashboardView demoMode />
      </div>

      {/* Vignette Overlay for readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none fixed" />

      {/* Foreground Content (Scrollable) */}
      <div className="relative z-20 overflow-y-auto h-screen">
        <LandingHero />
        <LandingContent />
      </div>
    </div>
  );
}
