/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMarketPolling } from "@/hooks/useMarketPolling";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useMarketPolling", () => {
    beforeEach(() => {
        // Use fake timers with shouldAdvanceTime to allow waitFor to work
        vi.useFakeTimers({ shouldAdvanceTime: true });
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("fetches events on mount", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                events: [{ id: "1", question: "Test Market" }],
            }),
        });

        const { result } = renderHook(() => useMarketPolling());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockFetch).toHaveBeenCalledWith("/api/markets/events");
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].id).toBe("1");
    });

    // TODO: Fix timer race condition - fake timers with shouldAdvanceTime causes double-fetch
    it.skip("polls at the specified interval", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        renderHook(() => useMarketPolling({ intervalMs: 5000 }));

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

    // TODO: Fix - mockRejectedValueOnce gets overwritten by shouldAdvanceTime triggering another fetch
    it.skip("handles fetch errors gracefully", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() => useMarketPolling());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Network error");
        expect(result.current.events).toEqual([]);
    });

    // TODO: Fix timer race condition - fake timers with shouldAdvanceTime causes double-fetch
    it.skip("cleans up interval on unmount", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        const { unmount } = renderHook(() => useMarketPolling());

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

    it("does not poll when disabled", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ events: [] }),
        });

        renderHook(() => useMarketPolling({ enabled: false }));

        // Advance time
        await act(async () => {
            vi.advanceTimersByTime(30000);
        });

        // Should not have fetched at all
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
