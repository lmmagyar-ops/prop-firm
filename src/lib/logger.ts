/**
 * Isomorphic Logger — Console-based
 * 
 * Safe to import from ANY context: server components, client components,
 * API routes, workers, scripts, middleware.
 * 
 * Uses structured console output with context prefixes. Console output is
 * captured by Vercel's log drain in production, so no log data is lost.
 * 
 * Previous implementation used winston (Node.js only), which caused
 * "Module not found: Can't resolve 'fs'" build failures when imported
 * from 'use client' pages.
 */

export interface LoggerInstance {
    info: (message: string, meta?: string | object) => void;
    warn: (message: string, meta?: string | object) => void;
    error: (message: string, error?: unknown, meta?: string | object) => void;
    debug: (message: string, meta?: string | object) => void;
    withContext: (extra: Record<string, unknown>) => LoggerInstance;
}

export type Logger = LoggerInstance;

const formatMeta = (meta: unknown): string => {
    if (!meta) return '';
    if (typeof meta === 'string') return meta;
    if (typeof meta === 'object' && Object.keys(meta as object).length > 0) {
        return JSON.stringify(meta);
    }
    return '';
};

export const createLogger = (context: string, baseContext: Record<string, unknown> = {}): LoggerInstance => {
    const prefix = `[${context}]`;
    const mergedMeta = (meta: string | object = {}): object => {
        const normalized = typeof meta === 'string' ? { detail: meta } : meta;
        return Object.keys(baseContext).length > 0
            ? { ...baseContext, ...normalized }
            : normalized;
    };

    return {
        // eslint-disable-next-line no-console
        info: (message: string, meta: string | object = {}) => {
            const m = mergedMeta(meta);
            const metaStr = formatMeta(m);
            // eslint-disable-next-line no-console
            console.log(prefix, message, metaStr || '');
        },
        // eslint-disable-next-line no-console
        warn: (message: string, meta: string | object = {}) => {
            const m = mergedMeta(meta);
            const metaStr = formatMeta(m);
            // eslint-disable-next-line no-console
            console.warn(prefix, message, metaStr || '');
        },
        error: (message: string, error?: unknown, meta: string | object = {}) => {
            const m = mergedMeta(meta);
            if (error instanceof Error) {
                // eslint-disable-next-line no-console
                console.error(prefix, message, { ...m, error: error.message, stack: error.stack });
            } else if (error) {
                // eslint-disable-next-line no-console
                console.error(prefix, message, { ...m, error });
            } else {
                const metaStr = formatMeta(m);
                // eslint-disable-next-line no-console
                console.error(prefix, message, metaStr || '');
            }
        },
        // eslint-disable-next-line no-console
        debug: (message: string, meta: string | object = {}) => {
            const m = mergedMeta(meta);
            const metaStr = formatMeta(m);
            // eslint-disable-next-line no-console
            console.debug(prefix, message, metaStr || '');
        },
        withContext: (extra: Record<string, unknown>) =>
            createLogger(context, { ...baseContext, ...extra }),
    };
};

/**
 * Root logger instance (for modules that import { logger } directly).
 * Prefer createLogger('YourModule') for structured context.
 */
export const logger = createLogger('root');
