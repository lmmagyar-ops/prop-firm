# CLAUDE.md — Funded Prediction

> **Funded Prediction** — A simulated trading platform where users trade on Polymarket/Kalshi data with firm capital.

## ⚙️ Engineering Standards (Anthropic-Grade)

### Core Principles
- **One variable per change.** Never mix refactors with behavioral changes. Each commit should be independently revertable.
- **Fail closed on financial/security paths.** If you can't verify something is safe, block it. Never fail open on money or auth.
- **Behavioral tests over unit tests.** Test what the system DOES, not how it's wired. Mock at boundaries, not internals. Beware "mocking mirages" — tests that pass because mocks mirror assumptions, not reality.
- **No dead code.** Don't comment things out "for later." Delete it. Git remembers.

### Before Writing Code
- Always read CLAUDE.md (or equivalent project docs) before making changes.
- Grep for existing patterns before inventing new ones. If there's a `formatPrice()`, use it — don't write `Math.round(price * 100)`.
- Check if the thing you're about to build already exists but isn't wired up (like an orphaned component).

### Code Quality
- No `any` types in production code. Use `unknown` + type narrowing.
- No silent catch blocks. Log or rethrow — never swallow errors.
- No hardcoded values in business logic. Constants belong in config.
- Mark incomplete work with a consistent tag (e.g., `FUTURE(v2):`) — never bare `TODO` without context.

### Verification Discipline
- Run the full test suite after every change, not just the file you edited.
- Browser smoke test any UI change — screenshots prove more than type-checks.
- Cross-reference numbers: if a value appears in the API response AND the DB AND the UI, verify all three match.

### Communication
- Always leave a journal.md entry when completing work.
- When handing off, leave a "Tomorrow Morning" section with prioritized next steps ranked by leverage × risk.
- Document root causes, not just fixes. Future agents need the "why."

---

## 🧠 New Agent? Start Here

1. **Read this file** — full architecture, risk rules, debugging protocols
2. **Run `npm run test:engine`** — 53 assertions across 11 phases prove the trading engine works
3. **Run `npm run test:lifecycle`** — 73 assertions across 7 phases prove the full challenge lifecycle
4. **Run `npm run test:safety`** — 44 assertions proving each critical exploit path (payout, drawdown, transitions) is blocked
5. **Run `npm run test:financial`** — Financial consistency verification (share counts, PnL cross-checks, risk limit messages)
6. **If debugging**, follow the "Number Discrepancy Audit" section — step-by-step protocol with symptom → cause lookup
6. **If data looks wrong**, run `npx tsx scripts/reconcile-positions.ts` to validate positions against trade history
7. **If using the browser subagent**, read `.agent/workflows/browser-agent.md` first — mandatory constraints to prevent spiraling
7. **For manual testing**, see `docs/SMOKE_TEST.md` — 15-minute end-to-end checklist
8. **For history**, see `journal.md` — daily changelog with root causes, commits, and verification results

| Symptom | First Action | Key File |
|---------|-------------|----------|
| Balance wrong | `npm run test:engine` | `scripts/reconcile-positions.ts` |
| PnL shows $0 | Check `trades.positionId` linkage | `admin/activity` route |
| Trade rejected | Check risk engine logs | `src/lib/risk.ts` |
| Prices stale | `GET /api/cron/heartbeat-check` | Railway worker logs |
| NaN in UI | Search for `parseFloat` without guard | `src/lib/safe-parse.ts` |

---

## Quick Start

