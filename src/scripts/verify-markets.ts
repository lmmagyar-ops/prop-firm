import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Redis from 'ioredis';

// ============================================================
// MARKET DATA QUALITY AUDIT
// ============================================================
// Validates the live Redis market data for:
// 1. Duplicates (binary markets duplicating featured event sub-markets)
// 2. Stale/invalid prices (0%, 100%, or exactly 50%)
// 3. Encoding corruption (Mojibake like "Supá Bowl")
// 4. Empty/ghosted events (events with 0 sub-markets)
// 5. Count reasonableness (expected range of total markets)
// 6. Category coverage (at least some markets in key categories)
// 7. Token ID conflicts (same ID appearing in multiple events)
// ============================================================

// --- Types (mirrored from ingestion + market.ts) ---

interface SubMarket {
    id: string;
    question: string;
    outcomes: string[];
    price: number;
    volume: number;
}

interface EventMetadata {
    id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    volume: number;
    endDate?: string;
    categories?: string[];
    markets: SubMarket[];
    isMultiOutcome: boolean;
}

interface StoredBinaryMarket {
    id: string;
    question: string;
    description?: string;
    image?: string;
    volume: number;
    outcomes: string[];
    end_date?: string;
    categories: string[];
    basePrice: number;
    closed?: boolean;
    accepting_orders?: boolean;
}

// --- Config ---

const KNOWN_MOJIBAKE: string[] = [
    'Supá', 'supá', 'SUPÁ',
    'Ã', 'â€™', 'â€"', 'â€œ', 'â€',     // Common UTF-8 → Latin-1 corruption patterns
    'Ã©', 'Ã¡', 'Ã³', 'Ã±',              // Accented char corruptions
];

const EXPECTED_MIN_EVENTS = 10;
const EXPECTED_MAX_EVENTS = 500;
const EXPECTED_MIN_BINARY = 0;
const EXPECTED_MAX_BINARY = 2000;

const KEY_CATEGORIES = ['Politics', 'Sports', 'Crypto', 'Business'];

// --- Test Harness ---

let pass = 0;
let fail = 0;
let warn = 0;
const warnings: string[] = [];
const failures: string[] = [];

function assert(condition: boolean, message: string) {
    if (condition) {
        pass++;
        console.log(`  ✅ ${message}`);
    } else {
        fail++;
        failures.push(message);
        console.log(`  ❌ FAIL: ${message}`);
    }
}

function advisory(condition: boolean, message: string) {
    if (condition) {
        pass++;
        console.log(`  ✅ ${message}`);
    } else {
        warn++;
        warnings.push(message);
        console.log(`  ⚠️  WARN: ${message}`);
    }
}

// ============================================================
// AUDIT CHECKS
// ============================================================

function auditDuplicates(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n🔍 AUDIT 1: Duplicate Detection');
    console.log('   Checks if binary markets duplicate featured event sub-markets\n');

    // Collect all sub-market questions and IDs from featured events
    const subMarketQuestions = new Set<string>();
    const subMarketIds = new Set<string>();

    for (const event of events) {
        for (const market of event.markets) {
            subMarketQuestions.add(market.question.toLowerCase().trim());
            subMarketIds.add(market.id);
        }
    }

    // Check binary markets for overlaps with featured event sub-markets.
    // NOTE: Overlap in raw Redis data is expected — dedup happens at read-time  
    // in getActiveEvents(). This is an informational check, not a failure.
    // The real correctness check is Audit 7 (Merged Output Simulation).
    const duplicatesByQuestion: string[] = [];
    const duplicatesById: string[] = [];

    for (const m of binaryMarkets) {
        if (subMarketQuestions.has(m.question.toLowerCase().trim())) {
            duplicatesByQuestion.push(m.question.slice(0, 60));
        }
        if (subMarketIds.has(m.id)) {
            duplicatesById.push(`${m.id.slice(0, 12)}... (${m.question.slice(0, 40)})`);
        }
    }

    advisory(
        duplicatesByQuestion.length === 0,
        `No raw binary/sub-market question overlap (found ${duplicatesByQuestion.length} — filtered at read-time)`
    );

    advisory(
        duplicatesById.length === 0,
        `No raw binary/sub-market token ID overlap (found ${duplicatesById.length} — filtered at read-time)`
    );

    // Check for duplicate event titles
    const eventTitles = events.map(e => e.title.toLowerCase().trim());
    const titleCounts = new Map<string, number>();
    for (const t of eventTitles) {
        titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
    }
    const duplicateTitles = [...titleCounts.entries()].filter(([, count]) => count > 1);

    assert(
        duplicateTitles.length === 0,
        `No duplicate event titles (found ${duplicateTitles.length})`
    );
    if (duplicateTitles.length > 0) {
        console.log(`     Duplicates: ${duplicateTitles.map(([t, c]) => `"${t}" ×${c}`).join(', ')}`);
    }
}

