import { describe, it, expect } from "vitest";
import {
    sanitizeText,
    cleanOutcomeName,
    isSpamMarket,
    getCategories,
} from "@/workers/market-classifier";

// =====================================================================
// sanitizeText — Mojibake / encoding fix
// =====================================================================
describe("sanitizeText", () => {
    it("fixes 'Supá' → 'Super' (Polymarket encoding bug)", () => {
        expect(sanitizeText("Supá Bowl LVIII")).toBe("Super Bowl LVIII");
    });

    it("handles lowercase variant 'supá'", () => {
        expect(sanitizeText("supá bowl")).toBe("super bowl");
    });

    it("handles uppercase variant 'SUPÁ'", () => {
        expect(sanitizeText("SUPÁ BOWL")).toBe("SUPER BOWL");
    });

    it("passes through clean text unchanged", () => {
        expect(sanitizeText("Will Trump win 2024?")).toBe("Will Trump win 2024?");
    });

    it("returns empty/null input unchanged", () => {
        expect(sanitizeText("")).toBe("");
    });

    it("fixes double underscore artifacts attached to words", () => {
        expect(sanitizeText("hit__ the target")).toBe("hit  the target");
    });
});

// =====================================================================
// cleanOutcomeName
// =====================================================================
describe("cleanOutcomeName", () => {
    it("removes leading article 'the'", () => {
        expect(cleanOutcomeName("the Lakers")).toBe("Lakers");
    });

    it("removes leading article 'a' (case-insensitive)", () => {
        expect(cleanOutcomeName("A Republican")).toBe("Republican");
    });

    it("removes leading article 'an'", () => {
        expect(cleanOutcomeName("an upset")).toBe("Upset");
    });

    it("capitalizes first letter after trimming", () => {
        expect(cleanOutcomeName("  john smith  ")).toBe("John smith");
    });

    it("handles empty string", () => {
        expect(cleanOutcomeName("")).toBe("");
    });

    it("preserves names that don't start with articles", () => {
        expect(cleanOutcomeName("Bitcoin above $100k")).toBe("Bitcoin above $100k");
    });
});

// =====================================================================
// isSpamMarket
// =====================================================================
describe("isSpamMarket", () => {
    it("detects 5-minute crypto bets", () => {
        expect(isSpamMarket("Bitcoin up or down by 10:30 AM ET")).toBe(true);
    });

    it("detects cancelled Super Bowl markets", () => {
        expect(isSpamMarket("Super Bowl 2024 cancelled")).toBe(true);
    });

    it("detects questions ending with 'cancelled?'", () => {
        expect(isSpamMarket("Will the event be cancelled?")).toBe(true);
    });

    it("detects questions starting with 'cancelled:'", () => {
        expect(isSpamMarket("Cancelled: NFL Playoffs")).toBe(true);
    });

    it("passes through legitimate markets", () => {
        expect(isSpamMarket("Will Bitcoin hit $100k in 2024?")).toBe(false);
    });

    it("passes through sports markets", () => {
        expect(isSpamMarket("Chiefs vs. Eagles - Super Bowl LVIII")).toBe(false);
    });
});

// =====================================================================
// getCategories — classification logic
// =====================================================================
describe("getCategories", () => {
    it("classifies Trump as Politics", () => {
        const cats = getCategories(null, "Will Trump win the 2024 election?");
        expect(cats).toContain("Politics");
    });

    it("classifies Bitcoin as Crypto", () => {
        const cats = getCategories(null, "Will Bitcoin hit $100k by EOY?");
        expect(cats).toContain("Crypto");
    });

    it("classifies NBA game as Sports", () => {
        const cats = getCategories(null, "Lakers vs. Celtics - NBA Finals");
        expect(cats).toContain("Sports");
    });

    it("classifies Ukraine/Putin as Geopolitics", () => {
        const cats = getCategories(null, "Will Putin escalate in Ukraine?");
        expect(cats).toContain("Geopolitics");
    });

    it("defaults to 'Other' when no category matches", () => {
        const cats = getCategories(null, "Will pigs fly?");
        expect(cats).toEqual(["Other"]);
    });

    it("maps Polymarket 'US-current-affairs' category", () => {
        const cats = getCategories("US-current-affairs", "Something political");
        expect(cats).toContain("Politics");
    });

    // Disambiguation rules
    it("Sports wins over Politics for 'vs' pattern markets", () => {
        const cats = getCategories("US-current-affairs", "Eagles vs. Cowboys");
        expect(cats).toContain("Sports");
        // Politics should be removed when Sports is detected
        expect(cats).not.toContain("Politics");
    });

    it("Finance overrides bare Geopolitics for economic topics", () => {
        const cats = getCategories(null, "Will Russia raise rates this year?");
        expect(cats).toContain("Business");
        expect(cats).not.toContain("Geopolitics");
    });

    it("Culture overrides Politics for entertainment Elon topics", () => {
        const cats = getCategories(null, "How many tweets will Elon post today?");
        expect(cats).toContain("Culture");
        expect(cats).not.toContain("Politics");
    });

    it("adds 'Breaking' for high-volume events", () => {
        const cats = getCategories(null, "Normal market question", undefined, undefined, {
            isHighVolume: true,
        });
        expect(cats).toContain("Breaking");
    });

    it("adds 'New' for recently created markets", () => {
        const recent = new Date();
        recent.setDate(recent.getDate() - 2); // 2 days ago

        const cats = getCategories(null, "Something new and random", undefined, undefined, {
            createdAt: recent.toISOString(),
        });
        expect(cats).toContain("New");
    });

    it("does NOT add 'New' for markets older than 7 days", () => {
        const old = new Date();
        old.setDate(old.getDate() - 30); // 30 days ago

        const cats = getCategories(null, "Something old", undefined, undefined, {
            createdAt: old.toISOString(),
        });
        expect(cats).not.toContain("New");
    });

    it("detects Sports from tags", () => {
        const cats = getCategories(null, "Game tonight", ["nba", "basketball"]);
        expect(cats).toContain("Sports");
    });

    it("detects Sports from image URL", () => {
        const cats = getCategories(null, "Game tonight", undefined, "https://cdn.poly.market/nfl/image.png");
        expect(cats).toContain("Sports");
    });
});
