import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
// @ts-expect-error - next-pwa doesn't have TypeScript definitions
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {}, // Empty config to silence Turbopack warning with webpack-based next-pwa
  // Exclude propshot-waitlist from build - it's a separate Next.js project
  outputFileTracingExcludes: {
    '*': ['./propshot-waitlist/**/*'],
  },
  // Exclude propshot-waitlist from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // External image hostnames — Polymarket serves images from multiple S3 buckets
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "polymarket-upload.s3.us-east-2.amazonaws.com" },
      { protocol: "https", hostname: "*.polymarket.com" },
      { protocol: "https", hostname: "polymarket.com" },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-audio-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-video-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      // PERF: Only cache non-critical API routes. Trade-critical endpoints
      // (dashboard, trade, markets, orderbook, payout) MUST NOT be cached
      // to prevent stale balance/position display on a trading platform.
      urlPattern: ({ url }: { url: URL }) => {
        if (!url.pathname.startsWith('/api/')) return false;
        // Exclude trade-critical endpoints from caching
        const noCachePrefixes = ['/api/dashboard', '/api/trade', '/api/markets', '/api/orderbook', '/api/payout', '/api/positions'];
        if (noCachePrefixes.some(prefix => url.pathname.startsWith(prefix))) return false;
        return true;
      },
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 60, // 1 minute - short cache for non-critical API data
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) => {
        const isSameOrigin = self.origin === url.origin;
        if (!isSameOrigin) return false;
        const pathname = url.pathname;
        // Exclude API routes from default caching (handled above)
        if (pathname.startsWith("/api/")) return false;
        return true;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
})(nextConfig);

// Sentry wraps the final config to instrument server/client/edge
export default withSentryConfig(pwaConfig, {
  // Upload source maps for readable stack traces
  silent: true, // Suppress noisy build logs
  widenClientFileUpload: true, // Upload more client files for better coverage

  // Performance: don't wrap every API route automatically
  // We call Sentry.captureException/captureMessage explicitly where needed
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,

  // Hide source maps from users but still upload to Sentry
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry telemetry
  disableLogger: true,
});
