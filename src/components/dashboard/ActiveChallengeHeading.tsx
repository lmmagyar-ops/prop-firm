"use client";

import ShinyText from "@/components/reactbits/ShinyText";

interface ActiveChallengeHeadingProps {
    isFunded: boolean;
}

export function ActiveChallengeHeading({ isFunded }: ActiveChallengeHeadingProps) {
    return (
        <div className="border-t border-white/5 pt-6 mt-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isFunded ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`} />
                <ShinyText
                    text={isFunded ? 'Funded Account' : 'Active Challenge'}
                    speed={3}
                    color="#ffffff"
                    shineColor="#00FFB2"
                    spread={120}
                    className="text-xl font-bold"
                />
            </h2>
        </div>
    );
}
