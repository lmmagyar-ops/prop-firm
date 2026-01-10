/**
 * Market Cards Visual Regression Test
 * 
 * This test catches visual bugs before they ship by comparing screenshots
 * of the market cards on each PR.
 * 
 * CRITICAL: This test would have caught the "Pittsburgh Steelers Bug" where
 * card titles showed truncated labels instead of full questions.
 * 
 * Run with: npx playwright test e2e/market-cards.spec.ts
 */
import { test, expect } from "@playwright/test";

test.describe("Market Cards Display", () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to trade page
        await page.goto("/dashboard/trade");

        // Wait for market cards to load
        await page.waitForSelector("[data-testid='market-grid'], .grid", {
            state: "visible",
            timeout: 10000,
        });
    });

    test("market cards show full questions in all tabs", async ({ page }) => {
        // Check Trending tab (default)
        await expect(page.locator("h3").first()).toBeVisible();

        // Take visual snapshot of Trending
        await expect(page.locator("main")).toHaveScreenshot("trending-market-cards.png", {
            maxDiffPixels: 100,
        });

        // Check Sports tab
        await page.click("text=Sports");
        await page.waitForTimeout(500); // Allow re-render

        // Verify a specific card shows full question, not truncated
        const sportsCards = page.locator("h3");
        const cardTexts = await sportsCards.allTextContents();

        // At least some cards should have "Will" prefix (full questions)
        const hasFullQuestions = cardTexts.some(
            (text) => text.includes("Will ") || text.includes("?")
        );
        expect(hasFullQuestions).toBe(true);

        // Visual snapshot of Sports tab
        await expect(page.locator("main")).toHaveScreenshot("sports-market-cards.png", {
            maxDiffPixels: 100,
        });
    });

    test("market cards do NOT show truncated team names as titles", async ({ page }) => {
        // Navigate to Sports tab where the bug was most visible
        await page.click("text=Sports");
        await page.waitForTimeout(500);

        // Get all h3 (card titles)
        const cardTitles = await page.locator("h3").allTextContents();

        // These would be WRONG - truncated labels that shouldn't appear as standalone titles
        const truncatedPatterns = [
            /^the Pittsburgh Steelers$/,
            /^the Seattle Seahawks$/,
            /^the Dallas Cowboys$/,
            /^the Indiana Pacers$/,
            /^the Chicago Bulls$/,
            /^Kevin Warsh$/,
            /^Pam Bondi$/,
        ];

        for (const title of cardTitles) {
            for (const pattern of truncatedPatterns) {
                expect(
                    pattern.test(title.trim()),
                    `Card title "${title}" should be a full question, not a truncated label`
                ).toBe(false);
            }
        }
    });

    test("multi-outcome card headers show event titles correctly", async ({ page }) => {
        // Switch to Politics or check Trending (likely has multi-outcome events)
        await page.click("text=Politics");
        await page.waitForTimeout(500);

        // Look for known multi-outcome event titles
        const pageContent = await page.content();

        // Multi-outcome events should show event-level titles, not outcome names
        // e.g., "Super Bowl Champion 2026" not "Pittsburgh Steelers"
        // e.g., "2028 Presidential Election" not "Tim Walz"

        // Visual snapshot
        await expect(page.locator("main")).toHaveScreenshot("politics-market-cards.png", {
            maxDiffPixels: 100,
        });
    });
});
