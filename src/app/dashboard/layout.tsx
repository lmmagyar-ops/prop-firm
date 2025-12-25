
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { auth } from "@/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="min-h-screen bg-[#0E1217] flex font-sans text-white">
            <Sidebar active="dashboard" /> {/* Note: Active state might need context or route checking, but default is fine for now/layout */}

            <main className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">
                <TopNav />

                <div className="flex-1 p-6 max-w-[1800px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
