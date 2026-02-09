import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Predictions Firm — Skill Evaluation for Prediction Market Traders",
  description: "The world's first skill evaluation platform for prediction markets. Demonstrate your ability trading Polymarket & Kalshi data, earn up to 90% performance payouts.",
  openGraph: {
    title: "Predictions Firm — Prove Your Edge. Earn Your Account.",
    description: "The world's first skill evaluation platform for prediction market traders. Demonstrate your ability, earn performance payouts.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    </html>
  );
}
