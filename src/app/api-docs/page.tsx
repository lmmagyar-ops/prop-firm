'use client';

import { useState } from 'react';

// API endpoint definitions
const API_ENDPOINTS = {
    auth: {
        title: '🔐 Authentication',
        endpoints: [
            {
                method: 'POST',
                path: '/api/auth/register',
                description: 'Register a new user account',
                body: { email: 'string', password: 'string' },
                response: { success: true, userId: 'string' },
            },
            {
                method: 'POST',
                path: '/api/auth/verify',
                description: 'Verify email with OTP code',
                body: { email: 'string', code: 'string' },
                response: { success: true },
            },
            {
                method: 'POST',
                path: '/api/auth/resend-code',
                description: 'Resend verification code',
                body: { email: 'string' },
                response: { success: true },
            },
            {
                method: 'GET',
                path: '/api/auth/pending-user',
                description: 'Get pending user registration status',
                response: { email: 'string', createdAt: 'Date' },
            },
        ],
    },
    trading: {
        title: '💰 Trading',
        endpoints: [
            {
                method: 'POST',
                path: '/api/trade/execute',
                description: 'Execute a trade (buy position)',
                auth: true,
                body: { marketId: 'string', amount: 'number', direction: 'YES | NO' },
                response: { success: true, position: { id: 'string', shares: 'number' } },
            },
            {
                method: 'POST',
                path: '/api/trade/close',
                description: 'Close an existing position',
                auth: true,
                body: { positionId: 'string' },
                response: { success: true, pnl: 'number' },
            },
            {
                method: 'GET',
                path: '/api/trade/positions',
                description: 'Get all open positions for the user',
                auth: true,
                response: { positions: [{ id: 'string', marketId: 'string', shares: 'number', direction: 'string' }] },
            },
            {
                method: 'GET',
                path: '/api/trade/position',
                description: 'Get a specific position by market',
                auth: true,
                query: { marketId: 'string', direction: 'YES | NO' },
                response: { position: { id: 'string', shares: 'number', entryPrice: 'number' } },
            },
            {
                method: 'GET',
                path: '/api/orderbook',
                description: 'Get orderbook for a market',
                query: { marketId: 'string' },
                response: { bids: [], asks: [], spread: 'number' },
            },
        ],
    },
    dashboard: {
        title: '📊 Dashboard',
        endpoints: [
            {
                method: 'GET',
                path: '/api/dashboard',
                description: 'Get complete dashboard data including challenge status, balance, and positions',
                auth: true,
                response: {
                    challenge: { id: 'string', phase: 'string', balance: 'number' },
                    positions: [],
                    metrics: {},
                },
            },
            {
                method: 'GET',
                path: '/api/challenges',
                description: 'Get all challenges for the user',
                auth: true,
                response: { challenges: [] },
            },
            {
                method: 'POST',
                path: '/api/challenge/start',
                description: 'Start a new challenge',
                auth: true,
                body: { platform: 'polymarket | kalshi', tier: '5k | 10k | 25k' },
                response: { success: true, challengeId: 'string' },
            },
        ],
    },
    payouts: {
        title: '💸 Payouts',
        endpoints: [
            {
                method: 'GET',
                path: '/api/payout/eligibility',
                description: 'Check payout eligibility for funded account',
                auth: true,
                response: {
                    eligible: true,
                    requirements: {
                        isFunded: true,
                        hasProfit: true,
                        minTradingDays: true,
                        noConsistencyFlag: true,
                    },
                },
            },
            {
                method: 'POST',
                path: '/api/payout/request',
                description: 'Submit a payout request',
                auth: true,
                body: { walletAddress: 'string', network: 'polygon | ethereum' },
                response: { success: true, payoutId: 'string' },
            },
            {
                method: 'GET',
                path: '/api/payout/status',
                description: 'Get status of payout requests',
                auth: true,
                response: { payouts: [{ id: 'string', status: 'string', amount: 'number' }] },
            },
        ],
    },
    admin: {
        title: '👑 Admin',
        endpoints: [
            {
                method: 'GET',
                path: '/api/admin/traders/[id]',
                description: 'Get trader details (admin only)',
                auth: true,
                admin: true,
                response: { trader: { id: 'string', challenges: [] } },
            },
            {
                method: 'GET',
                path: '/api/admin/challenges',
                description: 'Get all challenges with filters',
                auth: true,
                admin: true,
                query: { status: 'string', phase: 'string' },
                response: { challenges: [] },
            },
            {
                method: 'POST',
                path: '/api/admin/actions',
                description: 'Execute admin actions on challenges',
                auth: true,
                admin: true,
                body: { action: 'approve | reject | flag', challengeId: 'string' },
                response: { success: true },
            },
            {
                method: 'GET',
                path: '/api/admin/analytics',
                description: 'Get platform analytics',
                auth: true,
                admin: true,
                response: { totalUsers: 'number', activeChallenges: 'number', revenue: 'number' },
            },
            {
                method: 'GET',
                path: '/api/admin/risk-alerts',
                description: 'Get active risk alerts',
                auth: true,
                admin: true,
                response: { alerts: [] },
            },
        ],
    },
    system: {
        title: '⚙️ System',
        endpoints: [
            {
                method: 'POST',
                path: '/api/cron/daily-reset',
                description: 'Daily balance reset job (cron only)',
                auth: 'CRON_SECRET',
                response: { success: true, processed: 'number' },
            },
            {
                method: 'POST',
                path: '/api/cron/inactivity-check',
                description: 'Check for inactive funded accounts (cron only)',
                auth: 'CRON_SECRET',
                response: { success: true, terminated: 'number' },
            },
            {
                method: 'GET',
                path: '/api/refresh-markets',
                description: 'Refresh market data from providers',
                response: { success: true, marketsUpdated: 'number' },
            },
            {
                method: 'POST',
                path: '/api/webhooks/confirmo',
                description: 'Confirmo payment webhook',
                response: { received: true },
            },
        ],
    },
};

