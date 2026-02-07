/**
 * Market classification and text sanitization utilities.
 *
 * Extracted from ingestion.ts to reduce the worker's size and
 * make category logic independently testable.
 */

// ────────────────────────────────────────────────
// Text helpers
// ────────────────────────────────────────────────

/**
 * Fix known Polymarket API encoding issues (Mojibake).
 * The Polymarket Gamma API sometimes returns corrupted text,
 * e.g. "Supá Bowl" instead of "Super Bowl".
 */
export function sanitizeText(text: string): string {
    if (!text) return text;

    const ENCODING_FIXES: Record<string, string> = {
        'Supá': 'Super',
        'supá': 'super',
        'SUPÁ': 'SUPER',
    };

    let sanitized = text;
    for (const [corrupted, correct] of Object.entries(ENCODING_FIXES)) {
        sanitized = sanitized.replaceAll(corrupted, correct);
    }

    return sanitized;
}

/**
 * Clean up outcome names from raw API data.
 * - Removes leading articles (the, a, an)
 * - Capitalizes first letter
 * - Trims whitespace
 */
export function cleanOutcomeName(name: string): string {
    let cleaned = name.trim();
    cleaned = cleaned.replace(/^(the|a|an)\s+/i, '');

    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
}

/**
 * Check if market is short-term spam (e.g., 5-minute crypto bets).
 */
export function isSpamMarket(question: string): boolean {
    const q = question.toLowerCase();

    if (q.includes('super bowl') && q.includes('cancelled')) return true;

    if (q.includes('up or down') && (q.includes('am') || q.includes('pm') || q.includes('et'))) {
        return true;
    }

    if (q.endsWith('cancelled?') || q.startsWith('cancelled:')) return true;

    return false;
}

// ────────────────────────────────────────────────
// Category classifier
// ────────────────────────────────────────────────

interface CategoryOptions {
    createdAt?: string;
    volume24hr?: number;
    isHighVolume?: boolean;
}

/**
 * Word-boundary match helper — prevents false positives from substring matches
 * e.g. 'war' in 'Warriors', 'russia' in 'Borussia', 'xi' in 'exist', 'nato' in 'senator'
 */
function wordMatch(text: string, word: string): boolean {
    return new RegExp(`\\b${word}\\b`).test(text);
}

/**
 * Classify a market question into one or more categories.
 *
 * @param apiCategory - The original Polymarket/Kalshi category
 * @param question - The market question (title)
 * @param tags - Optional tags from the API
 * @param imageUrl - Event image URL (often contains sport identifiers)
 * @param options - Additional fields for Breaking/New detection
 */
