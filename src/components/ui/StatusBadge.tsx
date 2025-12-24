
import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "neutral" | "cautious" | "info";

interface StatusBadgeProps {
    status: string;
    variant?: StatusType;
    className?: string;
    pulse?: boolean;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; border: string }> = {
    success: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
        border: "border-emerald-500/20",
    },
    warning: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        dot: "bg-amber-400",
        border: "border-amber-500/20",
    },
    error: {
        bg: "bg-red-500/10",
        text: "text-red-400",
        dot: "bg-red-400",
        border: "border-red-500/20",
    },
    cautious: {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        dot: "bg-orange-400",
        border: "border-orange-500/20",
    },
    neutral: {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        dot: "bg-zinc-400",
        border: "border-zinc-500/20",
    },
    info: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        dot: "bg-blue-400",
        border: "border-blue-500/20",
    },
};

// Map common status strings to variants
const getVariantFromStatus = (status: string): StatusType => {
    const s = status.toLowerCase();
    if (["active", "passed", "funded", "good", "connected"].includes(s)) return "success";
    if (["failed", "critical", "disconnected", "error"].includes(s)) return "error";
    if (["pending", "warning", "high load"].includes(s)) return "warning";
    if (["verification", "review"].includes(s)) return "cautious";
    return "neutral";
};

export function StatusBadge({ status, variant, className, pulse = false }: StatusBadgeProps) {
    const finalVariant = variant || getVariantFromStatus(status);
    const styles = statusConfig[finalVariant];

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium tracking-wide capitalize",
                styles.bg,
                styles.text,
                styles.border,
                className
            )}
        >
            <div className="relative flex h-1.5 w-1.5 item-center justify-center">
                {(pulse || finalVariant === "success" || finalVariant === "error") && (
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", styles.dot)}></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", styles.dot)}></span>
            </div>
            {status}
        </div>
    );
}
