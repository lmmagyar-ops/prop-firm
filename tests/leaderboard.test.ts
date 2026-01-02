import { describe, it, expect } from 'vitest';

// Helper functions for leaderboard logic
// TODO: Move these to src/lib/leaderboard.ts once implemented

type LeaderboardUser = {
    id: string;
    profit: number;
    volume?: number;
    privacy: 'public' | 'semi_private' | 'fully_private';
    rank?: number;
    name?: string;
};

function sortLeaderboard(users: LeaderboardUser[], sortBy: 'profit' | 'volume'): LeaderboardUser[] {
    const sorted = [...users].sort((a, b) => {
        if (sortBy === 'profit') {
            return b.profit - a.profit;
        }
        return (b.volume || 0) - (a.volume || 0);
    });
    return sorted;
}

function filterLeaderboard(users: LeaderboardUser[]): LeaderboardUser[] {
    return users.filter(user => user.privacy !== 'fully_private');
}

function getLeaderboardDisplayName(user: LeaderboardUser & { rank: number; name: string }): string {
    if (user.privacy === 'public') {
        return user.name;
    }
    return `Trader #${user.rank}`;
}

function assignRanks(users: LeaderboardUser[]): (LeaderboardUser & { rank: number })[] {
    return users.map((user, index) => ({
        ...user,
        rank: index + 1,
    }));
}

// ===== TESTS =====

describe('Leaderboard Sorting', () => {
    it('sorts by total profit (highest first)', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 12000, privacy: 'public' as const },
            { id: '3', profit: 8000, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'profit');
        expect(sorted[0].id).toBe('2'); // 12000
        expect(sorted[1].id).toBe('3'); // 8000
        expect(sorted[2].id).toBe('1'); // 5000
    });

    it('sorts by trading volume when specified', () => {
        const users = [
            { id: '1', profit: 5000, volume: 500000, privacy: 'public' as const },
            { id: '2', profit: 3000, volume: 1200000, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'volume');
        expect(sorted[0].id).toBe('2'); // Higher volume
        expect(sorted[1].id).toBe('1');
    });

    it('handles equal profits correctly', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 5000, privacy: 'public' as const },
            { id: '3', profit: 8000, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'profit');
        expect(sorted[0].id).toBe('3'); // 8000 is highest
        // '1' and '2' could be in either order (stable sort)
        expect([sorted[1].id, sorted[2].id]).toContain('1');
        expect([sorted[1].id, sorted[2].id]).toContain('2');
    });

    it('handles empty user list', () => {
        const users: LeaderboardUser[] = [];
        const sorted = sortLeaderboard(users, 'profit');
        expect(sorted).toHaveLength(0);
    });

    it('handles single user', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'profit');
        expect(sorted).toHaveLength(1);
        expect(sorted[0].id).toBe('1');
    });
});

describe('Privacy Filtering', () => {
    it('excludes fully_private users from leaderboard', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 12000, privacy: 'fully_private' as const },
            { id: '3', profit: 8000, privacy: 'semi_private' as const },
        ];

        const visible = filterLeaderboard(users);
        expect(visible).toHaveLength(2);
        expect(visible.find(u => u.id === '2')).toBeUndefined();
    });

    it('includes public users', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 12000, privacy: 'public' as const },
        ];

        const visible = filterLeaderboard(users);
        expect(visible).toHaveLength(2);
    });

    it('includes semi_private users', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'semi_private' as const },
            { id: '2', profit: 12000, privacy: 'semi_private' as const },
        ];

        const visible = filterLeaderboard(users);
        expect(visible).toHaveLength(2);
    });

    it('shows semi_private users as "Trader #XXX"', () => {
        const user = {
            id: '1',
            profit: 5000,
            privacy: 'semi_private' as const,
            rank: 3,
            name: 'John'
        };
        const display = getLeaderboardDisplayName(user);
        expect(display).toBe('Trader #3');
    });

    it('shows public users with their actual name', () => {
        const user = {
            id: '1',
            profit: 5000,
            privacy: 'public' as const,
            rank: 1,
            name: 'Alice'
        };
        const display = getLeaderboardDisplayName(user);
        expect(display).toBe('Alice');
    });

    it('filters multiple fully_private users', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 12000, privacy: 'fully_private' as const },
            { id: '3', profit: 8000, privacy: 'fully_private' as const },
            { id: '4', profit: 6000, privacy: 'semi_private' as const },
        ];

        const visible = filterLeaderboard(users);
        expect(visible).toHaveLength(2);
        expect(visible.map(u => u.id)).toEqual(['1', '4']);
    });
});

