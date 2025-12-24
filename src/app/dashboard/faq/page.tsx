

import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export default function FAQPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">FAQ</h1>

            <div className="max-w-2xl mx-auto mt-16">
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-[#2E81FF]/20 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-[#2E81FF]" />
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-white">Help Center Coming Soon</h2>
                    <p className="text-zinc-400 mb-8">
                        We're building a comprehensive FAQ section for Project X. In the meantime, contact us for support.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <Button className="bg-[#2E81FF] hover:bg-[#2E81FF]/80 text-white border-0">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Support
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
