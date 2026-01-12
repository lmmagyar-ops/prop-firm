hi # Dual-Platform Trading: Developer Handoff

## Overview

This prop firm application supports trading on **two prediction market platforms**:
- **Polymarket** (🌐) - Crypto-based, global markets
- **Kalshi** (🇺🇸) - US-regulated, CFTC-approved exchange

Users purchase "evaluations" tied to one platform and trade simulated positions against real market data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ChallengeSelector         ThemedTradeLayout                   │
│  (Platform Selection)      (Light/Dark Theme)                  │
│         ↓                         ↓                             │
│  Cookie Sync ─────────────► Server-Side Rendering              │
│  (selectedChallengeId)      (Platform Detection)               │
├─────────────────────────────────────────────────────────────────┤
│                        MARKET CARDS                             │
│  ┌──────────────────┐    ┌────────────────────┐                │
│  │ SmartEventCard   │    │ KalshiMatchupCard  │                │
│  │ (Polymarket)     │    │ KalshiMultiOutcome │                │
│  └──────────────────┘    └────────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│                      DATA LAYER (Redis)                         │
│  event:active_list ──────────► Polymarket Events                │
│  kalshi:active_list ─────────► Kalshi Events                    │
├─────────────────────────────────────────────────────────────────┤
│                   INGESTION WORKERS                             │
│  refresh-markets.ts ─────────► Polymarket API → Redis           │
│  refresh-kalshi.ts ──────────► Kalshi API → Redis               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files

### Platform Configuration
| File | Purpose |
|------|---------|
| `src/lib/platform-theme.ts` | Colors, styling tokens for both platforms |
| `src/lib/formatPrice.ts` | Price formatting (% vs ¢) |
| `src/lib/market-utils.ts` | `getCleanOutcomeName()` - extracts outcome names |

### Data Ingestion
| File | Purpose |
|------|---------|
| `src/scripts/refresh-markets.ts` | Polymarket ingestion worker |
| `src/scripts/refresh-kalshi.ts` | Kalshi ingestion worker |
| `src/lib/kalshi-client.ts` | Kalshi API client |

### UI Components
| File | Purpose |
|------|---------|
| `src/components/trading/ThemedTradeLayout.tsx` | Platform-aware light/dark theme wrapper |
| `src/components/trading/KalshiMatchupCard.tsx` | 2-outcome matchup cards (sports style) |
| `src/components/trading/KalshiMultiOutcomeCard.tsx` | Multi-outcome table cards |
| `src/components/trading/SmartEventCard.tsx` | Polymarket cards |
| `src/components/trading/MarketGridWithTabs.tsx` | Renders correct card type per platform |

### State Management
| File | Purpose |
|------|---------|
| `src/hooks/useSelectedChallenge.ts` | Manages selected evaluation, syncs to cookie |
| `src/app/dashboard/trade/page.tsx` | Reads cookie, fetches platform-specific data |

---

## How Platform Selection Works

### 1. User Purchases Evaluation
- Checkout page sends `platform: "polymarket" | "kalshi"` to API
- Stored in `challenges` table with `platform` column

### 2. Challenge Selection (Client-Side)
```typescript
// useSelectedChallenge.ts
selectChallenge(id) {
  localStorage.setItem("selectedChallengeId", id);
  document.cookie = `selectedChallengeId=${id}; path=/; max-age=...`;
  window.location.reload(); // Forces server re-render
}
```

### 3. Server-Side Platform Detection
```typescript
// trade/page.tsx
const cookieStore = await cookies();
const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

// Lookup challenge's platform in database
const challenge = await db.query.challenges.findFirst({
  where: and(eq(challenges.id, selectedChallengeId), eq(challenges.userId, userId))
});
const platform = challenge?.platform || "polymarket";

// Fetch platform-specific events
const events = await getActiveEvents(platform);
```

---

## Data Flow

### Polymarket Ingestion
```
Polymarket API → refresh-markets.ts → Redis (event:active_list)
```

