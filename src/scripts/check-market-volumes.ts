/**
 * Debug script: Check market volumes in Redis
 * Run: npx tsx src/scripts/check-market-volumes.ts
 */

import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

async function checkVolumes() {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        tls: {}
    });

    console.log("\n=== MARKET VOLUME DEBUG ===\n");

    // Check event:active_list
    const eventData = await redis.get("event:active_list");
    if (eventData) {
        const events = JSON.parse(eventData);
        console.log(`Found ${events.length} events in event:active_list\n`);

        // Show first 5 events and their volumes
        console.log("Sample events with volumes:");
        events.slice(0, 5).forEach((event: any, i: number) => {
            console.log(`\n${i + 1}. ${event.title}`);
            console.log(`   Event Volume: $${(event.volume || 0).toLocaleString()}`);
            if (event.markets && event.markets.length > 0) {
                event.markets.slice(0, 3).forEach((m: any) => {
                    console.log(`   - Market "${m.question}": Volume $${(m.volume || 0).toLocaleString()}`);
                });
            }
        });
    } else {
        console.log("❌ No event:active_list found in Redis!");
    }

    // Check market:active_list
    const marketData = await redis.get("market:active_list");
    if (marketData) {
        const markets = JSON.parse(marketData);
        console.log(`\nFound ${markets.length} markets in market:active_list`);

        // Show top 5 by volume
        const sorted = [...markets].sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0));
        console.log("\nTop 5 markets by volume:");
        sorted.slice(0, 5).forEach((m: any, i: number) => {
            console.log(`${i + 1}. ${m.question}`);
            console.log(`   Volume: $${(m.volume || 0).toLocaleString()}`);
            console.log(`   ID: ${m.id}`);
        });

        // Check how many have >$10M, $1-10M, etc.
        const highVol = markets.filter((m: any) => (m.volume || 0) >= 10_000_000).length;
        const medVol = markets.filter((m: any) => (m.volume || 0) >= 1_000_000 && (m.volume || 0) < 10_000_000).length;
        const lowVol = markets.filter((m: any) => (m.volume || 0) >= 100_000 && (m.volume || 0) < 1_000_000).length;
        const blocked = markets.filter((m: any) => (m.volume || 0) < 100_000).length;

        console.log("\nVolume tier breakdown:");
        console.log(`  >$10M (high): ${highVol}`);
        console.log(`  $1-10M (medium): ${medVol}`);
        console.log(`  $100k-1M (low): ${lowVol}`);
        console.log(`  <$100k (blocked): ${blocked}`);
    } else {
        console.log("❌ No market:active_list found in Redis!");
    }

    await redis.quit();
    console.log("\n=== END DEBUG ===\n");
}

checkVolumes().catch(console.error);
