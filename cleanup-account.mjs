import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
    const client = await pool.connect();
    try {
        console.log('Listing users...');
        const users = await client.query('SELECT id, email FROM users');
        console.log('Users:', users.rows);

        console.log('\nCleaning up...');

        // Delete in order of dependencies
        const tradesResult = await client.query('DELETE FROM trades');
        console.log('Deleted trades:', tradesResult.rowCount);

        const positionsResult = await client.query('DELETE FROM positions');
        console.log('Deleted positions:', positionsResult.rowCount);

        const challengesResult = await client.query('DELETE FROM challenges');
        console.log('Deleted challenges:', challengesResult.rowCount);

        console.log('\n✅ Account cleaned! You can now start fresh.');
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup().catch(console.error);
