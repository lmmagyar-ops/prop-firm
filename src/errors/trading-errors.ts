export class TradingError extends Error {
    public data?: Record<string, unknown>;
    constructor(message: string, public code: string, public status: number = 400, data?: Record<string, unknown>) {
        super(message);
        this.name = 'TradingError';
        this.data = data;
    }
}

export class InsufficientFundsError extends TradingError {
    constructor(userId: string, required: number, available: number) {
        super(`Insufficient funds. Required: $${required}, Available: $${available}`, 'INSUFFICIENT_FUNDS', 402);
    }
}

export class MarketClosedError extends TradingError {
    constructor(marketId: string) {
        super(`Market ${marketId} is currently closed or halted`, 'MARKET_CLOSED', 403);
    }
}

export class PriceStaleError extends TradingError {
    constructor(marketId: string, ageMs: number) {
        super(`Price for ${marketId} is stale (Data age: ${ageMs}ms)`, 'PRICE_STALE', 409);
    }
}

export class PositionNotFoundError extends TradingError {
    constructor(positionId: string) {
        super(`Position ${positionId} not found`, 'POSITION_NOT_FOUND', 404);
    }
}

export class RiskLimitExceededError extends TradingError {
    constructor(reason: string) {
        super(reason, 'RISK_LIMIT_EXCEEDED', 403);
    }
}
