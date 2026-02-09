import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us | Predictions Firm",
    description: "Learn about Predictions Firm, the world's first prediction market prop firm. We fund traders to trade on Polymarket and Kalshi with our capital.",
    openGraph: {
        title: "About Predictions Firm - Prediction Market Prop Firm",
        description: "Learn about Predictions Firm, the world's first prediction market prop firm.",
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
