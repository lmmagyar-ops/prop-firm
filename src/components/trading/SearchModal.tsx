"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventMetadata } from "@/app/actions/market";

interface SearchModalProps {
    events: EventMetadata[];
    onSelectEvent: (event: EventMetadata) => void;
}

// Detect if user is on Mac
function useIsMac() {
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        const isMacOS = typeof navigator !== 'undefined' &&
            (navigator.platform?.toLowerCase().includes('mac') ||
                navigator.userAgent?.toLowerCase().includes('mac'));
        setIsMac(isMacOS);
    }, []);

    return isMac;
}

export function SearchModal({ events, onSelectEvent }: SearchModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const isMac = useIsMac();

    // Filter events based on query
    const filteredEvents = query.trim()
        ? events.filter(event =>
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.markets.some(m => m.question.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 8)
        : events.slice(0, 6); // Show top events when no query

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery("");
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredEvents.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && filteredEvents[selectedIndex]) {
            handleSelect(filteredEvents[selectedIndex]);
        }
    };

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selectedEl = resultsRef.current.children[selectedIndex] as HTMLElement;
            selectedEl?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    const handleSelect = (event: EventMetadata) => {
        onSelectEvent(event);
        setIsOpen(false);
    };

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    const getTopPrice = (event: EventMetadata) => {
        if (event.markets.length === 0) return null;
        return Math.round(event.markets[0].price * 100);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-white/10 rounded-lg text-sm text-zinc-400 transition-all"
            >
                <Search className="w-4 h-4" />
                <span>Search markets...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-700 rounded text-xs text-zinc-400">
                    {isMac ? '⌘' : 'Ctrl+'}K
                </kbd>
            </button>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50">
                <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                        <Search className="w-5 h-5 text-zinc-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search markets, events, outcomes..."
                            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            <X className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>

                    {/* Results */}
                    <div ref={resultsRef} className="max-h-[400px] overflow-y-auto">
                        {/* Section Header */}
                        <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            {query ? (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    Results
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="w-3 h-3" />
                                    Trending Markets
                                </>
                            )}
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div className="px-4 py-8 text-center text-zinc-500">
                                No markets found for "{query}"
                            </div>
                        ) : (
                            filteredEvents.map((event, i) => (
                                <button
                                    key={event.id}
                                    onClick={() => handleSelect(event)}
                                    className={cn(
                                        "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                                        i === selectedIndex
                                            ? "bg-blue-500/20"
                                            : "hover:bg-white/5"
                                    )}
                                >
                                    {/* Thumbnail */}
                                    {event.image ? (
                                        <img
                                            src={event.image}
                                            alt=""
                                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-5 h-5 text-zinc-600" />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {event.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                                            <span>{formatVolume(event.volume)} Vol.</span>
                                            <span>•</span>
                                            <span>{event.markets.length} outcomes</span>
                                            {event.categories?.[0] && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize">{event.categories[0]}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Top Price */}
                                    {getTopPrice(event) !== null && (
                                        <div className={cn(
                                            "text-sm font-bold tabular-nums shrink-0",
                                            getTopPrice(event)! >= 50 ? "text-emerald-400" : "text-zinc-400"
                                        )}>
                                            {getTopPrice(event)}%
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                                Select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd>
                                Close
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
