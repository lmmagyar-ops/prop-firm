import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArbitrageDetector } from "./arbitrage-detector";

// Mock dependencies
vi.mock("@/db", () => ({
    db: {
        query: {
            positions: {
                findFirst: vi.fn(),
                findMany: vi.fn()
            }
        }
    }
}));

vi.mock("@/app/actions/market", () => ({
    getActiveEvents: vi.fn()
}));

// Import after mocking
import { db } from "@/db";
import { getActiveEvents } from "@/app/actions/market";

describe("ArbitrageDetector.wouldCreateArbitrage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: no events (standalone market)
        vi.mocked(getActiveEvents).mockResolvedValue([]);
    });

    // --- Binary Market Tests ---

    it("should allow trade when no existing position", async () => {
        vi.mocked(db.query.positions.findFirst).mockResolvedValue(undefined);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ArbitrageDetector.wouldCreateArbitrage(
            "challenge-1",
            "market-1",
            "YES"
        );

        expect(result.isArb).toBe(false);
    });

    it("should block YES trade when holding NO position (binary arb)", async () => {
        const existingNoPosition = {
            id: "pos-1",
            challengeId: "challenge-1",
            marketId: "market-1",
            direction: "NO",
            shares: "100.00",
            status: "OPEN"
        };

        vi.mocked(db.query.positions.findFirst).mockResolvedValue(existingNoPosition as any);

        const result = await ArbitrageDetector.wouldCreateArbitrage(
            "challenge-1",
            "market-1",
            "YES" // Trying to buy YES when holding NO
        );

        expect(result.isArb).toBe(true);
        expect(result.reason).toContain("NO position");
        expect(result.reason).toContain("Close it before opening a YES");
    });

    it("should block NO trade when holding YES position (binary arb)", async () => {
        const existingYesPosition = {
            id: "pos-1",
            challengeId: "challenge-1",
            marketId: "market-1",
            direction: "YES",
            shares: "50.00",
            status: "OPEN"
        };

        vi.mocked(db.query.positions.findFirst).mockResolvedValue(existingYesPosition as any);

        const result = await ArbitrageDetector.wouldCreateArbitrage(
            "challenge-1",
            "market-1",
            "NO" // Trying to buy NO when holding YES
        );

        expect(result.isArb).toBe(true);
        expect(result.reason).toContain("YES position");
        expect(result.reason).toContain("Close it before opening a NO");
    });

    // --- Multi-Runner Market Tests ---

    it("should block when buying final outcome in multi-runner market (multi-runner arb)", async () => {
        // No opposite direction position (binary check passes)
        vi.mocked(db.query.positions.findFirst).mockResolvedValue(undefined);

        // User already holds 2 of 3 outcomes
        const existingPositions = [
            { id: "pos-1", marketId: "candidate-trump", direction: "YES", status: "OPEN" },
            { id: "pos-2", marketId: "candidate-biden", direction: "YES", status: "OPEN" }
        ];
        vi.mocked(db.query.positions.findMany).mockResolvedValue(existingPositions as any);

        // Multi-runner event with 3 outcomes
        const mockEvent = {
            id: "event-election",
            title: "Who wins 2024?",
            markets: [
                { id: "candidate-trump", question: "Trump wins?", price: 0.45, volume: 1000000 },
                { id: "candidate-biden", question: "Biden wins?", price: 0.35, volume: 1000000 },
                { id: "candidate-desantis", question: "DeSantis wins?", price: 0.20, volume: 500000 }
            ],
            isMultiOutcome: true
        };
        vi.mocked(getActiveEvents).mockResolvedValue([mockEvent] as any);

        // User tries to buy the 3rd outcome (DeSantis) - would complete arb
        const result = await ArbitrageDetector.wouldCreateArbitrage(
            "challenge-1",
            "candidate-desantis",
            "YES",
            "kalshi"
        );

        expect(result.isArb).toBe(true);
        expect(result.reason).toContain("2 other outcome(s)");
        expect(result.reason).toContain("risk-free profit");
    });

    it("should allow buying second outcome in multi-runner market (not yet arb)", async () => {
        // No opposite direction position
        vi.mocked(db.query.positions.findFirst).mockResolvedValue(undefined);

        // User only holds 1 of 3 outcomes
        const existingPositions = [
            { id: "pos-1", marketId: "candidate-trump", direction: "YES", status: "OPEN" }
        ];
        vi.mocked(db.query.positions.findMany).mockResolvedValue(existingPositions as any);

        // Multi-runner event
        const mockEvent = {
            id: "event-election",
            title: "Who wins 2024?",
            markets: [
                { id: "candidate-trump", question: "Trump wins?", price: 0.45, volume: 1000000 },
                { id: "candidate-biden", question: "Biden wins?", price: 0.35, volume: 1000000 },
                { id: "candidate-desantis", question: "DeSantis wins?", price: 0.20, volume: 500000 }
            ],
            isMultiOutcome: true
        };
        vi.mocked(getActiveEvents).mockResolvedValue([mockEvent] as any);

        // User tries to buy 2nd outcome (Biden) - still allowed, not arb yet
        const result = await ArbitrageDetector.wouldCreateArbitrage(
            "challenge-1",
            "candidate-biden",
            "YES",
            "kalshi"
        );

        expect(result.isArb).toBe(false);
    });
});
