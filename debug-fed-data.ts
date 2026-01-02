
const FETCH_URL = "https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50";

async function main() {
    console.log("Fetching events...");
    const res = await fetch(FETCH_URL);
    const events = await res.json();

    // Find the FED event
    const fedEvent = events.find((e: any) => e.title.includes("Fed") || e.title.includes("rates"));

    if (fedEvent) {
        console.log("--- FED EVENT FOUND ---");
        console.log("Title:", fedEvent.title);
        console.log("Markets:");
        fedEvent.markets.forEach((m: any) => {
            console.log(`  - Q: "${m.question}" | Outcomes: ${m.outcomes} | Prices: ${m.outcomePrices}`);
        });
    } else {
        console.log("XXX No FED Event Found XXX");
    }

    // Find the TRUMP NOMINEE event
    const trumpEvent = events.find((e: any) => e.title.includes("nominate") || e.title.includes("Fed Chair"));

    if (trumpEvent) {
        console.log("\n--- TRUMP NOMINEE EVENT FOUND ---");
        console.log("Title:", trumpEvent.title);
        console.log("Markets:");
        trumpEvent.markets.forEach((m: any) => {
            console.log(`  - Q: "${m.question}"`);
        });
    } else {
        console.log("XXX No Trump Nominee Event Found XXX");
        // Print all titles to see what we missed
        console.log("\nAvailable Titles:");
        events.forEach((e: any) => console.log("- " + e.title));
    }
}

main();
