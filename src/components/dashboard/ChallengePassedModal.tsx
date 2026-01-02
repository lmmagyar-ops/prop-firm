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
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChallengePassedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChallengePassedModal({ isOpen, onClose }: ChallengePassedModalProps) {
    const router = useRouter();

    const handleProceed = () => {
        onClose();
        // Navigate to verification page where users can complete KYC
        router.push("/dashboard/verification");
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="bg-[#1A232E] border-yellow-500/50 text-white max-w-md">
                <AlertDialogHeader className="items-center text-center">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20 shadow-[0_0_30px_-10px_rgba(234,179,8,0.5)]">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-bold text-yellow-500">
                        Objective Completed!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 mt-2">
                        Congratulations! You have successfully met the profit target.
                        <br />
                        Your performance has been verified.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center mt-6">
                    <AlertDialogCancel onClick={onClose} className="hidden">Close</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            onClick={handleProceed}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold h-12"
                        >
                            Proceed to Next Phase
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