### Kalshi Ingestion
```
Kalshi API (/events, /markets) → refresh-kalshi.ts → Redis (kalshi:active_list)
```

### Market Data Structure
```typescript
interface SubMarket {
  id: string;           // Market/ticker ID
  question: string;     // Outcome name (use getCleanOutcomeName to clean)
  outcomes: string[];   // ["Yes", "No"]
  price: number;        // 0-1 probability
  volume: number;       // 24h volume
}

interface EventMetadata {
  id: string;
  title: string;
  markets: SubMarket[];
  categories?: string[];
  // ...
}
```

---

## Visual Differences

| Aspect | Polymarket | Kalshi |
|--------|-----------|--------|
| **Theme** | Dark (zinc-950) | Light (slate-50) |
| **Accent** | Purple | Green |
| **Pricing** | Percentages (42%) | Cents (42¢) |
| **Buttons (matchup)** | - | Green=higher prob, Gray=lower |
| **Buttons (multi)** | - | Outline (green Yes, red No) |

---

## Kalshi Trade Modal Enhancement Plan

The current modal works but needs polish to match native Kalshi UX. Reference screenshots were captured from kalshi.com.

### Target Components

#### 1. Price History Chart
Native Kalshi shows a red line chart with volume below.

```
┌─────────────────────────────────────────────┐
│  [Line Chart - Price over time]             │
│                                             │
│  $1,360,765 vol            6H 1D 1W ALL    │
└─────────────────────────────────────────────┘
```

**Implementation**: Use recharts or lightweight charting library. Data source: Store historical prices during ingestion or fetch from Kalshi API.

#### 2. Outcome Table
Each row shows: Outcome | Chance % | Yes Button | No Button

```
Above 2.80    99% ▲1     [Yes] [No 1¢]
Above 2.85    20% ▼65    [Yes 19¢] [No 82¢]
```

- **Button styling**: Selected row = filled buttons, others = outline
- **Change indicator**: Show ▲/▼ with point change

**Current state**: ✅ Working but needs visual polish

#### 3. Trading Widget (Right Sidebar)
```
┌──────────────────────────┐
│ Event Title              │
│ Buy Yes · Above 2.85     │
├──────────────────────────┤
│  [Buy]  [Sell]           │   ← Tabs
│          Dollars ∨       │   ← Currency
├──────────────────────────┤
│ [Yes 19¢] [No 82¢]       │   ← Price buttons
├──────────────────────────┤
│ Dollars                  │
│ Earn 3.25% Interest      │
│ [Amount Input]    $0     │
├──────────────────────────┤
│        [-100] [-10] [+10] [+100] [+200]
├──────────────────────────┤
│ Shares    0              │
│ Total     $0.00          │
│ To Win    $0.00          │
├──────────────────────────┤
│     [████ Buy Yes ████]  │   ← Submit
└──────────────────────────┘
```

**Current state**: Partially implemented. Needs Buy/Sell tabs and interest text.

#### 4. Rules Section (Collapsible)
```
Rules summary                              ⓘ
─────────────────────────────────────────────
Above 2.85 ∨    ← Dropdown to select outcome

If average regular gas prices for United States are 
strictly greater than $2.85 on Dec 31, 2025 according 
to AAA, then the market resolves to Yes.

Note: this event is directional.

[View full rules]  [Help center]    ← Outline buttons
```

**Implementation**: 
- File: `src/components/trading/RulesSummary.tsx` (NEW)
- Props: `rules: string`, `outcomes: SubMarket[]`
- Store rules in EventMetadata (add to ingestion)

#### 5. Timeline Section (Collapsible)
```
Timeline and payout                         ∧
─────────────────────────────────────────────
│ ✓  Market open
│    Nov 30, 2025 · 10:00am EST
│
│ ○  Market closes  
│    Dec 30, 2025 · 11:59pm EST
│
│ ○  Projected payout
│    Dec 31, 2025 · 10:05am EST

Series KXAAAGASM  Event ...  Market ...
```

