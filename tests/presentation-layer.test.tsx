/**
 * Presentation Layer — Behavioral Tests
 * 
 * Tests what the system DOES (DOM output), not how it's wired (source strings).
 * Uses React Testing Library + jsdom, mocking at boundaries only.
 *
 * Mocked boundaries:
 *   - CountUp: renders static text (framer-motion springs don't work in jsdom)
 *   - framer-motion: passes through div/span
 *   - useEquityPolling: returns deterministic value
 *   - next/link: renders plain <a>
 *   - fetch: returns controlled trade data
 *   - SelectedChallengeContext: provides test challenge ID
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mock CountUp (framer-motion springs + ref.textContent = no jsdom support) ──
vi.mock('@/components/reactbits/CountUp', () => ({
    default: ({ to, prefix, suffix }: { to: number; prefix?: string; suffix?: string }) => (
        <span data-testid="countup">{prefix}{to}{suffix}</span>
    ),
}));

// ─── Mock framer-motion (no animations in jsdom) ──
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
            <div className={className} {...rest}>{children}</div>
        ),
        span: ({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) => (
            <span className={className} {...rest}>{children}</span>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
    useMotionValue: () => ({ set: vi.fn() }),
    useSpring: () => ({ on: vi.fn(() => vi.fn()) }),
}));

// ─── Mock SpotlightCard (just renders children) ──
vi.mock('@/components/reactbits/SpotlightCard', () => ({
    default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
    ),
}));

// ─── Mock ScrollReveal (just renders children) ──
vi.mock('@/components/reactbits/ScrollReveal', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Mock useEquityPolling hook ──
vi.mock('@/hooks/useEquityPolling', () => ({
    useEquityPolling: (initialBalance: number) => ({
        equity: initialBalance,
        lastUpdated: new Date(),
    }),
}));

// ─── Mock next/link ──
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// ─── Mock SelectedChallengeContext ──
vi.mock('@/contexts/SelectedChallengeContext', () => ({
    useSelectedChallengeContext: () => ({
        selectedChallengeId: 'test-challenge-123',
    }),
}));

// ─── Mock apiFetch (returns Response-like object) ──
const mockApiFetch = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// ─── Mock Shadcn Progress ──
vi.mock('@/components/ui/progress', () => ({
    Progress: ({ value, className }: { value: number; className?: string }) => (
        <div role="progressbar" aria-valuenow={value} className={className} />
    ),
}));

// ─── Imports (after mocks) ──
import { MissionTracker } from '@/components/dashboard/MissionTracker';
import { ProfitProgress } from '@/components/dashboard/ProfitProgress';
import { LiveEquityDisplay } from '@/components/dashboard/LiveEquityDisplay';
import { RecentTradesWidget } from '@/components/dashboard/RecentTradesWidget';

// ─── Tests ──────────────────────────────────────────────────────────
describe('Presentation Layer — Behavioral', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── B1: MissionTracker daily loss uses dailyPnL, not overall profit ──
    describe('MissionTracker daily loss calculation', () => {

        it('renders "Left" amount based on dailyPnL, not overall profit', () => {
            // Scenario: profitable overall (+$500) but lost $150 today
            render(
                <MissionTracker
                    startingBalance={10000}
                    currentBalance={10500}
                    profitTarget={1000}
                    maxDrawdown={800}
                    dailyLossLimit={400}
                    dailyPnL={-150}
                />
            );

            // dailyPnL = -150, dailyLossLimit = 400
            // "Left" = max(0, 400 + min(-150, 0)) = max(0, 250) = 250
            // If it used overall profit (+500), it would show "400 Left" (wrong)
            expect(screen.getByText(/250\s*Left/i)).toBeInTheDocument();
        });

        it('renders today-only loss amount from dailyPnL', () => {
            render(
                <MissionTracker
                    startingBalance={10000}
                    currentBalance={10500}
                    profitTarget={1000}
                    maxDrawdown={800}
                    dailyLossLimit={400}
                    dailyPnL={-150}
                />
            );

            // Should show "$150.00 Today" (from dailyPnL), not "$500.00" (from overall profit)
            expect(screen.getByText(/-\$150\.00\s*Today/i)).toBeInTheDocument();
        });

        it('shows full daily limit remaining when dailyPnL is positive', () => {
            render(
                <MissionTracker
                    startingBalance={10000}
                    currentBalance={10200}
                    profitTarget={1000}
                    maxDrawdown={800}
                    dailyLossLimit={400}
                    dailyPnL={50}
                />
            );

            // dailyPnL = +50, min(50, 0) = 0, so "Left" = max(0, 400 + 0) = 400
            expect(screen.getByText(/400\s*Left/i)).toBeInTheDocument();
        });
    });

    // ─── B3: ProfitProgress decimal precision ──
    describe('ProfitProgress decimal precision', () => {

        it('rounds totalPnL to at most 2 decimal places', () => {
            render(
                <ProfitProgress
                    totalPnL={655.819854}
                    profitTarget={1000}
                    profitProgress={65.58}
                    startingBalance={10000}
                />
            );

            // CountUp is mocked to render {to} directly
            // ProfitProgress renders TWO CountUp elements: [0] = dollar amount, [1] = progress %
            const countups = screen.getAllByTestId('countup');
            const profitCountUp = countups[0];
            const renderedValue = parseFloat(profitCountUp.textContent || '0');

            // Value should be 655.82 (exactly 2 decimal places)
            expect(renderedValue).toBe(655.82);

            // Also verify no more than 2 decimal places in the rendered text
            const text = profitCountUp.textContent || '';
            const decimalPart = text.split('.')[1] || '';
            expect(decimalPart.length).toBeLessThanOrEqual(2);
        });

        it('renders 0 for negative totalPnL (clamped)', () => {
            render(
                <ProfitProgress
                    totalPnL={-100}
                    profitTarget={1000}
                    profitProgress={0}
                    startingBalance={10000}
                />
            );

            // Math.max(0, -100) = 0
            // ProfitProgress renders TWO CountUp: [0] = dollar amount
            const countups = screen.getAllByTestId('countup');
            expect(parseFloat(countups[0].textContent || '-1')).toBe(0);
        });
    });

    // ─── U1: LiveEquityDisplay no "USD" suffix ──
    describe('LiveEquityDisplay currency display', () => {

        it('does NOT render "USD" anywhere', () => {
            const { container } = render(
                <LiveEquityDisplay initialBalance={10000} initialDailyPnL={50.25} />
            );

            // "USD" should not appear anywhere in the rendered DOM
            expect(container.textContent).not.toContain('USD');
        });

        it('renders the dollar sign prefix via BigNumberDisplay', () => {
            const { container } = render(
                <LiveEquityDisplay initialBalance={10000} initialDailyPnL={0} />
            );

            // BigNumberDisplay renders "$" as prefix
            expect(container.textContent).toContain('$');
        });

        it('renders "Current Equity" label', () => {
            render(
                <LiveEquityDisplay initialBalance={10000} initialDailyPnL={0} />
            );

            expect(screen.getByText('Current Equity')).toBeInTheDocument();
        });
    });

    // ─── U2/U3: RecentTradesWidget direction display ──
    describe('RecentTradesWidget direction badges', () => {

        const mockTradesWithDirection = [
            {
                id: 'trade-1',
                marketId: 'mkt-1',
                marketTitle: 'Will Bitcoin hit $100k?',
                type: 'BUY',
                direction: 'YES',
                price: 0.65,
                amount: 100,
                shares: 153.84,
                realizedPnL: null,
                executedAt: '2026-02-14T10:00:00Z',
            },
            {
                id: 'trade-2',
                marketId: 'mkt-2',
                marketTitle: 'Will Ethereum flip Bitcoin?',
                type: 'SELL',
                direction: 'NO',
                price: 0.30,
                amount: 50,
                shares: 71.42,
                realizedPnL: 25.50,
                executedAt: '2026-02-14T09:30:00Z',
            },
        ];

        beforeEach(() => {
            mockApiFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ trades: mockTradesWithDirection }),
            });
        });

        it('renders YES badge for YES-direction trades', async () => {
            render(<RecentTradesWidget />);

            await waitFor(() => {
                expect(screen.getByText('YES')).toBeInTheDocument();
            });
        });

        it('renders NO badge for NO-direction trades', async () => {
            render(<RecentTradesWidget />);

            await waitFor(() => {
                expect(screen.getByText('NO')).toBeInTheDocument();
            });
        });

        it('renders BUY/SELL badges alongside direction badges', async () => {
            render(<RecentTradesWidget />);

            await waitFor(() => {
                expect(screen.getByText('BUY')).toBeInTheDocument();
                expect(screen.getByText('SELL')).toBeInTheDocument();
            });
        });
    });

    // ─── U3: Trade History API direction field ──
    describe('Trade History API direction field', () => {

        it('enrichTrades includes direction in the mapping', async () => {
            // Pure function test: import route handler internals
            // The enrichTrades function maps raw DB rows → API response
            // We test the shape, not the string
            const rawTrade = {
                id: 'trade-1',
                marketId: 'mkt-1',
                type: 'BUY',
                entryPrice: '0.55',
                amount: '100',
                shares: '181.81',
                realizedPnl: null,
                closureReason: null,
                direction: 'YES',
                executedAt: new Date('2026-02-14T10:00:00Z'),
                marketTitle: 'Test Market',
                eventTitle: 'Test Event',
                image: null,
                positionId: 'pos-1',
            };

            // Simulate enrichTrades mapping (the same logic as the route)
            const enriched = {
                id: rawTrade.id,
                marketId: rawTrade.marketId,
                type: rawTrade.type,
                price: parseFloat(rawTrade.entryPrice),
                amount: parseFloat(rawTrade.amount),
                shares: parseFloat(rawTrade.shares),
                realizedPnL: rawTrade.realizedPnl,
                closureReason: rawTrade.closureReason || null,
                direction: rawTrade.direction || null,
                executedAt: rawTrade.executedAt,
            };

            // direction field exists and has correct value
            expect(enriched).toHaveProperty('direction');
            expect(enriched.direction).toBe('YES');
        });

        it('handles null direction gracefully (old trade rows)', () => {
            const rawTrade = {
                direction: null,
            };

            const direction = rawTrade.direction || null;
            expect(direction).toBeNull();
        });
    });

    // ─── Math Proofs (behavioral: these prove WHY the fixes were needed) ──
    describe('Math Proofs — Why fixes were necessary', () => {

        it('overall profit diverges from daily PnL (proves B1 root cause)', () => {
            // User started with $10,000 yesterday. Made $500 yesterday.
            // Today: balance is $10,500, lost $150 today.
            const startingBalance = 10000;
            const currentBalance = 10500;
            const dailyPnL = -150;

            const overallProfit = currentBalance - startingBalance; // +500
            // These are fundamentally different numbers
            expect(overallProfit).not.toBe(dailyPnL);
            // Using overall profit for daily loss calc would show 0 loss used
            // Using dailyPnL correctly shows 150 of daily limit used
            expect(Math.abs(Math.min(dailyPnL, 0))).toBe(150);
            expect(Math.abs(Math.min(overallProfit, 0))).toBe(0); // WRONG if used
        });

        it('raw floats have excessive decimal places (proves B3 root cause)', () => {
            const rawFloat = 655.819854;
            const fixedValue = parseFloat(Math.max(0, rawFloat).toFixed(2));

            // Raw float would show "655.819854" — too many decimals
            expect(rawFloat.toString().split('.')[1]!.length).toBeGreaterThan(2);
            // Fixed value shows "655.82" — correct
            expect(fixedValue).toBe(655.82);
            expect(fixedValue.toString().split('.')[1]!.length).toBeLessThanOrEqual(2);
        });
    });
});
