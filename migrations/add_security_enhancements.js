const { Client } = require('pg');
require('dotenv/config');

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('🔗 Connected to database');

        // Add new columns to users table
        console.log('📝 Adding new columns to users table...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email_verified_status BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
        `);
        console.log('✅ Users table updated');

        // Create user_2fa table
        console.log('📝 Creating user_2fa table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_2fa (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                secret TEXT NOT NULL,
                backup_codes JSONB,
                enabled BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                last_used_at TIMESTAMP
            );
        `);
        console.log('✅ user_2fa table created');

        // Create payout_methods table
        console.log('📝 Creating payout_methods table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS payout_methods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL,
                provider VARCHAR(50),
                label TEXT,
                details JSONB NOT NULL,
                is_default BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ payout_methods table created');

        // Create activity_logs table
        console.log('📝 Creating activity_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(50) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                location TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ activity_logs table created');

        // Create index for faster queries
        console.log('📝 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_payout_methods_user_id ON payout_methods(user_id);
        `);
        console.log('✅ Indexes created');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

runMigration();
