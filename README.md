# Gap Dashboard - Cryptocurrency Arbitrage Trading System

Real-time cryptocurrency arbitrage opportunity dashboard with automated execution capabilities.

## 📋 Project Status

**Current Phase:** Phase 2 - Backend API Integration ✅ **COMPLETED**

**Last Updated:** 2026-01-25

**Servers Running:**
- ✅ Backend API: http://localhost:4000
- ✅ Frontend: http://localhost:3001

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Two terminal windows

### Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access the Dashboard:**
- Open http://localhost:3001 in your browser
- Backend API available at http://localhost:4000

### Verify Installation

```bash
# Test backend health
curl http://localhost:4000/health

# Test opportunities endpoint
curl http://localhost:4000/opportunities?dataset=dummy | jq '.count'
```

---

## 🎯 Development Roadmap

### ✅ Phase 1, Step 1: UI Skeleton with Dummy Data (COMPLETED)

**Goal:** Get the UI layout working with realistic dummy data

**Deliverables:**
- ✅ Vite + React + TypeScript setup
- ✅ Filter panel (left sidebar) with all controls
- ✅ Opportunity table with 11 columns
- ✅ Details modal that opens on row click
- ✅ 20 dummy opportunities covering all strategy types
- ✅ Client-side filtering fully functional
- ✅ Filter state persistence (localStorage)
- ✅ Responsive dark theme UI
- ✅ Build verified (no TypeScript errors)

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────────┐
│  FILTERS              │  GAP DASHBOARD - Live: 47              │
│  ─────────            │  ────────────────────────────────────   │
│  Strategy Type        │  Strategy│Symbol│Buy@  │Sell@ │Gap%    │
│  ☑ Spot+Hedge         │  ─────────────────────────────────────  │
│  ☑ Spot-Futures       │  🔄      │BTC   │Upbit │Binance│1.17%  │
│                       │  Hedge   │/USDT │$59.8k│$60.5k │       │
│  Gap Range (%)        │  ─────────────────────────────────────  │
│  Min: [0.5]           │  📊      │ETH   │Binance Perp │0.76%  │
│  Max: [100]           │  Future  │/USDT │$2245 │$2262 │       │
│                       │  ─────────────────────────────────────  │
│  Min Net Profit: 0.3% │  ... 18 more rows ...                  │
│                       │                                         │
│  Exclude Exchanges    │  Showing 20 of 20 opportunities        │
│  ☐ Binance            │  Last updated: 14:23:45 • Auto 3s      │
│  ☐ Upbit              └─────────────────────────────────────────┘
│  ☐ Bithumb
│  ☐ Bybit
│  ☐ OKX
│
│  Network & Route
│  ☑ Only OPEN Networks
│  ☐ Allow BRIDGE
│
│  [Reset Filters]
└───────────────────────┘
```

### ✅ Phase 1, Step 2: Verify Filters & Refine UI (COMPLETED)

**Goal:** Ensure all filtering works correctly and UI matches spec

**Deliverables:**
- ✅ All filter combinations tested (28/28 tests passing)
- ✅ Debug Mode with exclusion reasons
- ✅ Golden fixtures dataset (27 edge-case opportunities)
- ✅ Comprehensive filter verification
- ✅ Filter logic centralized in domain layer
- ✅ Sorting by Net Profit %
- ✅ Dataset switching (Dummy ↔ Golden)

### ✅ Phase 2: Backend API Integration (COMPLETED)

**Step 3: Backend Minimal API (Fastify + TypeScript)**
- ✅ Fastify server with TypeScript
- ✅ `/health` endpoint
- ✅ `/opportunities?dataset=dummy|golden` endpoint
- ✅ CORS configuration for frontend
- ✅ Frontend fetches from backend API
- ✅ Auto-refresh polling every 3 seconds
- ✅ Loading and error states

**Documentation:**
- `BACKEND_INTEGRATION_COMPLETE.md` - Full integration guide
- `PHASE_1_STEP_2_COMPLETE.md` - Filter verification results

### 🔜 Phase 3: Real Market Data (Next)

**Step 4: WebSocket Real-time Updates**
- Replace polling with WebSocket connections
- Real-time price updates from exchanges
- Server pushes new opportunities

**Step 5: Market Data Collectors**
- Integrate with live exchange APIs
- Gap calculation with real prices
- Spot-Futures opportunity generator

### 🔜 Phase 3: Network & Wallet Status

**Step 5: Wallet Status Collector**
- Fetch deposit/withdraw status from Binance
- Network normalization (e.g., ERC20 → ETH-ERC20)
- Display wallet status icons (🟢/🔴)
- In-memory cache + 60s refresh

**Step 6: Spot-Spot DIRECT-only**
- Global↔Global spot-spot opportunities
- Common network intersection validation
- Filter out opportunities with no OPEN common network

### 🔜 Phase 4: Kimchi Premium + FX + BRIDGE

**Step 7: FX Rate Integration**
- USDTKRW rate collection
- KRW exchange price normalization
- Upbit/Bithumb integration
- Compare KRW prices with global USDT prices

**Step 8: BRIDGE Route Display**
- Detect when DIRECT is not possible
- Show BRIDGE route option (Kimchi only)
- Display route steps in Details modal
- Estimate cost and time for bridge

## 🏗️ Architecture

### Frontend (Vite + React + TypeScript)

```
frontend/
├── src/
│   ├── components/
│   │   ├── FilterPanel.tsx       # Left sidebar with all filters
│   │   ├── OpportunityTable.tsx  # Main table with 20 rows
│   │   └── DetailsModal.tsx      # Detailed view with route steps
│   ├── data/
│   │   └── dummyOpportunities.ts # 20 realistic opportunities
│   ├── types/
│   │   └── opportunity.ts        # TypeScript interfaces
│   ├── App.tsx                   # Main app with filtering logic
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + custom styles
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

