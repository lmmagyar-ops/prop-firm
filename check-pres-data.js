const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6380');

redis.get('kalshi:active_list').then(data => {
    const events = JSON.parse(data);
    const event = events.find(e => e.title === 'Next US Presidential Election Winner?');

    console.log('Presidential Election outcomes:');
    event.markets.forEach(m => {
        console.log(`  - ${m.question} (${Math.round(m.price * 100)}%)`);
    });

    redis.disconnect();
});
