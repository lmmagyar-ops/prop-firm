/**
 * Outage Protection Integration Tests
 * 
 * Tests the Exchange Halt pattern: outage detection, evaluation freeze,
 * trade halt, challenge timer extension, and grace window.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutageManager } from '@/lib/outage-manager';

// Mock the database
vi.mock('@/db', () => ({
    db: {
        query: {
            outageEvents: { findFirst: vi.fn() },
            marketCache: { findFirst: vi.fn() },
        },
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                onConflictDoUpdate: vi.fn(),
                returning: vi.fn(() => []),
            })),
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => ({ rowCount: 5 })),
            })),
        })),
    },
}));

// Mock worker-client
vi.mock('@/lib/worker-client', () => ({
    getHeartbeat: vi.fn(),
}));

import { db } from '@/db';
import { getHeartbeat } from '@/lib/worker-client';

describe('OutageManager - getOutageStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return healthy when no active outage', async () => {
        vi.mocked(db.query.outageEvents.findFirst).mockResolvedValue(undefined);

        const status = await OutageManager.getOutageStatus();

        expect(status.isOutage).toBe(false);
        expect(status.isGraceWindow).toBe(false);
    });

    it('should detect active outage (no endedAt)', async () => {
        // First call returns active outage (no endedAt)
        vi.mocked(db.query.outageEvents.findFirst).mockResolvedValueOnce({
            id: 'outage-1',
            startedAt: new Date(),
            endedAt: null,
            durationMs: null,
            reason: 'Worker stale',
            challengesExtended: 0,
            graceWindowEndsAt: null,
            createdAt: new Date(),
        });

        const status = await OutageManager.getOutageStatus();

        expect(status.isOutage).toBe(true);
        expect(status.isGraceWindow).toBe(false);
        expect(status.message).toContain('halted');
    });

    it('should detect grace window (recently ended outage)', async () => {
        // First call: no active outage
        vi.mocked(db.query.outageEvents.findFirst)
            .mockResolvedValueOnce(undefined) // no active outage   
            .mockResolvedValueOnce({           // recently ended outage with grace window
                id: 'outage-1',
                startedAt: new Date(Date.now() - 60 * 60 * 1000),
                endedAt: new Date(Date.now() - 5 * 60 * 1000), // ended 5 min ago
                durationMs: 55 * 60 * 1000,
                reason: 'Worker stale',
                challengesExtended: 3,
                graceWindowEndsAt: new Date(Date.now() + 25 * 60 * 1000), // 25 min left
                createdAt: new Date(),
            });

        const status = await OutageManager.getOutageStatus();

        expect(status.isOutage).toBe(false);
        expect(status.isGraceWindow).toBe(true);
        expect(status.graceEndsAt).toBeDefined();
    });

    it('should not be in grace window if it has expired', async () => {
        vi.mocked(db.query.outageEvents.findFirst)
            .mockResolvedValueOnce(undefined) // no active outage
            .mockResolvedValueOnce({           // outage with expired grace window
                id: 'outage-1',
                startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                endedAt: new Date(Date.now() - 60 * 60 * 1000),
                durationMs: 60 * 60 * 1000,
                reason: 'Worker stale',
                challengesExtended: 3,
                graceWindowEndsAt: new Date(Date.now() - 30 * 60 * 1000), // expired
                createdAt: new Date(),
            });

        const status = await OutageManager.getOutageStatus();

        expect(status.isOutage).toBe(false);
        expect(status.isGraceWindow).toBe(false);
    });
});

describe('OutageManager - isWorkerHealthy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return true when heartbeat is fresh', async () => {
        vi.mocked(getHeartbeat).mockResolvedValue({
            timestamp: Date.now() - 30 * 1000, // 30s old
        });

        const healthy = await OutageManager.isWorkerHealthy();
        expect(healthy).toBe(true);
    });

    it('should return false when heartbeat is stale', async () => {
        vi.mocked(getHeartbeat).mockResolvedValue({
            timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes old
        });

        const healthy = await OutageManager.isWorkerHealthy();
        expect(healthy).toBe(false);
    });

    it('should return false when no heartbeat exists', async () => {
        vi.mocked(getHeartbeat).mockResolvedValue(null);

        const healthy = await OutageManager.isWorkerHealthy();
        expect(healthy).toBe(false);
    });

    it('should return false on error', async () => {
        vi.mocked(getHeartbeat).mockRejectedValue(new Error('Connection failed'));

        const healthy = await OutageManager.isWorkerHealthy();
        expect(healthy).toBe(false);
    });
});

describe('Evaluator - Exchange Halt Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should skip evaluation during outage', async () => {
        // Import evaluator with mocked OutageManager
        vi.doMock('@/lib/outage-manager', () => ({
            OutageManager: {
                getOutageStatus: vi.fn().mockResolvedValue({
                    isOutage: true,
                    isGraceWindow: false,
                    message: 'Trading halted',
                }),
            },
        }));

        // Mock other evaluator dependencies
        vi.doMock('@/lib/market', () => ({
            MarketService: {
                getLatestPrice: vi.fn(),
                getBatchOrderBookPrices: vi.fn(),
            },
        }));

        vi.doMock('@/lib/events', () => ({
            publishAdminEvent: vi.fn(),
        }));

        const { ChallengeEvaluator } = await import('@/lib/evaluator');
        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        expect(result.status).toBe('active');
        expect(result.reason).toContain('Exchange halt');
    });
});