```bash
# Main App (Dashboard)
npm run dev          # localhost:3000
npm run build        # Production build
npm run lint         # ESLint

# Landing Page (Waitlist) — separate Next.js app
cd propshot-waitlist && npm run dev -- -p 3002

# Database
npm run db:push      # Push Drizzle schema to PostgreSQL (no migration files)
npm run db:check     # Detect schema drift (dry-run push — exits 1 if drift found)

# Testing
npm run test                                    # All Vitest unit tests
npm run test:engine                             # Trading engine verification (53 assertions)
npm run test:lifecycle                          # Full lifecycle simulator (73 assertions)
npm run test:safety                             # Exploit scenario tests (44 assertions)
npm run test:financial                          # Financial consistency verification (share counts, PnL, risk limits)
npm run test:deploy -- https://prop-firmx.vercel.app  # Post-deploy smoke test (HTTP-only, no DB writes)
npm run test:markets                            # Market data quality audit (22 assertions) — OPTIONAL, requires worker running
npm run test:balances                           # Balance integrity verification
npm run test:e2e                                # Playwright smoke tests (10 tests)

# Workers (local)
npx tsx src/workers/ingestion.ts  # Start price ingestion

# Admin
DATABASE_URL="..." npx tsx scripts/grant-admin.ts email@example.com
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL (Two Projects)                       │
│                                                                 │
│  ┌─────────────────────────┐     ┌───────────────────────────┐  │
│  │   Funded Prediction     │     │   Landing Page (Waitlist) │  │
│  │   (Main App / Dashboard)│     │   (propshot-waitlist)     │  │
│  │   Next.js 16            │     │   Next.js                 │  │
│  │   :3000                 │     │   :3002                   │  │
│  └─────────────┬───────────┘     └───────────────────────────┘  │
│                │                                                │
│  ┌─────────────┴─┐  ┌───────────────┐  ┌───────────────────┐    │
│  │   API Routes  │  │  Prisma Pg    │  │   Railway Redis   │    │
│  │   (Logic)     │  │  (Database)   │  │   (Cache/Queue)   │    │
│  └───────────────┘  └───────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ingestion-worker                                          │  │
│  │  - Polymarket WebSocket (live prices)                      │  │
│  │  - RiskMonitor (5s breach detection)                       │  │
│  │  - Health server (:3001/health)                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Database** | Prisma Postgres (Vercel), Drizzle ORM |
| **Cache** | Railway Redis (flat-rate, via REDIS_URL) |
| **Auth** | NextAuth v5 (email/password + Google OAuth) |
| **UI** | Tailwind v4, Shadcn/ui, Framer Motion |
| **Real-time** | Redis pub/sub, WebSocket streams |
| **Markets** | Polymarket CLOB, Kalshi API |
| **Monitoring** | Sentry (all runtimes), console structured logging |

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard (role-protected)
│   ├── api/                # 70+ API routes
│   ├── dashboard/          # Trader dashboard
│   └── (auth)/             # Login, signup, password reset
├── components/
│   ├── admin/              # Admin dashboard components
│   ├── dashboard/          # Dashboard components
│   ├── trading/            # OrderBook, TradeModal, MarketGrid
│   └── ui/                 # Shadcn components
├── config/plans.ts         # Pricing tiers & rules
├── db/schema.ts            # Drizzle schema (20+ tables, composite indexes)
├── lib/
│   ├── trade.ts            # Trade execution engine
│   ├── risk.ts             # Pre-trade risk validation (9 rules)
│   ├── evaluator.ts        # Post-trade challenge evaluation
│   ├── market.ts           # MarketService (prices, order books, 5s event cache)
│   ├── dashboard-service.ts # Dashboard data aggregation (parallelized queries)
│   ├── position-utils.ts   # Shared position calculations
│   ├── safe-parse.ts       # NaN-safe parseFloat utility
│   ├── admin-auth.ts       # requireAdmin() helper
│   ├── dev-helpers.ts      # Demo auto-provisioning (dev-only)
│   └── alerts.ts           # Centralized alerting (Winston + Sentry + Slack)
├── workers/
│   ├── ingestion.ts        # Polymarket WebSocket + data pipeline
│   ├── market-classifier.ts # Category classification + spam filtering
│   ├── market-integrity.ts # Resolved market pruning + price drift monitoring
│   ├── risk-monitor.ts     # Real-time breach detection (5s loop)
│   └── health-server.ts    # HTTP health endpoint for Railway
└── scripts/
    ├── grant-admin.ts      # Grant admin role
    ├── verify-engine.ts    # 53-assertion trade engine test
    ├── verify-lifecycle.ts # 73-assertion challenge lifecycle test
    ├── verify-markets.ts   # Market data quality audit (22 assertions)
    ├── verify-prices.ts    # Live price drift audit (cached vs API)
    └── reconcile-positions.ts  # Position vs trade history audit

propshot-waitlist/          # Landing Page (Standalone Next.js)
```

