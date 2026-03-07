---
name: project-orientation
description: Read this skill FIRST before doing ANY work on the Funded Prediction platform. It summarizes the mandatory rules from ARCHITECTURE.md and the current system state. Failure to read this before working is the root cause of most agent regressions.
---

# Project Orientation Skill

## What This Project Is

**Funded Prediction** — A simulated prop trading platform where users trade on Polymarket prediction market data using firm capital. Users pay for an evaluation, must hit a profit target without breaching drawdown limits, then get funded with a profit split.

**This handles real money.** Every formatting error or silent failure has downstream financial consequences. The standards here are non-negotiable.

## Step 1: Read Current Status FIRST

Before ANYTHING else:
1. Open `journal.md` → read `## ⚠️ CURRENT STATUS` at the top
2. Note what's confirmed working, what's broken, and what's "agent-believed but user-unverified"
3. Do NOT trust individual journal entries saying "✅ Done" — trust only user-confirmed items

## Step 2: Non-Negotiable Engineering Rules

### Financial Display Rule (the most important rule in the codebase)
- **Client components DISPLAY financial values — they never COMPUTE them**
- PnL, equity, drawdown are always computed server-side in `src/lib/position-utils.ts`
- All components consume `/api/trade/positions` — never import a price stream and do math
- `unrealizedPnL =` is **BANNED** in `src/components/`. If you write this, you have created a bug.
- Use `formatPrice()` from `src/lib/formatters.ts` for price display. Never `Math.round(price * 100)`.

### Fail-Closed Rule
- **Financial and auth paths ALWAYS fail closed.** If you can't verify it's safe, block it.
- Never fallback to demo data on auth failure (`|| "demo-user-1"` is banned in production paths)
- Silent catch blocks are banned. Log or rethrow — never swallow errors.

### Before Writing Any Code
1. `grep` for the pattern you're about to implement — it probably already exists
2. Check `src/lib/position-utils.ts` for financial calculations
3. Check `src/lib/formatters.ts` for display formatting
4. Check `src/lib/safe-parse.ts` for NaN-safe number parsing
5. Check `config/plans.ts` for pricing tiers — never hardcode prices

### Bug Fix Protocol (MANDATORY — not optional)
If you are fixing a bug, you MUST follow `/fix-bug` workflow (`.agent/workflows/fix-bug.md`).
Do NOT write any fix code until steps 1–4 of that workflow are complete.
The workflow exists because bugs were "fixed" 3+ times by agents who skipped tracing from the pixel.

## Step 3: Architecture in 30 Seconds

```
Vercel (Main App: prop-firmx.vercel.app)
  ├── Next.js 16 App Router
  ├── Prisma Postgres (Vercel)
  └── Railway Redis (cache, pub/sub)

Railway (Worker)
  ├── ingestion.ts — Polymarket WebSocket + price pipeline
  ├── risk-monitor.ts — 30s breach detection loop
  └── health-server.ts — :3001/health

Key lib files:
  src/lib/trade.ts          — Trade execution (B-book model)
  src/lib/risk.ts           — 9-layer pre-trade validation
  src/lib/evaluator.ts      — Post-trade challenge evaluation
  src/lib/position-utils.ts — ALL position math (single source of truth)
  src/lib/safe-parse.ts     — NaN-safe parseFloat (always use this)
  src/lib/formatters.ts     — Price/number display (always use this)
  config/plans.ts           — Pricing tiers (single source of truth for prices)
```

## Step 4: Critical Business Rules

| Rule | Detail |
|---|---|
| **One active evaluation** | Users can only have 1 active evaluation at a time (enforced at 3 code paths) |
| **1-step model** | Pass challenge → immediate funding. No verification phase. |
| **Balance mutations** | ALL balance changes go through `BalanceManager` — raw SQL updates banned |
| **Position close invariant** | Every position close MUST insert a SELL trade record (4 paths, all must do this) |
| **Direction order book** | BUY NO uses BIDS (not ASKS). Handled by `effectiveSide` in `trade.ts ~L153` |
| **Equity not cash** | `equity = cash + positionValue`. All drawdown/PnL calcs use equity, not cash balance |

## Step 5: Required Verification Before Closing Any Task

Paste this Pre-Close Checklist into your journal entry and fill it out honestly:

```
## Pre-Close Checklist
- [ ] Bug/task was reproduced or understood BEFORE writing code
- [ ] Root cause traced from UI → API → DB (not just the service layer)
- [ ] Fix verified with the EXACT failing input
- [ ] grep confirms zero remaining instances of old pattern
- [ ] Full test suite passes: npm run test (number: ____)
- [ ] npm run test:engine (60/60), test:safety (54/54), test:financial (24/24)
- [ ] npx tsc --noEmit passes
- [ ] CONFIRMED BY USER: _____ (or: "UNVERIFIED — user has not tested")
```

A fix is **unverified** until the user confirms it. "I think it works" is not done.

## Step 6: Journal Before Finishing

After every session, update `journal.md`:
1. Update `## ⚠️ CURRENT STATUS` — this is not optional
2. Add a dated entry with: what changed, root cause, verification results, Pre-Close Checklist
3. Add a `### Tomorrow Morning` section ranked by leverage × risk
4. Follow `.agent/workflows/journal.md` for write discipline (≤40 lines per tool call)
5. Delete entries older than 7 days from today — the journal is a context window, not an archive

## Step 7: Deployment Rules

- **NEVER push directly to `main`.** Changes go to `develop` first.
- Pre-deploy: `test:engine` + `test:lifecycle` + `test:safety` + `test:financial` + `tsc --noEmit`
- After deploy: `npm run test:deploy -- https://prop-firmx.vercel.app`
- See `.agent/workflows/deploy.md` for the full workflow

## Test Account (for browser smoke tests)

| Email | Password | Notes |
|---|---|---|
| `forexampletrader@gmail.com` | `123456rR` | Mat's test account — Google OAuth only in UI (see browser-agent skill for how to log in via credentials) |

## Quick Decision Reference

| Symptom | First Action |
|---|---|
| Balance wrong | `npm run test:engine` → `scripts/reconcile-positions.ts` |
| PnL shows $0 | Check `trades.positionId` linkage |
| Trade rejected | Check risk engine logs in `src/lib/risk.ts` |
| Prices stale | `GET /api/cron/heartbeat-check` → Railway worker logs |
| NaN in UI | Search for `parseFloat` without guard → use `safeParseFloat()` |
| Number discrepancy | Follow Number Discrepancy Audit Protocol in ARCHITECTURE.md |
