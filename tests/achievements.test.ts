import { describe, it, expect } from 'vitest';

// Helper functions for achievements and badge logic
// TODO: Move these to src/lib/achievements.ts once implemented

type BadgeType = 'first_payout' | 'funded_trader' | '10k_milestone' | '5k_milestone' | '100_trades';

function checkBadgeUnlocks(params: {
    payoutCount?: number;
    previousPayoutCount?: number;
    phase?: string;
    previousPhase?: string;
    lifetimeProfit?: number;
    previousLifetimeProfit?: number;
    tradeCount?: number;
    previousTradeCount?: number;
}): BadgeType[] {
    const badges: BadgeType[] = [];

    // First payout
    if (params.payoutCount === 1 && params.previousPayoutCount === 0) {
        badges.push('first_payout');
    }

    // Funded trader
    if (params.phase === 'funded' && params.previousPhase !== 'funded') {
        badges.push('funded_trader');
    }

    // Profit milestones
    if (params.lifetimeProfit !== undefined && params.previousLifetimeProfit !== undefined) {
        // $10k milestone
        if (params.lifetimeProfit >= 10000 && params.previousLifetimeProfit < 10000) {
            badges.push('10k_milestone');
        }
        // $5k milestone
        if (params.lifetimeProfit >= 5000 && params.previousLifetimeProfit < 5000) {
            badges.push('5k_milestone');
        }
    }

    // Trade count milestones
    if (params.tradeCount === 100 && params.previousTradeCount === 99) {
        badges.push('100_trades');
    }

    return badges;
}

function calculateXP(params: {
    action: string;
    tradeProfit?: number;
    isWinner?: boolean;
}): number {
    const baseXP: Record<string, number> = {
        'trade_completed': 10,
        'first_trade': 50,
        'challenge_passed': 100,
        'payout_received': 200,
    };

    let xp = baseXP[params.action] || 0;

    // Bonus XP for winning trades
    if (params.isWinner && params.action === 'trade_completed') {
        xp += 5;
    }

    return xp;
}

