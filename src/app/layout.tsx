import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

/**
 * SEO Metadata Configuration
 * 
 * Anthropic Engineering Standards:
 * - Comprehensive OpenGraph tags
 * - Twitter card optimization
 * - Canonical URL handling
 * - Structured data ready
 */
export const metadata: Metadata = {
  // Primary Meta
  title: {
    default: "Propshot - World's First Prediction Market Prop Firm",
    template: "%s | Propshot",
  },
  description: "Trade prediction markets with our capital. Pass a simple evaluation, get funded up to $25K, and keep up to 90% of profits. Bi-weekly USDC payouts.",
  keywords: [
    "prop firm",
    "prediction markets",
    "polymarket",
    "funded trader",
    "event trading",
    "prop trading",
    "trading evaluation",
    "crypto payouts",
  ],
  authors: [{ name: "Propshot" }],
  creator: "Propshot",
  publisher: "Propshot",

  // Canonical
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://propshot.io"),
  alternates: {
    canonical: "/",
  },

  // OpenGraph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Propshot",
    title: "Propshot - World's First Prediction Market Prop Firm",
    description: "Trade prediction markets with our capital. Pass a simple evaluation, get funded up to $25K, keep up to 90% of profits.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Propshot - Prediction Market Prop Firm",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Propshot - World's First Prediction Market Prop Firm",
    description: "Trade prediction markets with our capital. Get funded up to $25K, keep 90% of profits.",
    images: ["/og-image.png"],
    creator: "@propshot_io",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // PWA
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Propshot',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} ${mono.variable} ${serif.variable} ${outfit.variable} font-sans bg-background text-foreground antialiased selection:bg-primary/30`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
