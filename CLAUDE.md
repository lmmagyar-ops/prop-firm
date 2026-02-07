# CLAUDE.md - Funded Prediction

> **Funded Prediction** - A simulated trading platform where users trade on Polymarket/Kalshi data with firm capital.

## 🧠 New Agent? Start Here

1. **Read this file** — it has the full architecture, every command, risk rules, and debugging protocols
2. **Run `npm run test:engine`** — 32 assertions across 7 phases prove the trading engine works (BUY/SELL, PnL, risk rejections, balance invariants)
3. **If debugging a bug**, follow the "Trading Engine Number Discrepancy Audit" section below — it has a step-by-step protocol with a symptom → cause lookup table
4. **If data looks wrong**, run `npx tsx scripts/reconcile-positions.ts` to validate positions against trade history
5. **For manual testing**, see `docs/SMOKE_TEST.md` — a 15-minute checklist for end-to-end verification
6. **Quick symptom guide:**

| Symptom | First Command | Then Check |
|---------|---------------|------------|
| Balance wrong | `npm run test:engine` | `scripts/reconcile-positions.ts` |
| PnL shows $0 | Check `trades.positionId` linkage | `admin/activity` route |
| Trade rejected | Check risk engine logs | `src/lib/risk.ts` rules table |
| Prices stale | `GET /api/cron/heartbeat-check` | Railway worker logs |
| NaN in UI | Search for `parseFloat` without `safeParseFloat` | `src/lib/safe-parse.ts` |

## Quick Start

```bash
# Main App (Dashboard)
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check

# Landing Page (Waitlist)
cd propshot-waitlist && npm run dev -- -p 3002
# Accessible at http://localhost:3002

# Database
npm run db:push      # Push Drizzle schema to PostgreSQL
npm run db:generate  # Generate migrations

# Testing
npm run test                                    # All Vitest unit tests
npm run test:engine                             # Trading engine verification (32 assertions)
npm run test:markets                            # Market data quality audit (22 assertions)
npm run test -- tests/discount-security.test.ts # Discount security (47 tests)
npm run test -- tests/payout-logic.test.ts      # Payout flow tests

# Workers (local)
npx tsx src/workers/ingestion.ts  # Start price ingestion

# Admin
DATABASE_URL="..." npx tsx scripts/grant-admin.ts email@example.com
```

---

## Architecture Overview

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

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Database** | Prisma Postgres (Vercel), Drizzle ORM |
| **Cache** | Railway Redis (flat-rate, via REDIS_URL) |
| **Auth** | NextAuth v5 (email/password + Google OAuth) |
| **UI** | Tailwind v4, Shadcn/ui, Framer Motion |
| **Real-time** | Redis pub/sub, WebSocket streams |
| **Markets** | Polymarket CLOB, Kalshi API |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (Main App)
│   ├── admin/              # Admin dashboard (protected by role)
│   ├── api/                # 70+ API routes
│   ├── dashboard/          # Trader dashboard
│   └── (auth)/             # Login, signup, password reset
├── components/
│   ├── admin/              # Admin dashboard components
│   ├── dashboard/          # Dashboard components
│   ├── trading/            # OrderBook, TradeModal, MarketGrid
│   └── ui/                 # Shadcn components
├── config/
│   └── plans.ts            # Pricing tiers & rules
├── db/
│   └── schema.ts           # Drizzle schema (20+ tables)
├── lib/
│   ├── trade.ts            # Trade execution engine
│   ├── risk.ts             # Pre-trade risk validation
│   ├── evaluator.ts        # Post-trade challenge evaluation
│   ├── dashboard-service.ts # Dashboard data aggregation
│   ├── position-utils.ts   # Shared position calculations
│   ├── market.ts           # MarketService (prices, order books)
│   ├── admin-auth.ts       # requireAdmin() helper for API auth
│   └── admin-utils.ts      # Shared admin constants (TIER_PRICES, etc.)
├── workers/
│   ├── ingestion.ts        # Polymarket WebSocket + RiskMonitor
│   ├── risk-monitor.ts     # Real-time breach detection
│   └── health-server.ts    # HTTP health endpoint for Railway
└── scripts/
    └── grant-admin.ts      # Grant admin role to users