**Tech Stack:**
- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **State:** React hooks (useState, useMemo, useEffect)
- **Storage:** localStorage for filter persistence

### Backend (Fastify + TypeScript) ✅ IMPLEMENTED

```
backend/
├── src/
│   ├── server.ts                # Main Fastify server
│   ├── types/
│   │   └── opportunity.ts       # TypeScript interfaces
│   └── fixtures/
│       ├── opportunities.dummy.ts   # Dummy data (20 items)
│       └── opportunities.golden.ts  # Golden fixtures (27 items)
├── package.json
├── tsconfig.json
├── .env
└── .env.example
```

**Tech Stack:**
- **Framework:** Fastify 4 (fast, low overhead)
- **Language:** TypeScript 5
- **Logging:** Pino with pino-pretty
- **CORS:** @fastify/cors
- **Environment:** dotenv

**API Endpoints:**
- `GET /health` - Health check
- `GET /opportunities?dataset=dummy|golden` - Fetch opportunities

**Coming in Phase 3:**
- PostgreSQL database for historical data
- Redis cache for real-time prices
- Live exchange API integration (Binance, Upbit, etc.)
- WebSocket for real-time updates

## 📊 Data Models

### Opportunity
```typescript
{
  id: string
  type: 'SPOT_SPOT_HEDGE' | 'SPOT_FUTURES'
  base: string              // e.g., 'BTC'
  quote: string             // e.g., 'USDT' or 'KRW'

  buyExchange: string
  sellExchange?: string
  futuresExchange?: string

  buyPrice: number
  sellPrice?: number
  futuresPrice?: number

  grossGapPct: number       // (sell - buy) / buy * 100
  netProfitPct: number      // After fees, slippage, costs

  fundingRate?: number      // For futures
  nextFundingAt?: string

  commonNetworks: number    // Count of shared OPEN networks
  walletStatusOk: boolean   // Both sides deposit+withdraw OPEN

  routeType: 'DIRECT' | 'BRIDGE'
  estTimeMins: number
  estCostUsd: number

  volume24hUsd: number
  updatedAt: string
}
```

### FilterState
```typescript
{
  minGapPct: number
  maxGapPct: number
  excludeExchanges: string[]
  showSpotSpotHedge: boolean
  showSpotFutures: boolean
  onlyOpenNetworks: boolean
  allowBridgeRoutes: boolean
  minNetProfitPct: number
}
```

## 🎨 UI Features

