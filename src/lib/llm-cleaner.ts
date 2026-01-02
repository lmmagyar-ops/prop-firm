/**
 * LLM-powered outcome name cleaner for Kalshi markets
 * 
 * Uses Claude to intelligently extract clean labels from messy API data.
 * Results are cached to avoid repeated API calls for the same inputs.
 */

import Anthropic from "@anthropic-ai/sdk";

// Simple in-memory cache for LLM results
const cleaningCache = new Map<string, string[]>();

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) {
        return null;
    }
    if (!anthropic) {
        anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return anthropic;
}

/**
 * Check if an outcome name needs LLM cleaning
 */
export function needsLLMCleaning(name: string): boolean {
    const lower = name.toLowerCase().trim();

    // Too short or placeholder
    if (lower.length < 3 || lower === "::") return true;

    // Sentence-like patterns
    const badPatterns = [
        /^the\s+/i,
        /^a\s+/i,
        /^an\s+/i,
        /^who\s+will/i,
        /^what\s+will/i,
        /^when\s+will/i,
        /^will\s+/i,
        /\s+be\s+/i,
        /\s+the\s+/i,
        /\s+before\s+/i,
        /\s+during\s+/i,
        /\s+after\s+/i,
    ];

    for (const pattern of badPatterns) {
        if (pattern.test(lower)) return true;
    }

    // Too long (likely a sentence)
    if (lower.length > 30) return true;

    return false;
}

/**
 * Use Claude to clean outcome names for an event
 */
export async function cleanOutcomeNamesWithLLM(
    eventTitle: string,
    outcomes: string[],
    tickers?: string[]  // Optional ticker codes which often encode candidate names
): Promise<string[]> {
    // Check cache first
    const cacheKey = `${eventTitle}::${outcomes.join("|")}`;
    const cached = cleaningCache.get(cacheKey);
    if (cached) return cached;

    const client = getAnthropicClient();
    if (!client) {
        // No API key - return outcomes as-is
        return outcomes;
    }

    // Check if any outcomes need cleaning
    const needsCleaning = outcomes.some(o => needsLLMCleaning(o));
    if (!needsCleaning) {
        cleaningCache.set(cacheKey, outcomes);
        return outcomes;
    }

    // Build outcomes list with ticker codes if available
    const outcomesWithTickers = outcomes.map((o, i) => {
        const ticker = tickers?.[i];
        // Extract the last part of ticker (e.g., "KXNEXTSTATE-29-RGRE" → "RGRE")
        const tickerCode = ticker?.split('-').pop() || '';
        return tickerCode ? `${i + 1}. "${o}" [ticker: ${tickerCode}]` : `${i + 1}. "${o}"`;
    }).join("\n");

    const prompt = `You are decoding Kalshi ticker codes into candidate names. This is CRITICAL for data accuracy.

Event: "${eventTitle}"

Raw data from Kalshi API:
${outcomesWithTickers}

TICKER DECODING RULES (follow exactly):
1. Ticker codes are 4-letter abbreviations of names
2. Format is usually: First initial + Last name (3 letters)
3. Examples of CORRECT decoding:
   - JVAN = J.D. Vance (J + VAN)
   - GNEW = Gavin Newsom (G + NEW)
   - DTRU = Donald Trump (D + TRU)
   - KHAR = Kamala Harris (K + HAR)
   - PBUT = Pete Buttigieg (P + BUT)
   - RDES = Ron DeSantis (R + DES)
   - RGRE = Ric Grenell (R + GRE)
   - ROBR = Robert O'Brien (R + OBR)
   - KHAS = Kevin Hassett (K + HAS)
   - NONE = "No One" or "None"

4. NEVER guess or hallucinate! If unsure, output the ticker code itself (e.g., "ABCD")
5. JVAN is NOT Joe Biden - it's J.D. Vance!

For each outcome, decode the ticker to get the real name.
Max 25 characters per label.

Return ONLY a JSON array of cleaned labels in the SAME ORDER:
["Name 1", "Name 2", ...]`;


    try {
        const message = await client.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
        });

        const content = message.content[0];
        if (content.type !== "text") {
            return outcomes;
        }

        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return outcomes;
        }

        const cleaned = JSON.parse(jsonMatch[0]) as string[];

        if (cleaned.length !== outcomes.length) {
            return outcomes;
        }

        // Cache the result
        cleaningCache.set(cacheKey, cleaned);
        return cleaned;
    } catch (error) {
        console.error(`[LLM Cleaner] Error cleaning "${eventTitle}":`, error);
        return outcomes;
    }
}

/**
 * Batch clean multiple events (with rate limiting)
 */
export async function batchCleanEvents(
    events: Array<{ title: string; outcomes: string[] }>
): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    for (const event of events) {
        const cleaned = await cleanOutcomeNamesWithLLM(event.title, event.outcomes);
        results.set(event.title, cleaned);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}