propshot-waitlist/          # Landing Page / Waitlist App (Standalone)
├── src/app/                # Landing page Next.js App Router
├── public/                 # Marketing assets (Logo.svg, etc.)
└── package.json            # Separate dependencies
```

---

## Business Logic

### Pricing Tiers

| Tier | Size | Price | Profit Target | Max Drawdown |
|------|------|-------|---------------|--------------|
| Scout | $5K | $79 | 10% ($500) | 8% |
| Grinder | $10K | $149 | 10% ($1,000) | 10% |
| Executive | $25K | $299 | 12% ($3,000) | 10% |

### Discount Codes

Discount codes can be applied at checkout (`/checkout`):

| Type | Example | Behavior |
|------|---------|----------|
| `percentage` | 20% off | `finalPrice = originalPrice × (1 - value/100)` |
| `fixed` | $25 off | `finalPrice = originalPrice - value` |

**Validation:**
- Codes are case-insensitive
- Checked for: expiration, max uses, min purchase, tier restrictions
- Redemptions tracked in `discountRedemptions` table

**Admin management:** `/admin/discounts`

### Challenge Flow

```
Payment → Challenge Phase → Verification Phase → Funded Phase
              ↓                    ↓                  ↓
        Hit profit target    Same rules again    80-90% split
        Don't breach DD      Prove consistency   Bi-weekly payouts
```

### Equity Calculation (CRITICAL)

All stats use **true equity**, not just cash:

```typescript
equity = cashBalance + totalPositionValue

// Position value accounts for direction
positionValue = shares × getDirectionAdjustedPrice(rawPrice, direction)

