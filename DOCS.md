# Propshot Documentation Hub

> **For Technical Cofounders & New Engineers**
> 
> This is your starting point for understanding the codebase. Read these docs in order before diving into code.

---

## 📚 Documentation Map

### 1. START HERE - Quick Reference
| Document | Purpose | Audience |
|----------|---------|----------|
| [CLAUDE.md](./CLAUDE.md) | **AI Assistant Context** - Complete project summary, commands, architecture diagrams | Developers |
| [README.md](./README.md) | Quick start guide, Docker setup, verification flows | Anyone |

### 2. Technical Documentation
| Document | Purpose | Audience |
|----------|---------|----------|
| [docs/STATE_MACHINES.md](./docs/STATE_MACHINES.md) | **Visual Business Logic** - Challenge lifecycle, trade execution, payout flow, evaluation rules | Everyone |
| [HANDOFF.md](./HANDOFF.md) | **Dual-Platform Architecture** - Polymarket vs Kalshi, ingestion workers, theming | Engineers |
| [docs/STAGING.md](./docs/STAGING.md) | Staging environment setup, deployment procedures | Engineers |

### 3. Business Rules & Configuration
| Document | Purpose | Audience |
|----------|---------|----------|
| [docs/trading_rules.md](./docs/trading_rules.md) | **User-Facing Rules** - Tier pricing, drawdown limits, payout info | Marketing/Support |
| [docs/faq.md](./docs/faq.md) | Frequently asked questions for users | Support |

### 4. Business Analysis
| Document | Purpose | Audience |
|----------|---------|----------|
| [BUSINESS_SURVIVAL_REPORT.md](./BUSINESS_SURVIVAL_REPORT.md) | **Monte Carlo Simulation** - Why we set pricing/rules the way we did | Founders |
| [BUSINESS_SURVIVAL_REPORT_UPDATED.md](./BUSINESS_SURVIVAL_REPORT_UPDATED.md) | Updated analysis with revised config | Founders |

### 5. Project Management
| Document | Purpose | Audience |
|----------|---------|----------|
| [TODO.md](./TODO.md) | **Pre-Launch Checklist** - Business registration, API integrations, features | Everyone |

---

## 🚀 Onboarding Checklist (New Technical Cofounder)

### Day 1: Understand the Business
- [ ] Read [docs/trading_rules.md](./docs/trading_rules.md) - What we sell
- [ ] Read [docs/STATE_MACHINES.md](./docs/STATE_MACHINES.md) - How the business logic works
- [ ] Read [BUSINESS_SURVIVAL_REPORT.md](./BUSINESS_SURVIVAL_REPORT.md) - Why our pricing is what it is

### Day 2: Understand the Tech
- [ ] Read [CLAUDE.md](./CLAUDE.md) - Full technical overview with diagrams
- [ ] Read [HANDOFF.md](./HANDOFF.md) - Dual-platform architecture
- [ ] Run `docker-compose up -d` and `npm run dev`
- [ ] Run `npx tsx src/workers/ingestion.ts` in separate terminal
- [ ] Visit http://localhost:3000 - explore as a user

### Day 3: Dive into Code
- [ ] Review [src/db/schema.ts](./src/db/schema.ts) - Database structure
- [ ] Review [src/lib/trade.ts](./src/lib/trade.ts) - Trade execution
- [ ] Review [src/lib/evaluator.ts](./src/lib/evaluator.ts) - Pass/fail logic
- [ ] Review [src/lib/risk.ts](./src/lib/risk.ts) - Pre-trade validation
- [ ] Run `npm run test` - Verify tests pass

### Day 4: Understand What's Left
- [ ] Read [TODO.md](./TODO.md) - What needs building
- [ ] Check GitHub Issues (if any)
- [ ] Review `npm audit` output for security notes

---

## 🗂️ Key Source Files (Quick Reference)

### Core Business Logic
```
src/lib/
├── trade.ts              # Trade execution engine
├── evaluator.ts          # Challenge pass/fail judge
├── risk.ts               # Pre-trade risk checks
├── funded-rules.ts       # Tier-specific limits (5k/10k/25k)
├── arbitrage-detector.ts # Prevents YES+NO on same market
├── market.ts             # Price fetching from Redis
└── dashboard-service.ts  # Dashboard data aggregation
```

### Workers & Ingestion
```
src/workers/
├── ingestion.ts          # Polymarket WebSocket → Redis
├── kalshi-ingestion.ts   # Kalshi WebSocket → Redis
├── fees.ts               # Daily carry fee deduction
├── risk-monitor.ts       # Real-time breach detection (5s)
└── leader-election.ts    # Prevents duplicate workers
```

### Database & Config
```
src/db/schema.ts          # All 20+ tables (Drizzle ORM)
src/config/plans.ts       # Pricing tiers
src/config/trading.ts     # Risk limits, fee rates
```

---

## 🔐 Critical Business Secrets (Not in Docs)

These are stored in environment variables and should never be committed:

| Secret | Purpose | Location |
|--------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Vercel |
| `REDIS_HOST/PASSWORD` | Upstash Redis | Vercel + Railway |
| `AUTH_SECRET` | NextAuth sessions | Vercel |
| `KALSHI_API_KEY_ID/PRIVATE_KEY` | Kalshi market data | Vercel + Railway |
| `CONFIRMO_API_KEY` | Crypto payments | Vercel |
| `SUMSUB_*` | KYC verification | Vercel |

---

## 🏗️ Architecture Quick Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
│  Next.js 16 (App Router) + React 19 + Tailwind                  │
│  Vercel: https://prop-firmx.vercel.app                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│  66 API Routes + Server Actions + SSE Streaming                 │
│  Trade Execution + Evaluation + Risk Engine                     │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  Redis (Upstash) │  │ Railway Worker  │
│   (Vercel)      │  │  Prices + Pubsub │  │ Ingestion 24/7  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIS                                 │
│  Polymarket (CLOB) + Kalshi (REST) → Live Market Data           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📞 Questions?

If you're the technical cofounder auditing this codebase:

1. **Business Questions** → Ask Les (non-technical cofounder)
2. **Architecture Questions** → Read CLAUDE.md first, then ask
3. **"Why did you do X this way?"** → Check git blame or ask

**Git Commit Conventions:**
- Check commit messages for context
- Key revert point: `68e608c` (before Vapi redesign)

---

*Last Updated: January 10, 2026*
*Maintained by: AI Assistant (Claude) + Les Magyar*
