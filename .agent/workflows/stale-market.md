---
description: Fix stale or incorrect market prices
---

# Stale Market Runbook

## Quick Diagnosis

**Symptom:** A market shows the wrong price compared to Polymarket.com

**Check live price:**
```
https://prop-firmx.vercel.app/api/admin/refresh-market?query=MARKET_NAME
```
Replace `MARKET_NAME` with the market (e.g., `portugal`, `trump`, `bitcoin`)

---

## Fix Options (in order of speed)

### Option 1: Force Sync (Instant - 10 seconds)
// turbo
```bash
curl -X POST https://prop-firmx.vercel.app/api/admin/force-sync-market \
  -H "Content-Type: application/json" \
  -d '{"query": "MARKET_NAME"}'
```

Or for ALL markets:
```bash
curl -X POST https://prop-firmx.vercel.app/api/admin/force-sync-market \
  -H "Content-Type: application/json" \
  -d '{"syncAll": true}'
```

### Option 2: Restart Railway Worker (1-2 minutes)
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click `prop-firm-ingestion`
3. Click **Restart**
4. Wait 60 seconds, refresh dashboard

### Option 3: Add to Force-Include Keywords (Permanent)
Edit `src/workers/ingestion.ts` line ~45:
```typescript
const FORCE_INCLUDE_KEYWORDS = [
    "portugal",
    "YOUR_NEW_KEYWORD",  // Add here
    ...
];
```
Then deploy and restart Railway.

---

## When to Use Each

| Situation | Solution |
|-----------|----------|
| Single market wrong | Option 1 (Force Sync) |
| Multiple markets wrong | Option 1 with `syncAll: true` |
| Markets keep going stale | Option 2 (Restart Worker) |
| Important market not appearing | Option 3 (Add keyword) |

---

## Monitoring

- **Balance Audit:** Runs daily at 2 AM UTC, check `/api/cron/balance-audit`
- **Railway Logs:** Check for `[Ingestion]` messages in Railway dashboard
- **Ingestion Health:** `/api/admin/ingestion-health`
