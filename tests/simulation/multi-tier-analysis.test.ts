/**
 * Multi-Tier Analysis Tests
 * 
 * Validates tier comparison calculations, profit margins, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
    analyzeTier,
    compareAllTiers,
    generateTierComparisonReport,
    exportTierComparisonCSV,
    type TierAnalysisResult
} from '@/lib/simulation/multi-tier-analysis';

describe('Multi-Tier Analysis', () => {
    describe('analyzeTier', () => {
        it('should analyze $10k tier with baseline config', () => {
            const result = analyzeTier('medium', 1000, {
                evalMultiplier: 2.0,
                evaluationPassRate: 0.08,
                fundedToPayoutRate: 0.03,
                firstPayoutCapPercent: 0.10,
                ongoingAttritionRate: 0.50,
            });

            // Check tier config
            expect(result.tier).toBe('medium');
            expect(result.tierLabel).toBe('$10k');
            expect(result.challengeFee).toBe(149);
            expect(result.startingBalance).toBe(10000);

            // Check revenue (1,000 traders × 2 evals × $149)
            expect(result.totalRevenue).toBe(298000);
            expect(result.revenuePerTrader).toBe(298);

            // Check profitability
            expect(result.netProfit).toBeGreaterThan(200000); // Should be ~$238k
            expect(result.profitMargin).toBeGreaterThan(75); // Should be ~79.9%
            expect(result.profitPerTrader).toBeGreaterThan(200); // Should be ~$238
        });

        it('should analyze $5k tier with lower fees', () => {
            const result = analyzeTier('small', 1000, {
                evalMultiplier: 2.0,
                evaluationPassRate: 0.08,
                fundedToPayoutRate: 0.03,
                firstPayoutCapPercent: 0.10,
                ongoingAttritionRate: 0.50,
            });

            expect(result.tierLabel).toBe('$5k');
            expect(result.challengeFee).toBe(79);
            expect(result.startingBalance).toBe(5000);

            // Revenue should be 1,000 × 2 × $79 = $158,000
            expect(result.totalRevenue).toBe(158000);

            // Should still be profitable
            expect(result.netProfit).toBeGreaterThan(0);
            expect(result.profitMargin).toBeGreaterThan(0);
        });

        it('should analyze $25k tier with higher fees', () => {
            const result = analyzeTier('large', 1000, {
                evalMultiplier: 2.0,
                evaluationPassRate: 0.08,
                fundedToPayoutRate: 0.03,
                firstPayoutCapPercent: 0.10,
                ongoingAttritionRate: 0.50,
            });

            expect(result.tierLabel).toBe('$25k');
            expect(result.challengeFee).toBe(299);
            expect(result.startingBalance).toBe(25000);

            // Revenue should be 1,000 × 2 × $299 = $598,000
            expect(result.totalRevenue).toBe(598000);

            // Should have highest absolute profit
            expect(result.netProfit).toBeGreaterThan(400000); // Should be ~$478k
        });

        it('should calculate break-even traders correctly', () => {
            const result = analyzeTier('medium', 1000, {
                evalMultiplier: 2.0,
                evaluationPassRate: 0.08,
                fundedToPayoutRate: 0.03,
                firstPayoutCapPercent: 0.10,
                ongoingAttritionRate: 0.50,
            });

            // Break-even = total payouts / (fee × eval multiplier)
            const expectedBreakEven = Math.ceil(result.totalPayouts / (149 * 2));
            expect(result.breakEvenTraders).toBe(expectedBreakEven);
            expect(result.breakEvenTraders).toBeLessThan(1000); // Should be profitable
        });

        it('should handle 1x eval multiplier', () => {
            const result = analyzeTier('medium', 1000, {
                evalMultiplier: 1.0, // No re-buys
                evaluationPassRate: 0.08,
                fundedToPayoutRate: 0.03,
                firstPayoutCapPercent: 0.10,
                ongoingAttritionRate: 0.50,
            });

            // Revenue should be 1,000 × 1 × $149 = $149,000
            expect(result.totalRevenue).toBe(149000);

            // Should still be profitable (from survival analysis, 1x still works)
            expect(result.netProfit).toBeGreaterThan(0);
            expect(result.profitMargin).toBeGreaterThan(0);
        });
    });

    describe('compareAllTiers', () => {
        it('should compare all three tiers with baseline config', () => {
            const comparison = compareAllTiers(1000);

            expect(comparison.tiers).toHaveLength(3);
            expect(comparison.tiers[0].tierLabel).toBe('$5k');
            expect(comparison.tiers[1].tierLabel).toBe('$10k');
            expect(comparison.tiers[2].tierLabel).toBe('$25k');

            // All tiers should be profitable
            comparison.tiers.forEach(tier => {
                expect(tier.netProfit).toBeGreaterThan(0);
                expect(tier.profitMargin).toBeGreaterThan(0);
            });

            // Best by margin should be identified
            expect(['$5k', '$10k', '$25k']).toContain(comparison.bestByMargin);

            // Best by absolute profit should be identified
            expect(['$5k', '$10k', '$25k']).toContain(comparison.bestByAbsoluteProfit);

            // $25k should have highest absolute profit (highest fee)
            expect(comparison.bestByAbsoluteProfit).toBe('$25k');
        });

        it('should use custom attrition config', () => {
            const comparison = compareAllTiers(1000, {
                evalMultiplier: 3.0, // Aggressive re-buys
                evaluationPassRate: 0.05, // Harder challenge
                fundedToPayoutRate: 0.02, // Higher attrition
            });

            // Revenue should be higher with 3x multiplier
            const mediumTier = comparison.tiers.find(t => t.tier === 'medium')!;
            expect(mediumTier.totalRevenue).toBe(1000 * 3 * 149); // $447,000

            // Config should be stored
            expect(comparison.config.evalMultiplier).toBe(3.0);
            expect(comparison.config.evaluationPassRate).toBe(0.05);
            expect(comparison.config.fundedToPayoutRate).toBe(0.02);
        });

        it('should handle edge case: 0 traders', () => {
            const comparison = compareAllTiers(0);

            comparison.tiers.forEach(tier => {
                expect(tier.totalRevenue).toBe(0);
                expect(tier.totalPayouts).toBe(0);
                expect(tier.netProfit).toBe(0);
            });
        });

        it('should identify best tier by margin', () => {
            const comparison = compareAllTiers(1000);

            // Find tier with highest margin
            const highestMarginTier = comparison.tiers.reduce((best, current) =>
                current.profitMargin > best.profitMargin ? current : best
            );

            expect(comparison.bestByMargin).toBe(highestMarginTier.tierLabel);
        });

        it('should identify best tier by absolute profit', () => {
            const comparison = compareAllTiers(1000);

            // Find tier with highest absolute profit
            const highestProfitTier = comparison.tiers.reduce((best, current) =>
                current.netProfit > best.netProfit ? current : best
            );

            expect(comparison.bestByAbsoluteProfit).toBe(highestProfitTier.tierLabel);
        });
    });

    describe('generateTierComparisonReport', () => {
        it('should generate markdown report', () => {
            const comparison = compareAllTiers(1000);
            const report = generateTierComparisonReport(comparison);

            // Check structure
            expect(report).toContain('# Multi-Tier Profitability Analysis');
            expect(report).toContain('## Summary');
            expect(report).toContain('## Tier Comparison');
            expect(report).toContain('## Detailed Metrics');

            // Check tier labels present
            expect(report).toContain('$5k');
            expect(report).toContain('$10k');
            expect(report).toContain('$25k');

            // Check config details
            expect(report).toContain('Traders per tier: 1,000');
            expect(report).toContain('Eval multiplier: 2x');

            // Check best performers
            expect(report).toContain('Best margin:');
            expect(report).toContain('Best absolute profit:');
        });
    });

    describe('exportTierComparisonCSV', () => {
        it('should export CSV with all metrics', () => {
            const comparison = compareAllTiers(1000);
            const csv = exportTierComparisonCSV(comparison);

            // Check header
            expect(csv).toContain('Tier,Fee,Starting Balance');
            expect(csv).toContain('Revenue,Revenue/Trader');
            expect(csv).toContain('Net Profit,Profit Margin %');

            // Check data rows
            expect(csv).toContain('$5k,79');
            expect(csv).toContain('$10k,149');
            expect(csv).toContain('$25k,299');

            // Should have 4 lines (header + 3 tiers)
            const lines = csv.trim().split('\n');
            expect(lines).toHaveLength(4);
        });

        it('should format numbers correctly in CSV', () => {
            const comparison = compareAllTiers(1000);
            const csv = exportTierComparisonCSV(comparison);

            // Check for decimal formatting (e.g., "298.00" for revenue/trader)
            expect(csv).toMatch(/\d+\.\d{2}/);

            // No commas in CSV numbers (for Excel compatibility)
            const lines = csv.split('\n').slice(1); // Skip header
            lines.forEach(line => {
                if (line) {
                    // Revenue and other large numbers should NOT have commas
                    const fields = line.split(',');
                    fields.forEach(field => {
                        if (field && !field.startsWith('$')) {
                            expect(field).not.toContain(',');
                        }
                    });
                }
            });
        });
    });

    describe('Mathematical Consistency', () => {
        it('should satisfy: revenue - payouts = net profit', () => {
            const comparison = compareAllTiers(1000);

            comparison.tiers.forEach(tier => {
                const calculatedProfit = tier.totalRevenue - tier.totalPayouts;
                expect(tier.netProfit).toBeCloseTo(calculatedProfit, 1);
            });
        });

        it('should satisfy: profit margin = (net profit / revenue) × 100', () => {
            const comparison = compareAllTiers(1000);

            comparison.tiers.forEach(tier => {
                if (tier.totalRevenue > 0) {
                    const calculatedMargin = (tier.netProfit / tier.totalRevenue) * 100;
                    expect(tier.profitMargin).toBeCloseTo(calculatedMargin, 1);
                }
            });
        });

        it('should have consistent per-trader metrics', () => {
            const comparison = compareAllTiers(1000);

            comparison.tiers.forEach(tier => {
                expect(tier.revenuePerTrader).toBeCloseTo(tier.totalRevenue / 1000, 0.1);
                expect(tier.payoutsPerTrader).toBeCloseTo(tier.totalPayouts / 1000, 0.1);
                expect(tier.profitPerTrader).toBeCloseTo(tier.netProfit / 1000, 0.1);
            });
        });
    });
});