type Endpoint = {
    method: string;
    path: string;
    description: string;
    auth?: boolean | string;
    admin?: boolean;
    body?: Record<string, string>;
    query?: Record<string, string>;
    response: Record<string, unknown>;
};

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
    const [expanded, setExpanded] = useState(false);

    const methodColors: Record<string, string> = {
        GET: 'bg-green-500/20 text-green-400 border-green-500/30',
        POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
            >
                <span className={`px-2 py-1 rounded text-xs font-mono font-bold border ${methodColors[endpoint.method]}`}>
                    {endpoint.method}
                </span>
                <code className="text-white/80 font-mono text-sm flex-1">{endpoint.path}</code>
                {endpoint.auth && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                        {endpoint.auth === true ? '🔒 Auth' : endpoint.auth === 'CRON_SECRET' ? '🔑 Cron' : '🔐'}
                    </span>
                )}
                {endpoint.admin && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">👑 Admin</span>
                )}
                <svg
                    className={`w-5 h-5 text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                    <p className="text-white/60 text-sm pt-3">{endpoint.description}</p>

                    {endpoint.body && (
                        <div>
                            <h4 className="text-xs font-semibold text-white/40 uppercase mb-2">Request Body</h4>
                            <pre className="bg-black/30 rounded p-3 text-sm text-green-400 overflow-x-auto">
                                {JSON.stringify(endpoint.body, null, 2)}
                            </pre>
                        </div>
                    )}

                    {endpoint.query && (
                        <div>
                            <h4 className="text-xs font-semibold text-white/40 uppercase mb-2">Query Parameters</h4>
                            <pre className="bg-black/30 rounded p-3 text-sm text-blue-400 overflow-x-auto">
                                {JSON.stringify(endpoint.query, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-semibold text-white/40 uppercase mb-2">Response</h4>
                        <pre className="bg-black/30 rounded p-3 text-sm text-amber-400 overflow-x-auto">
                            {JSON.stringify(endpoint.response, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ApiDocsPage() {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="max-w-5xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            API Documentation
                        </span>
                    </h1>
                    <p className="text-white/60 text-lg">
                        Complete reference for the PropFirm API. All endpoints require authentication unless specified.
                    </p>
                    <div className="mt-4 flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Base URL: <code className="text-white/80">https://your-domain.com</code>
                        </div>
                    </div>
                </div>

                {/* Quick Navigation */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {Object.entries(API_ENDPOINTS).map(([key, section]) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(activeSection === key ? null : key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === key
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                        >
                            {section.title}
                        </button>
                    ))}
                </div>

                {/* Endpoints */}
                <div className="space-y-8">
                    {Object.entries(API_ENDPOINTS)
                        .filter(([key]) => !activeSection || activeSection === key)
                        .map(([key, section]) => (
                            <section key={key}>
                                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                                <div className="space-y-2">
                                    {(section.endpoints as Endpoint[]).map((endpoint, idx) => (
                                        <EndpointCard key={idx} endpoint={endpoint} />
                                    ))}
                                </div>
                            </section>
                        ))}
                </div>

                {/* Auth Info */}
                <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">🔐 Authentication</h3>
                    <p className="text-white/70 text-sm">
                        Most endpoints require authentication via session cookies (handled automatically by NextAuth.js).
                        For cron jobs, use the <code className="bg-black/30 px-1 rounded">x-cron-secret</code> header
                        with your <code className="bg-black/30 px-1 rounded">CRON_SECRET</code> environment variable.
                    </p>
                </div>

                {/* Rate Limiting */}
                <div className="mt-4 p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <h3 className="text-lg font-semibold text-amber-400 mb-2">⚡ Rate Limiting</h3>
                    <p className="text-white/70 text-sm">
                        API endpoints are rate-limited to <strong>100 requests per minute</strong> per IP address.
                        Exceeding this limit returns a <code className="bg-black/30 px-1 rounded">429 Too Many Requests</code> response.
                    </p>
                </div>
            </div>
        </div>
    );
}
