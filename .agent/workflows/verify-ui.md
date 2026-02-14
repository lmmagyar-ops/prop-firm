---
description: Mandatory verification workflow after any UI or presentation-layer change
---

# Verify UI Changes

**When to run:** After ANY change to components in `src/components/`, styling, or display formatting.

## 1. Read CLAUDE.md
// turbo
Confirm you understand the project's formatting conventions (`formatPrice()`, `formatCurrency()`, etc.) and testing standards before making changes.

## 2. Write behavioral tests FIRST (TDD)

Write tests in `tests/` using React Testing Library that **render components** and **assert DOM output**:

```tsx
// ✅ CORRECT: Behavioral test
render(<ProfitProgress totalPnL={655.82} ... />);
const countups = screen.getAllByTestId('countup');
expect(parseFloat(countups[0].textContent)).toBe(655.82);

// ❌ WRONG: Structural test (don't do this)
const source = fs.readFileSync('ProfitProgress.tsx', 'utf8');
expect(source).toContain('toFixed(2)');
```

**Mock at boundaries only:**
- `CountUp` → renders `{to}` as static text (framer-motion can't animate in jsdom)
- `framer-motion` → passthrough div/span
- `useEquityPolling` → returns deterministic value
- `apiFetch` → returns controlled Response-like object
- Context providers → return test values

See `tests/presentation-layer.test.tsx` as the canonical example.

## 3. Run the behavioral tests
// turbo
```bash
npx vitest run tests/presentation-layer.test.tsx
```

## 4. Run the full test suite
// turbo
```bash
npx vitest run
```
Confirm zero regressions from your changes.

## 5. Browser smoke test

Start the dev server and visually verify the changed UI elements:
```bash
npm run dev
```
Open `http://localhost:3000/dashboard` and screenshot the affected areas.

**Checklist:**
- [ ] Numbers display with correct decimal precision
- [ ] No hardcoded suffixes/prefixes that shouldn't be there
- [ ] Direction badges (YES/NO) appear on trades
- [ ] Daily loss meter uses today's P&L
- [ ] No layout shifts or visual regressions

## 6. Cross-reference numbers

Pick one live value and trace it across all 3 layers:
1. **Database**: What does the `trades` or `positions` table store?
2. **API**: What does `/api/trades/history` return?  
3. **UI**: What does the component render?

All three MUST match. If they don't, follow the Number Discrepancy Audit Protocol in CLAUDE.md.

## 7. Update journal.md

Document what changed, what was tested, and verification results.