export function getCategories(
    apiCategory: string | null,
    question: string,
    tags?: string[],
    imageUrl?: string,
    options?: CategoryOptions
): string[] {
    const categories: string[] = [];
    const q = question.toLowerCase();
    const tagsLower = (tags || []).filter(t => typeof t === 'string').map(t => t.toLowerCase());
    const imageLower = (imageUrl || '').toLowerCase();

    // === BREAKING DETECTION ===
    const breakingKeywords = [
        'just in', 'breaking', 'urgent', 'shock', 'announcement', 'declares',
        'dies', 'assassination', 'attack', 'crash', 'collapse', 'emergency'
    ];
    const hasBreakingKeyword = breakingKeywords.some(kw => q.includes(kw));
    const isBreaking = hasBreakingKeyword || options?.isHighVolume;

    if (isBreaking) {
        categories.push('Breaking');
    }

    // === NEW DETECTION ===
    if (options?.createdAt) {
        const createdDate = new Date(options.createdAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (createdDate > sevenDaysAgo) {
            categories.push('New');
        }
    }

    // Map Polymarket's native category first
    const categoryMap: Record<string, string> = {
        'US-current-affairs': 'Politics',
        'Crypto': 'Crypto',
        'Sports': 'Sports',
        'NBA Playoffs': 'Sports',
        'Olympics': 'Sports',
        'Business': 'Business',
        'Tech': 'Tech',
        'Science': 'Science',
        'Pop-Culture': 'Culture',
        'Pop-Culture ': 'Culture',
        'NFTs': 'Crypto',
        'Coronavirus': 'World',
    };

    if (apiCategory && categoryMap[apiCategory]) {
        categories.push(categoryMap[apiCategory]);
    }

    // SPORTS DETECTION
    const isEconomyMarket = (
        q.includes('fed') || q.includes('gdp') || q.includes('inflation') ||
        q.includes('rate cut') || q.includes('rate hike') || q.includes('recession') ||
        q.includes('stock') || q.includes('s&p') || q.includes('nasdaq') ||
        q.includes('bond') || q.includes('yield') || q.includes('cpi') ||
        q.includes('tariff') || q.includes('trade war') || q.includes('economic')
    );

    const sportsTags = ['nfl', 'nba', 'nhl', 'mlb', 'ncaa', 'ufc', 'mma', 'soccer', 'football',
        'basketball', 'hockey', 'tennis', 'golf', 'esports', 'epl', 'premier league',
        'la liga', 'bundesliga', 'serie a', 'champions league', 'sports'];
    const hasSportsTag = tagsLower.some(tag => sportsTags.some(st => tag.includes(st)));

    const sportsImagePatterns = ['/nfl', '/nba', '/nhl', '/mlb', '/ufc', '/soccer', '/sports', '/epl', '/premier'];
    const hasSportsImage = sportsImagePatterns.some(pattern => imageLower.includes(pattern));

    const hasSportsKeyword = (
        q.includes('nfl') || q.includes('nba') || q.includes('nhl') ||
        q.includes('mlb') || q.includes('ncaa') || q.includes('cfb') ||
        q.includes('cbb') || q.includes('ufc') || q.includes('mma') ||
        q.includes('super bowl') || q.includes('world cup') || q.includes('playoffs') ||
        q.includes('championship') || q.includes('world series') || q.includes('stanley cup') ||
        q.includes('champions league') || q.includes('ucl') || q.includes('mvp') ||
        q.includes('finals') || q.includes('tournament') ||
        q.includes('premier league') || q.includes('epl') || q.includes('la liga') ||
        q.includes('bundesliga') || q.includes('serie a') || q.includes('ligue 1') ||
        q.includes('fifa') || q.includes('soccer') ||
        // NFL Teams
        q.includes('bills') || q.includes('dolphins') || q.includes('patriots') || q.includes('jets') ||
        q.includes('ravens') || q.includes('bengals') || q.includes('browns') || q.includes('steelers') ||
        q.includes('broncos') || q.includes('chiefs') || q.includes('raiders') || q.includes('chargers') ||
        q.includes('cowboys') || q.includes('giants') || q.includes('eagles') || q.includes('commanders') ||
        q.includes('packers') || q.includes('vikings') || q.includes('49ers') || q.includes('seahawks') ||
        q.includes('texans') || q.includes('colts') || q.includes('titans') || q.includes('jaguars') ||
        q.includes('falcons') || q.includes('panthers') || q.includes('saints') || q.includes('buccaneers') ||
        q.includes('cardinals') || q.includes('rams') || q.includes('lions') || q.includes('bears') ||
        // NBA Teams (excluding ambiguous: nuggets, jazz, heat, thunder, suns, rockets)
        q.includes('lakers') || q.includes('celtics') || q.includes('warriors') || q.includes('knicks') ||
        q.includes('mavericks') || q.includes('bucks') || q.includes('76ers') || q.includes('clippers') ||
        q.includes('pelicans') || q.includes('spurs') ||
        // Player names
        q.includes('jokic') || q.includes('lebron') || q.includes('curry') || q.includes('mahomes') ||
        q.includes('kelce') || q.includes('giannis') || q.includes('shai') || q.includes('tatum') ||
        q.includes('patrick mahomes') || q.includes('josh allen') || q.includes('lamar jackson') ||
        // Game patterns
        (q.includes(' vs ') && (q.includes('win') || q.includes('beat') || q.includes('game')))
    );

    if (!isEconomyMarket && (hasSportsTag || hasSportsImage || hasSportsKeyword)) {
        if (!categories.includes('Sports')) categories.push('Sports');
    }

    // US Politics (domestic)
    if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
        q.includes('president') || q.includes('congress') || q.includes('senate') ||
        q.includes('democrat') || q.includes('republican') || q.includes('doge ') ||
        q.includes('musk') || q.includes('elon') || q.includes('cabinet')) {
        if (!categories.includes('Politics')) categories.push('Politics');
    }

    // Geopolitics (international)
    if (q.includes('putin') || q.includes('ukraine') || wordMatch(q, 'russia') ||
        q.includes('zelensky') || wordMatch(q, 'nato') || q.includes('israel') ||
        q.includes('netanyahu') || wordMatch(q, 'iran') || wordMatch(q, 'china') ||
        q.includes('xi jinping') || q.includes('ceasefire') || wordMatch(q, 'war') ||
        q.includes('nuclear') || q.includes('maduro') || q.includes('venezuela') ||
        q.includes('kim jong') || q.includes('north korea') || q.includes('sanctions')) {
        if (!categories.includes('Geopolitics')) categories.push('Geopolitics');
    }

    // Crypto
    if (q.includes('bitcoin') || q.includes('btc') || q.includes('ethereum') ||
        q.includes('eth') || q.includes('crypto') || q.includes('solana') ||
        q.includes('xrp') || q.includes('tether') || q.includes('usdt')) {
        if (!categories.includes('Crypto')) categories.push('Crypto');
    }

    // Business/Finance
    if (q.includes('fed') || q.includes('recession') || q.includes('gdp') ||
        q.includes('stock') || q.includes('ceo') || q.includes('market cap') ||
        q.includes('ipo') || q.includes('earnings') || q.includes('s&p') ||
        q.includes('nasdaq') || q.includes('dow')) {
        if (!categories.includes('Business')) categories.push('Business');
    }

    // Tech
    if (wordMatch(q, 'ai') || q.includes('openai') || q.includes('chatgpt') ||
        q.includes('google') || q.includes('apple') || q.includes('microsoft') ||
        q.includes('spacex') || q.includes('nvidia') || q.includes('tesla') ||
        wordMatch(q, 'meta') || q.includes('amazon')) {
        if (!categories.includes('Tech')) categories.push('Tech');
    }

    // Culture (Entertainment, Pop Culture)
    if (q.includes('movie') || q.includes('oscar') || q.includes('grammy') ||
        q.includes('emmy') || q.includes('marvel') || q.includes('disney') ||
        q.includes('netflix') || q.includes('stranger things') || q.includes('kardashian') ||
        q.includes('celebrity') || q.includes('epstein') || q.includes('youtube') ||
        q.includes('tiktok') || q.includes('logan paul') || q.includes('mr beast') ||
        q.includes('avatar') || q.includes('star wars') || q.includes('album')) {
        if (!categories.includes('Culture')) categories.push('Culture');
    }

    // Default
    if (categories.length === 0) {
        categories.push('Other');
    }

    return categories;
}