---

## Business Logic

### Pricing Tiers

| Tier | Size | Price | Profit Target | Max Drawdown |
|------|------|-------|---------------|--------------|
| Scout | $5K | $79 | 10% ($500) | 8% |
| Grinder | $10K | $149 | 10% ($1,000) | 10% |
| Executive | $25K | $299 | 12% ($3,000) | 10% |

### Challenge Flow (1-Step Model)

```
Payment → Challenge Phase → Funded Phase
              ↓                  ↓
        Hit profit target    80-90% split
        Don't breach DD      Bi-weekly payouts
```

> [!IMPORTANT]
> **No verification phase.** Pass the challenge once → instant funding. All open positions are auto-closed on transition. See `docs/STATE_MACHINES.md` for details.

### Discount Codes

Applied at `/checkout`. Types: `percentage` (20% off) and `fixed` ($25 off). Case-insensitive, validated for expiration/max uses/tier restrictions. Managed at `/admin/discounts`. Protected by 47 security tests in `tests/discount-security.test.ts`.

> [!CAUTION]
> Production blocks codes matching test patterns (`TEST*`, `DEMO*`, `DEV*`, etc.) — see `TEST_CODE_PATTERNS` in the discount validation logic.

### Equity Calculation

> [!IMPORTANT]
> All stats use **true equity** (cash + position value), not just cash balance.

```typescript
equity = cashBalance + totalPositionValue
positionValue = shares × getDirectionAdjustedPrice(rawPrice, direction)
// YES: value = rawPrice  |  NO: value = 1 - rawPrice
```

**Key file:** `src/lib/position-utils.ts`

---

## Core Systems

### 1. Trade Execution (B-Book Model)

```
Trade Request → RiskEngine.validate() → MarketService.calculateImpact()
      ↓                                           ↓
 Pre-trade checks                          Walk order book for VWAP
      ↓                                           ↓
 Position opened/reduced ← DB Transaction (row lock) → Balance updated
      ↓
 ChallengeEvaluator.evaluate() [async]
```

**Files:** `src/lib/trade.ts` (TradeExecutor), `src/lib/trading/PositionManager.ts`, `src/lib/trading/BalanceManager.ts`

**Runtime invariants** (enforced in TradeExecutor):
- `shares > 0`, `entryPrice ∈ (0.01, 0.99)`, `amount > 0`, `newBalance ≥ 0`
- **Negative balance throws** — `BalanceManager` will hard-error if a trade would produce a negative balance (data corruption guard)

> [!IMPORTANT]
> **All balance mutations route through `BalanceManager`** — `deductCost`, `creditProceeds`, `resetBalance`, `adjustBalance`. Every call requires a transaction handle (`tx`), enforces negative-balance guards, and produces forensic before/after logging with a source tag (`'trade'`, `'position_liquidation'`, `'funded_transition'`, `'market_settlement'`, `'carry_fee'`). Raw SQL balance updates are banned.
- Trades blocked when `currentPrice ≤ 0.01` or `≥ 0.99` (market effectively resolved)
- `direction` (YES/NO) recorded on every trade for audit trail
- Warning logged when executing against synthetic order book

