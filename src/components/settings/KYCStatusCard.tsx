
import { CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KYCStatusCardProps {
    status: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'rejected';
    onStartVerification: () => void;
}

export function KYCStatusCard({ status, onStartVerification }: KYCStatusCardProps) {
    const getStatusConfig = () => {
        switch (status) {
            case 'approved':
                return {
                    icon: <CheckCircle className="w-8 h-8 text-emerald-400" />,
                    title: "Verification Complete",
                    description: "Your identity has been verified. You have full access to all features.",
                    color: "bg-emerald-500/10 border-emerald-500/20",
                    textColor: "text-emerald-400",
                    cta: null
                };
            case 'under_review':
            case 'in_progress':
                return {
                    icon: <Clock className="w-8 h-8 text-yellow-400" />,
                    title: "Verification In Progress",
                    description: "We are reviewing your documents. This usually takes less than 24 hours.",
                    color: "bg-yellow-500/10 border-yellow-500/20",
                    textColor: "text-yellow-400",
                    cta: (
                        <Button disabled className="w-full mt-4 bg-yellow-500/20 text-yellow-200 border border-yellow-500/30">
                            Check Status
                        </Button>
                    )
                };
            case 'rejected':
                return {
                    icon: <ShieldAlert className="w-8 h-8 text-red-400" />,
                    title: "Verification Failed",
                    description: "Please check your email for details on why your verification was rejected.",
                    color: "bg-red-500/10 border-red-500/20",
                    textColor: "text-red-400",
                    cta: (
                        <Button onClick={onStartVerification} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white">
                            Retry Verification
                        </Button>
                    )
                };
            default:
                return {
                    icon: <ShieldAlert className="w-8 h-8 text-blue-400" />,
                    title: "Identity Verification Required",
                    description: "To withdraw funds or trade with larger accounts, you must complete KYC verification.",
                    color: "bg-blue-500/10 border-blue-500/20",
                    textColor: "text-blue-400",
                    cta: (
                        <Button onClick={onStartVerification} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                            Start Verification
                        </Button>
                    )
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={cn("p-6 rounded-xl border", config.color)}>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-black/20 rounded-lg backdrop-blur-sm">
                    {config.icon}
                </div>
                <div>
                    <h3 className={cn("text-lg font-bold mb-1", config.textColor)}>{config.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        {config.description}
                    </p>
                </div>
            </div>
            {config.cta}
        </div>
    );
}
