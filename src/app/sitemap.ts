import { MetadataRoute } from "next";

/**
 * Dynamic Sitemap Generator
 * 
 * Anthropic Engineering Standards:
 * - Auto-generates from known routes
 * - Proper priority and changeFrequency
 * - Production URL from env
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/sitemap
 */

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXTAUTH_URL || "https://predictionsfirm.com";

    // Static pages with their priorities
    const staticPages = [
        { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
        { path: "/login", priority: 0.8, changeFrequency: "monthly" as const },
        { path: "/signup", priority: 0.9, changeFrequency: "monthly" as const },
        { path: "/buy-evaluation", priority: 0.9, changeFrequency: "weekly" as const },
        { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
        { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
        { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    ];

    return staticPages.map((page) => ({
        url: `${baseUrl}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
    }));
}
