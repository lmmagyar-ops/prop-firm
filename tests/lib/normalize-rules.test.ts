import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeRulesConfig } from "@/lib/normalize-rules";

describe("normalizeRulesConfig", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, "warn").mockImplementation(() => { });
    });

    // ─── Correct absolute values pass through unchanged ────────────

    it("should pass through correct absolute values for $10k account", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 800, profitTarget: 1000 },
            10000
        );
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
    });

    it("should pass through correct absolute values for $5k account", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 400, profitTarget: 500 },
            5000
        );
        expect(result.maxDrawdown).toBe(400);
        expect(result.profitTarget).toBe(500);
    });

    it("should pass through correct absolute values for $25k account", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 2500, profitTarget: 3000 },
            25000
        );
        expect(result.maxDrawdown).toBe(2500);
        expect(result.profitTarget).toBe(3000);
    });

    // ─── Corrupt decimal values are auto-corrected ─────────────────

    it("should convert decimal maxDrawdown to absolute dollars (THE BUG)", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 0.08, profitTarget: 1000 },
            10000
        );
        // 0.08 * 10000 = $800
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("maxDrawdown=0.08 looks like a percentage")
        );
    });

    it("should convert decimal profitTarget to absolute dollars", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 800, profitTarget: 0.10 },
            10000
        );
        expect(result.maxDrawdown).toBe(800);
        // 0.10 * 10000 = $1000
        expect(result.profitTarget).toBe(1000);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("profitTarget=0.1 looks like a percentage")
        );
    });

    it("should convert BOTH corrupt values simultaneously", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 0.08, profitTarget: 0.10 },
            10000
        );
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
    });

    it("should convert corrupt values on $25k account", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 0.10, profitTarget: 0.12 },
            25000
        );
        expect(result.maxDrawdown).toBe(2500);
        expect(result.profitTarget).toBe(3000);
    });

    // ─── Missing/null/zero values use sensible defaults ────────────

    it("should use defaults when rules is null", () => {
        const result = normalizeRulesConfig(null, 10000);
        // Default: 8% drawdown, 10% profit target
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
    });

    it("should use defaults when rules is undefined", () => {
        const result = normalizeRulesConfig(undefined, 10000);
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
    });

    it("should use defaults when values are 0", () => {
        const result = normalizeRulesConfig(
            { maxDrawdown: 0, profitTarget: 0 },
            10000
        );
        expect(result.maxDrawdown).toBe(800);
        expect(result.profitTarget).toBe(1000);
    });

    it("should use defaults when values are missing from rules", () => {
        const result = normalizeRulesConfig({}, 5000);
        expect(result.maxDrawdown).toBe(400);   // 5000 * 0.08
        expect(result.profitTarget).toBe(500);   // 5000 * 0.10
    });

    // ─── Edge cases ────────────────────────────────────────────────

    it("should NOT convert values that are >= 1 (e.g. $1 is valid)", () => {
        // Contrived: a $10 account with $1 drawdown. Unlikely but valid.
        const result = normalizeRulesConfig(
            { maxDrawdown: 1, profitTarget: 1 },
            10
        );
        expect(result.maxDrawdown).toBe(1);
        expect(result.profitTarget).toBe(1);
    });

    it("should not log warnings for correct absolute values", () => {
        normalizeRulesConfig(
            { maxDrawdown: 800, profitTarget: 1000 },
            10000
        );
        expect(console.warn).not.toHaveBeenCalled();
    });
});