// YES positions: value = rawPrice
// NO positions:  value = 1 - rawPrice
```

**Key file:** `src/lib/position-utils.ts`

---

## Key Systems

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

**Files:**
- `src/lib/trade.ts` - TradeExecutor
- `src/lib/trading/PositionManager.ts`
- `src/lib/trading/BalanceManager.ts`

**⚠️ NO Direction Order Book Selection (CRITICAL):**

Prediction markets have only ONE order book (YES). NO trades must consume the opposite side:

| Trade | Order Book Side | Why |
|-------|-----------------|-----|
| BUY YES | ASKS | Buy from YES sellers |
| SELL YES | BIDS | Sell to YES buyers |
| **BUY NO** | **BIDS** | YES buyers implicitly sell NO at (1 - bid) |
| **SELL NO** | **ASKS** | YES sellers implicitly buy NO at (1 - ask) |

This is handled by `effectiveSide` in `trade.ts` (line ~153).

### 2. Risk Monitoring (Real-time)

The `RiskMonitor` runs every 5 seconds in the ingestion worker:

1. Fetches all active challenges
2. Gets live prices from Redis
3. Calculates equity (cash + unrealized P&L)
4. Checks for breaches:
   - **Max Drawdown** → HARD FAIL
   - **Daily Drawdown** → HARD FAIL
   - **Profit Target** → PASS (advance phase)

**File:** `src/workers/risk-monitor.ts`

### Risk Rules Specification (9-Layer Protocol)

Pre-trade validation in `RiskEngine.validateTrade()` enforces 9 rules:

| # | Rule | Limit | Notes |
|---|------|-------|-------|
| 1 | Max Total Drawdown | 8-10% of start | Equity-based (cash + positions) |
| 2 | Daily Drawdown | 4-5% of SOD | Resets at midnight UTC |
| 3 | Per-Event Exposure | 5% of start | **Sibling markets aggregated** |
| 4 | Category Exposure | 10% per category | 8 categories tracked |
| 5 | Volume-Tiered Exposure | Varies by volume tier | See table below |
| 6 | Liquidity Enforcement | 10% of 24h volume | Prevents market impact |
| 7 | Minimum Volume Filter | $100k | Blocks illiquid markets |
| 8 | Position Limits | Tier-based (10-50) | Prevents over-diversification |
| 9 | Trade Frequency | 60/hour | Rate limiting |

**Volume Tiers (RULE 5):**
| Volume | Max Exposure |
|--------|--------------|
| >$10M | 5% of balance |
| $1-10M | 2.5% of balance |
| $100k-1M | 2% of balance |
| <$100k | Blocked (RULE 7) |

**Key Files:**
- `src/lib/risk.ts` - RiskEngine implementation
- `docs/RISK_RULES.md` - Formal specification
- `src/lib/risk.test.ts` - 13 unit tests
- `src/lib/trade-flow.integration.test.ts` - 6 integration tests

**RULE 3 Critical Note:** When event lookup fails (market removed from Redis), the fail-safe blocks trades exceeding the per-market limit to prevent bypass.

### 3. Admin Access Control

Admin routes (`/admin/*`) are protected by role check:

```typescript
// src/app/admin/layout.tsx
const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { role: true }
});

if (user?.role !== "admin") {
    redirect("/dashboard");
}
```

**API endpoints** use `requireAdmin()` helper:

```typescript
// src/lib/admin-auth.ts
const { isAuthorized, response } = await requireAdmin();
if (!isAuthorized) return response;
```

**Grant admin access:**
```bash
DATABASE_URL="..." npx tsx scripts/grant-admin.ts user@email.com
```

### 4. Mission Control Dashboard (Admin Panel)

Real-time admin dashboard at `/admin/*` with the following features:

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/admin` | Overview + Quick Actions | `/api/admin/quick-stats` |
| `/admin/risk` | Risk Desk (liability, VaR) | `/api/admin/risk/exposure` |
| `/admin/analytics` | Cohort retention, LTV/CAC | `/api/admin/analytics/metrics` |
| `/admin/growth` | Growth KPIs, discount perf | `/api/admin/growth/metrics` |
| `/admin/discounts` | Discount code management | `/api/admin/discounts/*` |
| `/admin/traders` | Trader DNA feed | `/api/admin/activity` |

**Shared utilities:** `src/lib/admin-utils.ts`
- `TIER_PRICES` - Maps starting balance to purchase price
- `getTierPrice()` - Helper to get price for a tier
- `EXPOSURE_CAP`, `VAR_MULTIPLIER`, `HEDGE_RATIO` - Risk constants

**Mobile responsive:** Hamburger menu with slide-out drawer for mobile screens.

### 5. Waitlist System

The "Waitlist" is a standalone Next.js application (`propshot-waitlist/`) deployed separately to Vercel.

**Architecture:**
- **Repo:** Monorepo subdirectory `propshot-waitlist/`
- **Domain:** `predictionsfirm.com` (Production), `propshot-waitlist.vercel.app` (Fallback)
- **Deployment:** Vercel Project `propshot-waitlist` (Root Directory set to `propshot-waitlist/`)

**Email Integration (Resend):**
Uses Resend for transactional "Welcome" emails and audience collection.
- **Workflow:** `POST /api/subscribe` -> Add Contact -> Send Welcome Email
- **Critical Keys:**
  - `RESEND_API_KEY`: Production key (starts with `re_...`)
  - `RESEND_AUDIENCE_ID`: UUID for the specific audience list
- **DNS:** Requires separate verification records (MX, SPF, DKIM) on `predictionsfirm.com` since the domain is shared between Vercel (Web) and Resend (Email).

---

## Environment Variables

### Vercel (Next.js App)

```env
# Auth
AUTH_SECRET=...
NEXTAUTH_URL=https://your-app.vercel.app

# Database (auto-injected by Vercel Postgres)
DATABASE_URL=postgres://...

# Google OAuth (optional)
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### Waitlist App (Vercel)

```env
# Resend Integration
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...
```

### Railway (Ingestion Worker)

```env
# Database
DATABASE_URL=postgres://...@db.prisma.io:5432/postgres?sslmode=require

# Redis (Railway - internal reference)
REDIS_URL=${{Redis.REDIS_URL}}
# Or use public proxy for external access:
# REDIS_URL=redis://default:PASSWORD@HOST.proxy.rlwy.net:PORT
```

---

## Deployment

### Vercel (Main App)

- **URL:** Production domain
- **Branch:** `main` (auto-deploy)
- **Database:** Prisma Postgres (via Vercel Storage)

### Railway (Worker)

- **Service:** `ingestion-worker`
- **Config:** `railway.json`
- **Health check:** `/health` on port 3001
- **Replicas:** 2 (with leader election)

### Database Setup

```bash
# Push schema to production
DATABASE_URL="..." npm run db:push
```

---

## Testing

### Test Suites

| Suite | File | Description |
|-------|------|-------------|
| **Risk Rules** | `src/lib/risk.test.ts` | 13 tests: drawdown, exposure, volume, positions |
| **Trade Flow** | `src/lib/trade-flow.integration.test.ts` | 6 integration tests: full trade lifecycle |
| **Discount Security** | `tests/discount-security.test.ts` | 47 tests: validation, calculation, fraud prevention |
| **Payout Logic** | `tests/payout-logic.test.ts` | Profit split calculations, payout eligibility |
| **Achievements** | `tests/achievements.test.ts` | Trading achievement unlock logic |
| **Trade Engine** | `npm run test:engine` | 32-assertion round-trip verification (7 phases) |

### Running Tests

```bash
# All tests
npm run test

# Specific suite
npm run test -- tests/discount-security.test.ts

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

### CI Test Tiering (Anthropic Pattern)

Tests are **tiered by execution time** to keep CI fast:

| Tier | Tests | When Run | Max Time |
|------|-------|----------|----------|
| **Unit/Integration** | Business logic, API mocks | Every push | ~2 min |
| **Simulation** | Monte Carlo, stress tests | Nightly (6 AM UTC) | 2h |

**How it works:**
- `vitest.config.ts` detects `CI=true` and excludes `tests/simulation/**`
- GitHub Actions workflow has separate `simulation` job on schedule
- Manual trigger: **Actions → CI → Run workflow → ✓ Run simulations**

### Discount Security Tests (Critical)

The discount system is protected by 47 tests covering:

- **Validation**: Date ranges, usage limits, tier eligibility, new customer checks
- **Calculation**: Percentage discounts, fixed amounts, rounding, edge cases
- **Authentication**: Auth requirements for redemption vs. validation
- **Authorization**: Admin-only operations (create, delete, view all)
- **Fraud Prevention**: IP tracking, duplicate detection, price manipulation
- **Test Code Detection**: Blocks `TEST*`, `DEMO*`, `DEV*` etc. in production

**Production Protection**: Codes starting with test patterns are automatically blocked:
```typescript
const TEST_CODE_PATTERNS = [
    /^TEST/i, /^DEMO/i, /^DEV/i, /^STAGING/i,
    /^FAKE/i, /^DUMMY/i, /^SAMPLE/i, /^DEBUG/i
];
```

---

## Common Tasks

### Grant Admin to User

```bash
DATABASE_URL="postgres://..." npx tsx scripts/grant-admin.ts email@example.com
```

### Add New API Route

1. Create `src/app/api/[route]/route.ts`
2. Export `GET`, `POST`, etc. handlers
3. Add auth check if needed: `const session = await auth()`

### Modify Risk Rules

1. **Pre-trade limits:** `src/lib/risk.ts`
2. **Post-trade evaluation:** `src/lib/evaluator.ts`
3. **Tier config:** `src/config/plans.ts`

### Add New Market Platform

1. Create `src/workers/[platform]-ingestion.ts`
2. Add Redis key patterns to market.ts
3. Update UI to handle platform selection

---

## Debugging

### Check Worker Logs

```bash
# Railway dashboard → ingestion-worker → Logs
# Look for:
# [Ingestion] Updated 321 order books
# [RiskMonitor] 🛡️ Starting real-time breach monitoring
```

### Database Queries

```bash
# Run grant-admin to verify connection
DATABASE_URL="..." npx tsx scripts/grant-admin.ts test@test.com
# Will show "User not found" if connected but user doesn't exist
```

### Price Data Issues

```bash
# Check Redis directly
npx tsx -e "
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL);
r.get('event:active_list').then(d => console.log(JSON.parse(d).length + ' events'));
"
```

### Stale Market Fix (Run `/stale-market` workflow)

| Issue | Solution |
|-------|----------|
| Single market wrong | `POST /api/admin/force-sync-market` with `{"query": "market_name"}` |
| All markets stale | `POST /api/admin/force-sync-market` with `{"syncAll": true}` |
| Persistent staleness | Restart Railway ingestion worker |

---

## Operational Tools

### Admin Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/admin/refresh-market?query=X` | Check live Polymarket price for market X |
| `/api/admin/force-sync-market` | Force-update Redis directly (bypasses Railway) |
| `/api/admin/reset-challenge` | Reset a user's challenge (balance corruption fix) |
| `/api/admin/investigate?email=X` | Forensic audit for a user |
| `/api/cron/balance-audit` | Balance integrity check (runs daily 2AM UTC) |

### Cron Jobs

| Job | Schedule | File |
|-----|----------|------|
| Balance Audit | Daily 2 AM UTC | `src/app/api/cron/balance-audit/route.ts` |

### Force-Include Keywords

The ingestion worker always fetches events matching these keywords, regardless of volume rank:

```typescript
// src/workers/ingestion.ts, line ~45
const FORCE_INCLUDE_KEYWORDS = [
    "portugal", "presidential", "uk election", "germany", "france",
    "macron", "starmer", "bitcoin", "ethereum", "super bowl",
    "nba", "trump", "gaza", "ukraine", "china", "taiwan"
];
```

Add new keywords here when important events aren't appearing.

### Polymarket Data Sanitization (IMPORTANT)

The Polymarket Gamma API occasionally returns corrupted UTF-8 text (Mojibake). The `sanitizeText()` method in `ingestion.ts` fixes known patterns at the data boundary:

```typescript
// Known Polymarket encoding corruptions
'Supá' → 'Super'   // e.g. "Supá Bowl Champion 2026" → "Super Bowl Champion 2026"
```

**Applied to 3 call sites:**
1. Event title (card headers)
2. Market question (sub-market display)
3. Dedup normalization (prevents treating "Supá Bowl" and "Super Bowl" as separate)

**When you see new corrupted text from Polymarket:** Add the pattern to `ENCODING_FIXES` in `sanitizeText()`.


## Git Workflow (Staging-First)

> [!CAUTION]
> **NEVER push directly to `main` branch.** All changes MUST go to `develop` first for staging validation. This prevents production incidents.

### Branch Strategy

| Branch | Environment | URL |
|--------|-------------|-----|
| `develop` | Staging | Vercel preview URL |
| `main` | Production | prop-firmx.vercel.app |

### Standard Workflow

```bash
# 1. ALWAYS work on develop
git checkout develop
# ... make changes ...

# 2. Push to staging ONLY
git push origin develop

# 3. Test on Vercel preview URL
# Wait for user verification before promoting

# 4. Promote to production (ONLY after staging verification)
git checkout main && git merge develop && git push origin main
```

### Rules for Agents

1. **Default branch is `develop`** - All code changes push here first
2. **Never auto-push to `main`** - Requires explicit user approval
3. **Run `/deploy` workflow** for production promotions

See `.agent/workflows/deploy.md` for detailed instructions.

---

## Recent Component Additions (Jan 2026)

### Trading UX Enhancements
| Component | Purpose |
|-----------|---------|
| `OrderBook.tsx` | Enhanced with order clustering, spread indicator, depth bars |
| `TradingPanel.tsx` | Added keyboard shortcuts (Y/N/B/1-4/?) |
| `MobileTradeSheet.tsx` | Bottom sheet for mobile trading (drag-to-dismiss) |
| `PWAInstallPrompt.tsx` | iOS/Android install prompt |

### Landing Page
| Component | Purpose |
|-----------|---------|
| `LiveStatsBar.tsx` | Animated platform stats (disabled for launch) |
| `Testimonials.tsx` | Auto-rotate carousel (disabled for launch) |
| `ExitIntentModal.tsx` | Exit-intent popup with discount code |
| `UrgencyTimer.tsx` | Countdown timer for FOMO |

### SEO
| File | Purpose |
|------|---------|
| `sitemap.ts` | Dynamic sitemap generation |
| `robots.ts` | Crawler rules |
| `about/page.tsx` | SEO landing page |

### Risk Rules Hardening (Jan 20)
| Commit | Fix |
|--------|-----|
| `0e149a3` | RULE 3 bypass: fail-safe when event lookup fails |
| `ac95df6` | Volume data type: store parsed number, not string |
| `da9f0ad` | Market unavailable: improved error UX |
| `7d49a6c` | Cleanup: removed 12 legacy debug scripts |
| `9152655` | Testing: 6 new trade flow integration tests |
| `9ea0f7d` | CI: fixed TypeScript errors and test timeouts |
| `772ebaa` | Mobile UX: MobileTradeSheet quick trading |
| `019a1e0` | Docs: fixed staging URL in deploy workflow |
| `8d0c39b` | Maintenance: fixed duplicate import in verify-engine.ts |

**MobileTradeSheet Integration:**
- Mobile Yes/No buttons → open lightweight bottom sheet (not full modal)
- Desktop Yes/No buttons → open full EventDetailModal (unchanged)
- Uses `useMediaQuery("(max-width: 768px)")` for detection
- Trade execution wired via `useTradeExecution` hook

**Scripts Removed:**
- `check-challenges.mjs`, `create-admin-cardman*.ts/mjs`, `investigate-users.ts`
- `test-pub.ts`, `test-trade-api.ts`, `verify-trade.ts`
- `check-market-volumes.ts`, `generate-clob-keys.ts`, `investigate-pnl.ts`, `seed-check.ts`

**Scripts Retained:** `grant-admin.ts`, `verify-admins.ts`, `update-position-prices.ts`, `llm-market-fixer.ts`, `refresh-kalshi.ts`, `refresh-markets.ts`, `verify-engine.ts`, `verify-prices.ts`

### Infrastructure Migration (Jan 22)
| Change | Details |
|--------|---------|
| **Redis Provider** | Migrated from Upstash to Railway Redis (flat-rate $5/mo) |
| **Connection String** | Use `REDIS_URL` only (Railway internal reference: `${{Redis.REDIS_URL}}`) |
| **Legacy Vars Removed** | Purged `REDIS_HOST`, `REDIS_PASSWORD` from Vercel |
| **Ingestion Hardening** | Fixed multi-layer caching, source-branch mismatch, API type drift |
| **Order Book Coverage** | Achieved 100% coverage (~2,000 active markets) |

### Dashboard Fixes (Jan 23)
| Fix | Details |
|-----|---------|
| **Incident 39** | Removed `Math.max(0, totalPnL)` floor in `dashboard-service.ts` that was showing phantom profit when underwater |
| **PayoutProgressCard** | Now shows red text + TrendingDown icon when P&L is negative |
| **Trade History UX** | Added `RecentTradesWidget` to dashboard + "Trade History" sidebar link |

### Price Fallback Hardening (Jan 27)
| Fix | Details |
|-----|---------|
| **Incident 40** | Added price validation to `lookupPriceFromEvents()` in `market.ts` - stale/resolved market prices (≤0.01 or ≥0.99) now fall through to demo price (0.55) instead of showing 0¢. Root cause: event lists stored snapshot prices at ingestion time, and near-resolved markets were cached with invalid prices. |

> [!IMPORTANT]
> The payout *calculation* still correctly floors to 0 (you can't withdraw negative). Only the *display* was fixed to show accurate P&L.

### Market Engine Parity Audit (Jan 29)
| Change | Details |
|--------|---------|
| **PolymarketOracle** | NEW `src/lib/polymarket-oracle.ts` - Queries Gamma API for authoritative market resolution status, replaces price-move heuristic. 5-minute Redis caching. |
| **Synthetic Order Book Depth** | Reduced from 50K to 5K shares per level in `buildSyntheticOrderBookPublic()` to match real Polymarket liquidity (~1K-10K per level). |
| **Order Book Spread** | Widened from 1¢ to 2¢ in `buildSyntheticOrderBookPublic()` to match real market spreads (0.5%-10%). |
| **Demo Fallback Updated** | `getDemoOrderBook()` also updated to 5K shares for consistency. |

**Key Files:**
- `src/lib/polymarket-oracle.ts` - Resolution detection via Gamma API
- `src/lib/market.ts` - Synthetic order book generation (lines 92-105, 454-474)
- `src/lib/resolution-detector.ts` - Integrates PolymarketOracle

**Trade Execution Verification:**
- BUY/SELL execution ✅
- Slippage calculation ~2.86% ✅
- P&L math verified ✅
- Double-click prevention (already exists in `useTradeExecution` hook) ✅

### Ghost Numbers Audit Fixes (Jan 29, 8:00 PM)

| Fix | Details |
|-----|---------|
| **Extreme Price Guard** | Trades now blocked when `currentPrice ≤ 0.01` or `currentPrice ≥ 0.99`. Error: `MARKET_RESOLVED`. Prevents trading on effectively resolved markets. |
| **Synthetic Order Book Logging** | Warning logged when trades execute against synthetic order books: `SYNTHETIC ORDERBOOK USED for trade on {marketId}`. Provides operational visibility for B-Book model. |

**Key Files:**
- `src/lib/trade.ts` - Lines 93-102 (extreme price guard), Lines 139-147 (synthetic logging)

### P0 Critical Debt Fixes (Jan 29, 8:10 PM)

| Fix | Details |
|-----|---------|
| **Redis TTL** | All 4 Redis writes in `ingestion.ts` now use `EX 600` (10-min TTL). If ingestion fails, stale data auto-expires instead of persisting forever. |
| **NaN Guards** | Created `src/lib/safe-parse.ts` with `safeParseFloat()` utility. Updated `payout-service.ts`, `dashboard-service.ts`, `activity-tracker.ts` (21 total call sites). |

**Key Files:**
- `src/lib/safe-parse.ts` (NEW) - Safe parsing utilities
- `src/workers/ingestion.ts` - Redis TTLs
- `src/lib/payout-service.ts` - safeParseFloat
- `src/lib/dashboard-service.ts` - safeParseFloat
- `src/lib/activity-tracker.ts` - safeParseFloat

**All Ghost Numbers Audit Debt: RESOLVED** ✅

---

## Trading Engine Number Discrepancy Audit

> **MANDATORY PROCESS**: When ANY number appears wrong in the UI or trading calculations, follow this process systematically. Do NOT skip steps.

### Step 1: Reproduce & Isolate (30 min)

**Goal: Determine if the bug is in UI, API, or core logic.**

```
1. Open DevTools Network tab
2. Make a trade or trigger the issue
3. Capture and compare:
   - What the API returns
   - What the UI displays
   - What the database stores
```

| If mismatch is here... | The bug is in... |
|------------------------|------------------|
| API response ≠ UI display | Frontend parsing/display code |
| Database value ≠ API response | API calculation logic |
| Trade input ≠ Database stored | TradeExecutor/core engine |

### Step 2: Data Flow Trace (1 hour)

**Goal: Follow one trade through the entire system with logging.**

Add temporary trace logging at each layer:

```typescript
[TradeAPI]       → Received: $100 YES on market X
[TradeExecutor]  → Calculated: 172.4 shares @ $0.58
[PositionUpdate] → New position: 172.4 shares, entry $0.58
[BalanceUpdate]  → New balance: $14,900
[API Response]   → Sent: { shares: 172.4, price: 0.58 }
[Frontend]       → Displayed: ???
```

### Step 3: Symptom-Specific Audits

| Symptom | Audit Focus | Key Files |
|---------|-------------|-----------|
| Wrong P&L | `(currentPrice - entryPrice) * shares` calculation | `position-utils.ts`, `dashboard-service.ts` |
| Wrong balance | Race conditions in balance updates | `trade.ts`, `evaluator.ts` |
| Wrong entry price | Order book simulation vs display price | `trade.ts`, `market.ts` |
| Numbers flickering | WebSocket vs REST race conditions | `useTradeExecution.ts` |
| Stale prices | Redis TTLs, cache invalidation | `ingestion.ts`, `market.ts` |
| NaN/Infinity | `parseFloat` on null/undefined | Use `safeParseFloat()` from `safe-parse.ts` |

### Step 4: Run Reconciliation Script

```bash
# Validate all positions against trade history
npx tsx scripts/reconcile-positions.ts

# Check for orphaned/inconsistent data
npx tsx scripts/data-integrity-check.ts
```

These scripts will report:
- Positions with shares ≠ sum of trades
- Entry prices that don't match weighted average
- Orphaned positions (no user, no challenge)
- Trades referencing deleted positions

### Step 5: Add Invariant Assertions

If root cause found, add runtime guards to prevent recurrence:

```typescript
// In TradeExecutor
assert(newBalance >= 0, 'Balance cannot go negative');
assert(Number.isFinite(newBalance), 'Balance must be finite');
assert(shares > 0, 'Shares must be positive');
assert(entryPrice > 0 && entryPrice < 1, 'Entry price must be valid');
```

### Step 6: Document in Journal

After fixing, add an entry to `journal.md`:
- What was wrong
- Root cause
- Fix applied
- Files modified

---

## Schema Management

### Migration Strategy: `drizzle-kit push`

This project uses `drizzle-kit push` (not `drizzle-kit migrate`) for schema changes:

```bash
npm run db:push    # Diffs schema.ts against live DB, applies changes directly
```

- No migration files needed for deployment
- Historical migration SQL files exist in `./drizzle/` but are not used day-to-day
- Always review the diff output before confirming destructive changes (table drops)

### Schema Audit (Feb 6, 2026)

Completed a full column-by-column audit of core trading tables. Findings:

| Fix | Column | Issue | Resolution |
|-----|--------|-------|------------|
| ✅ | `positions.pnl` | Never written | Populated on close in `PositionManager.ts` |
| ✅ | `trades.positionId` | FK never populated | Linked in all 3 trade branches in `trade.ts` |
| ✅ | `positions.closedPrice` | Written, never read | Kept (low cost, useful for future analytics) |
| ✅ | `marketPrices` table | Entirely dead | Removed from schema + dropped via `db:push` |

**Admin route fix:** `admin/activity` and `admin/traders/[id]` now read `trades.realizedPnL` instead of `positions.pnl` for PnL display.

---

## Reconciliation Scripts

### `scripts/reconcile-positions.ts`

Validates all open positions against their trade history:
- Sum of trade shares should equal position shares
- Weighted average of trade prices should equal entry price
- Reports any mismatches with position IDs

### `scripts/data-integrity-check.ts`

Checks for orphaned and inconsistent data:
- Positions without valid users
- Positions without valid challenges
- Trades referencing deleted positions
- Challenges in impossible states

---

