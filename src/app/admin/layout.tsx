import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {/* Background Gradients (Aurora Effect) */}
                <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-black pointer-events-none" />
                <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

                {/* Noise Texture (Optional / Subtle) */}
                <div className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

                {/* Content */}
                <div className="relative z-10 h-full p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
