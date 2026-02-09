/**
 * Normalize RulesConfig Values
 * 
 * Defense-in-depth guard against the decimal-vs-absolute bug.
 * Legacy challenges may have maxDrawdown stored as 0.08 (percentage)
 * instead of 800 (absolute dollars). This utility auto-corrects at read time.
 * 
 * Every consumer of rulesConfig.maxDrawdown or rulesConfig.profitTarget
 * MUST go through this function.
 */

export interface NormalizedRules {
    maxDrawdown: number;
    profitTarget: number;
}

/**
 * Normalize maxDrawdown and profitTarget from rulesConfig.
 * 
 * Detects the known bug where values were stored as decimals (0.08, 0.10)
 * instead of absolute dollars ($800, $1000). Values < 1 are treated as
 * percentages and multiplied by startingBalance.
 * 
 * @param rules - The raw rulesConfig from the database
 * @param startingBalance - The challenge's starting balance (used for fallback and conversion)
 * @returns Normalized absolute-dollar values for maxDrawdown and profitTarget
 */
export function normalizeRulesConfig(
    rules: Record<string, unknown> | null | undefined,
    startingBalance: number
): NormalizedRules {
    const safeRules = rules || {};

    // Read raw values, falling back to tier-appropriate defaults
    let maxDrawdown = (safeRules.maxDrawdown as number) || startingBalance * 0.08;
    let profitTarget = (safeRules.profitTarget as number) || startingBalance * 0.10;

    // GUARD: If stored as decimal percentage (< 1), convert to absolute dollars.
    // A $5k account (smallest tier) has maxDrawdown = $400 at minimum.
    // Any value < 1 is clearly a percentage, not a dollar amount.
    if (maxDrawdown > 0 && maxDrawdown < 1) {
        console.warn(
            `[normalizeRulesConfig] ⚠️ maxDrawdown=${maxDrawdown} looks like a percentage, ` +
            `converting to absolute: $${(startingBalance * maxDrawdown).toFixed(2)}`
        );
        maxDrawdown = startingBalance * maxDrawdown;
    }

    if (profitTarget > 0 && profitTarget < 1) {
        console.warn(
            `[normalizeRulesConfig] ⚠️ profitTarget=${profitTarget} looks like a percentage, ` +
            `converting to absolute: $${(startingBalance * profitTarget).toFixed(2)}`
        );
        profitTarget = startingBalance * profitTarget;
    }

    return { maxDrawdown, profitTarget };
}
