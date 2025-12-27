"use client";

import { LandingHero } from "@/components/dashboard/LandingHero";
import { LandingContent } from "@/components/dashboard/LandingContent";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

export default function Page() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      {/* Simple Background Gradient */}
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
