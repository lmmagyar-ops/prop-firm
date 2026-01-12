# Prediction Market Prop Firm

> **The world's first Proprietary Trading Firm for Prediction Markets.**

Trade on Polymarket and Kalshi with firm capital. Pass the evaluation, get funded, keep up to 90% of profits.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# (Separate terminal) Start price ingestion
npx tsx src/workers/ingestion.ts
```

Visit [localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Database:** Prisma Postgres (Drizzle ORM)
- **Cache:** Upstash Redis
- **Auth:** NextAuth v5
- **Markets:** Polymarket, Kalshi

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | **Complete technical reference** - architecture, systems, debugging |
| [docs/platforms.md](./docs/platforms.md) | Polymarket vs Kalshi platform details |
| [docs/roadmap.md](./docs/roadmap.md) | Pre-launch checklist and tasks |
| [docs/trading_rules.md](./docs/trading_rules.md) | User-facing trading rules |
| [docs/faq.md](./docs/faq.md) | Frequently asked questions |
| [docs/STATE_MACHINES.md](./docs/STATE_MACHINES.md) | Challenge lifecycle diagrams |

## Deployment

| Service | Platform | Purpose |
|---------|----------|---------|
| Next.js App | Vercel | Frontend + API |
| Ingestion Worker | Railway | 24/7 price feeds |
| Database | Prisma Postgres | Data storage |
| Cache | Upstash Redis | Real-time prices |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Unit tests
npm run db:push      # Push schema to database

# Admin
DATABASE_URL="..." npx tsx scripts/grant-admin.ts email@example.com
```

## License

Proprietary. All rights reserved.
