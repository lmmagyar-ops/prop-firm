/**
 * Safe Parsing Utilities
 * 
 * Guards against NaN/null propagation through financial calculations.
 * All parseFloat calls in critical paths should use these helpers.
 */

/**
 * Safely parse a float value, returning a default if parsing fails.
 * 
 * @param value - The value to parse (string, number, null, undefined)
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns Parsed float or defaultValue
 * 
 * @example
 * safeParseFloat("123.45") // 123.45
 * safeParseFloat(null) // 0
 * safeParseFloat(undefined) // 0
 * safeParseFloat("not a number") // 0
 * safeParseFloat("", 100) // 100
 */
export function safeParseFloat(
    value: string | number | null | undefined,
    defaultValue: number = 0
): number {
    // Handle null/undefined upfront
    if (value === null || value === undefined) {
        return defaultValue;
    }

    // If already a number, validate it's not NaN/Infinity
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : defaultValue;
    }

    // Empty string check
    if (typeof value === 'string' && value.trim() === '') {
        return defaultValue;
    }

    // Parse the string
    const parsed = parseFloat(value);

    // NaN check
    if (Number.isNaN(parsed)) {
        return defaultValue;
    }

    // Infinity check
    if (!Number.isFinite(parsed)) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Safely parse a float and round to specified decimal places.
 * Useful for financial calculations to avoid floating-point drift.
 * 
 * @param value - The value to parse
 * @param decimals - Number of decimal places (default: 2 for dollars)
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns Parsed and rounded float
 * 
 * @example
 * safeParseRounded("123.456789") // 123.46
 * safeParseRounded("123.456789", 4) // 123.4568
 */
export function safeParseRounded(
    value: string | number | null | undefined,
    decimals: number = 2,
    defaultValue: number = 0
): number {
    const parsed = safeParseFloat(value, defaultValue);
    const multiplier = Math.pow(10, decimals);
    return Math.round(parsed * multiplier) / multiplier;
}

/**
 * Format a number as a dollar string with proper rounding.
 * Guards against NaN display in UI.
 * 
 * @param value - The value to format
 * @param defaultValue - Value to use if parsing fails (default: 0)
 * @returns Formatted dollar string (e.g., "$123.45" or "-$45.00")
 * 
 * @example
 * safeFormatDollars(123.456) // "$123.46"
 * safeFormatDollars(-45) // "-$45.00"
 * safeFormatDollars(null) // "$0.00"
 */
export function safeFormatDollars(
    value: string | number | null | undefined,
    defaultValue: number = 0
): string {
    const amount = safeParseRounded(value, 2, defaultValue);
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toFixed(2);
    return isNegative ? `-$${absAmount}` : `$${absAmount}`;
}

/**
 * Format a number as a percentage string with proper rounding.
 * Guards against NaN display in UI.
 * 
 * @param value - The value to format (0.1 = 10%)
 * @param defaultValue - Value to use if parsing fails (default: 0)
 * @returns Formatted percentage string (e.g., "10.5%" or "-5.2%")
 * 
 * @example
 * safeFormatPercent(0.105) // "10.50%"
 * safeFormatPercent(null) // "0.00%"
 */
export function safeFormatPercent(
    value: string | number | null | undefined,
    defaultValue: number = 0
): string {
    const parsed = safeParseFloat(value, defaultValue);
    return `${(parsed * 100).toFixed(2)}%`;
}
