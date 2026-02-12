#!/usr/bin/env node
/**
 * Console → Logger Migration Codemod
 * 
 * Migrates console.log/error/warn to structured Winston logger.
 * Handles server-side files only (workers, API routes, lib).
 * Skips client components and test files.
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

function getContextName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath));
    // route.ts files → use parent dir name
    if (basename === 'route') {
        const parentDir = path.basename(path.dirname(filePath));
        return parentDir
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }
    return basename
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function isClientComponent(content: string): boolean {
    const firstLines = content.slice(0, 500);
    return firstLines.includes("'use client'") || firstLines.includes('"use client"');
}

function hasLogger(content: string): boolean {
    return content.includes('createLogger(') || content.includes("from '@/lib/logger'") || content.includes("from \"@/lib/logger\"") || content.includes("from '../lib/logger'") || content.includes("from \"../lib/logger\"");
}

function hasConsoleStatements(content: string): boolean {
    return /console\.(log|error|warn)\s*\(/.test(content);
}

function getImportPath(filePath: string): string {
    if (filePath.includes('/workers/')) return '../lib/logger';
    return '@/lib/logger';
}

function getFilesRecursively(dir: string, ext: string[]): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getFilesRecursively(fullPath, ext));
        } else if (ext.some(e => entry.name.endsWith(e))) {
            if (!entry.name.includes('.test.') && !fullPath.includes('__tests__')) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

function migrateFile(filePath: string): { modified: boolean; changes: number } {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changes = 0;

    if (isClientComponent(content)) return { modified: false, changes: 0 };
    if (!hasConsoleStatements(content)) return { modified: false, changes: 0 };

    const contextName = getContextName(filePath);
    const importPath = getImportPath(filePath);
    const useDoubleQuotes = content.includes('from "') || content.includes("from \"");
    const quote = useDoubleQuotes ? '"' : "'";

    // Add logger import + instantiation if not present
    if (!hasLogger(content)) {
        // Find insertion point after imports
        const lines = content.split('\n');
        let lastImportLine = -1;
        let inMultiLineImport = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (inMultiLineImport) {
                if (line.includes('}')) {
                    lastImportLine = i;
                    inMultiLineImport = false;
                }
                continue;
            }
            if (line.startsWith('import ')) {
                if (line.includes('{') && !line.includes('}')) {
                    inMultiLineImport = true;
                }
                lastImportLine = i;
            }
        }

        if (lastImportLine >= 0) {
            const importLine = `import { createLogger } from ${quote}${importPath}${quote};`;
            const instanceLine = `\nconst logger = createLogger(${quote}${contextName}${quote});`;
            lines.splice(lastImportLine + 1, 0, importLine + instanceLine);
            content = lines.join('\n');
            changes++;
        }
    }

    // Replace console.log → logger.info
    const logCount = (content.match(/console\.log\(/g) || []).length;
    content = content.replace(/console\.log\(/g, 'logger.info(');
    changes += logCount;

    // Replace console.error → logger.error
    const errorCount = (content.match(/console\.error\(/g) || []).length;
    content = content.replace(/console\.error\(/g, 'logger.error(');
    changes += errorCount;

    // Replace console.warn → logger.warn
    const warnCount = (content.match(/console\.warn\(/g) || []).length;
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    changes += warnCount;

    if (changes > 0 && !DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    return { modified: changes > 0, changes };
}

function main() {
    const dirs = ['src/workers', 'src/app/api', 'src/lib'];
    const extensions = ['.ts', '.tsx'];

    let totalFiles = 0;
    let modifiedFiles = 0;
    let totalChanges = 0;
    const results: Array<{ file: string; changes: number }> = [];

    for (const dir of dirs) {
        const files = getFilesRecursively(dir, extensions);

        for (const file of files) {
            totalFiles++;
            const { modified, changes } = migrateFile(file);
            if (modified) {
                modifiedFiles++;
                totalChanges += changes;
                results.push({ file, changes });
                if (VERBOSE) {
                    console.log(`  ✅ ${file} (${changes} changes)`);
                }
            }
        }
    }

    console.log(`\n📊 Migration Summary${DRY_RUN ? ' (DRY RUN)' : ''}:`);
    console.log(`  Files scanned: ${totalFiles}`);
    console.log(`  Files modified: ${modifiedFiles}`);
    console.log(`  Total changes: ${totalChanges}`);

    if (results.length > 0) {
        console.log(`\n📝 Modified files:`);
        for (const r of results.sort((a, b) => b.changes - a.changes)) {
            console.log(`  ${r.file} (${r.changes} replacements)`);
        }
    }
}

main();
