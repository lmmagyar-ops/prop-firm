# Development Journal

This journal tracks daily progress, issues encountered, and resolutions for the Prop-Firm project.

## ⚠️ CURRENT STATUS — Read This First

> [!CAUTION]
> **New agent? Read this section before doing anything else.**
> This is the single source of truth for what actually works. Do NOT trust individual journal entries — they reflect what the agent *believed*, not what the user confirmed.

### Mar 5, 2026 (1:28 AM CT) — Tier Pricing & Risk Update (Mat's New Numbers)

| Change | File(s) |
|--------|---------|
| **Prices** — $79→$99, $149→$189, $299→$359 | `plans.ts`, `tiers.ts`, `seed-rules.ts`, `LandingPage.tsx`, `LandingContent.tsx`, `BuyEvaluationButton.tsx`, `dashboard/page.tsx`, `faq/page.tsx` |
| **Max DD** — 5k: 8%→6%, 10k: 10%→8%, 25k: 10%→6% | `tiers.ts`, `funded-rules.ts`, `challenges.ts`, `account-tiers.ts`, `simulation/config.ts` |
| **Daily DD** — 5k: 4%→3%, 10k: 5%→4%, 25k: 5%→3% | Same config files |
| **Profit Targets** — 10k: 10%→12% ($1,200), 25k: 12%→10% ($2,500) | Same config files |
| **Docs** — `CLAUDE.md` pricing table, `RISK_RULES.md` Rules 1&2 now tier-dependent | `CLAUDE.md`, `docs/RISK_RULES.md` |
| **Tests** — Updated 7 test files (22 total files touched) | `trade-flow.test.ts`, `funded-rules.test.ts`, `audit-regression.test.ts`, `evaluator-integration.test.ts`, `evaluator.test.ts`, `multi-tier-analysis.test.ts`, `api-routes-webhook.test.ts` |

**Root cause:** Mat wants higher prices to fund 30% affiliate/discount program (15% discount + 15% rev share).
**Grandfathering:** Existing challenges use snapshotted `rulesConfig` — unaffected.
**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅

### 🔜 Tomorrow Morning — Prioritized by Leverage × Risk

> [!IMPORTANT]
> **Nothing has been pushed yet.** All changes are local only. Follow `/deploy` workflow when ready.

1. **🟥 Browser Smoke Test (HIGH — blocks push)**
   - Kill any stale `next dev` process (`lsof -ti:3000 | xargs kill`), then `npm run dev`
   - Verify on localhost:
     - Landing page (`/`) — 3 pricing cards show $99 / $189 / $359
     - FAQ page (`/dashboard/faq`) — no stale $79/$149/$299 references
     - Buy Evaluation flow (`/buy-evaluation`) — correct prices in Confirmo checkout
   - Use browser subagent against **staging** URL after push to `develop` for final visual proof

2. **🟧 Push to `develop` (MEDIUM — after smoke test passes)**
   - `git add -A && git commit -m "feat: update tier pricing and risk params (Mat's new numbers)"` 
   - `git push origin develop` (counts as push 1/2 for the day)
   - Verify staging deployment at `https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app`
   - Browser smoke test on staging URL (browser agent CAN reach this)

3. **🟨 Merge to `main` (LOWER — after Mat confirms staging looks good)**
   - Get Mat's visual confirmation on staging
   - Merge `develop` → `main` (push 2/2)
   - Verify production at `https://prop-firmx.vercel.app`

4. **🟩 Seed DB rules if needed (LOW)**
   - `seed-rules.ts` was updated but the DB isn't auto-seeded — new challenges will pick up the canonical config from `tiers.ts` / `buildRulesConfig()`, so seeding is only needed if admin manually queries `businessRules` table
   - Run `npx tsx src/db/seed-rules.ts` if needed after deploy

### ⚠️ What the Next Agent Must Know

- **22 files were changed** — all local, no commits yet. Run `git diff --stat` to see full list.
- **All 85 test files pass** (1,299 tests). Run `npx vitest run` to re-verify.
- **`tsc --noEmit` is clean** — no type errors.
- **The dev server was left running on port 3000** — user is restarting laptop to clear it. Start fresh with `npm run dev`.
- **Browser agent CANNOT reach localhost** — use staging URL for browser verification per `.agents/skills/browser-agent/SKILL.md`.
- **Deployment rules**: Max 2 pushes/day (`develop` then `main`). Never push just to "see if it looks right" — verify locally first.
- **Confirmo webhook test** (`api-routes-webhook.test.ts`) requires a real DB connection — it uses the test DB, not mocks. If it fails on a fresh machine, ensure `.env.local` has `DATABASE_URL` set.

