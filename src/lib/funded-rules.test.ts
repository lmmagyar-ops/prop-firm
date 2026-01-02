import { describe, it, expect } from "vitest";
import {
    FUNDED_RULES,
    VOLUME_EXPOSURE_TIERS,
    CONSISTENCY_CONFIG,
    getFundedRulesForTier,
    getExposureLimitByVolume,
    getVolumeTierLabel,
} from "./funded-rules";

describe("FUNDED_RULES Configuration", () => {
    describe("5k Tier", () => {
        const tier = FUNDED_RULES["5k"];

        it("has correct starting balance", () => {
            expect(tier.startingBalance).toBe(5000);
        });

        it("has correct drawdown limits (4% daily, 8% total)", () => {
            expect(tier.maxDailyDrawdownPercent).toBe(0.04);
            expect(tier.maxTotalDrawdownPercent).toBe(0.08);
            expect(tier.maxDailyDrawdown).toBe(200);   // 4% of $5000
            expect(tier.maxTotalDrawdown).toBe(400);   // 8% of $5000
        });

        it("has correct payout configuration", () => {
            expect(tier.profitSplit).toBe(0.80);       // 80% to trader
            expect(tier.payoutCap).toBe(5000);         // Max = starting balance
            expect(tier.minTradingDays).toBe(5);
        });

        it("has correct position limits", () => {
            expect(tier.maxOpenPositions).toBe(10);
        });
    });

    describe("10k Tier", () => {
        const tier = FUNDED_RULES["10k"];

        it("has correct starting balance", () => {
            expect(tier.startingBalance).toBe(10000);
        });

        it("has correct drawdown limits (5% daily, 10% total)", () => {
            expect(tier.maxDailyDrawdownPercent).toBe(0.05);
            expect(tier.maxTotalDrawdownPercent).toBe(0.10);
            expect(tier.maxDailyDrawdown).toBe(500);   // 5% of $10000
            expect(tier.maxTotalDrawdown).toBe(1000);  // 10% of $10000
        });

        it("has correct payout configuration", () => {
            expect(tier.profitSplit).toBe(0.80);
            expect(tier.payoutCap).toBe(10000);
            expect(tier.minTradingDays).toBe(5);
        });

        it("has correct position limits", () => {
            expect(tier.maxOpenPositions).toBe(15);
        });
    });

    describe("25k Tier", () => {
        const tier = FUNDED_RULES["25k"];

        it("has correct starting balance", () => {
            expect(tier.startingBalance).toBe(25000);
        });

        it("has correct drawdown limits (5% daily, 10% total)", () => {
            expect(tier.maxDailyDrawdownPercent).toBe(0.05);
            expect(tier.maxTotalDrawdownPercent).toBe(0.10);
            expect(tier.maxDailyDrawdown).toBe(1250);  // 5% of $25000
            expect(tier.maxTotalDrawdown).toBe(2500);  // 10% of $25000
        });

        it("has correct payout configuration", () => {
            expect(tier.profitSplit).toBe(0.80);
            expect(tier.payoutCap).toBe(25000);
            expect(tier.minTradingDays).toBe(5);
        });

        it("has correct position limits", () => {
            expect(tier.maxOpenPositions).toBe(20);
        });
    });
});

describe("VOLUME_EXPOSURE_TIERS", () => {
    it("has correct high volume threshold (>$10M)", () => {
        expect(VOLUME_EXPOSURE_TIERS.high.minVolume).toBe(10_000_000);
        expect(VOLUME_EXPOSURE_TIERS.high.label).toBe("High Volume");
    });

    it("has correct medium volume threshold ($1-10M)", () => {
        expect(VOLUME_EXPOSURE_TIERS.medium.minVolume).toBe(1_000_000);
        expect(VOLUME_EXPOSURE_TIERS.medium.label).toBe("Medium Volume");
    });

    it("has correct low volume threshold ($100k-1M)", () => {
        expect(VOLUME_EXPOSURE_TIERS.low.minVolume).toBe(100_000);
        expect(VOLUME_EXPOSURE_TIERS.low.label).toBe("Low Volume");
    });
});

describe("CONSISTENCY_CONFIG", () => {
    it("has correct consistency thresholds", () => {
        expect(CONSISTENCY_CONFIG.maxSingleDayProfitPercent).toBe(0.50);
        expect(CONSISTENCY_CONFIG.minTradesForFlag).toBe(3);
        expect(CONSISTENCY_CONFIG.inactivityDays).toBe(30);
    });
});

describe("getFundedRulesForTier", () => {
    it("returns correct config for 5k tier", () => {
        const rules = getFundedRulesForTier("5k");
        expect(rules.tier).toBe("5k");
        expect(rules.startingBalance).toBe(5000);
    });

    it("returns correct config for 10k tier", () => {
        const rules = getFundedRulesForTier("10k");
        expect(rules.tier).toBe("10k");
        expect(rules.startingBalance).toBe(10000);
    });

    it("returns correct config for 25k tier", () => {
        const rules = getFundedRulesForTier("25k");
        expect(rules.tier).toBe("25k");
        expect(rules.startingBalance).toBe(25000);
    });
});

describe("getExposureLimitByVolume", () => {
    const balance = 10000; // Use $10k for easy percentage calculation

    it("returns 5% for high volume (>$10M)", () => {
        expect(getExposureLimitByVolume(balance, 15_000_000)).toBe(500);
        expect(getExposureLimitByVolume(balance, 10_000_000)).toBe(500); // exactly at threshold
    });

    it("returns 2.5% for medium volume ($1-10M)", () => {
        expect(getExposureLimitByVolume(balance, 5_000_000)).toBe(250);
        expect(getExposureLimitByVolume(balance, 1_000_000)).toBe(250); // exactly at threshold
    });

    it("returns 0.5% for low volume ($100k-1M)", () => {
        expect(getExposureLimitByVolume(balance, 500_000)).toBe(50);
        expect(getExposureLimitByVolume(balance, 100_000)).toBe(50); // exactly at threshold
    });

    it("returns 0 for insufficient volume (<$100k)", () => {
        expect(getExposureLimitByVolume(balance, 50_000)).toBe(0);
        expect(getExposureLimitByVolume(balance, 0)).toBe(0);
    });
});

describe("getVolumeTierLabel", () => {
    it("returns correct label for high volume", () => {
        expect(getVolumeTierLabel(15_000_000)).toBe("high volume (>$10M)");
        expect(getVolumeTierLabel(10_000_000)).toBe("high volume (>$10M)");
    });

    it("returns correct label for medium volume", () => {
        expect(getVolumeTierLabel(5_000_000)).toBe("medium volume ($1-10M)");
        expect(getVolumeTierLabel(1_000_000)).toBe("medium volume ($1-10M)");
    });

    it("returns correct label for low volume", () => {
        expect(getVolumeTierLabel(500_000)).toBe("low volume ($100k-1M)");
        expect(getVolumeTierLabel(100_000)).toBe("low volume ($100k-1M)");
    });

    it("returns correct label for insufficient volume", () => {
        expect(getVolumeTierLabel(50_000)).toBe("insufficient volume (<$100k)");
        expect(getVolumeTierLabel(0)).toBe("insufficient volume (<$100k)");
    });
});
