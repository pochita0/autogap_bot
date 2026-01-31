# Symbol Universe Service

## Overview

The **Symbol Universe Service** creates a canonical representation of tradeable assets across all supported exchanges, enabling premium opportunity calculations over the real intersection of symbols available on both KRW and USDT markets.

## Supported Exchanges

### KRW Markets
- **Bithumb** - KRW-based cryptocurrency exchange (curated top 21 symbols)
- **Upbit** - KRW-based cryptocurrency exchange (all KRW markets)

### Global Markets (USDT)
- **Binance** - USDT spot markets
- **OKX** - USDT spot markets
- **Bybit** - USDT spot markets

## Symbol Normalization

Each exchange uses different symbol formats. The normalization layer parses these formats into a common `base/quote` structure.

### Format Rules by Exchange

| Exchange | Format | Example | Base | Quote |
|----------|--------|---------|------|-------|
| **Bithumb** | `{BASE}_{QUOTE}` | `BTC_KRW` | `BTC` | `KRW` |
| **Upbit** | `{QUOTE}-{BASE}` | `KRW-BTC` | `BTC` | `KRW` |
| **Binance** | `{BASE}{QUOTE}` | `BTCUSDT` | `BTC` | `USDT` |
| **OKX** | `{BASE}-{QUOTE}` | `BTC-USDT` | `BTC` | `USDT` |
| **Bybit** | `{BASE}{QUOTE}` | `BTCUSDT` | `BTC` | `USDT` |

### Normalization Examples

```typescript
// Bithumb
parseBithumbSymbol('BTC_KRW')   // => { base: 'BTC', quote: 'KRW' }
parseBithumbSymbol('FXS_KRW')   // => { base: 'FXS', quote: 'KRW' }

// Upbit
parseUpbitSymbol('KRW-BTC')     // => { base: 'BTC', quote: 'KRW' }
parseUpbitSymbol('KRW-ETH')     // => { base: 'ETH', quote: 'KRW' }

// Binance
parseBinanceSymbol('BTCUSDT')   // => { base: 'BTC', quote: 'USDT' }
parseBinanceSymbol('FRAXUSDT')  // => { base: 'FRAX', quote: 'USDT' }

// OKX
parseOKXSymbol('BTC-USDT')      // => { base: 'BTC', quote: 'USDT' }
parseOKXSymbol('FRAX-USDT')     // => { base: 'FRAX', quote: 'USDT' }

// Bybit
parseBybitSymbol('BTCUSDT')     // => { base: 'BTC', quote: 'USDT' }
```

## Alias Rules

### FRAX ↔ FXS Mapping

Bithumb lists **FXS** in its KRW market, while global exchanges list **FRAX** in USDT markets. These represent the same underlying asset and should be matched for premium calculations.

**Canonical Asset ID:** `FRAX`

**Symbol Mapping:**
- **KRW Markets:** `FXS` (Bithumb symbol)
- **Global Markets:** `FRAX` (Binance, OKX, Bybit symbol)

**Example:**
```
Bithumb: FXS_KRW   ─┐
                     ├─→ Canonical Asset: FRAX
Binance: FRAXUSDT  ─┘
```

### Implementation

Alias mapping is handled internally by `SymbolUniverseService`:

```typescript
// Internal alias rules
const ALIAS_RULES = {
  FRAX: {
    krw: 'FXS',      // KRW exchanges use FXS
    global: 'FRAX',  // Global exchanges use FRAX
  },
};
```

When building the universe:
1. Bithumb's `FXS_KRW` is mapped to canonical asset `FRAX` with KRW symbol `FXS`
2. Binance's `FRAXUSDT` is mapped to canonical asset `FRAX` with global symbol `FRAX`
3. The canonical asset `FRAX` has both KRW and USDT markets available

## API Endpoint

### GET `/symbols/universe`

Returns the complete symbol universe with canonical assets and statistics.

