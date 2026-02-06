import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function investigate() {
    try {
        // Get market:active_list
        const activeList = await redis.get('market:active_list');
        if (!activeList) {
            console.log('No market:active_list found');
            redis.disconnect();
            return;
        }

        const markets = JSON.parse(activeList);
        console.log('Total markets in active_list:', markets.length);

        // Find specific markets
        const rubioMarkets = markets.filter((m: any) => (m.question || m.title || '').toLowerCase().includes('rubio'));
        const newsomMarkets = markets.filter((m: any) => (m.question || m.title || '').toLowerCase().includes('newsom'));
        const arsenalMarkets = markets.filter((m: any) => (m.question || m.title || '').toLowerCase().includes('arsenal'));

        console.log('\n=== MARCO RUBIO MARKETS ===');
        rubioMarkets.forEach((m: any) => {
            console.log('  ID:', m.id?.slice(0, 12) + '...');
            console.log('  Volume:', (m.volume || 0).toLocaleString());
            console.log('  Question:', m.question?.slice(0, 70));
            console.log('  Would pass Rule 7 (min $100k)?', (m.volume || 0) >= 100000 ? 'YES' : 'NO (BLOCKED)');
            console.log('');
        });
        if (rubioMarkets.length === 0) console.log('(No Rubio markets found)');

        console.log('\n=== GAVIN NEWSOM MARKETS ===');
        newsomMarkets.forEach((m: any) => {
            console.log('  ID:', m.id?.slice(0, 12) + '...');
            console.log('  Volume:', (m.volume || 0).toLocaleString());
            console.log('  Question:', m.question?.slice(0, 70));
            console.log('  Would pass Rule 7 (min $100k)?', (m.volume || 0) >= 100000 ? 'YES' : 'NO (BLOCKED)');
            console.log('');
        });
        if (newsomMarkets.length === 0) console.log('(No Newsom markets found)');

        console.log('\n=== ARSENAL MARKETS ===');
        arsenalMarkets.forEach((m: any) => {
            console.log('  ID:', m.id?.slice(0, 12) + '...');
            console.log('  Volume:', (m.volume || 0).toLocaleString());
            console.log('  Question:', m.question?.slice(0, 70));
            console.log('  Would pass Rule 7 (min $100k)?', (m.volume || 0) >= 100000 ? 'YES' : 'NO (BLOCKED)');
            console.log('');
        });
        if (arsenalMarkets.length === 0) console.log('(No Arsenal markets found)');

        redis.disconnect();
    } catch (err: any) {
        console.error('Error:', err.message);
        redis.disconnect();
    }
}

investigate();
