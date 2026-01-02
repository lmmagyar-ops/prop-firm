require('dotenv/config');
const { Client } = require('pg');

async function addPrivacyControls() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Add privacy control columns to users table
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS leaderboard_privacy VARCHAR(20) DEFAULT 'semi_private',
            ADD COLUMN IF NOT EXISTS show_country BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS show_stats_publicly BOOLEAN DEFAULT true;
        `);

        console.log('✅ Added privacy control columns');

        // Add index for leaderboard queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_leaderboard_privacy 
            ON users(leaderboard_privacy) 
            WHERE leaderboard_privacy != 'fully_private';
        `);

        console.log('✅ Added leaderboard privacy index');

        console.log('\n🎉 Privacy controls migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

addPrivacyControls();