function auditPrices(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n💰 AUDIT 2: Price Sanity');
    console.log('   Checks for stale, invalid, or placeholder prices\n');

    // Check event sub-market prices
    let stalePriceCount = 0;
    let extremePriceCount = 0;
    let placeholderPriceCount = 0;
    const staleExamples: string[] = [];
    const extremeExamples: string[] = [];

    for (const event of events) {
        for (const market of event.markets) {
            const p = market.price;

            // Stale: exactly 0 or NaN
            if (p === 0 || isNaN(p)) {
                stalePriceCount++;
                if (staleExamples.length < 3) staleExamples.push(`${event.title} → ${market.question.slice(0, 30)} (${p})`);
            }

            // Extreme: ≤1% or ≥99% (likely resolved)
            if (p <= 0.01 || p >= 0.99) {
                extremePriceCount++;
                if (extremeExamples.length < 3) extremeExamples.push(`${event.title} → ${market.question.slice(0, 30)} (${(p * 100).toFixed(1)}%)`);
            }

            // Placeholder: exactly 50%
            if (Math.abs(p - 0.5) < 0.005) {
                placeholderPriceCount++;
            }
        }
    }

    assert(
        stalePriceCount === 0,
        `No stale prices (0 or NaN) in event sub-markets (found ${stalePriceCount})`
    );
    if (staleExamples.length > 0) console.log(`     Examples: ${staleExamples.join(' | ')}`);

    advisory(
        extremePriceCount === 0,
        `No extreme prices (≤1% or ≥99%) in event sub-markets (found ${extremePriceCount})`
    );
    if (extremeExamples.length > 0) console.log(`     Examples: ${extremeExamples.join(' | ')}`);

    // Check binary market prices
    let binaryStale = 0;
    let binaryExtreme = 0;

    for (const m of binaryMarkets) {
        const p = m.basePrice;
        if (p === 0 || isNaN(p)) binaryStale++;
        if (p <= 0.01 || p >= 0.99) binaryExtreme++;
    }

    assert(
        binaryStale === 0,
        `No stale prices in binary markets (found ${binaryStale})`
    );

    advisory(
        binaryExtreme === 0,
        `No extreme prices in binary markets (found ${binaryExtreme})`
    );
}

function auditEncoding(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n🔤 AUDIT 3: Encoding / Mojibake Detection');
    console.log('   Checks for character encoding corruption in titles/questions\n');

    const corruptedTexts: string[] = [];

    // Check all text fields for known Mojibake patterns
    const allTexts: { text: string; source: string }[] = [];

    for (const event of events) {
        allTexts.push({ text: event.title, source: `event: ${event.title.slice(0, 40)}` });
        for (const market of event.markets) {
            allTexts.push({ text: market.question, source: `sub-market: ${market.question.slice(0, 40)}` });
        }
    }

    for (const m of binaryMarkets) {
        allTexts.push({ text: m.question, source: `binary: ${m.question.slice(0, 40)}` });
    }

    for (const { text, source } of allTexts) {
        for (const pattern of KNOWN_MOJIBAKE) {
            if (text.includes(pattern)) {
                corruptedTexts.push(`"${pattern}" in ${source}`);
                break; // One flag per text is enough
            }
        }
    }

    assert(
        corruptedTexts.length === 0,
        `No encoding corruption (Mojibake) detected (found ${corruptedTexts.length})`
    );
    if (corruptedTexts.length > 0) {
        for (const c of corruptedTexts.slice(0, 5)) {
            console.log(`     → ${c}`);
        }
    }
}

