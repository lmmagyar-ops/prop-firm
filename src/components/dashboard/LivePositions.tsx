'use client';

import { useState, useEffect, useMemo } from 'react';
import { OpenPositions } from './OpenPositions';
import { useMarketStream } from '@/hooks/useMarketStream';

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
    onClosePosition?: (positionId: string) => void;
}

/**
 * LivePositions - Wraps OpenPositions with SSE live price updates
 * 
 * Initial data comes from server, then SSE updates prices in real-time.
 * Recalculates unrealized P&L on each price update.
 */
export function LivePositions({ initialPositions, onClosePosition = () => { } }: LivePositionsProps) {
    const { prices, connected } = useMarketStream();
    const [positions, setPositions] = useState<Position[]>(initialPositions);

    // Update positions when SSE prices change
    useEffect(() => {
        if (Object.keys(prices).length === 0) return;

        setPositions(prev => prev.map(pos => {
            const liveData = prices[pos.marketId];
            if (!liveData) return pos;

            const livePrice = parseFloat(liveData.price);

            // Calculate P&L with correct direction handling
            const isNo = pos.direction === 'NO';
            const effectiveCurrentValue = isNo ? (1 - livePrice) : livePrice;
            const effectiveEntryValue = isNo ? (1 - pos.entryPrice) : pos.entryPrice;
            const unrealizedPnL = (effectiveCurrentValue - effectiveEntryValue) * pos.shares;

            return {
                ...pos,
                currentPrice: livePrice,
                unrealizedPnL,
                marketTitle: liveData.title || pos.marketTitle,
            };
        }));
    }, [prices]);

    // Reset when initial positions change (e.g., new trade)
    useEffect(() => {
        setPositions(initialPositions);
    }, [initialPositions]);

    return (
        <div className="relative">
            {/* SSE Connection Indicator */}
            {connected && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 text-xs text-green-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                </div>
            )}

            <OpenPositions
                positions={positions}
                onClosePosition={onClosePosition}
            />
        </div>
    );
}
