/**
 * Safe Parse Utilities Tests
 *
 * Guards against NaN/null/Infinity propagation through financial calculations.
 * Every edge case here represents a real production scenario where
 * parseFloat would silently corrupt financial data.
 */
import { describe, it, expect } from "vitest";
import {
    safeParseFloat,
    safeParseRounded,
    safeFormatDollars,
    safeFormatPercent
} from "@/lib/safe-parse";

// =====================================================================
// safeParseFloat
// =====================================================================

describe("safeParseFloat", () => {
    it("parses valid numeric strings", () => {
        expect(safeParseFloat("123.45")).toBe(123.45);
        expect(safeParseFloat("0")).toBe(0);
        expect(safeParseFloat("-50.5")).toBe(-50.5);
    });

    it("passes through valid numbers", () => {
        expect(safeParseFloat(42)).toBe(42);
        expect(safeParseFloat(0)).toBe(0);
        expect(safeParseFloat(-10.5)).toBe(-10.5);
    });

    it("returns default for null/undefined", () => {
        expect(safeParseFloat(null)).toBe(0);
        expect(safeParseFloat(undefined)).toBe(0);
        expect(safeParseFloat(null, 100)).toBe(100);
        expect(safeParseFloat(undefined, 999)).toBe(999);
    });

    it("returns default for NaN input", () => {
        expect(safeParseFloat("not a number")).toBe(0);
        expect(safeParseFloat("abc")).toBe(0);
        expect(safeParseFloat("NaN")).toBe(0);
    });

    it("returns default for Infinity", () => {
        expect(safeParseFloat(Infinity)).toBe(0);
        expect(safeParseFloat(-Infinity)).toBe(0);
        expect(safeParseFloat("Infinity")).toBe(0);
    });

    it("returns default for empty/whitespace strings", () => {
        expect(safeParseFloat("")).toBe(0);
        expect(safeParseFloat("   ")).toBe(0);
    });

    it("uses custom default value", () => {
        expect(safeParseFloat("garbage", 42)).toBe(42);
    });
});

// =====================================================================
// safeParseRounded
// =====================================================================

describe("safeParseRounded", () => {
    it("rounds to 2 decimal places by default", () => {
        expect(safeParseRounded("123.456789")).toBe(123.46);
        expect(safeParseRounded("0.005")).toBe(0.01); // Banker's rounding
    });

    it("rounds to specified decimal places", () => {
        expect(safeParseRounded("123.456789", 4)).toBe(123.4568);
        expect(safeParseRounded("123.456789", 0)).toBe(123);
    });

    it("handles null input with default", () => {
        expect(safeParseRounded(null)).toBe(0);
        expect(safeParseRounded(null, 2, 100)).toBe(100);
    });
});

// =====================================================================
// safeFormatDollars
// =====================================================================

describe("safeFormatDollars", () => {
    it("formats positive amounts", () => {
        expect(safeFormatDollars(123.456)).toBe("$123.46");
        expect(safeFormatDollars(0)).toBe("$0.00");
    });

    it("formats negative amounts with leading minus", () => {
        expect(safeFormatDollars(-45)).toBe("-$45.00");
        expect(safeFormatDollars(-0.50)).toBe("-$0.50");
    });

    it("handles null/undefined/NaN gracefully", () => {
        expect(safeFormatDollars(null)).toBe("$0.00");
        expect(safeFormatDollars(undefined)).toBe("$0.00");
        expect(safeFormatDollars("garbage")).toBe("$0.00");
    });

    it("parses string input", () => {
        expect(safeFormatDollars("1234.50")).toBe("$1234.50");
    });
});

// =====================================================================
// safeFormatPercent
// =====================================================================

describe("safeFormatPercent", () => {
    it("converts decimal to percentage string", () => {
        expect(safeFormatPercent(0.105)).toBe("10.50%");
        expect(safeFormatPercent(1)).toBe("100.00%");
        expect(safeFormatPercent(0)).toBe("0.00%");
    });

    it("handles null/undefined gracefully", () => {
        expect(safeFormatPercent(null)).toBe("0.00%");
        expect(safeFormatPercent(undefined)).toBe("0.00%");
    });

    it("handles negative percentages", () => {
        expect(safeFormatPercent(-0.052)).toBe("-5.20%");
    });
});
