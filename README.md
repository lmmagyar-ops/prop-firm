# Funded Prediction

[![CI](https://github.com/lmmagyar-ops/prop-firm/actions/workflows/ci.yml/badge.svg)](https://github.com/lmmagyar-ops/prop-firm/actions/workflows/ci.yml)

> **The world's first Proprietary Trading Firm for Prediction Markets.**

Trade on real Polymarket data with simulated firm capital. Pass a one-step evaluation, get funded, and keep up to 90% of your profits.

**Production:** [prop-firmx.vercel.app](https://prop-firmx.vercel.app) &nbsp;|&nbsp; **Waitlist:** [predictionsfirm.com](https://predictionsfirm.com)

---

## How It Works

```
Payment → Challenge Phase → Funded Phase
              ↓                  ↓
        Hit profit target    80–90% profit split
        Don't breach DD      Bi-weekly payouts
```

| Tier | Size | Profit Target | Max Drawdown | Price |
|------|------|---------------|--------------|-------|
| Scout | $5K | 10% ($500) | 6% | $99 |
| Grinder | $10K | 12% ($1,200) | 8% | $189 |
| Executive | $25K | 10% ($2,500) | 6% | $359 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16, React 19 |
| **Database** | Neon Postgres (Vercel), Drizzle ORM |
| **Cache** | Railway Redis |
| **Auth** | NextAuth v5 |
| **Markets** | Polymarket CLOB |
| **Monitoring** | Sentry, structured logging |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev                    # localhost:3000

# (Separate terminal) Start price ingestion worker
npx tsx src/workers/ingestion.ts

# Run test suites
npm run test:engine            # 53-assertion trade engine verification
npm run test:lifecycle         # 81-assertion end-to-end lifecycle
npm run test:safety            # 54-assertion exploit scenario proofs
```

---

## Repository Structure

```
src/                        # Main Next.js application
├── app/api/                # 89 API routes
├── lib/                    # Core business logic (trade, risk, evaluator)
├── workers/                # Railway ingestion worker + risk monitor
└── scripts/                # Verification scripts and admin utilities

propshot-waitlist/          # Standalone waitlist/landing page (predictionsfirm.com)
docs/                       # Architecture docs, state machines, risk rules
.github/workflows/ci.yml    # CI: quality → unit tests → integration → build → E2E
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Complete technical reference** — architecture, systems, debugging protocols |
| [docs/STATE_MACHINES.md](./docs/STATE_MACHINES.md) | Challenge lifecycle state diagrams |
| [docs/RISK_RULES.md](./docs/RISK_RULES.md) | Full 9-rule pre-trade risk engine spec |
| [docs/SMOKE_TEST.md](./docs/SMOKE_TEST.md) | 15-minute manual QA checklist |
| [docs/trading_rules.md](./docs/trading_rules.md) | User-facing trading rules |

---

## Deployment

| Component | Platform | Branch |
|-----------|----------|--------|
| Main App | Vercel (auto-deploy) | `main` |
| Staging | Vercel (preview) | `develop` |
| Ingestion Worker | Railway | `main` |

---

## License

Proprietary. All rights reserved.
