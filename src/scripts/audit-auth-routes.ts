/**
 * AUDIT 3: Auth & API Route Security
 * 
 * Scans all API route files to verify they have auth checks.
 * Reports any route that doesn't call auth(), requireAdmin(), 
 * or isn't explicitly public.
 * 
 * Usage: node --env-file=.env.local --import=tsx src/scripts/audit-auth-routes.ts
 */

import fs from 'fs';
import path from 'path';

// Known public routes (no auth required by design)
const PUBLIC_ROUTES = new Set([
    'auth/[...nextauth]/route.ts',   // NextAuth handler
    'auth/signup/route.ts',          // Registration
    'auth/register/route.ts',        // Registration 
    'auth/forgot-password/route.ts', // Password reset
    'auth/reset-password/route.ts',  // Password reset
    'auth/verify/route.ts',          // Email verification
    'auth/verify-email/route.ts',    // Email verification
    'auth/resend-code/route.ts',     // Resend verification
    'auth/pending-user/route.ts',    // Pre-auth flow
    'webhooks',                      // External callbacks
    'cron',                          // Vercel cron jobs
]);

const AUTH_PATTERNS = [
    'auth()',
    'requireAdmin()',
    'getServerSession',
    'verifySignature',      // Webhook signature verification
    'x-vercel-cron',        // Cron job protection
    'CRON_SECRET',          // Cron secret verification
];

function isPublicRoute(relativePath: string): boolean {
    for (const pub of PUBLIC_ROUTES) {
        if (relativePath.includes(pub)) return true;
    }
    return false;
}

function hasAuthCheck(content: string): { hasAuth: boolean; pattern: string | null } {
    for (const pattern of AUTH_PATTERNS) {
        if (content.includes(pattern)) {
            return { hasAuth: true, pattern };
        }
    }
    return { hasAuth: false, pattern: null };
}

function findRouteFiles(dir: string, baseDir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findRouteFiles(fullPath, baseDir));
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
            results.push(fullPath);
        }
    }
    return results;
}

async function runAuthAudit() {
    console.log("\n🔍 ═══════════════════════════════════════════════");
    console.log("   AUDIT 3: AUTH & API ROUTE SECURITY");
    console.log("   ═══════════════════════════════════════════════\n");

    const apiDir = path.join(process.cwd(), 'src/app/api');
    const routeFiles = findRouteFiles(apiDir, apiDir);

    console.log(`📋 Found ${routeFiles.length} API route files\n`);

    const protected_routes: Array<{ route: string; pattern: string }> = [];
    const public_routes: string[] = [];
    const UNPROTECTED: Array<{ route: string; hasOwnershipCheck: boolean }> = [];
    const ownership_issues: string[] = [];

    for (const file of routeFiles) {
        const relativePath = path.relative(apiDir, file);
        const content = fs.readFileSync(file, 'utf-8');

        // Skip known public routes
        if (isPublicRoute(relativePath)) {
            public_routes.push(relativePath);
            continue;
        }

        const { hasAuth, pattern } = hasAuthCheck(content);

        if (hasAuth) {
            protected_routes.push({ route: relativePath, pattern: pattern! });

            // Check for ownership verification on write operations
            const isWriteRoute = content.includes('export async function POST') ||
                content.includes('export async function PUT') ||
                content.includes('export async function DELETE') ||
                content.includes('export async function PATCH');

            const hasOwnershipCheck = content.includes('session.user.id') ||
                content.includes('userId') ||
                content.includes('requireAdmin');

            if (isWriteRoute && !hasOwnershipCheck) {
                ownership_issues.push(relativePath);
            }
        } else {
            // Check if it at least has some form of protection
            const hasOwnershipCheck = content.includes('session') || content.includes('userId');
            UNPROTECTED.push({ route: relativePath, hasOwnershipCheck });
        }
    }

    // Report
    console.log("✅ PROTECTED ROUTES:");
    for (const r of protected_routes) {
        console.log(`  ✅ ${r.route} (${r.pattern})`);
    }

    console.log(`\n🔓 KNOWN PUBLIC ROUTES (${public_routes.length}):`);
    for (const r of public_routes) {
        console.log(`  🔓 ${r}`);
    }

    if (UNPROTECTED.length > 0) {
        console.log(`\n❌ UNPROTECTED ROUTES (${UNPROTECTED.length}):`);
        for (const r of UNPROTECTED) {
            console.log(`  ❌ ${r.route}${r.hasOwnershipCheck ? ' (has session/userId ref but no auth() call)' : ''}`);
        }
    }

    if (ownership_issues.length > 0) {
        console.log(`\n⚠️ OWNERSHIP VERIFICATION MISSING (write routes with auth but no userId check):`);
        for (const r of ownership_issues) {
            console.log(`  ⚠️ ${r}`);
        }
    }

    // Summary
    console.log("\n═══════════════════════════════════════════════");
    console.log("   AUTH AUDIT RESULTS");
    console.log("═══════════════════════════════════════════════\n");
    console.log(`  Protected routes: ${protected_routes.length}`);
    console.log(`  Public routes: ${public_routes.length}`);
    console.log(`  Unprotected routes: ${UNPROTECTED.length}`);
    console.log(`  Ownership issues: ${ownership_issues.length}`);

    const result = UNPROTECTED.length === 0 ? "🟢 PASS" : "🔴 FAIL";
    console.log(`\n  RESULT: ${result}\n`);

    process.exit(UNPROTECTED.length > 0 ? 1 : 0);
}

runAuthAudit().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
