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

// Wrapper for consistent context logging
export const createLogger = (context: string) => {
    return {
        info: (message: string, meta: object = {}) => logger.info(message, { context, ...meta }),
        warn: (message: string, meta: object = {}) => logger.warn(message, { context, ...meta }),
        error: (message: string, error?: unknown, meta: object = {}) => {
            if (error instanceof Error) {
                logger.error(message, { context, error: error.message, stack: error.stack, ...meta });
            } else {
                logger.error(message, { context, error, ...meta });
            }
        },
        debug: (message: string, meta: object = {}) => logger.debug(message, { context, ...meta }),
    };
};