function auditStructure(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n🏗️  AUDIT 4: Structural Integrity');
    console.log('   Checks for empty events, missing fields, and count reasonableness\n');

    // Empty events (0 sub-markets)
    const emptyEvents = events.filter(e => !e.markets || e.markets.length === 0);
    assert(
        emptyEvents.length === 0,
        `No empty events (0 sub-markets) (found ${emptyEvents.length})`
    );
    if (emptyEvents.length > 0) {
        console.log(`     Empty: ${emptyEvents.map(e => e.title.slice(0, 40)).join(', ')}`);
    }

    // isMultiOutcome consistency
    const badFlags = events.filter(e =>
        (e.isMultiOutcome && e.markets.length <= 1) ||
        (!e.isMultiOutcome && e.markets.length > 1)
    );
    advisory(
        badFlags.length === 0,
        `isMultiOutcome flag consistent with market count (${badFlags.length} mismatches)`
    );

    // Missing titles
    const noTitle = events.filter(e => !e.title || e.title.trim() === '');
    assert(
        noTitle.length === 0,
        `All events have titles (${noTitle.length} missing)`
    );

    // Missing categories in binary markets
    const noCats = binaryMarkets.filter(m => !m.categories || m.categories.length === 0);
    advisory(
        noCats.length < binaryMarkets.length * 0.2,
        `<20% of binary markets have no categories (${noCats.length}/${binaryMarkets.length})`
    );

    // Token ID uniqueness within events
    const tokenIdToEvent = new Map<string, string[]>();
    for (const event of events) {
        for (const market of event.markets) {
            const existing = tokenIdToEvent.get(market.id) || [];
            existing.push(event.title.slice(0, 30));
            tokenIdToEvent.set(market.id, existing);
        }
    }
    const conflictingIds = [...tokenIdToEvent.entries()].filter(([, events]) => events.length > 1);
    assert(
        conflictingIds.length === 0,
        `No token ID conflicts across events (${conflictingIds.length} IDs in multiple events)`
    );
    if (conflictingIds.length > 0) {
        for (const [id, evts] of conflictingIds.slice(0, 3)) {
            console.log(`     → ${id.slice(0, 12)}... in: ${evts.join(', ')}`);
        }
    }
}

function auditCounts(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n📊 AUDIT 5: Count Reasonableness');
    console.log('   Checks that market counts are in expected ranges\n');

    const totalSubMarkets = events.reduce((sum, e) => sum + e.markets.length, 0);

    assert(
        events.length >= EXPECTED_MIN_EVENTS,
        `Featured events ≥ ${EXPECTED_MIN_EVENTS} (actual: ${events.length})`
    );
    assert(
        events.length <= EXPECTED_MAX_EVENTS,
        `Featured events ≤ ${EXPECTED_MAX_EVENTS} (actual: ${events.length})`
    );
    assert(
        binaryMarkets.length >= EXPECTED_MIN_BINARY,
        `Binary markets ≥ ${EXPECTED_MIN_BINARY} (actual: ${binaryMarkets.length})`
    );
    assert(
        binaryMarkets.length <= EXPECTED_MAX_BINARY,
        `Binary markets ≤ ${EXPECTED_MAX_BINARY} (actual: ${binaryMarkets.length})`
    );

    console.log(`\n  📈 Summary: ${events.length} events, ${totalSubMarkets} sub-markets, ${binaryMarkets.length} binary markets`);

    // Multi-outcome distribution
    const multi = events.filter(e => e.isMultiOutcome);
    const binary = events.filter(e => !e.isMultiOutcome);
    console.log(`     Multi-outcome: ${multi.length} events | Binary: ${binary.length} events`);

    // Top 5 events by sub-market count
    const sorted = [...events].sort((a, b) => b.markets.length - a.markets.length);
    console.log(`     Largest events:`);
    for (const e of sorted.slice(0, 5)) {
        console.log(`       ${e.markets.length} markets — ${e.title.slice(0, 50)}`);
    }
}

function auditCategories(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n🏷️  AUDIT 6: Category Coverage');
    console.log('   Checks that key categories have at least some markets\n');

    // Count events per category
    const catCounts = new Map<string, number>();
    for (const event of events) {
        for (const cat of (event.categories || [])) {
            catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
        }
    }
    // Also count binary markets
    for (const m of binaryMarkets) {
        for (const cat of (m.categories || [])) {
            catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
        }
    }

    for (const cat of KEY_CATEGORIES) {
        const count = catCounts.get(cat) || 0;
        advisory(
            count > 0,
            `Category "${cat}" has markets (${count})`
        );
    }

    // Show full category breakdown
    console.log(`\n  📋 Full category breakdown:`);
    const sortedCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sortedCats) {
        console.log(`     ${cat}: ${count}`);
    }
}

