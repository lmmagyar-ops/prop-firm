/**
 * Schema Drift Detection Script
 * 
 * Compares the current Drizzle ORM schema definition against the live database
 * to detect any drift (columns added/removed directly in SQL, type mismatches, etc.).
 * 
 * How it works:
 *   Runs `drizzle-kit push --strict` with stdin ignored so the interactive prompt
 *   auto-aborts. Parses stdout/stderr for drift indicators. If changes are listed,
 *   drift was detected. If push exits cleanly with only schema pull output, the
 *   schema is in sync.
 * 
 * Usage:
 *   npm run db:check
 * 
 * Exit codes:
 *   0 — Schema is in sync
 *   1 — Drift detected (lists differences)
 *   2 — Script error (cannot connect, etc.)
 */

import { spawn } from 'child_process';

const DRIFT_INDICATORS = ['ALTER', 'CREATE TABLE', 'DROP', 'Warning', 'data-loss', 'Do you still want', 'aborted'];
const ERROR_INDICATORS = ['ECONNREFUSED', 'authentication', 'ETIMEDOUT'];

console.log('🔍 Checking for schema drift...\n');

const child = spawn('npx drizzle-kit push --strict', {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored → prompt auto-aborts
    shell: true,
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString();
});

child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
});

// Safety timeout — drizzle-kit shouldn't take more than 60s
const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    console.error('💥 Schema check timed out after 60s. Check DATABASE_URL connectivity.');
    process.exit(2);
}, 60000);

child.on('close', (code) => {
    clearTimeout(timeout);
    const combined = stdout + stderr;

    // Strip spinner lines for clean analysis
    const cleanOutput = combined
        .split('\n')
        .filter(line => !line.match(/^\[.*\]\s*(Pulling|Pushing)/))
        .filter(line => !line.match(/^No config path/))
        .filter(line => !line.match(/^Reading config/))
        .filter(line => !line.match(/^Using '/))
        .join('\n')
        .trim();

    // Check for connection errors first
    if (ERROR_INDICATORS.some(indicator => combined.includes(indicator))) {
        console.error('💥 Cannot connect to database. Check DATABASE_URL.\n');
        if (cleanOutput) console.error(cleanOutput);
        process.exit(2);
    }

    // Check for drift indicators
    const hasDrift = DRIFT_INDICATORS.some(indicator => combined.includes(indicator));

    if (hasDrift) {
        console.error('❌ SCHEMA DRIFT DETECTED\n');
        console.error('The following changes would be applied to sync the database:\n');
        if (cleanOutput) console.error(cleanOutput);
        console.error('\nRun `npm run db:push` to apply these changes, or investigate manually.');
        process.exit(1);
    }

    // Exit code 0 with no drift indicators = in sync
    if (code === 0) {
        console.log('✅ Schema is in sync with database. No drift detected.\n');
        process.exit(0);
    }

    // Non-zero exit with no recognized patterns — report for human review
    console.error(`⚠️  drizzle-kit exited with code ${code}. Review output:\n`);
    if (cleanOutput) console.error(cleanOutput);
    process.exit(code === null ? 2 : code);
});

child.on('error', (err) => {
    clearTimeout(timeout);
    console.error('💥 Failed to run drizzle-kit:', err.message);
    process.exit(2);
});
