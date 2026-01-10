/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMarketPolling } from "./useMarketPolling";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useMarketPolling", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches events on mount", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                events: [{ id: "1", question: "Test Market" }],
            }),
        });

        const { result } = renderHook(() => useMarketPolling("polymarket"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockFetch).toHaveBeenCalledWith("/api/markets/events?platform=polymarket");
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].id).toBe("1");
    });

    it("polls at the specified interval", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        renderHook(() => useMarketPolling("polymarket", { intervalMs: 5000 }));

        // Initial fetch
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        // Advance time by 5 seconds
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Advance time by another 5 seconds
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("handles fetch errors gracefully", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() => useMarketPolling("polymarket"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Network error");
        expect(result.current.events).toEqual([]);
    });

    it("cleans up interval on unmount", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        const { unmount } = renderHook(() => useMarketPolling("polymarket"));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        // Unmount the hook
        unmount();

        // Advance time - should NOT trigger more fetches
        await act(async () => {
            vi.advanceTimersByTime(20000);
        });

        // Still only 1 call (the initial one)
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("refetches when platform changes", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        const { result, rerender } = renderHook(
            ({ platform }: { platform: "polymarket" | "kalshi" }) => useMarketPolling(platform),
            { initialProps: { platform: "polymarket" as "polymarket" | "kalshi" } }
        );

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/markets/events?platform=polymarket");
        });

        // Change platform
        rerender({ platform: "kalshi" });

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/markets/events?platform=kalshi");
        });
    });

    it("does not poll when disabled", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        renderHook(() => useMarketPolling("polymarket", { enabled: false }));

        // Advance time
        await act(async () => {
            vi.advanceTimersByTime(30000);
        });

        // Should not have fetched at all
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
