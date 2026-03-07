# Contributing to Funded Prediction

Thank you for contributing. This document covers the development workflow, commit conventions, and quality standards for the project.

---

## Getting Started

```bash
git clone https://github.com/lmmagyar-ops/prop-firm.git
cd prop-firm
npm install
cp .env.example .env.local   # Fill in required values
npm run dev
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system context before making changes.

---

## Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | Vercel production |
| `develop` | Integration branch | Vercel staging (preview) |
| `feat/*` | Feature work | Local only |
| `fix/*` | Bug fixes | Local only |

**Always branch from `develop`. Never commit directly to `main`.**

```bash
git checkout develop
git pull origin develop
git checkout -b fix/your-fix-name
```

---

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body explaining WHY, not what]
```

| Type | When to use |
|------|-------------|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `perf:` | Performance improvement |
| `docs:` | Documentation only |
| `test:` | Adding or fixing tests |
| `refactor:` | Code change with no behavior change |
| `chore:` | Build, CI, dependencies |
| `security:` | Security patches |

---

## Pull Request Process

1. **Run the full test suite locally before opening a PR:**
   ```bash
   npm run test:safety      # 54 assertions — must pass before any PR
   npm run test:engine      # 53 assertions — trade engine integrity
   npm run test:lifecycle   # 81 assertions — end-to-end lifecycle
   npx tsc --noEmit         # Zero type errors required
   npm run lint             # Zero lint errors required
   ```

2. **Open a PR against `develop`**, never directly against `main`.

3. **Fill out the PR template** — every section is required.

4. **Financial changes require extra review:**
   - Any change to `src/lib/trade.ts`, `risk.ts`, `evaluator.ts`, or `BalanceManager.ts` must include a verification run and screenshot
   - Follow the [Financial Display Rule](./ARCHITECTURE.md#financial-display-rule): client components display, never compute

5. **Merging to `main`** is done once per session after staging validation, not per-feature.

---

## Code Quality Standards

- **No `any` types** in production code — use `unknown` + type narrowing
- **No silent catch blocks** — log or rethrow, never swallow errors
- **No hardcoded business logic values** — constants belong in `src/config/`
- **No inline PnL math in components** — all financial computation is server-side
- **Mark TODOs with context:** `// FUTURE(v2): reason` — never bare `TODO`

---

## Financial Code Rules

The codebase handles real money. Two rules are enforced by CI and must never be violated:

**Financial Display Rule** — Client components display values, never compute them. PnL, equity, and drawdown are always calculated server-side via `position-utils.ts` and served from `/api/trade/positions`. CI grep guard blocks `unrealizedPnL =` in `src/components/`.

**Dual-Path Rule** — Every financial operation has multiple code paths. Before declaring any financial flow correct, grep for all callers. The evaluator and risk-monitor both evaluate challenges — both must be correct.

---

## Deployment

See [`.agents/workflows/deploy.md`](./.agents/workflows/deploy.md) for the full deployment workflow. The short version:

1. All work on `develop`
2. One push to `develop` per session (triggers staging)
3. Verify staging, then merge `develop → main` once
4. Run `npm run test:deploy -- https://prop-firmx.vercel.app` to verify production