**Response Structure:**
```typescript
{
  "assets": [
    {
      "assetId": "BTC",              // Canonical asset identifier
      "krwSymbols": {
        "BITHUMB": ["BTC"],
        "UPBIT": ["BTC"],
        "BINANCE": [],
        "OKX": [],
        "BYBIT": []
      },
      "globalSymbols": {
        "BITHUMB": [],
        "UPBIT": [],
        "BINANCE": ["BTC"],
        "OKX": ["BTC"],
        "BYBIT": ["BTC"]
      }
    },
    {
      "assetId": "FRAX",             // Canonical ID (alias applied)
      "krwSymbols": {
        "BITHUMB": ["FXS"],          // Bithumb uses FXS
        "UPBIT": [],
        "BINANCE": [],
        "OKX": [],
        "BYBIT": []
      },
      "globalSymbols": {
        "BITHUMB": [],
        "UPBIT": [],
        "BINANCE": ["FRAX"],         // Binance uses FRAX
        "OKX": ["FRAX"],
        "BYBIT": ["FRAX"]
      }
    }
  ],
  "stats": {
    "perExchangeCounts": {
      "BITHUMB": { "krw": 21, "usdt": 0 },
      "UPBIT": { "krw": 300, "usdt": 0 },
      "BINANCE": { "krw": 0, "usdt": 2000 },
      "OKX": { "krw": 0, "usdt": 1500 },
      "BYBIT": { "krw": 0, "usdt": 1800 }
    },
    "canonicalCount": 2500,          // Total unique canonical assets
    "matchedCount": 150,             // Assets available on both KRW and USDT
    "generatedAt": "2026-01-28T10:00:00.000Z"
  },
  "generatedAt": "2026-01-28T10:00:00.000Z"
}
```

### Usage Examples

#### Get Full Universe
```bash
curl http://localhost:4000/symbols/universe | jq '.'
```

#### Get Statistics Only
```bash
curl http://localhost:4000/symbols/universe | jq '.stats'
```

**Example Output:**
```json
{
  "perExchangeCounts": {
    "BITHUMB": { "krw": 21, "usdt": 0 },
    "UPBIT": { "krw": 300, "usdt": 0 },
    "BINANCE": { "krw": 0, "usdt": 2000 },
    "OKX": { "krw": 0, "usdt": 1500 },
    "BYBIT": { "krw": 0, "usdt": 1800 }
  },
  "canonicalCount": 2500,
  "matchedCount": 150,
  "generatedAt": "2026-01-28T10:00:00.000Z"
}
```

#### Verify FRAX Alias
```bash
curl http://localhost:4000/symbols/universe | jq '.assets[] | select(.assetId == "FRAX")'
```

**Expected Output:**
```json
{
  "assetId": "FRAX",
  "krwSymbols": {
    "BITHUMB": ["FXS"],
    "UPBIT": [],
    "BINANCE": [],
    "OKX": [],
    "BYBIT": []
  },
  "globalSymbols": {
    "BITHUMB": [],
    "UPBIT": [],
    "BINANCE": ["FRAX"],
    "OKX": ["FRAX"],
    "BYBIT": ["FRAX"]
  }
}
```

#### Get Matched Assets Count
```bash
curl http://localhost:4000/symbols/universe | jq '.stats.matchedCount'
```

## Canonical Asset Structure

A **canonical asset** represents a single tradeable asset identified consistently across all exchanges.

```typescript
interface CanonicalAsset {
  assetId: string;                       // Canonical identifier (e.g., 'BTC', 'FRAX')
  krwSymbols: Record<Exchange, string[]>; // Symbols on KRW markets per exchange
  globalSymbols: Record<Exchange, string[]>; // Symbols on USDT markets per exchange
}
```

### Properties

- **`assetId`**: The canonical identifier for the asset (e.g., `BTC`, `ETH`, `FRAX`)
- **`krwSymbols`**: Maps each exchange to an array of symbols available in KRW markets
- **`globalSymbols`**: Maps each exchange to an array of symbols available in USDT markets

### Matched Assets

