/**
 * REGRESSION TESTS — Core Business Logic Audit
 * 
 * These tests directly verify that specific bugs found during
 * the Feb 2026 audit were fixed correctly. Each test is named
 * after the bug it guards against.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================
// CRITICAL #1: rulesConfig mismatch
// Bug: createChallengeAction hard-coded maxDrawdown: 500 (5%)
//      instead of 800 (8%), and used 30-day duration instead of 60.
// Fix: Updated to match canonical DEFAULT_RULES.
// =============================================

describe("REGRESSION: createChallengeAction rulesConfig", () => {
    // We can't easily test the server action directly (it calls auth()),
    // so we parse the source file to verify the config values.
    // This is a "structural" test — it breaks if someone re-introduces the bug.

    let fileContent: string;

    beforeEach(async () => {
        const fs = await import("fs");
        const path = await import("path");
        fileContent = fs.readFileSync(
            path.resolve(__dirname, "../app/actions/challenges.ts"),
            "utf-8"
        );
    });

    it("should delegate rulesConfig to buildRulesConfig (not hardcode values)", () => {
        // challenges.ts must import and call buildRulesConfig — NOT hardcode maxDrawdown/profitTarget
        expect(fileContent).toContain("buildRulesConfig");
        expect(fileContent).toContain("getTierConfig");
        // Should NOT contain the old buggy hardcoded value
        expect(fileContent).not.toContain("maxDrawdown: 500");
    });

    it("should use durationDays from rulesConfig (not hardcode duration)", () => {
        // Should reference rulesConfig.durationDays for computing endsAt
        expect(fileContent).toContain("rulesConfig.durationDays");
        // Should NOT contain the old hardcoded 30-day or 60-day arithmetic
        expect(fileContent).not.toContain("30 * 24 * 60 * 60 * 1000");
    });

    it("should initialize highWaterMark", () => {
        expect(fileContent).toContain("highWaterMark:");
    });

    it("should produce correct 10k tier values via buildRulesConfig", async () => {
        // Directly verify the canonical config produces the right values
        const { buildRulesConfig } = await import("@/config/tiers");
        const rules = buildRulesConfig("10k");

        expect(rules.maxDrawdown).toBe(1000);           // 10% of $10k = $1000
        expect(rules.profitTarget).toBe(1000);           // 10% of $10k = $1000
        expect(rules.maxTotalDrawdownPercent).toBe(0.10);
        expect(rules.maxDailyDrawdownPercent).toBe(0.05);
        expect(rules.maxPositionSizePercent).toBe(0.05);
        expect(rules.maxCategoryExposurePercent).toBe(0.10);
        expect(rules.durationDays).toBe(60);
    });
});

// =============================================
// CRITICAL #2: Payout cycle reset timing
// Bug: requestPayout() reset activeTradingDays to 0 immediately,
//      before admin approval. Rejected payouts lost progress.
// Fix: Moved cycle reset to completePayout().
// =============================================

describe("REGRESSION: Payout cycle reset timing", () => {
    let fileContent: string;

    beforeEach(async () => {
        const fs = await import("fs");
        const path = await import("path");
        fileContent = fs.readFileSync(
            path.resolve(__dirname, "./payout-service.ts"),
            "utf-8"
        );
    });

    it("requestPayout should NOT contain activeTradingDays reset", () => {
        // Extract the requestPayout method body
        const requestPayoutStart = fileContent.indexOf("static async requestPayout(");
        const requestPayoutEnd = fileContent.indexOf("static async approvePayout(");
        const requestPayoutBody = fileContent.slice(requestPayoutStart, requestPayoutEnd);

        // Should NOT reset activeTradingDays in requestPayout
        expect(requestPayoutBody).not.toContain("activeTradingDays: 0");
    });

    it("completePayout SHOULD contain activeTradingDays reset", () => {
        // Extract the completePayout method body
        const completePayoutStart = fileContent.indexOf("static async completePayout(");
        const completePayoutEnd = fileContent.indexOf("static async failPayout(");
        const completePayoutBody = fileContent.slice(completePayoutStart, completePayoutEnd);

        // Should reset activeTradingDays in completePayout
        expect(completePayoutBody).toContain("activeTradingDays: 0");
        expect(completePayoutBody).toContain("payoutCycleStart:");
    });
});

// =============================================
// MEDIUM #3: Hard-coded tier in eligibility
// Bug: checkEligibility always used FUNDED_RULES["10k"]
// Fix: Now uses getFundedTier() based on startingBalance
// =============================================

describe("REGRESSION: Tier-aware payout eligibility", () => {
    let fileContent: string;

    beforeEach(async () => {
        const fs = await import("fs");
        const path = await import("path");
        fileContent = fs.readFileSync(
            path.resolve(__dirname, "./payout-service.ts"),
            "utf-8"
        );
    });

    it("checkEligibility should NOT hard-code '10k' tier", () => {
        const eligibilityStart = fileContent.indexOf("static async checkEligibility(");
        const eligibilityEnd = fileContent.indexOf("static async calculatePayout(");
        const eligibilityBody = fileContent.slice(eligibilityStart, eligibilityEnd);

        // Should NOT contain hard-coded "10k"
        expect(eligibilityBody).not.toContain('FUNDED_RULES["10k"]');
        // Should use dynamic tier lookup
        expect(eligibilityBody).toContain("getFundedTier");
    });
});

// =============================================
// MEDIUM #4: Missing status guards
// Bug: approvePayout, markProcessing, completePayout, failPayout
//      had no WHERE clause on current status
// Fix: Added status guards to all transitions
// =============================================

describe("REGRESSION: Payout state transition guards", () => {
    let fileContent: string;

    beforeEach(async () => {
        const fs = await import("fs");
        const path = await import("path");
        fileContent = fs.readFileSync(
            path.resolve(__dirname, "./payout-service.ts"),
            "utf-8"
        );
    });

    it("approvePayout should guard on 'pending' status", () => {
        const approveStart = fileContent.indexOf("static async approvePayout(");
        const approveEnd = fileContent.indexOf("static async markProcessing(");
        const approveBody = fileContent.slice(approveStart, approveEnd);

        expect(approveBody).toContain('"pending"');
    });

    it("markProcessing should guard on 'approved' status", () => {
        const processStart = fileContent.indexOf("static async markProcessing(");
        const processEnd = fileContent.indexOf("static async completePayout(");
        const processBody = fileContent.slice(processStart, processEnd);

        expect(processBody).toContain('"approved"');
    });

    it("completePayout should guard on 'processing' status", () => {
        const completeStart = fileContent.indexOf("static async completePayout(");
        const completeEnd = fileContent.indexOf("static async failPayout(");
        const completeBody = fileContent.slice(completeStart, completeEnd);

        expect(completeBody).toContain('"processing"');
    });

    it("completePayout should throw if payout not found or wrong status", () => {
        const completeStart = fileContent.indexOf("static async completePayout(");
        const completeEnd = fileContent.indexOf("static async failPayout(");
        const completeBody = fileContent.slice(completeStart, completeEnd);

        expect(completeBody).toContain("throw new Error");
    });
});

// =============================================
// MEDIUM #5: Concurrent payout guard
// Bug: No check for existing pending/approved/processing payouts
// Fix: checkEligibility now rejects if one is in progress
// =============================================

describe("REGRESSION: Concurrent payout prevention", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("checkEligibility should check for existing in-progress payouts", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const fileContent = fs.readFileSync(
            path.resolve(__dirname, "./payout-service.ts"),
            "utf-8"
        );

        const eligibilityStart = fileContent.indexOf("static async checkEligibility(");
        const eligibilityEnd = fileContent.indexOf("static async calculatePayout(");
        const eligibilityBody = fileContent.slice(eligibilityStart, eligibilityEnd);

        // Should check payouts table for existing in-progress payouts
        expect(eligibilityBody).toContain("pending");
        expect(eligibilityBody).toContain("approved");
        expect(eligibilityBody).toContain("processing");
        expect(eligibilityBody).toContain("Existing payout already in progress");
    });
});
