import Redis from 'ioredis';

const REDIS_URL = 'rediss://default:AcOsAAIncDEzZGYxNWRjNGRmYmU0NWNkYTRjNTZmZTYwOTY2MDI0NnAxNTAwOTI@renewed-snail-50092.upstash.io:6379';
const redis = new Redis(REDIS_URL);

async function fetchAndStore() {
    const url = 'https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50';
    const response = await fetch(url);
    const events = await response.json();

    let processedEvents = [];
    let fedChairProcessed = null;

    for (const event of events) {
        if (!event.markets || event.markets.length === 0) continue;

        const subMarkets = [];
        for (const market of event.markets) {
            if (market.closed || market.archived) continue;

            const clobTokens = JSON.parse(market.clobTokenIds || '[]');
            const outcomes = JSON.parse(market.outcomes || '[]');
            const prices = JSON.parse(market.outcomePrices || '[]');

            if (clobTokens.length === 0) continue;

            const tokenId = clobTokens[0];
            const yesPrice = parseFloat(prices[0] || '0.5');

            if (yesPrice < 0.001) continue;

            subMarkets.push({
                id: tokenId,
                question: market.question,
                outcomes: outcomes,
                price: Math.max(yesPrice, 0.01),
                volume: parseFloat(market.volume || '0'),
            });
        }

        if (subMarkets.length === 0) continue;
        subMarkets.sort((a, b) => b.price - a.price);

        const processed = {
            id: event.id || event.slug,
            title: event.title,
            slug: event.slug,
            description: event.description,
            image: event.image,
            volume: event.volume || 0,
            categories: [],
            markets: subMarkets,
            isMultiOutcome: subMarkets.length > 1,
        };

        processedEvents.push(processed);

        if (event.title && event.title.toLowerCase().includes('fed chair')) {
            fedChairProcessed = processed;
        }
    }

    console.log('Processed events count:', processedEvents.length);

    if (fedChairProcessed) {
        console.log('\nFed Chair PROCESSED:');
        console.log('First market:', fedChairProcessed.markets[0].question);
        console.log('First market price:', fedChairProcessed.markets[0].price);
        console.log('First market ID:', fedChairProcessed.markets[0].id.substring(0, 20) + '...');
    }

    // Now store it
    await redis.set('event:active_list', JSON.stringify(processedEvents));
    console.log('\nStored to Redis!');

    // Verify
    const stored = JSON.parse(await redis.get('event:active_list'));
    const storedFedChair = stored.find(e => e.title && e.title.toLowerCase().includes('fed chair'));
    console.log('\nVERIFICATION from Redis:');
    console.log('First market:', storedFedChair?.markets[0]?.question);
    console.log('First market price:', storedFedChair?.markets[0]?.price);

    redis.disconnect();
}

fetchAndStore().catch(e => console.error(e));
