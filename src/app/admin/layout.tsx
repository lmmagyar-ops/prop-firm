import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Gradeint */}
                <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 h-full p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