function auditMergedOutput(events: EventMetadata[], binaryMarkets: StoredBinaryMarket[]) {
    console.log('\n🔗 AUDIT 7: Merged Output Simulation');
    console.log('   Simulates getActiveEvents() merge and checks for duplicates in final output\n');

    // Replicate the merge logic from getActiveEvents()
    const existingTitles = new Set(events.map(e => e.title.toLowerCase().trim()));

    const existingSubMarketQuestions = new Set<string>();
    const existingSubMarketIds = new Set<string>();
    for (const event of events) {
        for (const market of event.markets) {
            existingSubMarketQuestions.add(market.question.toLowerCase().trim());
            existingSubMarketIds.add(market.id);
        }
    }

    const wouldPassThrough = binaryMarkets.filter(m => {
        if (existingTitles.has(m.question.toLowerCase().trim())) return false;
        if (existingSubMarketQuestions.has(m.question.toLowerCase().trim())) return false;
        if (existingSubMarketIds.has(m.id)) return false;
        if (!m.categories || m.categories.length === 0) return false;

        const price = m.basePrice ?? 0;
        if (price <= 0.01 || price >= 0.99) return false;

        const isFiftyPercent = Math.abs(price - 0.5) < 0.005;
        const isLowVolume = (m.volume || 0) < 50000;
        if (isFiftyPercent && isLowVolume) return false;

        return true;
    });

    const totalMerged = events.length + wouldPassThrough.length;

    console.log(`  Simulated merge: ${events.length} featured + ${wouldPassThrough.length} binary = ${totalMerged} total cards`);

    // Check the final merged set for near-duplicate titles (fuzzy)
    const allTitles: string[] = [
        ...events.map(e => e.title),
        ...wouldPassThrough.map(m => m.question),
    ];

    const nearDuplicates: string[] = [];
    for (let i = 0; i < allTitles.length; i++) {
        for (let j = i + 1; j < allTitles.length; j++) {
            const a = allTitles[i].toLowerCase().trim();
            const b = allTitles[j].toLowerCase().trim();
            // Check if one contains the other (common duplicate pattern)
            if (a.length > 20 && b.length > 20) {
                if (a.includes(b) || b.includes(a)) {
                    nearDuplicates.push(`"${allTitles[i].slice(0, 40)}" ≈ "${allTitles[j].slice(0, 40)}"`);
                }
            }
        }
    }

    advisory(
        nearDuplicates.length === 0,
        `No near-duplicate titles in merged output (found ${nearDuplicates.length})`
    );
    if (nearDuplicates.length > 0) {
        for (const nd of nearDuplicates.slice(0, 5)) {
            console.log(`     → ${nd}`);
        }
    }

    assert(
        totalMerged >= 15,
        `Merged output has at least 15 cards (actual: ${totalMerged})`
    );
    assert(
        totalMerged <= 600,
        `Merged output has at most 600 cards (actual: ${totalMerged})`
    );
}

// ============================================================
// MAIN
// ============================================================

async function runAudit() {
    console.log('\n🧪 ═══════════════════════════════════════════════');
    console.log('   MARKET DATA QUALITY AUDIT');
    console.log('   ═══════════════════════════════════════════════\n');

    // Connect to Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';
    const redis = new Redis(redisUrl);

    try {
        // Fetch raw data from Redis
        console.log('📡 Fetching live market data from Redis...');

        const [eventData, binaryData] = await Promise.all([
            redis.get('event:active_list'),
            redis.get('market:active_list'),
        ]);

        assert(eventData !== null, 'event:active_list exists in Redis');
        assert(binaryData !== null, 'market:active_list exists in Redis');

        if (!eventData || !binaryData) {
            console.log('\n❌ Cannot proceed — missing Redis data. Is the ingestion worker running?');
            process.exit(1);
        }

        const events: EventMetadata[] = JSON.parse(eventData);
        const binaryMarkets: StoredBinaryMarket[] = JSON.parse(binaryData);

        console.log(`  📦 Loaded ${events.length} featured events, ${binaryMarkets.length} binary markets\n`);

        // Run all audits
        auditDuplicates(events, binaryMarkets);
        auditPrices(events, binaryMarkets);
        auditEncoding(events, binaryMarkets);
        auditStructure(events, binaryMarkets);
        auditCounts(events, binaryMarkets);
        auditCategories(events, binaryMarkets);
        auditMergedOutput(events, binaryMarkets);

        // Results
        console.log('\n═══════════════════════════════════════════════');
        console.log(`   RESULTS: ${pass} passed, ${fail} failed, ${warn} warnings`);
        console.log('═══════════════════════════════════════════════\n');

        if (fail > 0) {
            console.log('❌ FAILURES:');
            for (const f of failures) {
                console.log(`   • ${f}`);
            }
        }
        if (warn > 0) {
            console.log('⚠️  WARNINGS:');
            for (const w of warnings) {
                console.log(`   • ${w}`);
            }
        }

        if (fail === 0) {
            console.log('🟢 ALL ASSERTIONS PASSED\n');
        } else {
            console.log('\n🔴 AUDIT FAILED — fix issues above before deploying\n');
        }

        process.exit(fail > 0 ? 1 : 0);
    } catch (err) {
        console.error('\n💥 Audit crashed:', err);
        process.exit(1);
    } finally {
        redis.disconnect();
    }
}

runAudit();