describe('Rank Calculation', () => {
    it('assigns correct ranks after sorting', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 12000, privacy: 'public' as const },
            { id: '3', profit: 8000, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'profit');
        const ranked = assignRanks(sorted);

        expect(ranked.find(u => u.id === '2')?.rank).toBe(1);
        expect(ranked.find(u => u.id === '3')?.rank).toBe(2);
        expect(ranked.find(u => u.id === '1')?.rank).toBe(3);
    });

    it('assigns ranks starting from 1', () => {
        const users = [
            { id: '1', profit: 1000, privacy: 'public' as const },
        ];

        const ranked = assignRanks(users);
        expect(ranked[0].rank).toBe(1);
    });

    it('assigns sequential ranks correctly', () => {
        const users = [
            { id: '1', profit: 100, privacy: 'public' as const },
            { id: '2', profit: 200, privacy: 'public' as const },
            { id: '3', profit: 300, privacy: 'public' as const },
            { id: '4', profit: 400, privacy: 'public' as const },
        ];

        const sorted = sortLeaderboard(users, 'profit');
        const ranked = assignRanks(sorted);

        expect(ranked[0].rank).toBe(1); // 400 profit
        expect(ranked[1].rank).toBe(2); // 300 profit
        expect(ranked[2].rank).toBe(3); // 200 profit
        expect(ranked[3].rank).toBe(4); // 100 profit
    });

    it('handles empty list for ranking', () => {
        const users: LeaderboardUser[] = [];
        const ranked = assignRanks(users);
        expect(ranked).toHaveLength(0);
    });
});

describe('Combined Workflow (Sort → Filter → Rank)', () => {
    it('correctly processes full leaderboard workflow', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const },
            { id: '2', profit: 15000, privacy: 'fully_private' as const }, // Should be filtered out
            { id: '3', profit: 8000, privacy: 'semi_private' as const },
            { id: '4', profit: 12000, privacy: 'public' as const },
            { id: '5', profit: 3000, privacy: 'public' as const },
        ];

        // Step 1: Filter out fully private
        const filtered = filterLeaderboard(users);
        expect(filtered).toHaveLength(4);

        // Step 2: Sort by profit
        const sorted = sortLeaderboard(filtered, 'profit');
        expect(sorted[0].id).toBe('4'); // 12000
        expect(sorted[1].id).toBe('3'); // 8000
        expect(sorted[2].id).toBe('1'); // 5000
        expect(sorted[3].id).toBe('5'); // 3000

        // Step 3: Assign ranks
        const ranked = assignRanks(sorted);
        expect(ranked[0].rank).toBe(1);
        expect(ranked[1].rank).toBe(2);
        expect(ranked[2].rank).toBe(3);
        expect(ranked[3].rank).toBe(4);
    });

    it('preserves privacy settings through workflow', () => {
        const users = [
            { id: '1', profit: 5000, privacy: 'public' as const, name: 'Alice' },
            { id: '2', profit: 8000, privacy: 'semi_private' as const, name: 'Bob' },
        ];

        const filtered = filterLeaderboard(users);
        const sorted = sortLeaderboard(filtered, 'profit');
        const ranked = assignRanks(sorted);

        // Bob should be rank 1 but displayed as "Trader #1"
        const bob = ranked.find(u => u.id === '2')!;
        expect(bob.rank).toBe(1);
        expect(getLeaderboardDisplayName(bob as any)).toBe('Trader #1');

        // Alice should be rank 2 and displayed with name
        const alice = ranked.find(u => u.id === '1')!;
        expect(alice.rank).toBe(2);
        expect(getLeaderboardDisplayName(alice as any)).toBe('Alice');
    });
});
