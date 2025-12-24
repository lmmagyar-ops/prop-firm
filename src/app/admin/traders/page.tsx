import { TraderDNAProfiles } from "@/components/admin/traders/TraderDNAProfiles";
import { TradeHeatmapCalendar } from "@/components/admin/traders/TradeHeatmapCalendar";
import { BehavioralFingerprint } from "@/components/admin/traders/BehavioralFingerprint";
import { SessionReplayTimeline } from "@/components/admin/traders/SessionReplayTimeline";

export default function TradersPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Traders Desk</h1>
                <p className="text-zinc-500">Behavioral forensics and trader DNA profiling</p>
            </div>

            {/* Trader DNA Profiles - Full Width */}
            <TraderDNAProfiles />

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TradeHeatmapCalendar />
                <BehavioralFingerprint />
            </div>

            {/* Session Replay - Full Width */}
            <SessionReplayTimeline />
        </div>
    );
}
