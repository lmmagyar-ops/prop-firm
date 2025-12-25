"use client";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { LandingHero } from "@/components/dashboard/LandingHero";
import { LandingContent } from "@/components/dashboard/LandingContent";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
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
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      {/* Simple Background Gradient (replaces expensive blurred dashboard) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-black" />
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#2E81FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Foreground Content (Scrollable) */}
      <div className="relative z-20 overflow-y-auto h-screen">
        <LandingHero />
        <LandingContent />
      </div>
    </div>
  );
}
