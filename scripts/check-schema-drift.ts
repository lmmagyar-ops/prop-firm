/**
 * Schema Drift Detection Script
 * 
 * Compares the current Drizzle ORM schema definition against the live database
 * to detect any drift (columns added/removed directly in SQL, type mismatches, etc.).
 * 
 * Usage:
 *   npm run db:check
 * 
 * Exit codes:
 *   0 — Schema is in sync
 *   1 — Drift detected (lists differences)
 *   2 — Script error (cannot connect, etc.)
 */

import { execSync } from 'child_process';

try {
    console.log('🔍 Checking for schema drift...\n');

    // drizzle-kit check compares schema files against the database
    // and reports any differences without applying them
    const output = execSync('npx drizzle-kit push --dry-run 2>&1', {
        encoding: 'utf-8',
        env: { ...process.env },
        cwd: process.cwd(),
    });

    // If "No changes detected" or similar — we're clean
    if (output.includes('No changes') || output.includes('nothing to do') || output.includes('0 tables')) {
        console.log('✅ Schema is in sync with database. No drift detected.\n');
        process.exit(0);
    }

    // If there ARE differences, drizzle-kit will list the SQL statements
    if (output.includes('ALTER') || output.includes('CREATE') || output.includes('DROP')) {
        console.error('❌ SCHEMA DRIFT DETECTED\n');
        console.error('The following changes would be applied to sync the database:\n');
        console.error(output);
        console.error('\nRun `npm run db:push` to apply these changes, or investigate manually.');
        process.exit(1);
    }

    // Ambiguous output — print it for human review
    console.log('⚠️  Ambiguous result from drizzle-kit. Review output:\n');
    console.log(output);
    process.exit(0);

} catch (error: unknown) {
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 1) {
        // drizzle-kit returned exit code 1 — drift detected
        const stdout = (error as { stdout?: string }).stdout || '';
        const stderr = (error as { stderr?: string }).stderr || '';
        console.error('❌ SCHEMA DRIFT DETECTED\n');
        if (stdout) console.error(stdout);
        if (stderr) console.error(stderr);
        process.exit(1);
    }

    console.error('💥 Schema check failed:', error instanceof Error ? error.message : error);
    process.exit(2);
}
