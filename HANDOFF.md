# Series A Technical Handoff 📦

**Status**: Feature Complete (Retention MVP)
**Date**: Dec 2025

## 1. The Product
We have built a **Retention-First Prediction Market Prop Firm**.
Unlike competitors who rely on high-leverage churn (Casino Model), this platform is engineered for **LTV and Engagement**.

### Core Capabilities
*   **Trading Engine**: B-Book Simulator with Real-World Impact Cost.
*   **Risk Engine**: Professional Rules (10% Max / 5% Daily Drawdown).
*   **Velocity Engine**: Automated Fee Sweeper (0.1% Carry Cost) + Interim Inventory Filter (<30 Days).
*   **Gamification**: "Profit Pulse" UI and "Bloomberg-style" News Feed.

## 2. Technical State
*   **Frontend**: Next.js 14, Tailwind, Shadcn. Fully Mobile Optimized.
*   **Backend**: Server Actions, Postgres (Drizzle), Redis (Pub/Sub).
*   **Data Pipeline**: `IngestionWorker` fetches real-time prices & order books from Polymarket.

## 3. "Demo Mode" Logic
To allow investor demos without Stripe/Auth friction:
-   `src/app/checkout/page.tsx`: Does NOT require login.
-   `src/app/api/checkout/mock/route.ts`: Uses `demo-user-123` if no session exists.
-   **Action**: Uncomment Auth checks before Production Deploy.

## 4. Launch Roadmap (Post-Handoff)
1.  **Stripe Live Mode**: Interchange the mock payment route with real Stripe Webhooks.
2.  **Cloud Deploy**: Deploy `IngestionWorker` to a persistent service (Railway/Render) to ensure 24/7 price updates.
3.  **Legal**: Add Terms of Service.

## 5. Maintenance
*   **Reset Data**: `docker-compose down -v` wipes the DB.
*   **Schema Updates**: `npm run db:push` applies Drizzle changes.
