"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function StartChallengeButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleStart = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/challenge/start", {
                method: "POST"
            });
            if (res.ok) {
                router.push("/trade");
            } else {
                console.error("Failed to start");
                setLoading(false);
            }
        } catch (error) {
            console.error("Start failed", error);
            setLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="lg"
                    className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg tracking-wide shadow-[0_4px_20px_-5px_rgba(16,185,129,0.5)] transition-all transform hover:scale-[1.02]"
                >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Start 30-Day Challenge
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1A232E] border-[#2E3A52] text-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Ready to begin?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                        Once you start, your 30-day evaluation timer will begin immediately. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleStart}
                        className="bg-green-600 text-white hover:bg-green-700 font-bold"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Let's Go"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