**Implementation**:
- File: `src/components/trading/MarketTimeline.tsx` (NEW)
- Props: `openDate`, `closeDate`, `payoutDate`
- Store dates in EventMetadata (already have `endDate`, need more)

### Data Requirements

Need to add to Kalshi ingestion (`refresh-kalshi.ts`):
- `rules` - Market resolution rules text
- `openTime` - When market opened
- `closeTime` - When trading ends
- `settlementTime` - When payout occurs

These are available from Kalshi API `/markets/{ticker}` endpoint.

---

---

## Recent Updates (Dec 2024)

### Kalshi UI Visual Refinement

**Color Corrections**
- Updated Kalshi button colors to match official branding:
  - Yes/Buy: `#00C896` (Kalshi Green) - was `#0058FF` (Blue)
  - No/Sell: `#E63E5D` (Kalshi Red) - was `#E300B9` (Barbie Pink)
- Applied across `KalshiMultiOutcomeCard`, `KalshiMatchupCard`, and `EventDetailModal`

**Market Grid Compactness**
- Reduced empty space in `KalshiMultiOutcomeCard`:
  - Removed fixed `min-h-[170px]`
  - Tightened padding and spacing throughout
  - Cards now shrink to fit content

**Trade Modal Polish**
- Fixed chart data discrepancy - chart end point now strictly matches `currentPrice`
- Optimized layout spacing (reduced `py-4` to `py-3` in outcome rows)
- Unified header heights between left/right panels (`h-[57px]`)
- Added proper table header for outcomes

### Kalshi API Authentication

**Implementation**
- Added HMAC-SHA256 signature generation in `kalshi-client.ts`
- Environment variables: `KALSHI_API_KEY_ID`, `KALSHI_PRIVATE_KEY`
- Updated `getKalshiEvents()` and `getKalshiMarkets()` to include auth headers

**Findings**
- Authenticated API endpoints provide same data as public API
- Candidate names (e.g., "J.D. Vance") not available - only party affiliation ("Republican")
- Kalshi website likely uses internal/private API for full names

### Data Quality Filtering

**Automatic Market Exclusion**
- Added quality filter in `refresh-kalshi.ts` to exclude markets with generic outcome names
- Filters out events where ALL outcomes are generic terms: `['republican', 'democratic', 'unknown', 'who will', 'yes', 'no']`
- Only applies to events with >2 outcomes (preserves binary yes/no markets)
- Self-maintaining - no manual intervention needed

**Example**
```
[Kalshi Refresh] Skipping "Next US Presidential Election Winner?" 
  - outcomes are too generic (republican, democratic, who will, unknown)
```

### Outcome Name Cleaning

**Deduplication Logic**
- Added deduplication in ingestion to prevent duplicate outcome names
- Groups outcomes by cleaned name, keeps highest probability entry
- Reduced "Presidential Election" from 23 duplicate entries to 4 unique outcomes

**Pattern Matching**
- Enhanced `getCleanOutcomeName()` with general pattern extraction
- Handles various Kalshi question formats automatically
- Extracts subject/name before common verbs (be, win, nominate, etc.)

---

## Known Issues / TODOs


1. **Timeline/Rules sections** - Kalshi modals need rules summary and timeline components
2. **Scrollbar styling** - Light theme scrollbar may need tuning
3. **Sidebar theming** - Currently stays dark on both platforms
4. **Polymarket timeline** - Verify end dates are displaying correctly

---

## Running Ingestion

```bash
# Refresh Polymarket data
npx tsx src/scripts/refresh-markets.ts

# Refresh Kalshi data  
npx tsx src/scripts/refresh-kalshi.ts
```

Both write to Redis and should be run periodically (cron or PM2).

---

## Testing Platform Switching

1. Purchase a Kalshi evaluation
2. Select it in the Challenge Selector dropdown
3. Page should reload with light theme + Kalshi markets
4. Switch to Polymarket evaluation → dark theme + Polymarket markets
