"use client";

import { useState } from "react";

const CHALLENGE_TYPES = [
    { id: "1-step", label: "1-Step Challenge" },
    { id: "2-step", label: "2-Step Challenge" },
    { id: "3-step", label: "3-Step Challenge" },
];

const CHALLENGE_DATA = {
    "1-step": [
        {
            name: "1-Step Challenge",
            accountSize: "$5,000",
            price: "$49",
            terms: [
                { label: "Profit target", value: "10%" },
                { label: "Maximum drawdown", value: "8%" },
                { label: "Daily drawdown", value: "4%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "1-Step Challenge",
            accountSize: "$10,000",
            price: "$99",
            terms: [
                { label: "Profit target", value: "10%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "1-Step Challenge",
            accountSize: "$25,000",
            price: "$199",
            terms: [
                { label: "Profit target", value: "10%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
    ],
    "2-step": [
        {
            name: "2-Step Challenge",
            accountSize: "$5,000",
            price: "$39",
            terms: [
                { label: "Profit target", value: "8% / 5%" },
                { label: "Maximum drawdown", value: "8%" },
                { label: "Daily drawdown", value: "4%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "2-Step Challenge",
            accountSize: "$10,000",
            price: "$79",
            terms: [
                { label: "Profit target", value: "8% / 5%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "2-Step Challenge",
            accountSize: "$25,000",
            price: "$149",
            terms: [
                { label: "Profit target", value: "8% / 5%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
    ],
    "3-step": [
        {
            name: "3-Step Challenge",
            accountSize: "$5,000",
            price: "$29",
            terms: [
                { label: "Profit target", value: "5% / 5% / 5%" },
                { label: "Maximum drawdown", value: "8%" },
                { label: "Daily drawdown", value: "4%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "3-Step Challenge",
            accountSize: "$10,000",
            price: "$59",
            terms: [
                { label: "Profit target", value: "5% / 5% / 5%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
        {
            name: "3-Step Challenge",
            accountSize: "$25,000",
            price: "$119",
            terms: [
                { label: "Profit target", value: "5% / 5% / 5%" },
                { label: "Maximum drawdown", value: "10%" },
                { label: "Daily drawdown", value: "5%" },
                { label: "Maximum trading days", value: "Infinite" },
                { label: "Minimum trading days", value: "0" },
                { label: "Profit split", value: "80%" },
                { label: "Payout frequency", value: "14 Days" },
            ],
        },
    ],
};

export function ChallengeSelectorV2() {
    const [activeTab, setActiveTab] = useState<keyof typeof CHALLENGE_DATA>("1-step");
    const cards = CHALLENGE_DATA[activeTab];

    return (
        <section id="pricing" className="v2-challenges">
            <div className="v2-container">
                <h2 className="v2-heading-serif">
                    Choose your <span className="accent">challenge</span>
                </h2>

                {/* Tabs */}
                <div className="v2-challenge-tabs">
                    {CHALLENGE_TYPES.map((type) => (
                        <button
                            key={type.id}
                            className={`v2-challenge-tab ${activeTab === type.id ? "active" : ""}`}
                            onClick={() => setActiveTab(type.id as keyof typeof CHALLENGE_DATA)}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Cards */}
                <div className="v2-challenge-cards">
                    {cards.map((card, idx) => (
                        <div key={idx} className="v2-card v2-challenge-card">
                            <h3>{card.accountSize} Account</h3>
                            <div className="price">{card.price}</div>
                            <div className="refund-note">Refundable on the third withdrawal</div>

                            <div className="terms">
                                {card.terms.map((term, termIdx) => (
                                    <div key={termIdx} className="term-row">
                                        <span className="term-label">{term.label}</span>
                                        <span className="term-value">{term.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
