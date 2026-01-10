"use client";

import { useState, useEffect } from "react";

interface ChallengeInfo {
    id: string;
    status: string;
    currentBalance: string;
    platform: string;
}

interface MarketOption {
    id: string;
    title: string;
    price: number;
}

interface TradeResult {
    success: boolean;
    trade?: {
        id: string;
        price: string;
        shares: string;
        amount: string;
    };
    error?: string;
    debug?: string;
}

export default function TradeTestPage() {
    // State
    const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
    const [markets, setMarkets] = useState<MarketOption[]>([]);
    const [selectedMarketId, setSelectedMarketId] = useState("");
    const [amount, setAmount] = useState(100);
    const [direction, setDirection] = useState<"YES" | "NO">("YES");
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<TradeResult | null>(null);

    // Add log helper
    const log = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
        console.log(`[TradeTest] ${message}`);
    };

    // Fetch challenge info on mount
    useEffect(() => {
        log("Fetching challenge info...");
        fetch("/api/user/challenge")
            .then(res => res.json())
            .then(data => {
                if (data.challenge) {
                    setChallenge(data.challenge);
                    log(`✅ Challenge loaded: ${data.challenge.id.slice(0, 8)}...`);
                    log(`   Status: ${data.challenge.status}, Balance: $${data.challenge.currentBalance}`);
                } else {
                    log("❌ No active challenge found");
                }
            })
            .catch(err => {
                log(`❌ Error fetching challenge: ${err.message}`);
            });
    }, []);

    // Fetch markets from Redis
    useEffect(() => {
        log("Fetching available markets...");
        fetch("/api/markets/events?platform=polymarket")
            .then(res => res.json())
            .then(data => {
                if (data.events && data.events.length > 0) {
                    // Flatten markets from events
                    const allMarkets: MarketOption[] = [];
                    for (const event of data.events.slice(0, 10)) {
                        for (const market of event.markets || []) {
                            allMarkets.push({
                                id: market.id,
                                title: `${event.title}: ${market.question}`.slice(0, 80),
                                price: market.price
                            });
                        }
                    }
                    setMarkets(allMarkets.slice(0, 20));
                    if (allMarkets.length > 0) {
                        setSelectedMarketId(allMarkets[0].id);
                    }
                    log(`✅ Loaded ${allMarkets.length} markets`);
                } else {
                    log("⚠️ No markets found in Redis");
                }
            })
            .catch(err => {
                log(`❌ Error fetching markets: ${err.message}`);
            });
    }, []);

    // Execute trade
    const executeTrade = async () => {
        if (!challenge) {
            log("❌ No active challenge - cannot trade");
            return;
        }
        if (!selectedMarketId) {
            log("❌ No market selected");
            return;
        }
        if (amount <= 0) {
            log("❌ Amount must be > 0");
            return;
        }

        setLoading(true);
        setResult(null);
        log("═══════════════════════════════════════════");
        log(`🚀 EXECUTING TRADE`);
        log(`   Market: ${selectedMarketId.slice(0, 20)}...`);
        log(`   Amount: $${amount}`);
        log(`   Direction: ${direction}`);
        log("═══════════════════════════════════════════");

        try {
            const response = await fetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    marketId: selectedMarketId,
                    outcome: direction,
                    amount: amount
                })
            });

            const data = await response.json();

            if (!response.ok) {
                log(`❌ TRADE FAILED: ${data.error}`);
                if (data.debug) {
                    log(`   Debug: ${data.debug.slice(0, 200)}...`);
                }
                setResult({ success: false, error: data.error, debug: data.debug });
            } else {
                log(`✅ TRADE SUCCESSFUL`);
                log(`   Trade ID: ${data.trade?.id}`);
                log(`   Price: ${data.trade?.price}`);
                log(`   Shares: ${data.trade?.shares}`);
                setResult({ success: true, trade: data.trade });

                // Refresh challenge balance
                fetch("/api/user/challenge")
                    .then(res => res.json())
                    .then(d => {
                        if (d.challenge) {
                            setChallenge(d.challenge);
                            log(`   New Balance: $${d.challenge.currentBalance}`);
                        }
                    });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            log(`❌ NETWORK ERROR: ${message}`);
            setResult({ success: false, error: message });
        } finally {
            setLoading(false);
            log("═══════════════════════════════════════════");
        }
    };

    const selectedMarket = markets.find(m => m.id === selectedMarketId);

    return (
        <div style={{
            fontFamily: "monospace",
            padding: "20px",
            maxWidth: "900px",
            margin: "0 auto",
            backgroundColor: "#0a0a0a",
            color: "#00ff00",
            minHeight: "100vh"
        }}>
            <h1 style={{ borderBottom: "2px solid #00ff00", paddingBottom: "10px" }}>
                🔧 TRADE ENGINE TEST HARNESS
            </h1>
            <p style={{ color: "#888", marginBottom: "30px" }}>
                Bare metal testing - no UI complexity, just raw engine calls
            </p>

            {/* Challenge Info */}
            <section style={{
                border: "1px solid #333",
                padding: "15px",
                marginBottom: "20px",
                backgroundColor: "#111"
            }}>
                <h2 style={{ margin: "0 0 10px 0", color: "#fff" }}>📊 Challenge Status</h2>
                {challenge ? (
                    <div>
                        <div>ID: <span style={{ color: "#0ff" }}>{challenge.id}</span></div>
                        <div>Status: <span style={{ color: challenge.status === "active" ? "#0f0" : "#f00" }}>{challenge.status}</span></div>
                        <div>Balance: <span style={{ color: "#ff0" }}>${challenge.currentBalance}</span></div>
                        <div>Platform: <span style={{ color: "#0ff" }}>{challenge.platform}</span></div>
                    </div>
                ) : (
                    <div style={{ color: "#f00" }}>❌ No active challenge found. Purchase or start one first.</div>
                )}
            </section>

            {/* Trade Controls */}
            <section style={{
                border: "1px solid #333",
                padding: "15px",
                marginBottom: "20px",
                backgroundColor: "#111"
            }}>
                <h2 style={{ margin: "0 0 15px 0", color: "#fff" }}>⚙️ Trade Parameters</h2>

                {/* Market Select */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Market:</label>
                    <select
                        value={selectedMarketId}
                        onChange={(e) => setSelectedMarketId(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#222",
                            color: "#0f0",
                            border: "1px solid #444",
                            fontFamily: "monospace",
                            fontSize: "12px"
                        }}
                    >
                        {markets.length === 0 && <option>Loading markets...</option>}
                        {markets.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.title} ({(m.price * 100).toFixed(0)}¢)
                            </option>
                        ))}
                    </select>
                    {selectedMarket && (
                        <div style={{ marginTop: "5px", fontSize: "11px", color: "#666" }}>
                            Full ID: {selectedMarketId}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Amount ($):</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        style={{
                            width: "200px",
                            padding: "10px",
                            backgroundColor: "#222",
                            color: "#ff0",
                            border: "1px solid #444",
                            fontFamily: "monospace",
                            fontSize: "16px"
                        }}
                    />
                    <div style={{ marginTop: "5px", display: "flex", gap: "5px" }}>
                        {[10, 50, 100, 500].map(v => (
                            <button
                                key={v}
                                onClick={() => setAmount(v)}
                                style={{
                                    padding: "5px 10px",
                                    backgroundColor: amount === v ? "#0f0" : "#333",
                                    color: amount === v ? "#000" : "#0f0",
                                    border: "1px solid #0f0",
                                    cursor: "pointer",
                                    fontFamily: "monospace"
                                }}
                            >
                                ${v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Direction */}
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Direction:</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={() => setDirection("YES")}
                            style={{
                                padding: "15px 40px",
                                backgroundColor: direction === "YES" ? "#00cc66" : "#222",
                                color: direction === "YES" ? "#000" : "#00cc66",
                                border: "2px solid #00cc66",
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: "18px",
                                fontWeight: "bold"
                            }}
                        >
                            YES
                        </button>
                        <button
                            onClick={() => setDirection("NO")}
                            style={{
                                padding: "15px 40px",
                                backgroundColor: direction === "NO" ? "#cc3366" : "#222",
                                color: direction === "NO" ? "#fff" : "#cc3366",
                                border: "2px solid #cc3366",
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: "18px",
                                fontWeight: "bold"
                            }}
                        >
                            NO
                        </button>
                    </div>
                </div>

                {/* Execute Button */}
                <button
                    onClick={executeTrade}
                    disabled={loading || !challenge || !selectedMarketId}
                    style={{
                        width: "100%",
                        padding: "20px",
                        backgroundColor: loading ? "#444" : "#0f0",
                        color: "#000",
                        border: "none",
                        cursor: loading ? "wait" : "pointer",
                        fontFamily: "monospace",
                        fontSize: "20px",
                        fontWeight: "bold"
                    }}
                >
                    {loading ? "⏳ EXECUTING..." : "🚀 EXECUTE TRADE"}
                </button>
            </section>

            {/* Result */}
            {result && (
                <section style={{
                    border: `2px solid ${result.success ? "#0f0" : "#f00"}`,
                    padding: "15px",
                    marginBottom: "20px",
                    backgroundColor: result.success ? "#001100" : "#110000"
                }}>
                    <h2 style={{
                        margin: "0 0 10px 0",
                        color: result.success ? "#0f0" : "#f00"
                    }}>
                        {result.success ? "✅ TRADE RESULT" : "❌ TRADE ERROR"}
                    </h2>
                    {result.success && result.trade ? (
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                            {`Trade ID:  ${result.trade.id}
Price:     ${result.trade.price}
Shares:    ${result.trade.shares}
Amount:    $${result.trade.amount}`}
                        </pre>
                    ) : (
                        <div>
                            <div style={{ color: "#f00", marginBottom: "10px" }}>
                                Error: {result.error}
                            </div>
                            {result.debug && (
                                <details>
                                    <summary style={{ cursor: "pointer", color: "#888" }}>Debug Info</summary>
                                    <pre style={{
                                        fontSize: "10px",
                                        color: "#666",
                                        whiteSpace: "pre-wrap",
                                        marginTop: "10px"
                                    }}>
                                        {result.debug}
                                    </pre>
                                </details>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Console Log */}
            <section style={{
                border: "1px solid #333",
                padding: "15px",
                backgroundColor: "#000"
            }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px"
                }}>
                    <h2 style={{ margin: 0, color: "#fff" }}>📝 Console Log</h2>
                    <button
                        onClick={() => setLogs([])}
                        style={{
                            padding: "5px 10px",
                            backgroundColor: "#333",
                            color: "#888",
                            border: "1px solid #444",
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: "11px"
                        }}
                    >
                        Clear
                    </button>
                </div>
                <div style={{
                    height: "300px",
                    overflowY: "auto",
                    backgroundColor: "#000",
                    padding: "10px",
                    fontSize: "12px",
                    lineHeight: "1.4"
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: "#444" }}>Waiting for actions...</div>
                    ) : (
                        logs.map((line, i) => (
                            <div key={i} style={{
                                color: line.includes("❌") ? "#f00" :
                                    line.includes("✅") ? "#0f0" :
                                        line.includes("⚠️") ? "#ff0" : "#0f0"
                            }}>
                                {line}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
