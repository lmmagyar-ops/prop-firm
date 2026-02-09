import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog | Predictions Firm — Prediction Market Trading Insights",
    description:
        "Learn prediction market trading strategies, prop firm tips, and industry analysis from the world's first prediction market prop firm.",
    openGraph: {
        title: "Blog | Predictions Firm",
        description:
            "Prediction market trading strategies, prop firm insights, and industry analysis.",
        type: "website",
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
