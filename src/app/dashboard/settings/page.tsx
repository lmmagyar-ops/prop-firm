
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserInformationTab } from "@/components/settings/UserInformationTab";
import { KYCTab } from "@/components/settings/KYCTab";
import { AddressTab } from "@/components/settings/AddressTab";
import { getSettingsData } from "@/lib/settings-actions";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
        return null;
    }

    const user = await getSettingsData();

    if (!user) {
        return <div>Error loading user data</div>;
    }

    return (

        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-zinc-400">Manage your profile, identity verification, and payout details.</p>
            </div>

            <Tabs defaultValue="user-info" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-3 mb-8 bg-[#1A232E] border border-[#2E3A52] p-1 rounded-xl">
                    <TabsTrigger
                        value="user-info"
                        className="data-[state=active]:bg-[#29af73] data-[state=active]:text-white text-zinc-400 rounded-lg transition-all"
                    >
                        User Info
                    </TabsTrigger>
                    <TabsTrigger
                        value="kyc"
                        className="data-[state=active]:bg-[#29af73] data-[state=active]:text-white text-zinc-400 rounded-lg transition-all"
                    >
                        KYC
                    </TabsTrigger>
                    <TabsTrigger
                        value="address"
                        className="data-[state=active]:bg-[#29af73] data-[state=active]:text-white text-zinc-400 rounded-lg transition-all"
                    >
                        Address
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="user-info" className="mt-0">
                    <UserInformationTab user={user} />
                </TabsContent>

                <TabsContent value="kyc" className="mt-0">
                    <KYCTab />
                </TabsContent>

                <TabsContent value="address" className="mt-0">
                    <AddressTab user={user} />
                </TabsContent>
            </Tabs>
        </div>

    );
}
