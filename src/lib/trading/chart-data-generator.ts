
// src/lib/trading/chart-data-generator.ts

export interface ChartDataPoint {
    time: number; // Unix timestamp
    value: number; // 0.0 - 1.0
}

export function generateChartData(
    currentPrice: number,
    timeRange: '1H' | '1D' | '1W' | '1M' | 'ALL'
): ChartDataPoint[] {
    const now = Math.floor(Date.now() / 1000);
    let startTime: number;
    let intervalSeconds: number;
    let pointsCount: number;

    switch (timeRange) {
        case '1H':
            startTime = now - 3600;
            intervalSeconds = 60; // 1 minute
            pointsCount = 60;
            break;
        case '1D':
            startTime = now - 86400;
            intervalSeconds = 1440; // 15 minutes
            pointsCount = 96; // 4 points per hour * 24
            break;
        case '1W':
            startTime = now - 604800;
            intervalSeconds = 3600; // 1 hour
            pointsCount = 168; // 24 * 7
            break;
        case '1M':
            startTime = now - 2592000;
            intervalSeconds = 14400; // 4 hours
            pointsCount = 180; // 6 * 30
            break;
        case 'ALL':
            startTime = now - 7776000; // 90 days
            intervalSeconds = 43200; // 12 hours
            pointsCount = 180;
            break;
        default:
            startTime = now - 86400;
            intervalSeconds = 1440;
            pointsCount = 96;
    }

    const data: ChartDataPoint[] = [];
    let price = currentPrice;

    // We generate backwards from now to start? No, generates forward from start to now.
    // We want the LAST point to be currentPrice.
    // So we will generate a random walk BACKWARDS from end to start, then reverse.

    const tempPoints: number[] = [currentPrice];
    let walker = currentPrice;

    for (let i = 0; i < pointsCount - 1; i++) {
        // Random walk backwards
        const drift = (0.5 - walker) * 0.02; // Mean reversion to 0.5
        const volatility = 0.015; // 1.5% volatility
        const change = drift + (Math.random() - 0.5) * volatility;

        walker = walker - change; // Subtract change to go backwards
        walker = Math.max(0.01, Math.min(0.99, walker));
        tempPoints.push(walker);
    }

    // Reverse so it goes from Start -> End
    const reversedPoints = tempPoints.reverse();

    for (let i = 0; i < pointsCount; i++) {
        const time = startTime + (i * intervalSeconds);
        data.push({ time, value: reversedPoints[i] });
    }

    return data;
}
