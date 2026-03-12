# Pre-Launch Code Review Guide

> **Context for Reviewer:** This is a simulated prop trading platform. Users pay real money (crypto via Confirmo) for a "challenge" evaluation. If they pass, they get a funded account and can request payouts (profit split). All trading is simulated against Polymarket prediction market data — we don't execute real trades, but money flows in (challenge fees) and out (payouts). Getting any financial path wrong means losing money or paying money we don't owe.

---

## Tier 1: "We Lose Money If This Is Wrong" — START HERE

These files control every dollar in and out. A bug here = direct financial loss.

### 💰 Trade Execution Engine
| File | Lines | What It Does |
|------|-------|-------------|
| [trade.ts](src/lib/trade.ts) | 424 | Core trade executor — opens/closes positions, calculates VWAP, updates balances |
| [BalanceManager.ts](src/lib/trading/BalanceManager.ts) | 208 | ALL balance mutations go through here — deduct, credit, reset. Negative balance guard |
| [PositionManager.ts](src/lib/trading/PositionManager.ts) | 123 | Position open/close/reduce. Must always insert SELL trade record on close |
| [position-utils.ts](src/lib/position-utils.ts) | 172 | Single source of truth for PnL, equity, position value calculations |

**Key questions the reviewer should answer:**
1. Can a user end up with a negative balance through any code path?
2. Is the position close → SELL trade record invariant maintained in ALL closure paths?
3. Does the VWAP/order book walk math look correct?
4. Are all DB operations properly atomic (transaction boundaries)?

### 💸 Payment & Payout Pipeline
| File | Lines | What It Does |
|------|-------|-------------|
| [confirmo webhook](src/app/api/webhooks/confirmo/route.ts) | 354 | Receives payment confirmations → creates challenge. Signature verification + idempotency |
| [payout request](src/app/api/payout/request/route.ts) | 83 | User requests payout → validates eligibility, calculates split |
| [settlement.ts](src/lib/settlement.ts) | 201 | Resolves positions when Polymarket markets settle |

**Key questions:**
1. Can a webhook be replayed to create duplicate challenges/credits?
2. Can a user request a payout larger than their actual profit?
3. Is the profit split calculation correct (80/90% to trader)?

### ⚖️ Challenge Evaluation (Pass/Fail Logic)
| File | Lines | What It Does |
|------|-------|-------------|
| [evaluator.ts](src/lib/evaluator.ts) | 426 | Post-trade evaluation — checks profit target hit, drawdown breach, time expiry |
| [risk-monitor.ts](src/workers/risk-monitor.ts) | 507 | 30-second polling loop — real-time breach detection, auto-closes positions |

> [!IMPORTANT]
> **These two files do the same thing via different paths.** `evaluator.ts` runs after every trade. `risk-monitor.ts` runs every 30s asynchronously. Both can pass or fail a challenge. If they disagree or have different math, that's a serious bug. This has happened before.

**Key questions:**
1. Do both files use the exact same equity/drawdown formula?
2. Can a user pass a challenge via one path and fail via the other simultaneously (race condition)?
3. When a challenge passes, are ALL positions closed atomically before transitioning to funded?

---

## Tier 2: "Users Can Exploit This" — Security & Auth

### 🔐 Authentication & Authorization
| File | Lines | What It Does |
|------|-------|-------------|
| [middleware.ts](src/middleware.ts) | 146 | CSP headers, rate limiting, route protection |
| [admin-auth.ts](src/lib/admin-auth.ts) | 80 | `requireAdmin()` guard for admin API routes |
| [auth config](src/lib/auth.ts) | — | NextAuth v5 config (Google OAuth + email/password) |

