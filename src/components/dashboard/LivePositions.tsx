'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OpenPositions } from './OpenPositions';

interface Position {
    id: string;
    marketId: string;
    marketTitle: string;
    direction: 'YES' | 'NO';
    entryPrice: number;
    currentPrice: number;
    shares: number;
    unrealizedPnL: number;
}

interface LivePositionsProps {
    initialPositions: Position[];
}

/**
 * LivePositions - Wraps OpenPositions with live polling from /api/trade/positions
 * 
 * ARCHITECTURE NOTE (Feb 2026):
 * Previously used SSE to independently recalculate PnL from a different price
 * source (Gamma API snapshots via /prices endpoint). This caused PnL to diverge
 * from the Portfolio dropdown, which uses /api/trade/positions with order book
 * mid-prices. Survived 3+ fix attempts because the rogue computation bypassed
 * all canonical functions.
 * 
 * Now uses the SAME canonical data path as PortfolioDropdown/PortfolioPanel:
 * polling /api/trade/positions, which computes PnL server-side using
 * position-utils.ts and order book mid-prices. No client-side PnL computation.
 * 
 * See CLAUDE.md "Financial Display Rule" for the guardrail preventing regression.
 */

const POLL_INTERVAL_MS = 5_000;

export function LivePositions({ initialPositions }: LivePositionsProps) {
    const [positions, setPositions] = useState<Position[]>(initialPositions);
    const [isLive, setIsLive] = useState(false);
    const pollCount = useRef(0);

    const fetchPositions = useCallback(async () => {
        try {
            const res = await fetch('/api/trade/positions');
            if (!res.ok) {
                // Don't overwrite good data on transient errors (rate limit, etc.)
                if (res.status !== 429) {
                    console.error(`[LivePositions] API error: ${res.status}`);
                }
                return;
            }

            const data = await res.json();
            const mapped: Position[] = (data.positions || []).map((p: {
                id: string;
                marketId: string;
                marketTitle: string;
                direction: 'YES' | 'NO';
                avgPrice: number;
                currentPrice: number;
                shares: number;
                unrealizedPnL: number;
            }) => ({
                id: p.id,
                marketId: p.marketId,
                marketTitle: p.marketTitle,
                direction: p.direction,
                entryPrice: p.avgPrice, // API field name differs from component interface
                currentPrice: p.currentPrice,
                shares: p.shares,
                unrealizedPnL: p.unrealizedPnL,
            }));

            setPositions(mapped);
            pollCount.current++;
            setIsLive(true);
        } catch (err) {
            console.error('[LivePositions] Poll failed:', err);
        }
    }, []);

    useEffect(() => {
        // First poll after a short delay to avoid racing with SSR hydration
        const initialDelay = setTimeout(() => {
            fetchPositions();
        }, 2_000);

        const interval = setInterval(fetchPositions, POLL_INTERVAL_MS);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, [fetchPositions]);

    // Reset to SSR data when initial positions change (e.g., page navigation)
    useEffect(() => {
        setPositions(initialPositions);
    }, [initialPositions]);

    return (
        <div className="relative">
            {/* Live Indicator — shows after first successful poll */}
            {isLive && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 text-xs text-green-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                </div>
            )}

            <OpenPositions
                positions={positions}
            />
        </div>
    );
}
