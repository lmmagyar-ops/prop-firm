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

    return {
        info: (message: string, meta: object = {}) => logger.info(message, { ...ctx, ...meta }),
        warn: (message: string, meta: object = {}) => logger.warn(message, { ...ctx, ...meta }),
        error: (message: string, error?: unknown, meta: object = {}) => {
            if (error instanceof Error) {
                logger.error(message, { ...ctx, error: error.message, stack: error.stack, ...meta });
            } else {
                logger.error(message, { ...ctx, error, ...meta });
            }
        },
        debug: (message: string, meta: object = {}) => logger.debug(message, { ...ctx, ...meta }),

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