---

### Mar 4, 2026 (5:30 PM CT) — Production Canary + E2E Breach Test ✅

| Change | File |
|--------|------|
| **Production Canary page** — 5 traffic-light health checks (heartbeat, price coverage, daily reset, order book data, worker reachability). Auto-refreshes every 30s. | `api/admin/canary/route.ts`, `admin/canary/page.tsx`, `AdminSidebar.tsx` |
| **Heartbeat fix** — Canary originally connected to Redis directly from Vercel (maxRetriesPerRequest failure). Added `/risk-heartbeat` endpoint to Railway health server. Canary now calls via HTTP. | `health-server.ts`, `canary/route.ts` |
| **E2E breach detection test** — Created controlled breach scenario: funded challenge with rigged $50k start-of-day equity → daily floor $47.5k > actual equity $10k. **Risk monitor auto-failed the account within 30s.** Audit log: `detectionMethod: real_time_monitoring`. | `risk-monitor.ts` (no code change — test of existing fix) |
| **CLAUDE.md audit** — Fixed 9 stale sections: 5s→30s interval, missing canary section, wrong login flow, outdated admin routes, stale test account notes. | `CLAUDE.md` |

**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅, browser-verified 5/5 GREEN on production ✅
**Commits:** `c54dfd1` (heartbeat fix), `a82e6b3` (canary)

---

### Mar 4, 2026 (12:43 PM CT) — PRODUCTION INCIDENT: Risk Monitor Never Worked ⚠️→✅

> [!CAUTION]
> **INCIDENT:** Risk monitor's 30-second breach detection was a **dead letter** — it has NEVER worked in production. Mat's funded account breached 133% daily drawdown without being auto-failed.

| Root Cause | Detail |
|------------|--------|
| **WS stream never functional** | `market:prices:all` has been empty. The custom `batchFetchPrices()` relied on it — with no data, the fail-closed guard silently skipped ALL checks. |
| **Wrong price source** | Risk monitor used WS stream (dead) while the dashboard used `MarketService.getBatchOrderBookPrices()` (alive, 1,986 tokens). Different code paths, different availability. |
| **Mocking mirage** | 1,299 tests all mock Redis with pre-populated prices. Tests verified "does math work?" — yes. Never tested "do prices actually exist?" |
| **Only trade-time detection** | The evaluator (runs on position close) was the ONLY path catching breaches/passes. Mat spotted this pattern. |

| Fix | File |
|-----|------|
| **Delegate to MarketService** — `batchFetchPrices()` now calls `MarketService.getBatchOrderBookPrices()` which uses: (1) order book mid-price, (2) event list fallback, (3) Gamma API fallback. Exact same chain as the dashboard. | `risk-monitor.ts` |

**Result:** Funded count dropped 2→1 at 18:43 UTC. Breach auto-detected ✅
**Commits:** `d9babad` (final fix on main). Code version v6.
**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅

---

### Mar 4, 2026 (10:25 AM CT) — 1-Hour Crypto Markets LIVE ✅

