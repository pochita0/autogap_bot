# Gap Dashboard Frontend

Phase 1, Step 1: UI skeleton with dummy data

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at http://localhost:3000

## Features (Phase 1, Step 1)

✅ **Completed:**
- Vite + React + TypeScript setup
- Filter panel with all controls:
  - Strategy type toggles (Spot-Spot + Hedge, Spot-Futures)
  - Gap range sliders (min/max)
  - Min net profit filter
  - Exchange exclusion checkboxes
  - Network status filter (only OPEN networks)
  - Bridge route allowance toggle
  - **🔧 Debug Mode** (developer tool - shows all opportunities with exclusion reasons)
- Opportunity table with columns:
  - Strategy badge
  - Symbol (Base/Quote)
  - Buy @ Exchange with price
  - Sell @ Exchange with price (or Futures for Spot-Futures)
  - Gap %
  - Net Profit %
  - Funding rate (for futures)
  - Network status indicator
  - Route type (DIRECT/BRIDGE)
  - Estimated time
  - 24h volume
- Details modal showing:
  - Buy/Sell/Hedge leg details
  - Transfer route steps timeline
  - Network availability
  - Risk flags (for bridge routes)
  - Profitability breakdown
- 20 dummy opportunities with realistic data
- Filter persistence (localStorage)
- Responsive table with hover effects
- Auto-refresh simulation (3s interval)

## Current State

**Data:** All dummy data (see `src/data/dummyOpportunities.ts`)

**Filtering:** Fully functional client-side filtering

**Sorting:** By Net Profit % (descending)

## Next Steps

**Phase 1, Step 2:**
- Verify all filters work correctly
- Refine UI styling to match spec
- Add sorting controls

**Phase 2, Step 3:**
- Connect to real backend API
- Replace dummy data with live quotes

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── FilterPanel.tsx
│   │   ├── OpportunityTable.tsx
│   │   └── DetailsModal.tsx
│   ├── data/
│   │   └── dummyOpportunities.ts
│   ├── types/
│   │   └── opportunity.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```
