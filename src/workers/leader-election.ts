import Redis from 'ioredis';

/**
 * Distributed Leader Election using Redis SETNX
 * 
 * Only one worker can be leader at a time. Others become hot standby
 * and take over when the leader's lock expires.
 */
export class LeaderElection {
    private redis: Redis;
    private lockKey: string;
    private lockTTL: number;
    private workerId: string;
    private renewIntervalId: NodeJS.Timeout | null = null;

    /**
     * @param redis - Redis client instance
     * @param lockKey - Redis key for the leader lock (default: 'ingestion:leader')
     * @param lockTTL - Lock expiry in seconds (default: 30s - gives enough buffer for renewals)
     */
    constructor(redis: Redis, lockKey = 'ingestion:leader', lockTTL = 30) {
        this.redis = redis;
        this.lockKey = lockKey;
        this.lockTTL = lockTTL;
        // Use Railway replica ID if available, otherwise generate random ID
        this.workerId = process.env.RAILWAY_REPLICA_ID || `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /**
     * Attempt to become leader using SETNX (set if not exists)
     * @returns true if this worker became leader, false if another worker holds the lock
     */
    async tryBecomeLeader(): Promise<boolean> {
        const result = await this.redis.set(
            this.lockKey,
            this.workerId,
            'EX', this.lockTTL,
            'NX'  // Only set if key doesn't exist
        );
        const isLeader = result === 'OK';

        if (isLeader) {
            console.log(`[LeaderElection] ✅ Became leader (workerId: ${this.workerId})`);
        }

        return isLeader;
    }

    /**
     * Renew the leader lock - must be called periodically by the leader
     * @returns true if lock was renewed, false if lock was lost
     */
    async renewLock(): Promise<boolean> {
        // Verify we still own the lock before renewing
        const currentHolder = await this.redis.get(this.lockKey);
        if (currentHolder !== this.workerId) {
            console.warn(`[LeaderElection] ⚠️ Lost leadership! Current holder: ${currentHolder}`);
            return false;
        }

        const renewed = await this.redis.expire(this.lockKey, this.lockTTL) === 1;
        if (!renewed) {
            console.warn(`[LeaderElection] ⚠️ Failed to renew lock - key may have expired`);
        }
        return renewed;
    }

    /**
     * Start automatic lock renewal every 10 seconds
     * Call this after becoming leader
     */
    startRenewal(onLost?: () => void): void {
        if (this.renewIntervalId) {
            clearInterval(this.renewIntervalId);
        }

        this.renewIntervalId = setInterval(async () => {
            const renewed = await this.renewLock();
            if (!renewed && onLost) {
                console.error(`[LeaderElection] 🔴 Leadership lost! Triggering callback...`);
                this.stopRenewal();
                onLost();
            }
        }, 10000); // Renew every 10s (TTL is 30s, so 3x buffer)

        console.log(`[LeaderElection] Started lock renewal (every 10s, TTL: ${this.lockTTL}s)`);
    }

    /**
     * Stop automatic lock renewal
     */
    stopRenewal(): void {
        if (this.renewIntervalId) {
            clearInterval(this.renewIntervalId);
            this.renewIntervalId = null;
            console.log(`[LeaderElection] Stopped lock renewal`);
        }
    }

    /**
     * Voluntarily release leadership (for graceful shutdown)
     */
    async releaseLock(): Promise<void> {
        this.stopRenewal();
        const currentHolder = await this.redis.get(this.lockKey);
        if (currentHolder === this.workerId) {
            await this.redis.del(this.lockKey);
            console.log(`[LeaderElection] Released leadership lock`);
        }
    }

    /**
     * Get the current leader's worker ID
     */
    async getCurrentLeader(): Promise<string | null> {
        return await this.redis.get(this.lockKey);
    }

    /**
     * Check if this worker is currently the leader
     */
    async isLeader(): Promise<boolean> {
        const currentHolder = await this.redis.get(this.lockKey);
        return currentHolder === this.workerId;
    }
}
