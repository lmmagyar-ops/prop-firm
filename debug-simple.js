const Redis = require('ioredis');

const REDIS_URL = 'rediss://default:AcOsAAIncDEzZGYxNWRjNGRmYmU0NWNkYTRjNTZmZTYwOTY2MDI0NnAxNTAwOTI@renewed-snail-50092.upstash.io:6379';
const redis = new Redis(REDIS_URL);

async function main() {
    try {
        // Fetch from API
        const url = 'https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50';
        const response = await fetch(url);
        const events = await response.json();

        const fedChair = events.find(e => e.title && e.title.toLowerCase().includes('fed chair'));
        console.log('\n=== API Response ===');
        console.log('Fed Chair markets:', fedChair.markets.length);
        console.log('First market:', fedChair.markets[0].question);
        console.log('First price raw:', fedChair.markets[0].outcomePrices);

        // Process
        const prices = JSON.parse(fedChair.markets[0].outcomePrices);
        const yesPrice = parseFloat(prices[0]);
        console.log('Parsed price:', yesPrice);

        // Create test data
        const testData = [{
            id: fedChair.id,
            title: fedChair.title,
            markets: [{
                question: fedChair.markets[0].question,
                price: yesPrice,
                id: 'test-id'
            }]
        }];

        // Store to a test key
        await redis.set('event:test_write', JSON.stringify(testData));
        console.log('\n=== Stored to Redis ===');

        // Read back
        const stored = JSON.parse(await redis.get('event:test_write'));
        console.log('Read back:', stored[0].markets[0].question);
        console.log('Read back price:', stored[0].markets[0].price);

        // Cleanup
        await redis.del('event:test_write');

        console.log('\n=== SUCCESS - Storage working correctly ===');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        redis.disconnect();
    }
}

main();
