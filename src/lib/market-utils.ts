
/**
 * Extract clean outcome name from market question/title
 * 
 * Kalshi markets often have patterns like:
 * - "Pam Bondi be the first person to leave the Trump Cabinet" → "Pam Bondi"
 * - "Above 2.85" → "Above 2.85"
 * - "Will Trump nominate Kevin Warsh as the next Fed chair?" → "Kevin Warsh"
 * - "Trump" → "Trump"
 * - "government spending decrease by 250" → "$250B"
 * - "the President sign more than 800 Executive Orders" → "800+"
 */
export function getCleanOutcomeName(question: string, eventTitle?: string): string {
    let cleaned = question.trim();

    // === NUMERIC RANGE PATTERNS (handle first for spending/quantity markets) ===

    // Pattern N1: "government spending decrease by 250" → "$250B"
    const spendingMatch = cleaned.match(/(?:government )?spending (?:decrease|increase|cut) by (\d+)/i);
    if (spendingMatch) {
        return `$${spendingMatch[1]}B`;
    }

    // Pattern N2: "more than X [items]" or "fewer than X [items]" → "X+" or "<X"
    const moreFewerMatch = cleaned.match(/(?:more|greater) than (\d+)/i);
    if (moreFewerMatch) {
        return `${moreFewerMatch[1]}+`;
    }
    const fewerMatch = cleaned.match(/(?:fewer|less) than (\d+)/i);
    if (fewerMatch) {
        return `<${fewerMatch[1]}`;
    }

    // Pattern N3: "X to Y [units]" ranges → "X-Y"
    const rangeMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
        return `${rangeMatch[1]}-${rangeMatch[2]}`;
    }

    // Pattern N4: "Above X" or "Below X" → keep as-is (already clean)
    const aboveBelowMatch = cleaned.match(/^(Above|Below|Over|Under)\s+(\d+(?:\.\d+)?)/i);
    if (aboveBelowMatch) {
        return `${aboveBelowMatch[1]} ${aboveBelowMatch[2]}`;
    }

    // Pattern N5: "X or more" or "X or fewer" → "X+" or "≤X"
    const orMoreMatch = cleaned.match(/(\d+)\s+or more/i);
    if (orMoreMatch) {
        return `${orMoreMatch[1]}+`;
    }
    const orFewerMatch = cleaned.match(/(\d+)\s+or fewer/i);
    if (orFewerMatch) {
        return `≤${orFewerMatch[1]}`;
    }

    // Pattern N6: Sentence ending in "by X" where X is a number → "$XB" (for spending markets)
    const byAmountMatch = cleaned.match(/by (\d{3,})$/i);
    if (byAmountMatch && eventTitle?.toLowerCase().includes('spending')) {
        return `$${byAmountMatch[1]}B`;
    }

    // === POLITICAL NAME PATTERNS ===

    // Pattern 1: "Will [Name] be the first person to leave..." → extract Name
    const cabinetMatch = cleaned.match(/^(?:Will\s+)?(.+?)\s+be the first (person|to leave)/i);
    if (cabinetMatch) {
        return cabinetMatch[1].trim();
    }

    // Pattern 2: "[Name] win the next presidential election" → extract Name
    // Also handles "Will [Name] win..."
    const electionMatch = cleaned.match(/^(?:Will\s+)?(.+?)\s+win the (next )?presidential/i);
    if (electionMatch) {
        return electionMatch[1].trim();
    }

    // Pattern 3: "Trump nominate [Name] as Fed chair" → extract Name
    // Handles: "Will Trump nominate X as the next Fed chair?" and "Trump next nominate X as Fed Chair"
    const fedMatch = cleaned.match(/(?:Will )?Trump (?:next )?nominate (.+?) as (?:the next )?Fed [Cc]hair/i);
    if (fedMatch) {
        return fedMatch[1].trim();
    }

    // Filler words that should never be extracted as outcome names
    // e.g., "Will there be no change..." should NOT return "there"
    const FILLER_WORDS = ['there', 'it', 'they', 'this', 'that', 'the'];

    // Pattern 4: "Will [Name] be..." → extract Name
    const willBeMatch = cleaned.match(/^Will (.+?) be/i);
    if (willBeMatch) {
        const extracted = willBeMatch[1].trim();
        if (!FILLER_WORDS.includes(extracted.toLowerCase())) {
            return extracted;
        }
    }

    // Pattern 5: General extraction for "[Subject] [verb] [rest of question]"
    // This catches patterns like "Kevin Hassett be nominated", "Republican win", etc.
    // Look for a name/subject before common verbs
    const generalMatch = cleaned.match(/^(?:Will |Trump next |Trump )?(.+?)\s+(?:be|win|get|receive|become|leave|nominate|invoke|impose|release|take)/i);
    if (generalMatch) {
        const extracted = generalMatch[1].trim();
        // Only use if it's reasonably short (likely a name, not a full clause)
        if (extracted.length < 50 && !extracted.includes(' the ') && !extracted.includes(' a ') && !FILLER_WORDS.includes(extracted.toLowerCase())) {
            return extracted;
        }
    }

    // Pattern 6: Already clean (e.g., "Above 2.85", candidate names)
    // Just strip trailing question marks
    if (cleaned.endsWith("?")) {
        cleaned = cleaned.slice(0, -1);
    }

    // If question equals event title, we can't extract anything useful
    if (eventTitle && cleaned.toLowerCase() === eventTitle.toLowerCase()) {
        return cleaned;
    }

    return cleaned;
}


/**
 * Returns true if a market question references a named date that is more than
 * 48 hours in the past. Used to prune stale threshold sub-markets from the
 * event list (e.g., "Will Bitcoin be above $60,000 on January 5?").
 *
 * Accepts `now` as a parameter for deterministic testing.
 *
 * Rule: filter when named date < (now - 48h).
 * - 48h (not 24h) because `new Date("February 22 2026")` parses as midnight
 *   local time, which in UTC can appear to be "yesterday" by early morning ET.
 * - Do NOT use setHours() — timezone-dependent and causes off-by-one bugs.
 */
export function isStaleMarketQuestion(question: string, now: Date = new Date()): boolean {
    const q = question.toLowerCase();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Check for date range patterns like "January 5-11" or "January 5-11?"
    const rangePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})-(\d{1,2})/i;
    const rangeMatch = q.match(rangePattern);
    if (rangeMatch) {
        const month = rangeMatch[1];
        const endDay = parseInt(rangeMatch[3], 10);
        const parsedDate = new Date(`${month} ${endDay} ${now.getFullYear()}`);
        if (!isNaN(parsedDate.getTime()) && parsedDate < twoDaysAgo) return true;
    }

    // Check for single date patterns like "January 12" or "January 12?"
    const singlePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\?|$|\s)/i;
    const singleMatch = q.match(singlePattern);
    if (singleMatch && !rangeMatch) {
        const month = singleMatch[1];
        const day = parseInt(singleMatch[2], 10);
        const parsedDate = new Date(`${month} ${day} ${now.getFullYear()}`);
        if (!isNaN(parsedDate.getTime()) && parsedDate < twoDaysAgo) return true;
    }

    return false;
}