| Change | File |
|--------|------|
| **Hourly crypto ingestion** — New `fetchHourlyCryptoMarkets()` queries 4 hardcoded series (`btc/eth/solana/xrp-up-or-down-hourly`) via `/series` endpoint. Uses series aggregate volume (not individual market volume). Read-modify-write on `event:active_list`. | `ingestion.ts` |
| **1% trade cap** — `HOURLY_CRYPTO_MAX_POSITION_PERCENT = 0.01` (Mat's directive). Risk engine override in both `validateTrade` and `getPreflightLimits`. | `trading-constants.ts`, `risk.ts` |
| **Belt-and-suspenders detection** — `isHourlyCryptoMarket()` checks category AND question pattern. Fail-closed: if either matches, 1% cap applies. | `risk.ts` |

**DEPLOYED + VERIFIED:** 40 hourly crypto events live in production under Crypto tab. Browser-tested with screenshots.

**Verification:** tsc clean ✅, 85/85 test files ✅, 1,299/1,299 tests ✅

---

### Mar 3, 2026 (3:25 PM CT) — DEPLOYED TO PRODUCTION ✅

**Production commit:** `26b438e` — Sentry fix + 93 new tests.

| Change | File |
|--------|------|
| **Activity tracking moved into DB transaction** — `recordTradingDay` was fire-and-forget; now atomic with trade. Fixes Sentry error. | `trade.ts` |
| **checkConsistency downgraded** — `.catch()` uses `logger.warn` instead of `logger.error`. | `trade.ts` |
| **Order book engine tests** — 24 pure function tests. | `tests/lib/order-book-engine.test.ts` [NEW] |
| **ChallengeManager tests** — 9 tests. | `tests/lib/challenge-manager.test.ts` [NEW] |
| **Close route tests** — 9 behavioral tests. | `tests/api/close-route.test.ts` [NEW] |
| **Financial chaos tests** — 35 adversarial/boundary tests. | `tests/financial-chaos.test.ts` [NEW] |
| **Property-based math** — 25 fast-check invariant tests. | `tests/property-based-math.test.ts` [NEW] |
| **Mocking mirage deleted** — 9 fake tests removed. | `tests/api/trade-endpoints.test.ts` [DELETED] |

**Pre-deploy:** test:engine 60/60 ✅, test:safety 54/54 ✅, test:lifecycle 81/81 ✅, tsc clean ✅
**Post-deploy:** 11/11 health checks pass (homepage, login, DB, Sentry, worker, SOD equity, cron, system status) ✅

---

### Mar 2, 2026 (9:55 PM CT) — Test Coverage Gap Audit + 200-Test Plan

| Change | File |
|--------|------|
| **Trade idempotency tests** — 8 behavioral tests: first call, duplicate detection, in-flight, fail-closed on worker failure, corrupted cache, cache write-through. | `tests/lib/trade-idempotency.test.ts` [NEW] |
| **Drawdown boundary tests** — 5 new evaluator edge cases: funded $1-under → survive, challenge HWM-trailing exact → fail, daily drawdown exact → pending_failure. | `tests/lib/evaluator.test.ts` |

**Audit report:** See `test_coverage_gap_audit.md` artifact for ranked findings (7 gaps: 2 CRITICAL ✅, 3 HIGH, 2 MEDIUM).

---

### 🌅 Tomorrow Morning — Handoff for Next Agent

> **Read `CLAUDE.md` and `journal.md` CURRENT STATUS before doing anything.**

**Ranked by leverage × risk:**

#### 1. Monitor Canary (LOW EFFORT — just check)
Visit `/admin/canary` and confirm all 5 lights are GREEN. If any are YELLOW/RED, investigate immediately.

#### 2. API Contract + Error Path Tests (MEDIUM LEVERAGE)
~60 remaining tests from the test gap fill plan: dashboard route, discount routes, auth edge cases, response shape contracts.

#### 3. Update Tier Config When Mat Sends Numbers (BLOCKED — waiting on Mat)
Mat is finalizing new DD/target values for 5k/10k/25k tiers. Once he sends them, update `funded-rules.ts` and `plans.ts`. Run full suite to verify.

---

### Mar 2, 2026 (8:15 PM CT) — Prior Session Deploy ✅

| Change | Files |
|--------|-------|
| Funded popup race condition — Close API now awaits evaluator | `close/route.ts`, `OpenPositions.tsx`, `PortfolioPanel.tsx` |
| Equity display clickable — nav equity opens Portfolio panel | `PortfolioPanel.tsx` |
| Tier label + bigger font — `5K EVALUATION` / `10K FUNDED` | `PortfolioPanel.tsx`, `balance/route.ts` |
| Carousel landing-only — hero only renders on Trending tab | `MarketGridWithTabs.tsx` |
| Carousel CSS polish + `getOutcomeName` dedup | `FeaturedCarousel.tsx` |

---

### Feb 27, 2026 — Mat Feedback Completion + QA Runbook v2

Shipped trade history `groupItemTitle` fix and funded dashboard layout reorder. Audited ALL Mat feedback — confirmed 100% complete. Created QA Runbook v2 (80+ checks).

---

*(Entries prior to Feb 27 pruned per 7-day rolling window — see KI forensic audit history for archived entries)*