**Key questions:**
1. Are all 91 API routes properly auth-gated? (Public routes that should be public: health, system status, auth/*, markets, webhooks, affiliate tracking, page-view events)
2. Can a non-admin user hit admin API routes?
3. Is the rate limiting actually effective, or trivially bypassable?
4. Is the Confirmo webhook signature verification correct?

### 🛡️ Risk Engine (Pre-Trade Validation)
| File | Lines | What It Does |
|------|-------|-------------|
| [risk.ts](src/lib/risk.ts) | 569 | 9-layer pre-trade risk validation — drawdown limits, exposure caps, liquidity checks |

**Key questions:**
1. Can any of the 9 risk rules be bypassed by crafting specific trade parameters?
2. Are the exposure calculations correct when a user has multiple positions in the same event?
3. What happens when market data is unavailable — does it fail open or closed?

---

## Tier 3: "Data Corruption" — Schema & Integrity

### 🗄️ Database Schema
| File | Lines | What It Does |
|------|-------|-------------|
| [schema.ts](src/db/schema.ts) | 584 | Drizzle ORM schema — 20+ tables, indexes, relations |

**Key questions:**
1. Are foreign keys and NOT NULL constraints sufficient to prevent orphaned records?
2. Are there any columns that should be NOT NULL but aren't?
3. Are indexes covering the hot query paths (positions by challengeId, trades by positionId)?
4. Is the `Decimal(20,8)` precision sufficient for financial amounts?

### 📋 Business Rules
| File | Lines | What It Does |
|------|-------|-------------|
| [plans.ts](src/config/plans.ts) | 92 | Pricing tiers, profit targets, drawdown limits, profit splits |

**Key question:** Are the numbers in this config actually what the business intends? (Scout $99/5K/10%/6%, Grinder $189/10K/12%/8%, Executive $359/25K/10%/6%)

---

## Tier 4: "Platform Goes Down" — Infrastructure

### 🏗️ Worker & Market Data
| File | Lines | What It Does |
|------|-------|-------------|
| [ingestion.ts](src/workers/ingestion.ts) | 1,254 | Polymarket WebSocket → Redis price pipeline. Biggest file in the codebase |
| [market.ts](src/lib/market.ts) | 670 | MarketService — price lookups, order books, caching |
| [outage-manager.ts](src/lib/outage-manager.ts) | 197 | Exchange halt mode when worker goes down |

**Key questions:**
1. What happens if Redis goes down? Does the platform degrade gracefully?
2. Is the outage detection/recovery logic sound?
3. Can stale prices cause incorrect PnL or breach detection?

---

## Tier 5: "Nice to Know" — Supporting Code

| File | Lines | Purpose |
|------|-------|---------|
| [dashboard-service.ts](src/lib/dashboard-service.ts) | 522 | Dashboard data aggregation |
| [safe-parse.ts](src/lib/safe-parse.ts) | 121 | NaN guard utility |
| [formatters.ts](src/lib/formatters.ts) | 101 | Price/number display formatting |

These are lower risk but still worth a glance.

---

## Suggested Review Order (if time-limited)

If your friend only has a few hours:

| Priority | Time | Focus |
|----------|------|-------|
| **1 hour** | `trade.ts` + `BalanceManager.ts` + `position-utils.ts` | "Can users steal money?" |
| **30 min** | `confirmo/route.ts` + `payout/request/route.ts` | "Can payments be exploited?" |
| **30 min** | `evaluator.ts` + `risk-monitor.ts` | "Do both paths agree on math?" |
| **30 min** | `risk.ts` | "Can risk rules be bypassed?" |
| **30 min** | `schema.ts` + `middleware.ts` | "Are there data/auth holes?" |

Total: ~3 hours for the critical path. The rest is nice-to-have.

---

## How to Run Locally

```bash
npm install
npm run dev          # localhost:3000

# Test suites (no DB needed — all mocked)
npm run test -- --run           # 1,341 tests
npm run test:engine             # 53 assertions — trade engine
npm run test:safety             # 54 assertions — exploit scenarios
npm run test:financial          # PnL cross-checks
npx tsc --noEmit                # Type check
```

## Architecture Quick Reference

- **Stack:** Next.js 15, React 19, Drizzle ORM, Neon Postgres, Railway Redis
- **Auth:** NextAuth v5 (email/password + Google OAuth)
- **DB pattern:** `db` = neon-http (stateless queries), `dbPool` = neon-serverless WebSocket (transactions only)
- **Deployment:** Vercel (app) + Railway (worker)
- **All trading is B-book** — simulated against Polymarket data, never touches real order books
