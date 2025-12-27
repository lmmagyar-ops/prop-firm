"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useState } from "react";

interface ChallengeFailedModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: string;
}

export function ChallengeFailedModal({ isOpen, onClose, reason }: ChallengeFailedModalProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="bg-[#1A232E] border-red-900/50 text-white max-w-md">
                <AlertDialogHeader className="items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)]">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-bold text-red-500">
                        Evaluation Failed
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 mt-2">
                        {reason || "Maximum drawdown limit reached."}
                        <br />
                        Don't give up. Professional trading is about resilience.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center mt-6">
                    <AlertDialogCancel onClick={onClose} className="hidden">Close</AlertDialogCancel> {/* Hidden valid dismiss */}
                    <AlertDialogAction asChild>
                        <Button
                            onClick={onClose}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12"
                        >
                            Review & Retry
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