An asset is considered **matched** if it has at least one symbol in both KRW and USDT markets. These are the assets that can be used for premium calculations.

**Example - Matched Asset (BTC):**
```json
{
  "assetId": "BTC",
  "krwSymbols": {
    "BITHUMB": ["BTC"],
    "UPBIT": ["BTC"]
  },
  "globalSymbols": {
    "BINANCE": ["BTC"],
    "OKX": ["BTC"],
    "BYBIT": ["BTC"]
  }
}
```
✅ **Matched** - Available on both KRW (Bithumb, Upbit) and USDT (Binance, OKX, Bybit)

**Example - Unmatched Asset (SOL - USDT only):**
```json
{
  "assetId": "SOL",
  "krwSymbols": {
    "BITHUMB": [],
    "UPBIT": []
  },
  "globalSymbols": {
    "BINANCE": ["SOL"],
    "OKX": ["SOL"],
    "BYBIT": ["SOL"]
  }
}
```
❌ **Not Matched** - Only available on USDT markets, no KRW markets

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SymbolUniverseService                     │
├─────────────────────────────────────────────────────────────┤
│ - Fetches markets from all exchange connectors              │
│ - Normalizes symbol formats                                 │
│ - Applies alias rules (FRAX↔FXS)                            │
│ - Builds canonical assets                                   │
│ - Calculates statistics                                     │
└─────────────────┬──────────────────────────┬────────────────┘
                  │                          │
        ┌─────────▼──────────┐     ┌────────▼─────────┐
        │ SymbolNormalization│     │ Exchange         │
        │ Utilities           │     │ Connectors       │
        └────────────────────┘     └──────┬───────────┘
                                           │
                  ┌────────────────────────┼────────────────┐
                  │                        │                │
         ┌────────▼────────┐    ┌─────────▼────────┐     ...
         │ BithumbConnector│    │ BinanceConnector │
         │ (KRW markets)   │    │ (USDT markets)   │
         └─────────────────┘    └──────────────────┘
```

### Data Flow

1. **Fetch Markets**
   - Each connector fetches its market list from the exchange API
   - Returns `MarketInfo[]` with normalized base/quote

2. **Normalize Symbols**
   - Parse exchange-specific formats into `ExchangeSymbol` objects
   - Extract base and quote assets in uppercase

3. **Apply Alias Rules**
   - Check if base symbol matches any alias rule
   - Map to canonical asset ID (e.g., `FXS` → `FRAX`)

4. **Build Canonical Assets**
   - Group symbols by canonical asset ID
   - Separate into KRW and USDT markets
   - Store per-exchange symbol arrays

5. **Calculate Statistics**
   - Count symbols per exchange and market type
   - Count total canonical assets
   - Count matched assets (available on both sides)

## Future Wiring Plan

### Phase 2: Premium Calculator Integration

**Goal:** Use the symbol universe to calculate premiums only for matched assets.

**Changes:**
1. Fetch symbol universe at startup or on-demand
2. Filter premium calculations to only matched assets
3. Use correct exchange symbols when fetching quotes (handle FXS↔FRAX mapping)

**Example:**
```typescript
// Current: Calculate premiums for all quotes
const opportunities = await premiumCalculator.calculatePremiumOpportunities(
  allKrwQuotes,
  allGlobalQuotes
);

// Future: Calculate premiums only for matched assets
const universe = await symbolUniverseService.buildUniverse();
const matchedAssets = universe.assets.filter(hasMatchedMarkets);