> [!CAUTION]
> **NO Direction Order Book Selection** — Prediction markets have only ONE order book (YES). NO trades must consume the opposite side:
>
> | Trade | Order Book Side | Why |
> |-------|-----------------|-----|
> | BUY YES | ASKS | Buy from YES sellers |
> | SELL YES | BIDS | Sell to YES buyers |
> | **BUY NO** | **BIDS** | YES buyers implicitly sell NO at (1 - bid) |
> | **SELL NO** | **ASKS** | YES sellers implicitly buy NO at (1 - ask) |
>
> Handled by `effectiveSide` in `trade.ts` (~line 153). Getting this wrong makes entire markets untradeable.

### 2. Risk Engine (9-Layer Protocol)

Pre-trade validation in `RiskEngine.validateTrade()`:

| # | Rule | Limit | Notes |
|---|------|-------|-------|
| 1 | Max Total Drawdown | 8-10% of start | Equity-based (cash + positions) |
| 2 | Daily Drawdown | 4-5% of starting balance | Consistent base across risk.ts, evaluator.ts, risk-monitor.ts |
| 3 | Per-Event Exposure | 5% of start | **Sibling markets aggregated** |
| 4 | Category Exposure | 10% per category | 8 categories tracked |
| 5 | Volume-Tiered Exposure | Varies | >$10M→5%, $1-10M→2.5%, $100k-1M→2% |
| 6 | Liquidity Enforcement | 10% of 24h volume | Prevents market impact |
| 7 | Minimum Volume Filter | $100k | Blocks illiquid markets |
| 8 | Position Limits | Tier-based (10-50) | Prevents over-diversification |
| 9 | Trade Frequency | 60/hour | Rate limiting |

**Key files:** `src/lib/risk.ts`, `docs/RISK_RULES.md`, `src/lib/risk.test.ts` (13 tests), `src/lib/trade-flow.integration.test.ts` (6 tests)

**RULE 3 fail-safe:** When event lookup fails (market removed from Redis), trades exceeding per-market limit are blocked to prevent bypass.

### 3. Risk Monitor (Real-time)

Runs every 5 seconds in the ingestion worker:
1. Fetches all active challenges
2. Gets live prices from Redis
3. Calculates equity (cash + unrealized P&L)
4. **Max Drawdown breach** → HARD FAIL (closes all positions) | **Daily Drawdown breach** → HARD FAIL (closes all positions) | **Profit Target hit** → PASS (closes all positions, transitions to funded)

> [!IMPORTANT]
> **Transaction safety:** `triggerBreach`, `triggerPass`, and `closeAllPositions` run inside `db.transaction()`. Status update + position closes + balance credit + audit log are fully atomic — if any step crashes, everything rolls back. Redis reads happen before the transaction (not transactional).

> [!IMPORTANT]
> On breach, `currentBalance` is stored as-is — equity is **not** written to currentBalance (prevents double-counting unrealized P&L).

> [!CAUTION]
> **Position Close Invariant:** Every code path that closes a position **MUST** also insert a SELL trade record. There are exactly 4 closure paths:
>
> | Path | File | `closureReason` |
> |------|------|-----------------|
> | Manual SELL | `trade.ts` | `null` |
> | Market settlement | `settlement.ts` | `'market_settlement'` |
> | Breach/pass liquidation | `risk-monitor.ts` | `'breach_liquidation'` / `'pass_liquidation'` |
> | Funded transition | `evaluator.ts` | `'pass_liquidation'` |
>
> If you add a new closure path, it **must** insert a trade record or PnL will be invisible in trade history.
>
> **Machine enforcement:** All 3 test suites (`verify-engine`, `verify-lifecycle`, `verify-safety`) assert this invariant. Run `npm run reconcile` to check production for violations.

**File:** `src/workers/risk-monitor.ts`

### 4. Exchange Halt (Outage Protection)

When the Railway ingestion worker goes down, the platform enters "Exchange Halt" mode to protect traders:

```
Heartbeat Stale → OutageManager.recordOutageStart()
                        ↓
            ┌─── OUTAGE ACTIVE ───┐
            │ • Evaluations frozen │
            │ • Trades return 503  │
            │ • Red UI banner      │
            └──────────────────────┘
                        ↓
Heartbeat Healthy → OutageManager.recordOutageEnd()
                        ↓
            ┌── GRACE WINDOW (30 min) ──┐
            │ • Evaluations still frozen │
            │ • Trading re-enabled       │
            │ • Yellow UI banner         │
            │ • Challenge timers extended │
            └───────────────────────────┘
                        ↓
                  NORMAL OPERATION
```

| Component | File | Purpose |
|-----------|------|---------|
| OutageManager | `src/lib/outage-manager.ts` | Core: detect, record, extend timers |
| MarketCacheService | `src/lib/market-cache-service.ts` | Postgres fallback cache (1hr expiry) |
| OutageBanner | `src/components/dashboard/OutageBanner.tsx` | Red/yellow UI alert |
| System Status API | `src/app/api/system/status/route.ts` | Polled by OutageBanner every 30s |
| Outage Events Table | `outage_events` in `schema.ts` | Audit trail + timer extension tracking |
| Market Cache Table | `market_cache` in `schema.ts` | Singleton row, upserted on every fetch |

**Integration points:**
- `heartbeat-check/route.ts` — records outage start/end
- `evaluator.ts` — skips evaluation during outage or grace window
- `trade.ts` — returns `EXCHANGE_HALT` error with reassuring message
- `worker-client.ts` — write-through cache to Postgres, fallback reads on failure
- `DashboardShell.tsx` — renders `<OutageBanner />` on every page

> [!IMPORTANT]
> Challenge `endsAt` is extended by the exact outage duration when the outage ends. This ensures traders are never failed due to infrastructure problems.

### 5. Admin Access

**Layout guard:** `src/app/admin/layout.tsx` — checks `user.role === "admin"`, redirects otherwise.

**API guard:** `requireAdmin()` from `src/lib/admin-auth.ts` — every admin API route must call this.

**Grant access:** `DATABASE_URL="..." npx tsx scripts/grant-admin.ts user@email.com`

**Admin routes:** Overview, Risk Desk, Analytics, Growth, Discounts, Traders — all under `/admin/*`.

**Shared utilities:** `src/lib/admin-utils.ts` — `TIER_PRICES`, `getTierPrice()`, `EXPOSURE_CAP`, `VAR_MULTIPLIER`, `HEDGE_RATIO`.

### 6. Waitlist System

Standalone Next.js app in `propshot-waitlist/`. Deployed separately to Vercel.

- **Domain:** `predictionsfirm.com` (production)
- **Email:** Resend integration — `POST /api/subscribe` → add contact → send welcome email
- **Env vars:** `RESEND_API_KEY` (starts with `re_...`), `RESEND_AUDIENCE_ID` (UUID)
- **DNS:** Requires separate MX, SPF, DKIM records on `predictionsfirm.com`

---

## Security

### Content-Security-Policy (CSP)

