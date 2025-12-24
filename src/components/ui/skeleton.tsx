
import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-shimmer rounded-md bg-zinc-800/20", className)}
            {...props}
        />
    )
}

export { Skeleton }