### Filter Panel
- **Strategy Type:** Toggle Spot+Hedge / Spot-Futures
- **Gap Range:** Min/Max sliders (0.5% to 100%)
- **Min Net Profit:** Threshold filter
- **Exchange Exclusion:** Checkboxes for each exchange
- **Network Filter:** Only show OPEN networks (default ON)
- **Bridge Routes:** Allow BRIDGE routes (default OFF, Kimchi only)
- **Reset Button:** Restore default filters

### Opportunity Table Columns
1. **Strategy:** Badge (🔄 Spot+Hedge / 📊 Spot-Futures)
2. **Symbol:** Base/Quote (e.g., BTC/USDT)
3. **Buy @ Exchange:** Exchange name + price
4. **Sell @ Exchange:** Exchange name + price (or Futures Perp)
5. **Gap %:** Gross gap, color-coded (green ≥2%, yellow ≥1%)
6. **Net Profit %:** After all costs, bold if ≥2%
7. **Funding:** Rate + next funding time (futures only)
8. **Networks:** Badge showing count (✅ if OK, ⚠️ if blocked)
9. **Route:** DIRECT (green) or BRIDGE (amber)
10. **Est Time:** Transfer time in minutes
11. **Volume 24h:** Condensed format (e.g., "1.5M")

### Details Modal
- **Buy/Sell/Hedge Legs:** Full details (price, volume, slippage)
- **Transfer Route:** Step-by-step timeline with icons
  - CEX Withdraw → Bridge Transfer → CEX Deposit
  - Time and cost per step
- **Network Status:** List of available networks
- **Risk Flags:** BRIDGE_CONTRACT_RISK, LIQUIDITY_RISK, etc.
- **Profitability Breakdown:**
  - Gross Gap
  - Trading Fees
  - Withdraw Fee
  - Bridge Cost (if applicable)
  - Slippage
  - Time Risk
  - **Net Profit** (bold)
- **Action Buttons:** PRECHECK / ENTER (disabled in Phase 1)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Build Frontend

```bash
cd frontend
npm run build
```

Output in `frontend/dist/`

## 📝 Development Principles

### Phase 1 Focus
1. **화면이 보이고 데이터가 뜬다** ✅
   - UI renders correctly
   - Dummy data displays in table
   - Modal opens and shows details

2. **필터가 정확히 먹는다** (Next: Step 2)
   - All filters apply correctly
   - Combinations work as expected
   - State persists across sessions

3. **기회 계산이 안정적으로 나온다** (Phase 2)
   - Real exchange data
   - Accurate gap calculation
   - Proper network filtering

### Network Filtering Rules (Critical)

**Global↔Global Spot-Spot:**
- **DIRECT ONLY** (no bridges allowed)
- **Requirement:** Common network with deposit+withdraw OPEN on BOTH exchanges
- **If no common network:** Opportunity NOT displayed

**Kimchi (Global→KRW):**
- **DIRECT preferred**
- **BRIDGE allowed** (if policy enabled + allowlist)
- **Requirement:** Destination KRW exchange has required deposit network
- **Example:** Upbit XRP requires XRP network deposit

**Spot-Futures:**
- Same as Global↔Global (conservative)
- Both exchanges must have common OPEN network

## 🔧 Configuration

### Default Filters
```typescript
{
  minGapPct: 0.5,
  maxGapPct: 100,
  excludeExchanges: [],
  showSpotSpotHedge: true,
  showSpotFutures: true,
  onlyOpenNetworks: true,      // ENFORCED
  allowBridgeRoutes: false,    // Kimchi only
  minNetProfitPct: 0.3,
}
```

### Supported Exchanges (Initial)
- **Upbit** (KRW, Spot only)
- **Bithumb** (KRW, Spot only)
- **Binance** (USDT, Spot + Futures)
- **Bybit** (USDT, Spot + Futures)
- **OKX** (USDT, Spot + Futures)

## 📚 References

- **Spec Document:** `gap_dashboard_spec_v0_3.md`
- **Original Spec:** `GAP_DASHBOARD_SPEC.md`
- **Frontend README:** `frontend/README.md`

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

Internal project - contact project lead for access

---

**Next Milestone:** Phase 1, Step 2 - Filter verification & UI refinement
# autogap_bot
# autogap_bot
# autogap_bot
