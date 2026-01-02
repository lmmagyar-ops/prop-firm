/**
 * Kalshi Ticker-to-Name Dictionary
 * 
 * Static mapping of ticker suffixes to canonical candidate/outcome names.
 * This eliminates LLM hallucination risk by using deterministic lookups.
 * 
 * FORMAT: Ticker suffixes are typically First Initial + Last Name (3-4 letters)
 * e.g., JVAN = J.D. Vance, GNEW = Gavin Newsom
 * 
 * To update: Add new mappings as they appear in Kalshi markets.
 */

export const KALSHI_TICKER_DICTIONARY: Record<string, string> = {
    // === PRESIDENTIAL / POLITICAL FIGURES ===
    "JVAN": "J.D. Vance",
    "GNEWS": "Gavin Newsom",
    "GNEW": "Gavin Newsom",
    "DTRU": "Donald Trump",
    "DTRUJR": "Donald Trump Jr.",
    "KHAR": "Kamala Harris",
    "PBUT": "Pete Buttigieg",
    "RDES": "Ron DeSantis",
    "AOCA": "Alexandria Ocasio-Cortez",
    "MRUB": "Marco Rubio",
    "RFK": "Robert F. Kennedy Jr.",
    "JPRI": "J.B. Pritzker",
    "WMOO": "Wes Moore",
    "RGRE": "Ric Grenell",
    "ROBR": "Robert O'Brien",
    "MWAL": "Mike Waltz",
    "KHAS": "Kevin Hassett",

    // === FED CHAIR / CABINET CANDIDATES ===
    "KWAR": "Kevin Warsh",
    "KXWAR": "Kevin Warsh",
    "JPOW": "Jerome Powell",
    "JYEL": "Janet Yellen",
    "LSUM": "Larry Summers",
    "NKAS": "Neel Kashkari",
    "CMIL": "Christopher Miller",
    "TGAB": "Tulsi Gabbard",
    "GABB": "Tulsi Gabbard",
    "SBAN": "Stephen Bannon",
    "SBES": "Scott Bessent",
    "EMAC": "Elon Musk",
    "EMUS": "Elon Musk",

    // === CABINET / GOVERNMENT OFFICIALS ===
    "PBON": "Pam Bondi",
    "BPHI": "Brad Raffensperger",
    "LEVI": "David Levy",
    "DHAL": "Dan Halpern",
    "HLUT": "Howard Lutnick",
    "KSTA": "Kash Patel",
    "JCHU": "John Chu",
    "STEL": "Stephen Miller",
    "CWAL": "Chris Wallace",
    "DWAY": "Dwayne Johnson",
    "MBOW": "Mitch McConnell",
    "LLIN": "Linda McMahon",
    "PMIC": "Peter Navarro",

    // === POPES (PAPAL CONCLAVE) ===
    "PPIZ": "Cardinal Pizzardo",
    "PPAR": "Cardinal Parolin",
    "PERD": "Cardinal Erdo",
    "MZUP": "Cardinal Zuppi",
    "LANT": "Cardinal Lant",
    "FAMB": "Cardinal Ambongo",
    "AARB": "Cardinal Arborelius",
    "PTAG": "Cardinal Tagle",
    "COEL": "Cardinal O'Malley",
    "SBIB": "Stanislaw Dziwisz",

    // === CELEBRITIES / PUBLIC FIGURES ===
    "TAY": "Taylor Swift",
    "BEY": "Beyoncé",
    "DJT": "Donald Trump",
    "AJR": "A.J. Rose",
    "ELT": "Elton John",
    "WEE": "Weezer",

    // === ATHLETES / SPORTS ===
    "JBUT": "Jimmy Butler III",
    "SCUR": "Steph Curry",
    "DBOK": "Devin Booker",
    "DGRE": "Draymond Green",
    "KATO": "Karl-Anthony Towns",
    "VWEM": "Victor Wembanyama",

    // === COUNTRIES / ORGS ===
    "USA": "United States",
    "GER": "Germany",
    "FRA": "France",
    "ITA": "Italy",
    "SPA": "Spain",
    "AUS": "Australia",
    "NASA": "NASA",
    "IMF": "IMF",
    "WTO": "WTO",
    "IAEA": "IAEA",
    "OECD": "OECD",
    "EPA": "EPA",

    // === YES/NO / COMMON OUTCOMES ===
    "NONE": "None",
    "NNP": "No New Pope",
    "OTHER": "Other",

    // === ENERGY TYPES ===
    "SOLAR": "Solar",
    "WIND": "Wind",
    "NUCLEAR": "Nuclear",
    "COAL": "Coal",
    "GAS": "Natural Gas",
    "OIL": "Oil",
    "HYDROPOWER": "Hydropower",
    "BIOMASS": "Biomass",
    "BIOFUEL": "Biofuel",
    "RENEWABLE": "Renewable",
};

/**
 * Look up a ticker suffix to get the canonical name.
 * Returns the ticker itself if no mapping exists (fail-safe, no guessing).
 */
export function lookupTickerName(tickerSuffix: string): string {
    return KALSHI_TICKER_DICTIONARY[tickerSuffix.toUpperCase()] || tickerSuffix;
}

/**
 * Check if we have a known mapping for this ticker.
 */
export function hasTickerMapping(tickerSuffix: string): boolean {
    return tickerSuffix.toUpperCase() in KALSHI_TICKER_DICTIONARY;
}

/**
 * Get the ticker suffix from a full ticker string.
 * e.g., "KXPREZ2028-28-JVAN" → "JVAN"
 */
export function extractTickerSuffix(fullTicker: string): string {
    return fullTicker.split('-').pop() || fullTicker;
}
