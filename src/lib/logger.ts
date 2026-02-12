import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for local development
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let metaStr = '';
    if (Object.keys(metadata).length > 0) {
        metaStr = JSON.stringify(metadata, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
    ),
    transports: [
        new winston.transports.Console()
    ],
});

export type Logger = ReturnType<typeof createLogger>;

// Wrapper for consistent context logging
export const createLogger = (context: string, baseContext: Record<string, unknown> = {}) => {
    const ctx = { context, ...baseContext };

    // Normalize meta: if a string was passed (from migrated console.log calls), wrap it
    const normalizeMeta = (meta: unknown): object => {
        if (typeof meta === 'string') return { detail: meta };
        if (meta && typeof meta === 'object') return meta as object;
        return {};
    };

    return {
        info: (message: string, meta: string | object = {}) =>
            logger.info(message, { ...ctx, ...normalizeMeta(meta) }),
        warn: (message: string, meta: string | object = {}) =>
            logger.warn(message, { ...ctx, ...normalizeMeta(meta) }),
        error: (message: string, error?: unknown, meta: string | object = {}) => {
            if (error instanceof Error) {
                logger.error(message, { ...ctx, error: error.message, stack: error.stack, ...normalizeMeta(meta) });
            } else {
                logger.error(message, { ...ctx, error, ...normalizeMeta(meta) });
            }
        },
        debug: (message: string, meta: string | object = {}) =>
            logger.debug(message, { ...ctx, ...normalizeMeta(meta) }),

        /**
         * Create a child logger with additional context fields pre-attached.
         * Every log line from the child includes these fields automatically.
         * 
         * Usage:
         *   const log = createLogger('TradeAPI').withContext({ userId, challengeId });
         *   log.info('Trade requested', { marketId, amount });
         *   // Output: { context: "TradeAPI", userId: "abc", challengeId: "ch-1", ... }
         */
        withContext: (extra: Record<string, unknown>) =>
            createLogger(context, { ...baseContext, ...extra }),
    };
};