// For each matched asset, fetch quotes using correct symbols
for (const asset of matchedAssets) {
  const krwQuotes = await fetchQuotesForAsset(asset, 'KRW');
  const globalQuotes = await fetchQuotesForAsset(asset, 'USDT');
  // Calculate premium...
}
```

### Phase 3: Dynamic Symbol Discovery

**Goal:** Automatically discover new tradeable assets as they become available on exchanges.

**Implementation:**
1. Cache universe results with TTL (e.g., 5 minutes)
2. Refresh universe periodically in background
3. Update frontend with newly matched assets
4. Track historical matched asset counts

### Phase 4: Additional Aliases

**Goal:** Support more symbol mismatches between KRW and global exchanges.

**Future Alias Rules:**
- Add new entries to `ALIAS_RULES` in `SymbolUniverseService.ts`
- Update tests to verify new aliases
- Document in this file

**Example - Adding a new alias:**
```typescript
const ALIAS_RULES = {
  FRAX: { krw: 'FXS', global: 'FRAX' },
  // New alias:
  LUNA: { krw: 'LUNC', global: 'LUNA' },
};
```

## Testing

### Run Unit Tests
```bash
npm test src/utils/__tests__/SymbolNormalization.test.ts
npm test src/services/__tests__/SymbolUniverseService.test.ts
```

### Test Coverage

**SymbolNormalization Tests:**
- ✅ Bithumb symbol parsing (`BTC_KRW` format)
- ✅ Upbit symbol parsing (`KRW-BTC` format)
- ✅ Binance symbol parsing (`BTCUSDT` format)
- ✅ OKX symbol parsing (`BTC-USDT` format)
- ✅ Bybit symbol parsing (`BTCUSDT` format)
- ✅ FRAX/FXS symbol extraction
- ✅ Filter by quote currency (KRW/USDT)
- ✅ Cross-exchange format consistency

**SymbolUniverseService Tests:**
- ✅ FRAX↔FXS alias mapping
- ✅ Canonical asset building
- ✅ Multi-exchange aggregation
- ✅ Matched asset counting
- ✅ Statistics calculation
- ✅ Error handling (connector failures)

## Performance Considerations

### Market Fetching
- **Parallel Fetching**: All exchanges are fetched concurrently using `Promise.all()`
- **Error Isolation**: Connector failures don't block other exchanges
- **Typical Response Time**: 2-5 seconds (depends on exchange APIs)

### Exchange-Specific Limits
- **Bithumb**: Hardcoded to 21 curated symbols (avoids rate limiting on 400+ symbols)
- **Upbit**: Fetches all KRW markets (~300 symbols)
- **Binance**: Single bulk request for all USDT markets (~2000 symbols)
- **OKX**: Single bulk request for all USDT markets (~1500 symbols)
- **Bybit**: Single bulk request for all USDT markets (~1800 symbols)

### Caching Strategy (Future)
- **Universe Cache**: Cache built universe for 5-10 minutes
- **Invalidation**: Refresh on demand or scheduled interval
- **Memory**: Minimal (~500KB for full universe)

## Troubleshooting

### Issue: FRAX not appearing in matched assets

**Check:**
1. Verify Bithumb lists `FXS_KRW`:
   ```bash
   curl http://localhost:4000/symbols/universe | jq '.assets[] | select(.assetId == "FRAX") | .krwSymbols'
   ```

2. Verify global exchanges list `FRAXUSDT`:
   ```bash
   curl http://localhost:4000/symbols/universe | jq '.assets[] | select(.assetId == "FRAX") | .globalSymbols'
   ```

3. Check connector logs for API errors

### Issue: Low matched asset count

**Possible Causes:**
- Exchange API failures (check server logs)
- Symbol format parsing errors (check normalization tests)
- Quote currency filters (ensure both KRW and USDT markets exist)

**Debug:**
```bash
# Check per-exchange counts
curl http://localhost:4000/symbols/universe | jq '.stats.perExchangeCounts'

# List all canonical assets
curl http://localhost:4000/symbols/universe | jq '.assets[].assetId'
```

## References

- **Types**: `/backend/src/types/symbolUniverse.ts`
- **Normalization**: `/backend/src/utils/SymbolNormalization.ts`
- **Service**: `/backend/src/services/SymbolUniverseService.ts`
- **Tests**: `/backend/src/utils/__tests__/SymbolNormalization.test.ts`
- **Tests**: `/backend/src/services/__tests__/SymbolUniverseService.test.ts`
- **Server Endpoint**: `/backend/src/server.ts` (line ~335)
