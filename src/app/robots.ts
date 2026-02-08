import { MetadataRoute } from "next";

/**
 * Robots.txt Generator
 * 
 * Controls search engine crawling behavior.
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/robots
 */

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXTAUTH_URL || "https://predictionsfirm.com";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",           // API routes
                    "/admin/",         // Admin panel
                    "/dashboard/",     // User dashboard (requires auth)
                    "/onboarding/",    // Onboarding flow
                    "/checkout/",      // Payment flow
                    "/_next/",         // Next.js internals
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
