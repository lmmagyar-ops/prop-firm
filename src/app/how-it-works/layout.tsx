import { Metadata } from "next";

export const metadata: Metadata = {
    title: "How It Works | Predictions Firm",
    description: "Learn how to get funded as a prediction market trader. One-step evaluation, no verification phase, up to 90% profit split.",
    openGraph: {
        title: "How It Works — Predictions Firm",
        description: "Pass one evaluation. Get funded. Trade prediction markets with our capital.",
    },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