Strict CSP header set in `src/middleware.ts` via `addSecurityHeaders()`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self' data:;
connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com;
frame-ancestors 'none'; object-src 'none'; base-uri 'self';
form-action 'self'; upgrade-insecure-requests
```

**HSTS:** `max-age=31536000; includeSubDomains; preload`

### Rate Limiting

Redis-based tiered rate limiting in middleware (works across serverless instances):

| Tier | Limit | Endpoints |
|------|-------|-----------|
| TRADE | 10/min | `/api/trade/*` |
| PAYOUT | 5/min | `/api/payout/*` |
| AUTH_SIGNUP | 5/5min | `/signup`, `/register` |
| AUTH_LOGIN | 10/min | `/login`, `/nextauth` |
| MARKETS | 60/min | `/api/markets/*` |
| DEFAULT | 100/min | Everything else |

**Fails open** on Redis errors — never blocks legitimate users.

### Admin Audit Logging

All admin mutations write immutable records to `audit_logs` table:

| Action | Route | Logged Fields |
|--------|-------|---------------|
| Pass/Fail Challenge | `/api/admin/actions` | adminId, previousStatus, newStatus, challengeUserId |
| Update Business Rules | `/api/admin/rules` | adminId, oldValue, newValue, version |

### Error Monitoring (Sentry)

Configured across all runtimes: `sentry.client.config.ts` (session replay + privacy masking), `sentry.server.config.ts`, `sentry.edge.config.ts`. DSN set via `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` in Vercel. Org: `prop-firm-org`.

### Alerting

`src/lib/alerts.ts` provides centralized alerts: `alerts.tradeFailed()`, `alerts.ingestionStale()`, `alerts.redisConnectionLost()`, `alerts.resolvedMarketDetected()`, `alerts.priceDrift()`, etc. Flow: Console → Sentry → Slack (for critical).

### Market Integrity Guards

`src/workers/market-integrity.ts` provides runtime market data guards:

| Guard | What It Does | Frequency |
|-------|-------------|----------|
| **Resolved Market Pruning** | Removes markets at ≥95%/≤5% from Redis | After every 5-min market refresh |
| **Price Drift Detection** | Samples 20 markets, compares cached vs live Polymarket API | Every 5 min (2.5 min offset) |

Both are wired into the ingestion worker's init cycle and fire Sentry warnings via `alerts.ts`.

---

## Environment & Deployment

### Environment Variables

**Vercel (Main App):**
```env
AUTH_SECRET=...
NEXTAUTH_URL=https://your-app.vercel.app
DATABASE_URL=postgres://...
AUTH_GOOGLE_ID=...                    # Optional
AUTH_GOOGLE_SECRET=...                # Optional
SENTRY_DSN=https://...@sentry.io/... 
NEXT_PUBLIC_SENTRY_DSN=...           # Same value, client-side
```

**Railway (Ingestion Worker):**
```env
DATABASE_URL=postgres://...@db.prisma.io:5432/postgres?sslmode=require
REDIS_URL=${{Redis.REDIS_URL}}
```

**Waitlist App (Vercel):** `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`

### Deployment

| Component | Platform | Branch | Config |
|-----------|----------|--------|--------|
| Main App | Vercel | `main` (auto-deploy) | Prisma Postgres |
| Staging | Vercel | `develop` (preview) | Same DB |
| Worker | Railway | `main` | `railway.json`, health: `/health:3001` |

### Schema Management

Uses `drizzle-kit push` (not migrate) — diffs `schema.ts` against live DB directly.

```bash
npm run db:push    # Review diff output before confirming destructive changes
```

### Git Workflow

> [!CAUTION]
> **NEVER push directly to `main`.** All changes go to `develop` first for staging validation.

#### Pre-Deploy Checklist (Mandatory)

```bash
npm run test:engine      # 53 assertions — core trading engine
npm run test:lifecycle   # 74 assertions — full challenge lifecycle
npm run test:safety      # 44 assertions — exploit scenario proofs
npm run test:financial   # Financial consistency (PnL, shares, risk messages)
npx tsc --noEmit         # Zero type errors
```

> [!CAUTION]
> **NEVER deploy without running `test:safety`.** It proves that critical financial exploits (infinite payouts, wrong drawdown rules, orphaned positions) are blocked. After promoting to production, run `npm run test:deploy -- https://prop-firmx.vercel.app` to verify the live site.

| Branch | Environment | URL |
|--------|-------------|-----|
| `develop` | Staging | Vercel preview URL |
| `main` | Production | prop-firmx.vercel.app |

```bash
git checkout develop        # 1. Work on develop
git push origin develop     # 2. Push to staging
# 3. Verify on preview URL
git checkout main && git merge develop && git push origin main  # 4. Promote (after approval)
```

See `.agent/workflows/deploy.md` for the full deployment workflow.

---

## Testing

### Test Suites

| Suite | Command / File | Tests |
|-------|---------------|-------|
| **All Unit/Integration** | `npm run test` | Full Vitest suite |
| **Risk Rules** | `src/lib/risk.test.ts` | 13 tests |
| **Trade Flow** | `src/lib/trade-flow.integration.test.ts` | 6 integration tests |
| **Discount Security** | `tests/discount-security.test.ts` | 47 tests |
| **Payout Logic** | `tests/payout-logic.test.ts` | Profit splits, eligibility |
| **Trade Engine** | `npm run test:engine` | 53 assertions, 11 phases |
| **Lifecycle** | `npm run test:lifecycle` | 73 assertions, 7 phases (full user journey) |
| **Safety** | `npm run test:safety` | 44 assertions — exploit scenario tests (payout deduction, transaction atomicity, funded-phase drawdown, position leak on transition) |
| **Deploy Smoke** | `npm run test:deploy -- <url>` | HTTP-only production smoke: homepage, cron status, heartbeat, login |
| **Balance Integrity** | `npm run test:balances` | Balance audit checks |
| **Financial Consistency** | `npm run test:financial` | Share count, PnL cross-check, risk limit messages, equity sync |
| **Market Quality** | `npm run test:markets` | 22 assertions vs live Redis (optional — requires worker running) |
| **E2E Smoke** | `npm run test:e2e` | 10 Playwright browser tests |
| **Presentation Layer** | `npx vitest run tests/presentation-layer.test.tsx` | 15 behavioral tests — React Testing Library renders + DOM assertions |

### E2E Setup

- **Auth:** `e2e/auth.setup.ts` logs in, saves session to `.auth/user.json`
- **Account:** `e2e-test@propshot.io` / `TestBot2026!` (pre-verified)
- **Re-create:** `node --env-file=.env.local --import=tsx src/scripts/create-e2e-account.ts`
- **Without creds:** Auth-gated tests skip, public tests still run

### CI Tiering

| Tier | When | Max Time |
|------|------|----------|
| Unit/Integration | Every push | ~2 min |
| E2E Smoke (Chromium) | Every push (after build) | ~30s |
| Simulation (Monte Carlo) | Nightly 6 AM UTC | 2h |

**Manual trigger:** Actions → CI → Run workflow → ✓ Run simulations

### GitHub Repository Secrets

| Secret | Purpose |
|--------|---------|
| `E2E_STAGING_URL` | Vercel staging preview URL |
| `E2E_USER_EMAIL` | `e2e-test@propshot.io` |
| `E2E_USER_PASSWORD` | Test account password |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypasses Vercel deployment protection for E2E |

**Branch protection:** `main` requires status checks (quality, test, build, e2e). `develop` requires (quality, test).

---

## Operations & Debugging

### Admin Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/admin/refresh-market?query=X` | Check live Polymarket price |
| `/api/admin/force-sync-market` | Force-update Redis (bypasses Railway) |
| `/api/admin/reset-challenge` | Reset user's challenge (balance fix) |
| `/api/admin/investigate?email=X` | Forensic audit for a user |
| `/api/cron/balance-audit` | Balance integrity check (daily 2 AM UTC) |

### Stale Market Fix

Run the `/stale-market` workflow, or:

| Scope | Action |
|-------|--------|
| Single market | `POST /api/admin/force-sync-market` with `{"query": "market_name"}` |
| All markets | `POST /api/admin/force-sync-market` with `{"syncAll": true}` |
| Persistent | Restart Railway ingestion worker |

### Debugging Price Issues

```bash
# Check Redis event count
npx tsx -e "
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL);
r.get('event:active_list').then(d => console.log(JSON.parse(d).length + ' events'));
"
```

### Data Integrity Scripts

```bash
npx tsx scripts/reconcile-positions.ts   # Validate positions vs trade history
npx tsx scripts/data-integrity-check.ts  # Find orphaned/inconsistent data
```

### Polymarket Data Sanitization

The Gamma API occasionally returns corrupted UTF-8 (Mojibake). `sanitizeText()` in `ingestion.ts` fixes known patterns (`Supá` → `Super`). Applied to event titles, market questions, and dedup normalization. Add new patterns to `ENCODING_FIXES` map.

### Force-Include Keywords

```typescript
// src/workers/ingestion.ts
const FORCE_INCLUDE_KEYWORDS = [
    "portugal", "presidential", "uk election", "germany", "france",
    "macron", "starmer", "bitcoin", "ethereum", "super bowl",
    "nba", "trump", "gaza", "ukraine", "china", "taiwan"
];
```

Add keywords when important events aren't appearing in the market list.

---

## Number Discrepancy Audit Protocol

> **MANDATORY PROCESS**: When ANY number appears wrong in the UI or trading calculations, follow these steps. Do NOT skip steps.

### Step 1: Reproduce & Isolate (30 min)

Compare what the API returns, what the UI displays, and what the database stores.

| Mismatch Location | Bug Is In |
|--------------------|-----------|
| API ≠ UI | Frontend parsing/display |
| DB ≠ API | API calculation logic |
| Trade input ≠ DB | TradeExecutor/core engine |

### Step 2: Data Flow Trace

Add temporary logging at each layer:

```
[TradeAPI] → Received: $100 YES on market X
[TradeExecutor] → Calculated: 172.4 shares @ $0.58
[PositionUpdate] → New position: 172.4 shares, entry $0.58
[BalanceUpdate] → New balance: $14,900
[API Response] → Sent: { shares: 172.4, price: 0.58 }
[Frontend] → Displayed: ???
```

### Step 3: Symptom Lookup

| Symptom | Audit Focus | Key Files |
|---------|-------------|-----------|
| Wrong P&L | `(currentPrice - entryPrice) * shares` | `position-utils.ts`, `dashboard-service.ts` |
| Wrong balance | Race conditions in balance updates | `trade.ts`, `evaluator.ts` |
| Wrong entry price | Order book simulation vs display | `trade.ts`, `market.ts` |
| Numbers flickering | WebSocket vs REST race | `useTradeExecution.ts` |
| Stale prices | Redis TTLs, cache invalidation | `ingestion.ts`, `market.ts` |
| NaN/Infinity | `parseFloat` without guard | Use `safeParseFloat()` from `safe-parse.ts` |

### Step 4: Run Reconciliation

```bash
npx tsx scripts/reconcile-positions.ts   # Positions vs trade history
npx tsx scripts/data-integrity-check.ts  # Orphaned/inconsistent data
```

### Step 5: Add Invariant Assertions

```typescript
assert(newBalance >= 0, 'Balance cannot go negative');
assert(Number.isFinite(newBalance), 'Balance must be finite');
assert(shares > 0, 'Shares must be positive');
assert(entryPrice > 0 && entryPrice < 1, 'Entry price must be valid');
```

### Step 6: Document in `journal.md`

Record: what was wrong, root cause, fix applied, files modified.

---

## Coding Conventions

### Price Display Convention

> [!CAUTION]
> **NEVER use inline `Math.round(price * 100)` for price display.** Always use `formatPrice()` from `src/lib/formatters.ts`. This is the single source of truth for price formatting (handles ¢ vs %, decimals, edge cases). Inline formatting creates scattered bugs that are impossible to grep reliably.

### Result\<T\> Pattern (for new code)

> [!IMPORTANT]
> All **new** pure business logic should return `Result<T>` instead of throwing. Existing code is not being refactored — this applies only to new functions.

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Usage
function calculatePayout(grossProfit: number, splitPct: number): Result<number> {
    if (grossProfit <= 0) return { ok: false, error: "No profit to split" };
    if (splitPct <= 0 || splitPct > 1) return { ok: false, error: "Invalid split" };
    return { ok: true, value: grossProfit * splitPct };
}

// Caller
const result = calculatePayout(5000, 0.85);
if (!result.ok) {
    logger.warn(result.error);
    return;
}
// result.value is typed as number here
```

**When to use:** Pure functions, validators, parsers, calculations.
**When NOT to use:** API routes (throw HTTP errors), DB operations (let Drizzle throw), infrastructure code.

