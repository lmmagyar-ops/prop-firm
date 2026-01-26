import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Propshot - The World's First Prediction Market Prop Firm",
  description: "A skill-based evaluation platform for prediction market traders. Demonstrate your abilities, access funded trading opportunities.",
  openGraph: {
    title: "Propshot - The World's First Prediction Market Prop Firm",
    description: "A skill-based evaluation platform for prediction market traders seeking funded opportunities.",
    type: "website",
  },
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
