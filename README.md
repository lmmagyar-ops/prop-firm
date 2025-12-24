# Prediction Market Prop Firm (MVP)

The world's first **Proprietary Trading Firm for Prediction Markets**. Built with Next.js 14, PostgreSQL, Redis, and Real-Time WebSockets.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for Postgres & Redis)

### 1. Start Infrastructure
Run the database and cache services:
```bash
docker-compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
You need **two separate terminals** to run the full system:

**Terminal 1: The Web App**
```bash
npm run dev
```
*Access at http://localhost:3000*

**Terminal 2: Data Ingestion Worker**
```bash
npx tsx src/workers/ingestion.ts
```
*Fetches live prices from Polymarket and broadcasts to Redis*

---

## 🧪 Verification Flows

### A. The "Trader" Journey (Demo Mode)
1.  **Landing Page**: Go to `http://localhost:3000/`. You will see the **"Live Teaser"**: real market data blurred in the background.
2.  **Start Challenge**: Click "Start Challenge" to visit the redesigned Checkout.
3.  **Payment**: Click "Pay $249.00" (Mock Simulation/No Card Required).
4.  **Trade**: You will be redirected to the Dashboard with a **$10,000** funded account.
5.  **Watch**: Observe real-time price updates (Odometer & Charts).

### B. The "Admin" Console
1.  **Access**: Go to `http://localhost:3000/admin`.
2.  **Monitor**: View all active challenges.
3.  **Control**: Click "Pass" or "Fail" to manually override a user's status.

---

## 🏗 Architecture

### Tech Stack
-   **Frontend**: Next.js 14 (App Router), Tailwind CSS, Shadcn UI, Framer Motion.
-   **Backend**: Next.js API Routes, Server Actions.
-   **Database**: PostgreSQL (Drizzle ORM).
-   **Real-Time**: Redis Pub/Sub, Custom WebSocket Server.
-   **Charts**: TradingView Lightweight Charts.

### Key Components
-   `src/workers/ingestion.ts`: Connects to Gamma/Polymarket APIs.
-   `src/lib/trade.ts`: The simulated matching engine (Slippage, Risk Checks).
-   `src/app/checkout`: Mock payment flow implementation.

## ⚡ Key Mechanics (The "Retention Engine")

### 1. High-Velocity Inventory
The system ingests **Interim Markets** (Expiry < 30 Days) from Polymarket to ensure steady volatility. Instead of "Election 2028", users trade "Weekly Polling" and "Monthly Econ Data".

### 2. Velocity Fees (The "Stick")
To discourage passive holding, any position held > 24 hours incurs a **0.1% Daily Carry Cost**. This mechanically forces turnover.

### 3. Gamified Profit Taking (The "Carrot")
The UI features a **"Profit Pulse"** that glows when a user is in the green, utilizing dopamine loops to encourage realized gains (and thus more trading).

### 4. Integrity & Risk (FTMO Standard)
*   **Real Slippage**: Orders match against the Polymarket CLOB. Large orders move the price.
*   **Max Drawdown**: **10%** of Initial Balance (Static).
*   **Daily Drawdown**: **5%** of Start-of-Day Balance (Trailing).

## ⚠️ Known Notes
-   **Database Permissions**: If you encounter `pg_filenode.map` errors on Mac, ensure Docker has file access or try resetting the volume (`docker-compose down -v`).
-   **Demo Mode**: The simulation uses a `demo-user-123` ID to bypass complex auth flows during localhost testing.
-   **Mocks**: Payment flows and News Feeds are simulated for the MVP.
