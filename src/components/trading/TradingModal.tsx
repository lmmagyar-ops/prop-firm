
"use client";

import { memo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, TrendingUp, Users } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface TradingModalProps {
    question: string;
    volume: number;
    activeTraders: number;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function TradingModal({
    question, volume, activeTraders, open, onClose, children
}: TradingModalProps) {
    const isMobile = useMediaQuery("(max-width: 768px)");

    // Desktop Modal
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className="!max-w-[95vw] h-[90vh] p-0 gap-0 bg-[#1A232E] border-zinc-800 overflow-hidden flex flex-col">
                    <DialogTitle className="sr-only">{question}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Trading interface for {question}. Current volume: ${(volume / 1000000).toFixed(1)}M
                    </DialogDescription>
                    <Header question={question} volume={volume} activeTraders={activeTraders} onClose={onClose} />
                    <div className="flex-1 overflow-hidden">
                        {children}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Bottom Sheet
    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent side="bottom" className="h-[85vh] p-0 bg-background border-t border-border flex flex-col">
                <Header question={question} volume={volume} activeTraders={activeTraders} onClose={onClose} mobile />
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
}

interface HeaderProps {
    question: string;
    volume: number;
    activeTraders: number;
    onClose: () => void;
    mobile?: boolean;
}

// Memoized to prevent re-renders that cause INP issues
const Header = memo(function Header({ volume, activeTraders, mobile }: HeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-sm h-14">
            <div className={`flex items-center gap-4 text-xs text-zinc-400`}>
                {!mobile && (
                    <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="font-mono text-zinc-300 ml-1">${(volume / 1000000).toFixed(1)}M</span>
                    </div>
                )}
                <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span className="font-mono text-zinc-300 ml-1">{activeTraders}</span>
                </div>
            </div>
        </div>
    );
});

