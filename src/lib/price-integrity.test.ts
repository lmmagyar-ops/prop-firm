/**
 * REGRESSION TEST: Price Integrity — No Fabricated Prices in Financial Paths
 * 
 * Root cause: ?? 0.5 and || "0.5" fallbacks allowed fabricated 50¢ prices
 * to flow into trade execution, generating phantom profit and fake challenge passes.
 * 
 * Fix: All financial-critical files now return null when no real price is available.
 * The close/route.ts already handles null with a 503 response.
 * 
 * This test greps the ACTUAL SOURCE FILES for dangerous patterns to prevent re-introduction.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Files that MUST NOT contain fabricated price fallbacks
const FINANCIAL_FILES = [
    'src/lib/market.ts',
    'src/lib/polymarket-oracle.ts',
    'src/workers/price-monitor.ts',
    'src/app/api/trade/close/route.ts',
    'src/app/api/trade/execute/route.ts',
    'src/lib/trade.ts',
];

// Dangerous patterns that indicate fabricated price injection
const DANGEROUS_PATTERNS = [
    { pattern: /\?\?\s*0\.5(?!\d)/, description: 'nullish coalescing to 0.5' },
    { pattern: /\|\|\s*["']0\.5["']/, description: 'logical OR fallback to "0.5"' },
    { pattern: /\|\|\s*["']0\.50["']/, description: 'logical OR fallback to "0.50"' },
];

describe('REGRESSION: No fabricated prices in financial paths', () => {
    const fileContents = new Map<string, string>();

    beforeAll(() => {
        const root = path.resolve(__dirname, '../..');
        for (const file of FINANCIAL_FILES) {
            const fullPath = path.join(root, file);
            if (fs.existsSync(fullPath)) {
                fileContents.set(file, fs.readFileSync(fullPath, 'utf-8'));
            }
        }
    });

    for (const file of FINANCIAL_FILES) {
        for (const { pattern, description } of DANGEROUS_PATTERNS) {
            it(`${path.basename(file)} must not contain ${description}`, () => {
                const content = fileContents.get(file);
                if (!content) {
                    // File doesn't exist — skip (e.g., execute/route.ts may have been renamed)
                    return;
                }

                // Filter out comments and test descriptions
                const codeLines = content
                    .split('\n')
                    .filter(line => {
                        const trimmed = line.trim();
                        return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
                    })
                    .join('\n');

                const match = pattern.exec(codeLines);
                expect(
                    match,
                    `Found "${description}" in ${file} — this creates fabricated prices. Use \`return null\` instead.`
                ).toBeNull();
            });
        }
    }

    it('close/route.ts must have a circuit breaker for price divergence', () => {
        const content = fileContents.get('src/app/api/trade/close/route.ts');
        expect(content).toBeDefined();
        expect(content).toContain('CIRCUIT BREAKER');
        expect(content).toContain('priceRatio');
    });
});
