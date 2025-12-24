
import { User } from "lucide-react";

interface PrivateProfileHeaderProps {
    user: {
        displayName?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function PrivateProfileHeader({ user }: PrivateProfileHeaderProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#0E1217] border border-[#2E3A52] p-8 shadow-2xl group">
            {/* Background Pattern: Cyber Grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#2E81FF 1px, transparent 1px), linear-gradient(90deg, #2E81FF 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2E81FF]/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#2E81FF]/20 transition-all duration-700" />

            <div className="relative flex items-center gap-8">
                {/* Avatar with Pulse */}
                <div className="relative h-24 w-24 shrink-0">
                    {/* Outer pulsating ring */}
                    <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping opacity-20" />
                    <div className="absolute -inset-1 rounded-full border border-blue-500/20" />

                    <div className="h-full w-full rounded-full bg-[#1A232E] border-2 border-[#2E3A52] flex items-center justify-center overflow-hidden relative z-10">
                        {user.image ? (
                            <img src={user.image} alt={user.displayName || "User"} className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-10 w-10 text-blue-400/50" />
                        )}
                    </div>
                    {/* Status Indicator: Neon Green */}
                    <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-[#10B981] border-4 border-[#0E1217] shadow-[0_0_10px_#10B981] z-20" />
                </div>

                {/* User Info */}
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        {user.displayName || "Trader"}
                        <span className="text-xs font-mono font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                            PRO
                        </span>
                    </h1>
                    <p className="text-[#94A3B8] font-medium flex items-center gap-2">
                        {user.email}
                        <span className="w-1 h-1 rounded-full bg-[#2E3A52]" />
                        <span className="text-[#58687D] text-sm">Member since 2024</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
