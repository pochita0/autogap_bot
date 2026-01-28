# Gap Dashboard + Trading Bot — Technical Specification v0.3 (Kimchi Bridge Route + Policy Split)

## Document Info
- **Version**: 0.3
- **Last Updated**: 2026-01-25
- **Status**: Planning Phase → Phase 1 (Dashboard + Real-time Monitoring) / Phase 2 (Execution)
- **Scope Note**: v0.3 incorporates **Kimchi Premium (KRW exchange) bridge-route automation** while keeping **global↔global spot-spot strict (direct only)**.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Core Filtering Logic (Policy Matrix)](#3-core-filtering-logic-policy-matrix)
4. [Currency Normalization (KRW↔USDT)](#4-currency-normalization-krwusdt)
5. [Transfer Route Planner (DIRECT vs BRIDGE)](#5-transfer-route-planner-direct-vs-bridge)
6. [Data Models](#6-data-models)
7. [Opportunity Calculation](#7-opportunity-calculation)
8. [Dashboard UI Specification](#8-dashboard-ui-specification)
9. [Exchange Connector Interface](#9-exchange-connector-interface)
10. [Execution Engine (Phase 2)](#10-execution-engine-phase-2)
11. [Risk Management](#11-risk-management)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Testing Strategy](#13-testing-strategy)
14. [Appendix](#14-appendix)
15. [Changelog](#15-changelog)

---

## 1. Executive Summary

### 1.1 Project Goal
Build a real-time cryptocurrency arbitrage opportunity dashboard that:
- Identifies price gaps across multiple exchanges:
  - **Spot-Spot + Hedge (현+현 헷징)** — includes *Kimchi Premium (KRW exchange)* and *global↔global*
  - **Spot-Futures (현+선)**
- Filters opportunities by **wallet/network availability** and **profitability**
- Enables **one-click automated execution** (Phase 2)

### 1.2 Supported Exchanges (Initial)
| Exchange | Type | Markets | Priority |
|----------|------|---------|----------|
| **Upbit** | Spot (KRW) | KRW pairs | High |
| **Bithumb** | Spot (KRW) | KRW pairs | High |
| **Binance** | Spot + Derivatives | USDT pairs | High |
| **Bybit** | Spot + Derivatives | USDT pairs | Medium |
| **OKX** | Spot + Derivatives | USDT pairs | Medium |

### 1.3 Strategy Types (Excluding Futures-Futures)
#### A. Spot-Spot + Hedge (현+현 헷징)
**Two policy modes**
- **Global↔Global** (해외↔해외): **DIRECT transfer only**
- **Kimchi Premium** (해외→원화거래소): **DIRECT preferred**, allow **BRIDGE_ROUTE** (optional + allowlist)

High-level flow:
1. Buy spot at low-price venue
2. Hedge with futures short (same quantity) to protect during transfer latency
3. Transfer asset
4. Sell spot at high-price venue
5. Close hedge

#### B. Spot-Futures Arbitrage (현+선)
1. Long spot (buy)
2. Short futures (same qty)
3. Profit from basis convergence ± funding
4. Close both positions based on exit rules

### 1.4 Phase Breakdown
| Phase | Scope | Deliverables |
|-------|------|--------------|
| **Phase 1 (MVP)** | Dashboard + Monitoring | Real-time opportunity feed, wallet/network checks, FX normalization, net-profit estimates, filtering/sorting UI |
| **Phase 2** | Execution | Account integration, automated orders, transfer automation (DIRECT + Kimchi BRIDGE_ROUTE), position monitoring |
| **Phase 3** | Optimization | Backtesting, analytics, multi-account, advanced risk controls, more exchanges/providers |

---

## 2. System Architecture

### 2.1 High-Level Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Dashboard)                     │
│  React + TypeScript + TanStack Query + Tailwind + shadcn/ui      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API / WebSocket
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend API Server                          │
│  Node.js + Fastify + TypeScript                                  │
│  - Opportunity API                                                │
│  - FX Rates API                                                   │
│  - Account Management API (Phase 2)                               │
│  - Execution API (Phase 2)                                        │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
    ┌─────────┴─────────┐         ┌──────────┴──────────┐
    │  Data Collectors  │         │  Execution Engine   │
    │   (Daemons)       │         │    (Phase 2)        │
    └─────────┬─────────┘         └──────────┬──────────┘
              │                               │
    ┌─────────┼─────────────────┐             │
    │         │                 │             │
┌───┴───┐ ┌──┴────┐ ┌──────────┴─────────┐   │
│ Market│ │Wallet │ │ Opportunity Engine │   │
│ Data  │ │Status │ │ + Route Planner    │   │
│Collect│ │Collect│ │ (Matcher/Scorer)   │   │
└───┬───┘ └───┬───┘ └──────────┬─────────┘   │
    │         │                │             │
    └─────────┴────────────────┴─────────────┘
                      │
            ┌─────────┴─────────┐
            │ Database/Cache     │
            │ Postgres + Redis   │
            └────────────────────┘
```

### 2.2 Component Responsibilities (Additions)
- **FX Rate Collector** (new): periodically fetch **USDTKRW** (or USDKRW) and publish to DB/Redis.
- **Transfer Route Planner** (new): generates DIRECT/BRIDGE routes based on wallet/network and policy mode.

---

## 3. Core Filtering Logic (Policy Matrix)

### 3.1 Policy Matrix (Hard Rules)
| Strategy | Mode | Allowed Transfer | Wallet/Network Requirement |
|---|---|---|---|
| Spot-Spot + Hedge | **Global↔Global** | **DIRECT ONLY** | **Common network intersection required** where **deposit+withdraw open on BOTH exchanges** |
| Spot-Spot + Hedge | **Kimchi (→KRW)** | **DIRECT preferred**, else **BRIDGE_ROUTE** (allowlist) | Destination KRW exchange **required deposit network** must be satisfied; route must be feasible and profitable |
| Spot-Futures | Any | No transfer required to open/close positions | **Policy**: still require that the asset has at least one **deposit+withdraw open network** on involved exchange(s). (Conservative) |
| Futures-Futures | N/A | Excluded | Excluded |

> **Important**  
> - For **global↔global spot-spot**, *bridge routes are forbidden* (explicit requirement).  
> - For **Kimchi spot-spot**, *bridge route is allowed only when configured and provider is allowlisted*.

### 3.2 The Golden Rule (Global↔Global Spot-Spot)
> Opportunities are valid **only if BOTH exchanges have deposit+withdraw enabled on the SAME canonical network** (intersection non-empty).

```ts
function isSpotSpotValidGlobalGlobal(exchangeA, exchangeB, asset): boolean {
  const netsA = getNetworks(exchangeA, asset).filter(n => n.depositEnabled && n.withdrawEnabled)
  const netsB = getNetworks(exchangeB, asset).filter(n => n.depositEnabled && n.withdrawEnabled)

  const common = intersection(netsA.map(n => n.networkId), netsB.map(n => n.networkId))
  return common.length > 0
}
```

### 3.3 Spot-Futures Validity (Fix: intersection policy consistent)
In v0.2, Spot-Futures validity did not check intersection. v0.3 fixes it to avoid policy inconsistency:

```ts
function isSpotFuturesValid(spotEx, futuresEx, asset): boolean {
  const a = getNetworks(spotEx, asset).filter(n => n.depositEnabled && n.withdrawEnabled).map(n => n.networkId)
  const b = getNetworks(futuresEx, asset).filter(n => n.depositEnabled && n.withdrawEnabled).map(n => n.networkId)
  return intersection(a, b).length > 0
}
```

> Note: This is conservative. You can later add a toggle (Phase 3) if you want to display spot-futures even when wallet is blocked, but v0.3 keeps your “both sides open” rule.

### 3.4 Network Name Normalization (Canonicalization)
Maintain mapping layer to unify exchange variants:
- `ETH-ERC20` ← `ERC20`, `ETH`, `Ethereum`, ...
- `TRON-TRC20` ← `TRC20`, `TRON`, `TRX`, ...
- `BSC-BEP20` ← `BEP20`, `BSC`, `BNB`, ...
- `XRP` ← `XRP`, `Ripple`, ...
- `FLOW` ← `FLOW`, ...

Unknown networks should be treated **conservatively**: return `null` → exclude route/opportunity.

---

## 4. Currency Normalization (KRW↔USDT)

### 4.1 Why this is required
Comparing:
- Upbit/Bithumb: `ASSET/KRW`
- Binance/Bybit/OKX: `ASSET/USDT`

Direct gap without FX is meaningless. v0.3 introduces an FX layer:
- Normalize all calculations to **USD/USDT** (recommended).

### 4.2 FX Rates
- Maintain `USDTKRW` (or `USDKRW`) and refresh periodically.
- Use multiple sources if desired; Phase 1 can start with a single provider.

**Normalized price examples**
- `price_usdt = price_krw / usdtkrw`
- `price_krw = price_usdt * usdtkrw`

### 4.3 FX Data Model (Postgres)
```sql
CREATE TABLE fx_rates (
  pair VARCHAR(20) PRIMARY KEY,          -- 'USDTKRW'
  rate DECIMAL(20, 10) NOT NULL,
  source VARCHAR(50),
  timestamp TIMESTAMPTZ NOT NULL
);
```

---

## 5. Transfer Route Planner (DIRECT vs BRIDGE)

### 5.1 Motivation (Kimchi Premium Case)
Example:
- KRW exchange accepts deposits **only via XRP network**.
- Source exchange (e.g., Binance) has XRP withdrawals **temporarily disabled**.
- You want to allow:
  - Withdraw on another open network (e.g., BSC)
  - Bridge/unwrap into XRP-network-compatible asset flow
  - Deposit to KRW exchange on XRP network
  - All automated, with hedge during latency

### 5.2 Route Types
```ts
type TransferRouteType = 'DIRECT' | 'BRIDGE'
```

### 5.3 Route Step Types
```ts
type RouteStepType =
  | 'CEX_WITHDRAW'
  | 'ONCHAIN_SWAP'
  | 'BRIDGE_TRANSFER'
  | 'UNWRAP_TO_NATIVE'
  | 'CEX_DEPOSIT_WAIT';
```

```ts
interface RouteStep {
  type: RouteStepType
  fromNetworkId?: string
  toNetworkId?: string
  providerId?: string            // bridge/DEX provider
  estTimeMins: number
  estCostUsd: number             // gas + bridge fee + slip
  required: boolean
  metadata?: Record<string, any> // memo/tag, confirmations, etc.
}
```

### 5.4 TransferRoute Model
```ts
interface TransferRoute {
  routeType: TransferRouteType
  destRequiredNetworkId?: string     // e.g., 'XRP'
  commonNetworks?: string[]          // for DIRECT
  steps: RouteStep[]
  estTotalTimeMins: number
  estTotalCostUsd: number
  riskFlags: string[]                // BRIDGE_CONTRACT_RISK, LIQUIDITY_RISK, TRAVEL_RULE_RISK...
}
```

### 5.5 Policy: When to allow BRIDGE routes
- **Only for Kimchi (dest is KRW exchange)**
- Only if `config.policies.kimchiSpotSpot.allowBridge === true`
- Only if provider is in **allowlist**
- Must satisfy route constraints:
  - `estTotalTimeMins <= maxBridgeTimeMins`
  - `estTotalCostUsd <= maxBridgeCostUsd` (or `costPct <= maxCostPct`)
  - memo/tag requirements fully satisfied
- Must be **net profitable** after adding bridge costs and time-risk penalty

### 5.6 Required Deposit Networks for KRW Exchanges
Add explicit config:
- Example: `UPBIT: XRP → [XRP]`, `BITHUMB: XRP → [XRP]`

```json
{
  "krwExchanges": ["UPBIT", "BITHUMB"],
  "requiredDepositNetworks": {
    "UPBIT": { "XRP": ["XRP"] },
    "BITHUMB": { "XRP": ["XRP"] }
  }
}
```

### 5.7 Route Planner Algorithm (MVP)
**Goal**: Find best route (lowest cost + fastest + lowest risk)
1. Determine destination required network (if KRW exchange + asset has fixed deposit network)
2. Try DIRECT route first (intersection + required network match)
3. If DIRECT fails and policy allows bridge:
   - Enumerate candidate source networks that allow withdrawal
   - For each, ask BridgeProvider(s) for a quote to destination required network
   - Compute route cost/time + risk flags
   - Filter infeasible routes
   - Return best route

---

## 6. Data Models

### 6.1 Existing Tables (v0.2)
- `exchanges`, `assets`, `networks`, `wallet_statuses`, `quotes_spot`, `quotes_futures`, `opportunities`
- Redis keys for market/wallet/opportunities

### 6.2 Additions / Fixes (v0.3)

#### 6.2.1 Opportunities: add `transfer_route`
Add to `opportunities` table:
- `transfer_route JSONB NOT NULL`

Example:
```json
{
  "routeType": "BRIDGE",
  "destRequiredNetworkId": "XRP",
  "steps": [
    { "type": "CEX_WITHDRAW", "fromNetworkId": "BSC-BEP20", "estTimeMins": 3, "estCostUsd": 1.2, "required": true },
    { "type": "BRIDGE_TRANSFER", "fromNetworkId": "BSC-BEP20", "toNetworkId": "XRP", "providerId": "BRIDGE_X", "estTimeMins": 8, "estCostUsd": 4.5, "required": true },
    { "type": "CEX_DEPOSIT_WAIT", "toNetworkId": "XRP", "estTimeMins": 5, "estCostUsd": 0, "required": true }
  ],
  "estTotalTimeMins": 16,
  "estTotalCostUsd": 5.7,
  "riskFlags": ["BRIDGE_CONTRACT_RISK", "LIQUIDITY_RISK"]
}
```

#### 6.2.2 FX Rates table
See [Section 4.3](#43-fx-data-model-postgres).

#### 6.2.3 Quotes: Snapshot vs History (clarify)
Phase 1 MVP uses **snapshot** tables (upsert 1 row per market).  
If you need history/backtesting later, add `quotes_*_history` in Phase 3.

---

## 7. Opportunity Calculation

### 7.1 Price Reference (Conservative)
- Spot Buy: `ask`
- Spot Sell: `bid`
- Futures Short: `bid` or `mark` (configurable)

### 7.2 Currency-normalized Gap Calculation
All gaps computed in **USDT** (or USD) terms.

#### Spot-Spot Gap (normalized)
```ts
function gapPct(buyPriceUSDT: number, sellPriceUSDT: number): number {
  return ((sellPriceUSDT - buyPriceUSDT) / buyPriceUSDT) * 100
}
```

#### Spot-Futures Gap (normalized)
```ts
function spotFuturesGapPct(spotUSDT: number, futuresUSDT: number): number {
  return ((futuresUSDT - spotUSDT) / spotUSDT) * 100
}
```

### 7.3 Net Profit Components (v0.3)
For Spot-Spot + Hedge, include:
- Spot trading fees (buy + sell)
- Futures fees (open + close hedge)
- Slippage (buy/sell + hedge)
- **Withdraw fee** (source exchange)
- **Bridge route cost** (sum of steps) — Kimchi BRIDGE only
- **Time risk penalty**: `timeRiskBpsPerMin * estTotalTimeMins`
- Safety buffer

### 7.4 BRIDGE Route cost integration
```ts
function routeCostPct(route: TransferRoute, orderSizeUsd: number): number {
  return (route.estTotalCostUsd / orderSizeUsd) * 100
}

function timeRiskPenaltyPct(route: TransferRoute, timeRiskBpsPerMin: number): number {
  return (timeRiskBpsPerMin * route.estTotalTimeMins) / 100 // bps->%
}
```

### 7.5 Scoring Update
- Default score = `netPct`
- Apply penalties based on:
  - Bridge risk flags
  - Long route time
  - Low liquidity

---

## 8. Dashboard UI Specification

### 8.1 Opportunity List (New Columns)
Add:
- **Route**: `DIRECT` / `BRIDGE`
- **Est Time**: minutes
- **Est Cost**: USD and/or cost%

Suggested columns (additions marked *NEW*):
| Column | Description |
|---|---|
| Strategy | 현+현(헷징) / 현+선 |
| Symbol |
| Exchanges |
| Buy Price |
| Sell Price |
| Gross Gap % |
| Net Profit % |
| Funding Rate |
| Networks |
| Wallet Status |
| **Route (NEW)** | DIRECT / BRIDGE |
| **Est Time (NEW)** | route estTotalTimeMins |
| **Est Cost (NEW)** | route estTotalCostUsd |
| Actions | Details / (Phase2 Enter) |

### 8.2 Kimchi-specific filter
Add a toggle:
- `Kimchi: allow BRIDGE routes` (Phase 1: affects display only; Phase 2: affects execution)

### 8.3 Details Modal (Route Timeline)
Display `transfer_route.steps` timeline with cost/time per step and risk flags.

---

## 9. Exchange Connector Interface

### 9.1 Existing Connectors (v0.2)
- MarketDataConnector
- WalletStatusConnector
- TradingConnector (Phase 2)

### 9.2 New: Bridge Provider Adapter
Bridge automation requires provider-specific integration. Define an adapter interface.

```ts
export interface BridgeQuoteRequest {
  assetSymbol: string
  amount: number
  fromNetworkId: string
  toNetworkId: string
  slippageBps: number
}

export interface BridgeQuote {
  providerId: string
  estTimeMins: number
  estFeeUsd: number
  estSlippageUsd: number
  minReceived: number
  routeData: any              // provider-specific payload for execution
  riskFlags: string[]         // e.g., BRIDGE_CONTRACT_RISK, LIQUIDITY_RISK
}

export abstract class BridgeProviderAdapter {
  abstract readonly providerId: string
  abstract quote(req: BridgeQuoteRequest): Promise<BridgeQuote | null>
  abstract execute(routeData: any, signer: any): Promise<{
    txid: string
    status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  }>
}
```

### 9.3 New: Onchain Execution Adapter (optional, but recommended)
For ONCHAIN_SWAP / UNWRAP, define:
- `DexSwapAdapter`
- `UnwrapAdapter`
(Phase 2+; can be stubbed in Phase 1 for estimation only.)

---

## 10. Execution Engine (Phase 2)

### 10.1 State Machine (unchanged)
`IDLE → PRECHECK → READY → ENTERING → ACTIVE → EXITING → CLOSED`

### 10.2 Spot-Futures execution (unchanged core)
- Open futures short first
- Buy spot
- Monitor and exit

### 10.3 Spot-Spot + Hedge execution (Updated for DIRECT/BRIDGE)
#### Flow
1. **Open hedge short FIRST**
2. Buy spot at source exchange
3. Execute transfer route:
   - **DIRECT**: CEX withdraw → CEX deposit wait
   - **BRIDGE**:
     - CEX withdraw to **operator wallet** (EOA) on fromNetwork
     - ONCHAIN_SWAP (optional)
     - BRIDGE_TRANSFER via provider allowlist
     - UNWRAP_TO_NATIVE (optional)
     - CEX deposit wait on required network
4. Sell spot at destination exchange
5. Close hedge short

#### New Precheck items (Kimchi BRIDGE)
- Verify provider allowlisted
- Verify operator wallet has gas for fromNetwork/toNetwork
- Verify memo/tag requirements for destination exchange
- Verify travel-rule/whitelist constraints (best-effort checks)
- Verify route is still feasible (fresh quote)

### 10.4 Position Monitoring: Exit rule fix (Bug fix from v0.2)
In v0.2, stoploss comparison could trigger immediate exits. v0.3 defines exit based on **entry gap reference**.

Definitions:
- `entryGapPct`: gap at entry time
- `currentGapPct`: gap now
- `gapDelta = currentGapPct - entryGapPct`

Rules:
- **Target**: `gapDelta <= -targetDeltaPct` (gap narrowed by target)
- **Stop**: `gapDelta >= stopDeltaPct` (gap widened by stop)
- **Max holding time**

```ts
function shouldExit(entryGapPct: number, currentGapPct: number, cfg: ExitCfg) {
  const delta = currentGapPct - entryGapPct

  if (delta <= -cfg.targetDeltaPct) return { exit: true, reason: 'TARGET' }
  if (delta >= cfg.stopDeltaPct) return { exit: true, reason: 'STOP' }
  return { exit: false }
}
```

---

## 11. Risk Management

### 11.1 New Risk Params (BRIDGE)
Add:
- `maxBridgeTimeMins`
- `maxBridgeCostUsd` or `maxBridgeCostPct`
- `timeRiskBpsPerMin`
- `allowedBridgeProviders`
- `operatorWalletMinGasUsd`

### 11.2 New Risk Flags (for scoring + execution)
- `BRIDGE_CONTRACT_RISK`
- `LIQUIDITY_RISK`
- `GAS_SPIKE_RISK`
- `TRAVEL_RULE_RISK`
- `WITHDRAW_WHITELIST_RISK`
- `MEMO_TAG_REQUIRED`

### 11.3 Emergency controls (bridge-specific)
- Disable a bridge provider
- Disable bridge routes globally (Kimchi only)
- Stop all new withdrawals immediately

---

## 12. Implementation Roadmap (Updated)

### Phase 1 (MVP): Dashboard + Monitoring
Additions to Phase 1:
- FX rates collector (USDTKRW)
- Route planner **estimation mode**:
  - DIRECT route detection
  - BRIDGE route feasibility + cost/time estimate using provider quote endpoints (if available), or static heuristics until provider integration

Acceptance criteria additions:
- ✅ KRW↔USDT price normalization works
- ✅ Global↔Global spot-spot shows **DIRECT-only** opportunities
- ✅ Kimchi opportunities can show **DIRECT** or **BRIDGE** route label (if allowed and feasible)
- ✅ Opportunity details include route steps (estimated)

### Phase 2: Execution
Additions:
- Operator wallet management (secure key storage)
- BridgeProviderAdapter integration (execute onchain)
- Memo/tag enforcement for XRP-like networks

---

## 13. Testing Strategy (Additions)

### Unit tests
- Network intersection validity (global↔global)
- Kimchi route planner returns DIRECT if possible, else BRIDGE if feasible
- FX normalization correctness

### Integration tests
- Wallet status parsing for KRW exchanges (required network constraints)
- Bridge quote ingestion (mock provider)

### E2E tests
- Simulated BRIDGE route: withdraw → “bridge tx confirmed” → deposit → sell → hedge close

---

## 14. Appendix

### 14.1 Config Template (v0.3)
```json
{
  "exchanges": ["UPBIT", "BITHUMB", "BINANCE", "BYBIT", "OKX"],
  "krwExchanges": ["UPBIT", "BITHUMB"],
  "policies": {
    "globalGlobalSpotSpot": { "allowBridge": false },
    "kimchiSpotSpot": {
      "allowBridge": true,
      "allowedBridgeProviders": ["BRIDGE_X", "BRIDGE_Y"],
      "maxBridgeTimeMins": 30,
      "maxBridgeCostUsd": 15,
      "timeRiskBpsPerMin": 1.0
    }
  },
  "requiredDepositNetworks": {
    "UPBIT": { "XRP": ["XRP"] },
    "BITHUMB": { "XRP": ["XRP"] }
  },
  "risk": {
    "maxExposureUsd": 50000,
    "maxOpenPositions": 10,
    "minNetPctThreshold": 0.5,
    "maxSlippageBps": 50,
    "operatorWalletMinGasUsd": 50
  },
  "fx": {
    "pair": "USDTKRW",
    "refreshSecs": 10,
    "source": "PROVIDER_1"
  }
}
```

### 14.2 Operational Notes (Phase 2 Safety)
- BRIDGE route automation implies:
  - operator wallet custody
  - smart-contract interactions
  - travel-rule & address whitelist constraints
- Must implement:
  - allowlist-only providers
  - emergency stop
  - per-step retries + timeouts
  - comprehensive logging + audit trail

---

## 15. Changelog

### v0.3 (2026-01-25)
- Added **Kimchi Premium spot-spot bridge route** support (DIRECT preferred, BRIDGE allowed by policy)
- Added **policy split**:
  - Global↔Global spot-spot: **DIRECT only**
  - Kimchi spot-spot: **DIRECT/BRIDGE**
- Added **Transfer Route Planner** model and step timeline
- Added **BridgeProviderAdapter** interface for Phase 2 onchain execution
- Added **FX normalization layer (USDTKRW)** for KRW↔USDT comparisons
- Fixed **Spot-Futures validity** to use network intersection
- Fixed **exit rules** (target/stop logic) to avoid immediate stoploss bug

---

**End of Specification v0.3**
