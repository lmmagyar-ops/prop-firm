/**
 * Data Quality Validator for Market Ingestion
 * 
 * Catches anomalies before bad data reaches Redis:
 * - Price validation (sums, ranges, staleness)
 * - Duplicate detection
 * - Missing field detection
 * - Suspicious patterns
 */

import type { EventMetadata, SubMarket } from "../app/actions/market";
import { createLogger } from "@/lib/logger";
const logger = createLogger("DataValidator");

export interface ValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
}

export interface EventValidation extends ValidationResult {
    eventId: string;
    eventTitle: string;
}

/**
 * Validate a single market/outcome
 */
export function validateMarket(market: SubMarket): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Price range check (should be 0-1)
    if (market.price < 0) {
        errors.push(`Negative price: ${market.price}`);
    }
    if (market.price > 1) {
        errors.push(`Price > 100%: ${(market.price * 100).toFixed(1)}%`);
    }

    // Suspiciously round prices (might indicate default/placeholder)
    if (market.price === 0.5) {
        warnings.push(`Exactly 50% price - might be placeholder`);
    }

    // No volume might indicate stale market
    if (market.volume === 0) {
        warnings.push(`Zero volume`);
    }

    // Missing question/title
    if (!market.question || market.question.trim() === "") {
        errors.push(`Missing question/title`);
    }

    // Very short question - warn but don't reject (LLM might produce valid short names like "U2")
    if (market.question && market.question.length < 2) {
        errors.push(`Question too short: "${market.question}"`);
    } else if (market.question && market.question.length < 3) {
        warnings.push(`Short question: "${market.question}"`);
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors
    };
}

/**
 * Validate an entire event with all its markets
 */
export function validateEvent(event: EventMetadata): EventValidation {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Must have markets
    if (!event.markets || event.markets.length === 0) {
        errors.push(`No markets in event`);
        return { isValid: false, warnings, errors, eventId: event.id, eventTitle: event.title };
    }

    // Validate each market
    for (const market of event.markets) {
        const marketValidation = validateMarket(market);
        warnings.push(...marketValidation.warnings.map(w => `[${market.question?.slice(0, 20)}...] ${w}`));
        errors.push(...marketValidation.errors.map(e => `[${market.question?.slice(0, 20)}...] ${e}`));
    }

    // Check probability sum for multi-outcome events
    if (event.markets.length > 2) {
        const totalProb = event.markets.reduce((sum, m) => sum + m.price, 0);

        // Sum should be roughly 1 (100%) - allow some vig/spread
        if (totalProb < 0.8) {
            warnings.push(`Probability sum too low: ${(totalProb * 100).toFixed(1)}% (expected ~100%)`);
        }
        if (totalProb > 1.5) {
            warnings.push(`Probability sum too high: ${(totalProb * 100).toFixed(1)}% (expected ~100%)`);
        }
    }

    // Check for all-same prices (likely broken data)
    const prices = event.markets.map(m => m.price);
    const allSamePrice = prices.length > 1 && prices.every(p => Math.abs(p - prices[0]) < 0.001);
    if (allSamePrice) {
        errors.push(`All ${prices.length} outcomes have identical price: ${(prices[0] * 100).toFixed(1)}%`);
    }

    // Check for duplicate outcome names
    const questions = event.markets.map(m => m.question.toLowerCase().trim());
    const uniqueQuestions = new Set(questions);
    if (uniqueQuestions.size < questions.length) {
        const duplicates = questions.filter((q, i) => questions.indexOf(q) !== i);
        warnings.push(`Duplicate outcomes detected: ${[...new Set(duplicates)].join(", ")}`);
    }

    // Missing title
    if (!event.title || event.title.trim() === "") {
        errors.push(`Missing event title`);
    }

    // Missing ID
    if (!event.id) {
        errors.push(`Missing event ID`);
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
        eventId: event.id,
        eventTitle: event.title
    };
}

/**
 * Validate a batch of events and return summary
 */
export function validateEventBatch(events: EventMetadata[]): {
    validEvents: EventMetadata[];
    invalidEvents: EventValidation[];
    totalWarnings: number;
    summary: string;
} {
    const validEvents: EventMetadata[] = [];
    const invalidEvents: EventValidation[] = [];
    let totalWarnings = 0;

    for (const event of events) {
        const validation = validateEvent(event);
        totalWarnings += validation.warnings.length;

        if (validation.isValid) {
            validEvents.push(event);
        } else {
            invalidEvents.push(validation);
        }
    }

    const summary = [
        `Validated ${events.length} events:`,
        `  ✅ Valid: ${validEvents.length}`,
        `  ❌ Invalid: ${invalidEvents.length}`,
        `  ⚠️  Warnings: ${totalWarnings}`,
    ].join("\n");

    return { validEvents, invalidEvents, totalWarnings, summary };
}

/**
 * Log validation issues (call this during ingestion)
 */
export function logValidationIssues(
    invalidEvents: EventValidation[],
    prefix: string = "[Validator]"
): void {
    if (invalidEvents.length === 0) return;

    logger.info(`\n${prefix} ❌ ${invalidEvents.length} events failed validation:`);

    for (const event of invalidEvents.slice(0, 5)) { // Show max 5
        logger.info(`  "${event.eventTitle}"`);
        for (const error of event.errors.slice(0, 3)) {
            logger.info(`    ❌ ${error}`);
        }
    }

    if (invalidEvents.length > 5) {
        logger.info(`  ... and ${invalidEvents.length - 5} more`);
    }
}
