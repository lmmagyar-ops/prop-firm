#!/usr/bin/env node
/**
 * Baseline Performance Test
 * 
 * Measures response times for critical API endpoints.
 * Run with: npx tsx scripts/perf-baseline.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
    endpoint: string;
    times: number[];
    avg: number;
    p50: number;
    p95: number;
    status: number;
}

async function measureEndpoint(
    name: string,
    url: string,
    iterations: number = 5
): Promise<TestResult> {
    const times: number[] = [];
    let lastStatus = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
            const res = await fetch(url);
            lastStatus = res.status;
            await res.text(); // Consume body
        } catch (e) {
            console.error(`  Error on ${name}:`, e);
        }
        const elapsed = performance.now() - start;
        times.push(elapsed);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { endpoint: name, times, avg, p50, p95, status: lastStatus };
}

async function main() {
    console.log('=== Prop-Firm Baseline Performance Test ===\n');
    console.log(`Target: ${BASE_URL}\n`);

    const endpoints = [
        { name: 'Markets List', url: `${BASE_URL}/api/markets/events` },
        { name: 'Orderbook', url: `${BASE_URL}/api/orderbook?marketId=test` },
        { name: 'Dashboard (unauth)', url: `${BASE_URL}/api/dashboard` },
        { name: 'Health Check', url: `${BASE_URL}/api/cron/status` },
    ];

    const results: TestResult[] = [];

    for (const ep of endpoints) {
        console.log(`Testing: ${ep.name}...`);
        const result = await measureEndpoint(ep.name, ep.url);
        results.push(result);
        console.log(`  Status: ${result.status}, Avg: ${result.avg.toFixed(0)}ms, P95: ${result.p95.toFixed(0)}ms`);
    }

    console.log('\n=== Summary ===\n');
    console.log('| Endpoint | Status | Avg (ms) | P50 (ms) | P95 (ms) |');
    console.log('|----------|--------|----------|----------|----------|');
    for (const r of results) {
        console.log(`| ${r.endpoint.padEnd(20)} | ${r.status} | ${r.avg.toFixed(0).padStart(8)} | ${r.p50.toFixed(0).padStart(8)} | ${r.p95.toFixed(0).padStart(8)} |`);
    }

    // Performance thresholds
    console.log('\n=== Performance Assessment ===\n');
    for (const r of results) {
        if (r.avg > 2000) {
            console.log(`🔴 SLOW: ${r.endpoint} (${r.avg.toFixed(0)}ms avg) - needs optimization`);
        } else if (r.avg > 500) {
            console.log(`🟡 OK: ${r.endpoint} (${r.avg.toFixed(0)}ms avg) - acceptable`);
        } else {
            console.log(`🟢 FAST: ${r.endpoint} (${r.avg.toFixed(0)}ms avg)`);
        }
    }
}

main().catch(console.error);
