
interface PublicProfileHeaderProps {
    user: {
        displayName?: string | null;
    };
}

export function PublicProfileHeader({ user }: PublicProfileHeaderProps) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#0E1217] border border-[#2E3A52] p-8 shadow-2xl group mb-8">
            {/* Background Pattern: Cyber Grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#29af73 1px, transparent 1px), linear-gradient(90deg, #29af73 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#29af73]/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#29af73]/20 transition-all duration-700" />

            <div className="relative space-y-2">
                <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                    Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#29af73] to-[#06B6D4]">{user.displayName || "Trader"}</span>
                </h1>
                <p className="text-sm font-mono text-[#94A3B8] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
                    {currentDate}
                </p>
            </div>
        </div>
    );
}
