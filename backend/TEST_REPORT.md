# Test Report: Live-only Premium Mode + Bithumb FX Rate

## Overview
This report documents the comprehensive test suite for the live-only premium mode with Bithumb USDT/KRW FX rate feature.

## Test Summary
✅ **31 Tests Passing** (100% pass rate for new tests)

### Test Breakdown

#### 1. FxRateService Tests (12 tests)
**Location:** `src/services/__tests__/FxRateService.test.ts`

**Coverage:**
- ✅ Returns FX rate with correct structure (source, bid, ask, mid, timestamp, stale)
- ✅ Computes mid correctly as `(bid + ask) / 2`
- ✅ Caches rate and doesn't fetch twice within TTL
- ✅ Returns stale=false for fresh cached data
- ✅ Returns stale cached value on fetch failure (with stale=true)
- ✅ Throws error if no cache available and fetch fails
- ✅ Handles null quote response from connector
- ✅ Handles invalid quote with zero prices
- ✅ Converts USDT to KRW using ask rate (conservative for buying)
- ✅ Converts USDT to KRW using bid rate (conservative for selling)
- ✅ Uses different rates for bid vs ask conversion
- ✅ Returns USDT/KRW rate from service

**Key Test Data:**
```typescript
mockQuote = {
  exchange: 'BITHUMB',
  symbol: 'USDT',
  market: 'USDT/KRW',
  bid: 1447,  // Conservative for selling USDT
  ask: 1448,  // Conservative for buying USDT
  timestamp: '2026-01-28T10:00:00.000Z'
}
```

**Verified Behavior:**
- FX rate caching works correctly (2s live cache, 60s fallback cache)
- Conservative conversion: `100 USDT * 1448 = 144,800 KRW (ask)` / `100 USDT * 1447 = 144,700 KRW (bid)`
- Spread: 0.069%

#### 2. PremiumCalculator Tests (12 tests)
**Location:** `src/services/__tests__/PremiumCalculator.test.ts`

**Coverage:**
- ✅ Uses fxAsk for converting globalAsk to KRW (conservative for buying global)
- ✅ Uses fxBid for converting globalBid to KRW (conservative for selling global)
- ✅ Includes FX rate details in opportunity (bid, ask, mid, source, timestamp, stale)
- ✅ Calculates Kimchi premium correctly when KRW price > global price
- ✅ Calculates Kimchi premium formula correctly
- ✅ Calculates Reverse premium correctly when global price > KRW price
- ✅ Calculates Reverse premium formula correctly
- ✅ Does not create opportunities when gap is negative
- ✅ Includes backward-compatible usdtKrw field (mid for backwards compatibility)
- ✅ Generates unique IDs for each opportunity type
- ✅ Returns metadata with FX rate details
- ✅ Returns correct count of opportunities

**Key Test Scenarios:**

**Kimchi Premium Test:**
```typescript
// KRW: bid=3,500,000 ask=3,510,000
// Global: bid=$2400 ask=$2405
// FX: bid=1447 ask=1448
//
// globalAskKRW = 2405 * 1448 = 3,482,440 KRW
// Gap = ((3,500,000 - 3,482,440) / 3,482,440) * 100 = 0.50%
```

**Reverse Premium Test:**
```typescript
// KRW: bid=170 ask=171
// Global: bid=$0.119 ask=$0.120
// FX: bid=1447 ask=1448
//
// globalBidKRW = 0.119 * 1447 = 172.19 KRW
// Gap = ((172.19 - 171) / 171) * 100 = 0.70%
```

**Verified Conservative FX Usage:**
- `globalAskKRW = globalAsk * fxAsk` ✓ (Conservative for buying global asset)
- `globalBidKRW = globalBid * fxBid` ✓ (Conservative for selling global asset)

#### 3. Fixture Mode Guard Tests (7 tests)
**Location:** `src/__tests__/fixture-mode-guard.test.ts`

**Coverage:**
- ✅ Default mode is "live" for /opportunities
- ✅ Default mode is "live" for /premiums
- ✅ Guards fixture mode based on ENABLE_FIXTURES env var
- ✅ Returns 400 error for blocked fixture mode
- ✅ Enforces live-only mode in production
- ✅ Uses Bithumb FX rates in live mode
- ✅ Defaults all API calls to live mode

**Verified Guard Logic:**
```typescript
const fixturesEnabled = process.env.ENABLE_FIXTURES === 'true';
if (mode === 'fixture' && !fixturesEnabled) {
  return reply.status(400).send({
    error: 'Fixture mode disabled',
    message: 'Fixture data is disabled. Only live mode is available. Set ENABLE_FIXTURES=true to enable fixtures.'
  });
}
```

## Manual Testing

### 1. Fixture Mode is Blocked ✅
```bash
$ curl "http://localhost:4000/opportunities?mode=fixture"
{"error":"Fixture mode disabled","message":"Fixture data is disabled. Only live mode is available. Set ENABLE_FIXTURES=true to enable fixtures."}
```

### 2. Live Mode Works ✅
```bash
$ curl "http://localhost:4000/opportunities?mode=live&limit=1"
{"dataset":"live","count":1,"data":[...]}
```

### 3. FX Rate Endpoint ✅
```bash
$ curl "http://localhost:4000/fx-rate"
{"source":"BITHUMB","bid":1447,"ask":1448,"mid":1447.5,"timestamp":"2026-01-28T09:06:45.689Z","stale":false}
```

### 4. Premium Endpoint with FX Details ✅
```bash
$ curl "http://localhost:4000/premiums?mode=live&limit=1"
{
  "count":2,
  "fxRate":1447.5,
  "fxRateBid":1447,
  "fxRateAsk":1448,
  "fxSource":"BITHUMB",
  "fxRateTimestamp":"2026-01-28T09:08:37.314Z",
  "fxStale":false,
  "data":[...]
}
```

## Test Execution

```bash
# Run all new tests
npm test -- src/services/__tests__/ src/__tests__/

# Results:
✓ Test Files: 3 passed (3)
✓ Tests: 31 passed (31)
✓ Duration: 2.25s
```

## Regression Safety

### Production Behavior Locked In:
1. ✅ **Live-only mode enforced** - Fixture mode blocked unless ENABLE_FIXTURES=true
2. ✅ **Bithumb FX rates** - Real USDT/KRW rates from Bithumb orderbook
3. ✅ **Conservative conversion** - Uses bid/ask spreads for safe calculations
4. ✅ **Caching** - 2s live cache + 60s fallback cache
5. ✅ **FX details in API** - All responses include bid, ask, mid, source, timestamp, stale

### No Production Code Changes Required:
- All tests verify existing behavior only
- No changes to server logic needed
- Fixture mode guard remains intact
- FX rate service behavior is locked in

## Test Files Created

1. **src/services/__tests__/FxRateService.test.ts** (291 lines)
   - Mock connector tests
   - Cache behavior tests
   - Stale fallback tests
   - Conversion tests

2. **src/services/__tests__/PremiumCalculator.test.ts** (373 lines)
   - Conservative FX tests
   - Premium calculation tests
   - Edge case tests
   - Metadata tests

3. **src/__tests__/fixture-mode-guard.test.ts** (89 lines)
   - Configuration tests
   - Production behavior tests
   - Guard logic tests

## Conclusion

✅ **All acceptance criteria met:**
- All 31 tests pass (100% pass rate)
- No production code behavior changes
- Fixture mode guard remains intact and verified
- Conservative FX usage verified with real calculations
- Caching behavior verified with timing tests
- API responses include all required FX details

The live-only mode with Bithumb USDT/KRW FX rates is now fully tested and regression-safe.
