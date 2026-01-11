"use client";

import { memo } from "react";
import type { EventMetadata } from "@/app/actions/market";
import { BinaryEventCard } from "./BinaryEventCard";
import { HeadToHeadCard, isSportsMatchup } from "./HeadToHeadCard";
import { MultiRunnerCard } from "./MultiRunnerCard";

interface SmartEventCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * SmartEventCard - Auto-detects the best card format based on event structure
 * Memoized to prevent INP issues from cascade re-renders in the market grid
 * 
 * Detection Logic:
 * 1. Single market (1 outcome) → BinaryEventCard
 * 2. Sports matchup (2-3 markets with sports keywords) → HeadToHeadCard
 * 3. Multiple outcomes (3+) → MultiRunnerCard
 */
export const SmartEventCard = memo(function SmartEventCard({ event, onTrade }: SmartEventCardProps) {
    // Determine card type based on event structure
    const cardType = getCardType(event);

    switch (cardType) {
        case 'binary':
            return <BinaryEventCard event={event} onTrade={onTrade} />;
        case 'headtohead':
            return <HeadToHeadCard event={event} onTrade={onTrade} />;
        case 'multirunner':
        default:
            return <MultiRunnerCard event={event} onTrade={onTrade} />;
    }
});

type CardType = 'binary' | 'headtohead' | 'multirunner';

/**
 * Determine which card type to use for an event
 */
function getCardType(event: EventMetadata): CardType {
    const marketCount = event.markets.length;

    // Single market = Binary Yes/No
    if (marketCount === 1) {
        return 'binary';
    }

    // 2-3 markets + sports pattern = Head-to-Head
    if (marketCount >= 2 && marketCount <= 3 && isSportsMatchup(event)) {
        return 'headtohead';
    }

    // 3+ markets = Multi-runner list
    return 'multirunner';
}

export { getCardType };