function calculateLevel(totalXP: number): number {
    const XP_PER_LEVEL = 500;
    return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

function detectMilestone(params: {
    currentProfit?: number;
    previousProfit?: number;
    currentTradeCount?: number;
    previousTradeCount?: number;
}): string | null {
    // Profit milestones
    if (params.currentProfit !== undefined && params.previousProfit !== undefined) {
        if (params.currentProfit >= 5000 && params.previousProfit < 5000) {
            return '5k_profit';
        }
        if (params.currentProfit >= 10000 && params.previousProfit < 10000) {
            return '10k_profit';
        }
    }

    // Trade count milestones
    if (params.currentTradeCount === 100 && params.previousTradeCount === 99) {
        return '100_trades';
    }
    if (params.currentTradeCount === 50 && params.previousTradeCount === 49) {
        return '50_trades';
    }

    return null;
}

// ===== TESTS =====

describe('Badge Unlocking Logic', () => {
    it('unlocks "First Payout" badge on first payout', () => {
        const badges = checkBadgeUnlocks({
            payoutCount: 1,
            previousPayoutCount: 0,
        });
        expect(badges).toContain('first_payout');
    });

    it('does not unlock "First Payout" on second payout', () => {
        const badges = checkBadgeUnlocks({
            payoutCount: 2,
            previousPayoutCount: 1,
        });
        expect(badges).not.toContain('first_payout');
    });

    it('unlocks "Funded Trader" badge on funded status', () => {
        const badges = checkBadgeUnlocks({
            phase: 'funded',
            previousPhase: 'verification',
        });
        expect(badges).toContain('funded_trader');
    });

    it('does not unlock "Funded Trader" if already funded', () => {
        const badges = checkBadgeUnlocks({
            phase: 'funded',
            previousPhase: 'funded',
        });
        expect(badges).not.toContain('funded_trader');
    });

    it('unlocks "$10k Milestone" badge at $10k profit', () => {
        const badges = checkBadgeUnlocks({
            lifetimeProfit: 10500,
            previousLifetimeProfit: 9800,
        });
        expect(badges).toContain('10k_milestone');
    });

    it('unlocks "$5k Milestone" badge at $5k profit', () => {
        const badges = checkBadgeUnlocks({
            lifetimeProfit: 5200,
            previousLifetimeProfit: 4900,
        });
        expect(badges).toContain('5k_milestone');
    });

    it('does not unlock milestone if already passed', () => {
        const badges = checkBadgeUnlocks({
            lifetimeProfit: 12000,
            previousLifetimeProfit: 11000,
        });
        expect(badges).not.toContain('10k_milestone');
    });

    it('unlocks "100 Trades" badge on 100th trade', () => {
        const badges = checkBadgeUnlocks({
            tradeCount: 100,
            previousTradeCount: 99,
        });
        expect(badges).toContain('100_trades');
    });

    it('can unlock multiple badges at once', () => {
        const badges = checkBadgeUnlocks({
            payoutCount: 1,
            previousPayoutCount: 0,
            phase: 'funded',
            previousPhase: 'verification',
        });
        expect(badges).toHaveLength(2);
        expect(badges).toContain('first_payout');
        expect(badges).toContain('funded_trader');
    });
});

describe('XP & Level Progression', () => {
    it('awards XP for completing trades', () => {
        const xp = calculateXP({
            action: 'trade_completed',
            tradeProfit: 150,
        });
        expect(xp).toBe(10); // Base XP for trade
    });

    it('awards bonus XP for profitable trades', () => {
        const xp = calculateXP({
            action: 'trade_completed',
            tradeProfit: 500,
            isWinner: true,
        });
        expect(xp).toBe(15); // 10 base + 5 bonus
    });

    it('awards high XP for first trade', () => {
        const xp = calculateXP({
            action: 'first_trade',
        });
        expect(xp).toBe(50);
    });

    it('awards XP for passing challenge', () => {
        const xp = calculateXP({
            action: 'challenge_passed',
        });
        expect(xp).toBe(100);
    });

    it('awards XP for receiving payout', () => {
        const xp = calculateXP({
            action: 'payout_received',
        });
        expect(xp).toBe(200);
    });

    it('calculates level from total XP (500 XP per level)', () => {
        expect(calculateLevel(0)).toBe(1);      // Level 1
        expect(calculateLevel(499)).toBe(1);    // Still level 1
        expect(calculateLevel(500)).toBe(2);    // Level 2
        expect(calculateLevel(1000)).toBe(3);   // Level 3
        expect(calculateLevel(2500)).toBe(6);   // Level 6
    });

    it('handles fractional XP correctly', () => {
        expect(calculateLevel(1450)).toBe(3);  // 1450/500 = 2.9 → level 3
        expect(calculateLevel(1500)).toBe(4);  // 1500/500 = 3.0 → level 4
    });

    it('returns 0 XP for unknown actions', () => {
        const xp = calculateXP({
            action: 'unknown_action',
        });
        expect(xp).toBe(0);
    });
});

describe('Milestone Detection', () => {
    it('detects crossing $5k profit milestone', () => {
        const milestone = detectMilestone({
            currentProfit: 5100,
            previousProfit: 4900,
        });
        expect(milestone).toBe('5k_profit');
    });

    it('detects crossing $10k profit milestone', () => {
        const milestone = detectMilestone({
            currentProfit: 10200,
            previousProfit: 9800,
        });
        expect(milestone).toBe('10k_profit');
    });

    it('detects 100th trade milestone', () => {
        const milestone = detectMilestone({
            currentTradeCount: 100,
            previousTradeCount: 99,
        });
        expect(milestone).toBe('100_trades');
    });

    it('detects 50th trade milestone', () => {
        const milestone = detectMilestone({
            currentTradeCount: 50,
            previousTradeCount: 49,
        });
        expect(milestone).toBe('50_trades');
    });

    it('returns null when no milestone crossed', () => {
        const milestone = detectMilestone({
            currentProfit: 4500,
            previousProfit: 4300,
        });
        expect(milestone).toBeNull();
    });

    it('does not detect milestone when already past', () => {
        const milestone = detectMilestone({
            currentProfit: 6000,
            previousProfit: 5500,
        });
        expect(milestone).toBeNull(); // Already past 5k
    });

    it('detects exactly at milestone', () => {
        const milestone = detectMilestone({
            currentProfit: 5000,
            previousProfit: 4999,
        });
        expect(milestone).toBe('5k_profit');
    });
});

describe('Edge Cases & Progress Tracking', () => {
    it('handles zero XP correctly', () => {
        const level = calculateLevel(0);
        expect(level).toBe(1);
    });

    it('handles very high XP values', () => {
        const level = calculateLevel(50000);
        expect(level).toBe(101); // 50000/500 + 1
    });

    it('handles negative profit (should not trigger milestones)', () => {
        const milestone = detectMilestone({
            currentProfit: -1000,
            previousProfit: -500,
        });
        expect(milestone).toBeNull();
    });

    it('handles zero trade count', () => {
        const milestone = detectMilestone({
            currentTradeCount: 0,
            previousTradeCount: 0,
        });
        expect(milestone).toBeNull();
    });

    it('does not award bonus XP for losing trades', () => {
        const xp = calculateXP({
            action: 'trade_completed',
            tradeProfit: -100,
            isWinner: false,
        });
        expect(xp).toBe(10); // Only base XP
    });

    it('handles first badge unlock correctly', () => {
        const badges = checkBadgeUnlocks({
            payoutCount: 1,
            previousPayoutCount: 0,
        });
        expect(badges).toHaveLength(1);
        expect(badges[0]).toBe('first_payout');
    });
});

describe('Combined Achievement Workflow', () => {
    it('calculates progression for active trader', () => {
        // Scenario: user completes 50 trades, earns $5k, gets funded
        let totalXP = 0;

        // 50 trades @ 10 XP each (some winning with bonus)
        for (let i = 0; i < 50; i++) {
            if (i % 3 === 0) {
                totalXP += calculateXP({ action: 'trade_completed', isWinner: true });
            } else {
                totalXP += calculateXP({ action: 'trade_completed', isWinner: false });
            }
        }

        // Check level
        const level = calculateLevel(totalXP);
        expect(level).toBeGreaterThan(1); // Should have leveled up

        // Check milestone
        const profitMilestone = detectMilestone({
            currentProfit: 5100,
            previousProfit: 4900,
        });
        expect(profitMilestone).toBe('5k_profit');

        // Check badges
        const badges = checkBadgeUnlocks({
            lifetimeProfit: 5100,
            previousLifetimeProfit: 4900,
            phase: 'funded',
            previousPhase: 'verification',
            payoutCount: 1,
            previousPayoutCount: 0,
        });
        expect(badges.length).toBeGreaterThanOrEqual(2);
    });
});
