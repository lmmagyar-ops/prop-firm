# CLAUDE.md - Prediction Market Prop Firm

> **World's first Prediction Market Prop Firm** - A simulated trading platform where users trade on Polymarket/Kalshi data with firm capital.

## Quick Start

```bash
# Development
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check

# Database
npm run db:push      # Push Drizzle schema to PostgreSQL
npm run db:generate  # Generate migrations

# Testing
npm run test                                    # All Vitest unit tests
npm run test:engine                             # Trading engine verification
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
│                         VERCEL                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │   Next.js     │  │   API Routes  │  │  Prisma Postgres  │   │
│  │   Frontend    │  │   66 endpoints│  │    (Database)     │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
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
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       UPSTASH REDIS                             │
│  - Price cache: market:price:{id}, market:book:{id}            │
│  - Event lists: event:active_list, kalshi:active_list          │
│  - Leader election locks                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Database** | Prisma Postgres (Vercel), Drizzle ORM |
| **Cache** | Upstash Redis (TLS) |
| **Auth** | NextAuth v5 (email/password + Google OAuth) |
| **UI** | Tailwind v4, Shadcn/ui, Framer Motion |
| **Real-time** | Redis pub/sub, WebSocket streams |
| **Markets** | Polymarket CLOB, Kalshi API |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
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

### Railway (Ingestion Worker)

```env
# Database
DATABASE_URL=postgres://...@db.prisma.io:5432/postgres?sslmode=require

# Redis (Upstash)
REDIS_HOST=your-host.upstash.io
REDIS_PASSWORD=...
REDIS_PORT=6379
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
| **Discount Security** | `tests/discount-security.test.ts` | 47 tests covering validation, calculation, auth, fraud prevention |
| **Payout Logic** | `tests/payout-logic.test.ts` | Profit split calculations, payout eligibility |
| **Achievements** | `tests/achievements.test.ts` | Trading achievement unlock logic |
| **Trade Engine** | `npm run test:engine` | Full trade execution verification |

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


## Git Workflow (Staging-First)

- **develop** → Staging (Vercel preview URL)
- **main** → Production (auto-deploys to prop-firmx.vercel.app)

```bash
# Make changes on develop first
git checkout develop
# ... make changes ...
git push origin develop
# Test on Vercel preview URL

# Promote to production
git checkout main && git merge develop && git push origin main
```

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

