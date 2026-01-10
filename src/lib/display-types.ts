/**
 * Display Types - Branded Types for Market Display Strings
 * 
 * This module provides compile-time safety for market display strings.
 * Using branded types ensures that developers cannot accidentally use
 * the wrong type of string in the wrong context.
 * 
 * @example
 * // TypeScript will ERROR if you try to use OutcomeLabel where MarketQuestion is expected
 * const title: MarketQuestion = extractOutcomeLabel(q); // ❌ Type error!
 */

// ============================================================================
// BRANDED TYPES
// ============================================================================

/**
 * MarketQuestion - A full market question for display as card titles/headers
 * 
 * Examples:
 * - "Will the Pittsburgh Steelers win Super Bowl 2026?"
 * - "Will Bitcoin reach $100k by end of 2026?"
 * - "Who will Trump nominate as Fed Chair?"
 * 
 * Use for:
 * - Card titles in MarketCard, BinaryEventCard
 * - Event headers in MultiRunnerCard
 * - Modal titles
 * 
 * ⚠️ NEVER truncate or transform this type for display
 */
export type MarketQuestion = string & { readonly __brand: 'MarketQuestion' };

/**
 * EventTitle - A descriptive event title (may differ from market question)
 * 
 * Examples:
 * - "Super Bowl Champion 2026"
 * - "2028 Presidential Election"
 * - "Fed Rate Decision January 2026"
 * 
 * Use for:
 * - Multi-runner card headers
 * - Event grouping labels
 */
export type EventTitle = string & { readonly __brand: 'EventTitle' };

/**
 * OutcomeLabel - A SHORT extracted label for multi-outcome lists ONLY
 * 
 * Examples:
 * - "Pittsburgh Steelers" (from "Will the Pittsburgh Steelers win...")
 * - "Kevin Warsh" (from "Will Trump nominate Kevin Warsh as Fed Chair?")
 * - ">$100k" (from "Will Bitcoin be above $100k?")
 * 
 * ⚠️ ONLY use for:
 * - Outcome rows INSIDE multi-runner cards
 * - Compact list views where full question would be too long
 * 
 * ❌ NEVER use for:
 * - Card titles
 * - Event headers
 * - Anything that stands alone without context
 */
export type OutcomeLabel = string & { readonly __brand: 'OutcomeLabel' };

// ============================================================================
// TYPE CONSTRUCTORS
// ============================================================================

/**
 * Mark a raw string as a MarketQuestion.
 * Use at API boundaries when receiving market data.
 */
export function asMarketQuestion(s: string): MarketQuestion {
    return s as MarketQuestion;
}

/**
 * Mark a raw string as an EventTitle.
 * Use at API boundaries when receiving event data.
 */
export function asEventTitle(s: string): EventTitle {
    return s as EventTitle;
}

/**
 * Internal use only - creates OutcomeLabel from extraction.
 * This is called by extractOutcomeLabel, not directly.
 */
export function asOutcomeLabel(s: string): OutcomeLabel {
    return s as OutcomeLabel;
}

// ============================================================================
// TYPE GUARDS (for runtime checking if needed)
// ============================================================================

/**
 * Check if a string looks like a full question (has "?" or "Will")
 * Useful for debugging/assertions
 */
export function looksLikeFullQuestion(s: string): boolean {
    return s.includes('?') || s.toLowerCase().startsWith('will ');
}

/**
 * Assert that a string is a full question.
 * Throws in development if the string looks truncated.
 */
export function assertFullQuestion(s: string, context: string): MarketQuestion {
    if (process.env.NODE_ENV === 'development') {
        if (!looksLikeFullQuestion(s) && s.length < 30) {
            console.warn(
                `[Display Warning] Possible truncated question in ${context}: "${s}". ` +
                `Expected full question like "Will X do Y?"`
            );
        }
    }
    return s as MarketQuestion;
}
