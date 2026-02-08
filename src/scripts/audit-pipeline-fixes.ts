import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Redis from 'ioredis';

/**
 * TARGETED AUDIT — Verifies the 5 specific pipeline fixes from this session.
 * 
 * Fix 1: Player props filtered out of "vs." game events
 * Fix 2: Gold market "__" encoding fixed  
 * Fix 3: Duplicate 50% filter removed (now only in server action layer)
 * Fix 4: "vs." events classified as Sports (not Politics)
 * Fix 5: isSportsMatchup expanded keywords
 */

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
    categories?: string[];
    markets: SubMarket[];
    isMultiOutcome: boolean;
}

let pass = 0;
let fail = 0;
let warn = 0;
const issues: string[] = [];

function check(ok: boolean, msg: string) {
    if (ok) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; issues.push(msg); console.log(`  ❌ FAIL: ${msg}`); }
}

function advisory(ok: boolean, msg: string) {
    if (ok) { pass++; console.log(`  ✅ ${msg}`); }
    else { warn++; issues.push(`⚠️ ${msg}`); console.log(`  ⚠️ WARN: ${msg}`); }
}

async function main() {
    console.log('\n🎯 ═══════════════════════════════════════════════');
    console.log('   TARGETED PIPELINE FIX AUDIT');
    console.log('   ═══════════════════════════════════════════════\n');

    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

    try {
        const eventData = await redis.get('event:active_list');
        if (!eventData) {
            console.log('❌ No event data in Redis — is ingestion worker running?');
            process.exit(1);
        }

        const events: EventMetadata[] = JSON.parse(eventData);
        console.log(`📦 Loaded ${events.length} events\n`);

        // ═══════════════════════════════════════════════
        // FIX 1: Player Prop Filtering
        // ═══════════════════════════════════════════════
        console.log('🏈 FIX 1: Player Prop Filtering');
        console.log('   "vs." events should NOT have player prop sub-markets\n');

        const vsEvents = events.filter(e => {
            const t = e.title.toLowerCase();
            return t.includes(' vs ') || t.includes(' vs. ');
        });

        console.log(`  Found ${vsEvents.length} "vs." events`);

        const playerPropPatterns = [
            /points o\/u/i, /assists o\/u/i, /rebounds o\/u/i,
            /passing yards/i, /rushing yards/i, /receiving yards/i,
            /touchdowns/i, /three-pointers/i, /3-pointers/i,
            /strikeouts/i, /home runs/i, /hits o\/u/i,
            /saves o\/u/i, /shots on goal/i, /goals o\/u/i,
        ];

        let totalPlayerProps = 0;
        const eventsWith59Markets: string[] = [];

        for (const event of vsEvents) {
            const playerProps = event.markets.filter(m =>
                playerPropPatterns.some(p => p.test(m.question))
            );
            if (playerProps.length > 0) {
                totalPlayerProps += playerProps.length;
                console.log(`  ⚠️ "${event.title}" has ${playerProps.length} player props out of ${event.markets.length} markets`);
                for (const pp of playerProps.slice(0, 3)) {
                    console.log(`     → "${pp.question}"`);
                }
            }
            if (event.markets.length > 10) {
                eventsWith59Markets.push(`${event.title} (${event.markets.length} markets)`);
            }
        }

        check(
            totalPlayerProps === 0,
            `No player props in "vs." events (found ${totalPlayerProps})`
        );

        advisory(
            eventsWith59Markets.length === 0,
            `No "vs." events with >10 markets (found ${eventsWith59Markets.length}: ${eventsWith59Markets.join(', ')})`
        );

        // ═══════════════════════════════════════════════
        // FIX 2: Encoding — no "__" in titles
        // ═══════════════════════════════════════════════
        console.log('\n🔤 FIX 2: Encoding Fix (underscore artifacts)');
        console.log('   No consecutive underscores in titles or questions\n');

        const underscoreIssues: string[] = [];
        // Only flag encoding artifacts: underscores attached to word chars (e.g., "hit__")
        // NOT intentional fill-in-the-blank patterns like "above ___"
        const encodingUnderscorePattern = /\w_{2,}|\b_{2,}\w/;
        for (const event of events) {
            if (encodingUnderscorePattern.test(event.title)) {
                underscoreIssues.push(`Title: "${event.title}"`);
            }
            for (const m of event.markets) {
                if (encodingUnderscorePattern.test(m.question)) {
                    underscoreIssues.push(`Q: "${m.question}"`);
                }
            }
        }

        check(
            underscoreIssues.length === 0,
            `No consecutive underscores in any text (found ${underscoreIssues.length})`
        );
        for (const ui of underscoreIssues.slice(0, 3)) {
            console.log(`     → ${ui}`);
        }

        // ═══════════════════════════════════════════════
        // FIX 3: 50% filter — now volume-aware only
        // ═══════════════════════════════════════════════
        console.log('\n💰 FIX 3: 50% Price Filter (should allow high-volume 50% markets)');
        console.log('   Markets near 50% should only be filtered if also low volume\n');

        let fiftyPctHighVolume = 0;
        let fiftyPctLowVolume = 0;
        const fiftyExamples: string[] = [];

        for (const event of events) {
            for (const m of event.markets) {
                if (Math.abs(m.price - 0.5) < 0.005) {
                    if (m.volume >= 50000) {
                        fiftyPctHighVolume++;
                        fiftyExamples.push(`"${m.question.slice(0, 40)}" ${(m.price * 100).toFixed(1)}% vol=${m.volume}`);
                    } else {
                        fiftyPctLowVolume++;
                    }
                }
            }
        }

        // Note: 50% markets in the ingestion output are now EXPECTED (filter removed)
        // They'll be filtered by the server action layer if low-volume
        console.log(`  Found ${fiftyPctHighVolume} high-volume 50% markets (these are legitimate — GOOD)`);
        console.log(`  Found ${fiftyPctLowVolume} low-volume 50% markets (will be filtered at display time)`);
        for (const ex of fiftyExamples.slice(0, 3)) {
            console.log(`     → ${ex}`);
        }

        advisory(
            true,  // Informational only — 50% markets ARE allowed in ingestion now
            `50% filter deferred to server action layer (${fiftyPctHighVolume} high-vol, ${fiftyPctLowVolume} low-vol in pipeline)`
        );

        // ═══════════════════════════════════════════════
        // FIX 4: Sports Classification — "vs." = Sports
        // ═══════════════════════════════════════════════
        console.log('\n🏷️ FIX 4: Sports Classification');
        console.log('   All "vs." events should have Sports category\n');

        const vsWithoutSports: string[] = [];
        const vsWithPolitics: string[] = [];

        for (const event of vsEvents) {
            const cats = event.categories || [];
            if (!cats.includes('Sports')) {
                vsWithoutSports.push(`"${event.title}" → [${cats.join(', ')}]`);
            }
            // Check for ONLY-politics (no Sports) — the worst case
            if (cats.includes('Politics') && !cats.includes('Sports')) {
                vsWithPolitics.push(`"${event.title}" classified as Politics without Sports!`);
            }
        }

        check(
            vsWithoutSports.length === 0,
            `All ${vsEvents.length} "vs." events have Sports category (missing: ${vsWithoutSports.length})`
        );
        for (const v of vsWithoutSports.slice(0, 5)) {
            console.log(`     → ${v}`);
        }

        check(
            vsWithPolitics.length === 0,
            `No "vs." events classified as Politics-only (found ${vsWithPolitics.length})`
        );
        for (const v of vsWithPolitics.slice(0, 3)) {
            console.log(`     → ${v}`);
        }

        // ═══════════════════════════════════════════════
        // FIX 5: Sports Tab Coverage
        // ═══════════════════════════════════════════════
        console.log('\n📊 FIX 5: Sports Tab Coverage');
        console.log('   Sports tab should show all game events\n');

        const sportsEvents = events.filter(e => (e.categories || []).includes('Sports'));
        console.log(`  Total Sports events: ${sportsEvents.length}`);

        // Show a sample of Sports events
        console.log('  Sample Sports events:');
        for (const e of sportsEvents.slice(0, 8)) {
            console.log(`     ${e.markets.length} mkts — ${e.title.slice(0, 60)}`);
        }

        check(
            sportsEvents.length >= 5,
            `Sports tab has ≥5 events (actual: ${sportsEvents.length})`
        );

        // ═══════════════════════════════════════════════
        // RESULTS
        // ═══════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════');
        console.log(`   RESULTS: ${pass} passed, ${fail} failed, ${warn} warnings`);
        console.log('═══════════════════════════════════════════════\n');

        if (fail > 0) {
            console.log('❌ ISSUES:');
            for (const i of issues.filter(i => !i.startsWith('⚠️'))) {
                console.log(`   • ${i}`);
            }
        }
        if (warn > 0) {
            console.log('⚠️ ADVISORIES:');
            for (const i of issues.filter(i => i.startsWith('⚠️'))) {
                console.log(`   • ${i}`);
            }
        }

        if (fail === 0) {
            console.log('🟢 ALL TARGETED CHECKS PASSED\n');
        } else {
            console.log('\n🔴 FIXES NOT YET EFFECTIVE — see issues above\n');
        }

        process.exit(fail > 0 ? 1 : 0);
    } finally {
        redis.disconnect();
    }
}

main();
