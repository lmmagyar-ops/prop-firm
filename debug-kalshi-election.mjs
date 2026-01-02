/**
 * Debug script to see raw Kalshi data for Presidential Election event
 */
import { getKalshiEvents, getKalshiMarkets } from "./src/lib/kalshi-client.js";

async function debug() {
    const markets = await getKalshiMarkets(1000);
    const events = await getKalshiEvents(200);

    const event = events.find(e => e.title === "Next US Presidential Election Winner?");
    if (!event) {
        console.log("Event not found");
        return;
    }

    console.log("Event:", event.event_ticker);
    console.log("Title:", event.title);
    console.log("\nMarkets for this event:");

    const eventMarkets = markets.filter(m => m.event_ticker === event.event_ticker);

    eventMarkets.slice(0, 10).forEach((m, i) => {
        console.log(`\n${i + 1}. Ticker: ${m.ticker}`);
        console.log(`   Title: ${m.title}`);
        console.log(`   Subtitle: ${m.subtitle || "N/A"}`);
        console.log(`   Price: ${Math.round(((m.yes_bid + m.yes_ask) / 2))}¢`);
    });
}

debug();
