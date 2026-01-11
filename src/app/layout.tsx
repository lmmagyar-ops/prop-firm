import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";
// Toaster temporarily removed - will re-add with clean implementation
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

export const metadata: Metadata = {
  title: "Propshot Trading",
  description: "World-class prediction market prop trading",
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
          {/* Toaster removed - will re-add with clean implementation */}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
