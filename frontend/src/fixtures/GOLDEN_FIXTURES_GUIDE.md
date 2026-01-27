# Golden Fixtures - Edge Case Testing Guide

## Overview

This dataset contains **25 carefully crafted opportunities** designed to test all filter edge cases and boundary conditions. Each opportunity has a descriptive ID that indicates what it tests.

---

## Quick Stats

```
Total Opportunities: 25

By Strategy:
  - SPOT_SPOT_HEDGE: 15
  - SPOT_FUTURES: 10

By Route Type:
  - DIRECT: 23
  - BRIDGE: 2

By Wallet Status:
  - All Open: 20
  - Blocked: 5
  - No Common Network: 3

By Gap (vs min 0.5%, max 100%):
  - Below Min: 1
  - At Min: 1
  - Above Min: 18
  - At Max: 1
  - Above Max: 1

By Net Profit (vs threshold 0.3%):
  - Below Threshold: 2
  - At Threshold: 2
  - Above Threshold: 21
```

---

## Edge Case Checklist

### 1. GAP FILTER BOUNDARIES

Default: `minGapPct: 0.5%`, `maxGapPct: 100%`

| Opportunity ID | Gap % | Expected Behavior (Default Filters) |
|----------------|-------|-------------------------------------|
| `gap-below-min` | 0.49% | ❌ **EXCLUDED** - Below minimum |
| `gap-at-min` | 0.50% | ✅ **INCLUDED** - Exactly at minimum |
| `gap-above-min` | 0.51% | ✅ **INCLUDED** - Just above minimum |
| `gap-below-max` | 99.9% | ✅ **INCLUDED** - Below maximum |
| `gap-at-max` | 100.0% | ✅ **INCLUDED** - Exactly at maximum |
| `gap-above-max` | 101.0% | ❌ **EXCLUDED** - Above maximum |

**Test Scenarios:**
- [x] Gap just below min (0.49%) → should be excluded
- [x] Gap exactly at min (0.50%) → should be included
- [x] Gap just above min (0.51%) → should be included
- [x] Gap just below max (99.9%) → should be included
- [x] Gap exactly at max (100.0%) → should be included
- [x] Gap just above max (101.0%) → should be excluded

---

### 2. NET PROFIT FILTER BOUNDARIES

Default: `minNetProfitPct: 0.3%`

| Opportunity ID | Net % | Gap % | Expected Behavior (Default Filters) |
|----------------|-------|-------|-------------------------------------|
| `net-below-threshold` | 0.29% | 1.0% | ❌ **EXCLUDED** - Net profit too low |
| `net-at-threshold` | 0.30% | 0.50% | ✅ **INCLUDED** - Exactly at threshold |
| `net-above-threshold` | 0.31% | 0.83% | ✅ **INCLUDED** - Just above threshold |

**Test Scenarios:**
- [x] Net profit just below threshold (0.29%) → should be excluded
- [x] Net profit exactly at threshold (0.30%) → should be included
- [x] Net profit just above threshold (0.31%) → should be included
- [x] High gap but low net (1.0% gap, 0.29% net) → should be excluded

---

### 3. WALLET STATUS / NETWORK AVAILABILITY

Default: `onlyOpenNetworks: true`

| Opportunity ID | Common Networks | walletStatusOk | Expected Behavior (Default Filters) |
|----------------|-----------------|----------------|-------------------------------------|
| `wallet-all-open` | 2 | ✅ true | ✅ **INCLUDED** - All networks open |
| `wallet-withdraw-blocked` | 1 | ❌ false | ❌ **EXCLUDED** - Withdraw disabled |
| `wallet-deposit-blocked` | 1 | ❌ false | ❌ **EXCLUDED** - Deposit disabled |
| `wallet-no-common-network` | 0 | ❌ false | ❌ **EXCLUDED** - No shared network |

**Test Scenarios:**
- [x] Multiple common networks, all open → should be included
- [x] Has network, but withdraw blocked → should be excluded
- [x] Has network, but deposit blocked → should be excluded
- [x] No common network between exchanges → should be excluded
- [x] Toggle `onlyOpenNetworks` OFF → all wallet states should be included

---

### 4. ROUTE TYPE (DIRECT vs BRIDGE)

Default: `allowBridgeRoutes: false`

| Opportunity ID | Route Type | Expected Behavior (Default Filters) |
|----------------|------------|-------------------------------------|
| `route-direct` | DIRECT | ✅ **INCLUDED** - Direct transfer allowed |
| `route-bridge` | BRIDGE | ❌ **EXCLUDED** - Bridge routes disabled |

**Test Scenarios:**
- [x] DIRECT route → should be included
- [x] BRIDGE route → should be excluded (default)
- [x] Toggle `allowBridgeRoutes` ON → bridge routes should be included
- [x] BRIDGE + wallet blocked → should have 2 exclusion reasons

---

### 5. EXCHANGE EXCLUSION

Default: `excludeExchanges: []`

| Opportunity ID | Exchanges | Expected When Excluded |
|----------------|-----------|------------------------|
| `exchange-binance-only` | Binance ↔ Binance | ❌ If Binance excluded |
| `exchange-upbit-only` | Binance ↔ Upbit | ❌ If Binance OR Upbit excluded |
| `exchange-bybit-only` | Bybit ↔ Bybit | ❌ If Bybit excluded |
| `exchange-okx-only` | OKX ↔ OKX | ❌ If OKX excluded |
| `exchange-bithumb-only` | Binance ↔ Bithumb | ❌ If Binance OR Bithumb excluded |
| `exchange-multiple` | Binance ↔ Bybit | ❌ If Binance OR Bybit excluded |

**Test Scenarios:**
- [x] Exclude Binance → should filter out Binance-only + multi-exchange opps
- [x] Exclude Upbit → should filter out Upbit-only + multi-exchange opps
- [x] Exclude multiple exchanges → cumulative filtering
- [x] Exclude all exchanges → should show 0 results (or all in debug mode)

---

### 6. STRATEGY TYPE

Default: `showSpotSpotHedge: true`, `showSpotFutures: true`

| Opportunity ID | Strategy | Expected Behavior |
|----------------|----------|-------------------|
| `strategy-spot-hedge` | SPOT_SPOT_HEDGE | ✅ Included by default, ❌ if toggle OFF |
| `strategy-spot-futures` | SPOT_FUTURES | ✅ Included by default, ❌ if toggle OFF |

**Test Scenarios:**
- [x] Toggle `showSpotSpotHedge` OFF → should hide all Spot+Hedge opportunities
- [x] Toggle `showSpotFutures` OFF → should hide all Spot-Futures opportunities
- [x] Toggle both OFF → should show 0 results (or all in debug mode)

---

### 7. COMBINATION EDGE CASES

| Opportunity ID | Multiple Filters Tested | Expected Behavior |
|----------------|-------------------------|-------------------|
| `combo-gap-below-net-below` | Gap: 0.49%, Net: 0.29% | ❌ EXCLUDED (2 reasons: gap + net) |
| `combo-bridge-wallet-blocked` | BRIDGE + wallet blocked | ❌ EXCLUDED (2 reasons: bridge + wallet) |
| `combo-high-gap-high-net-all-good` | Gap: 6%, Net: 5.2%, all open | ✅ INCLUDED (passes all filters) |
| `combo-exact-boundaries` | Gap: 0.50%, Net: 0.30% | ✅ INCLUDED (exactly at both boundaries) |

**Test Scenarios:**
- [x] Multiple exclusion reasons (gap + net) → should show 2 reasons in debug mode
- [x] Multiple exclusion reasons (bridge + wallet) → should show 2 reasons
- [x] All filters pass with high values → should be included
- [x] Exactly at multiple boundaries → should be included (inclusive boundaries)

---

## How to Use for Testing

### 1. Enable Debug Mode
1. Open the dashboard
2. Enable **🔧 Debug Mode** in the filter panel
3. You'll see all 25 opportunities with exclusion reasons

### 2. Test Individual Filters

**Gap Filter:**
```
1. Set minGapPct to 0.5%, maxGapPct to 100%
2. In debug mode, look for:
   - gap-below-min → should show [GAP_BELOW_MIN:0.49%<0.5%]
   - gap-at-min → should show ✓ PASSES
   - gap-above-max → should show [GAP_ABOVE_MAX:101.0%>100.0%]
```

**Net Profit Filter:**
```
1. Set minNetProfitPct to 0.3%
2. In debug mode, look for:
   - net-below-threshold → should show [NET_BELOW_THRESHOLD:0.29%<0.3%]
   - net-at-threshold → should show ✓ PASSES
```

**Wallet Filter:**
```
1. Keep onlyOpenNetworks = true (default)
2. In debug mode, look for:
   - wallet-withdraw-blocked → should show [WALLET_NOT_OPEN]
   - wallet-no-common-network → should show [NO_COMMON_NETWORK]
3. Toggle onlyOpenNetworks = false
4. All wallet-* opportunities should now show ✓ PASSES
```

**Bridge Filter:**
```
1. Keep allowBridgeRoutes = false (default)
2. In debug mode, look for:
   - route-bridge → should show [BRIDGE_DISABLED]
3. Toggle allowBridgeRoutes = true
4. route-bridge should now show ✓ PASSES
```

**Exchange Exclusion:**
```
1. Exclude Binance
2. In debug mode, look for:
   - exchange-binance-only → should show [EXCHANGE_EXCLUDED:BINANCE]
   - exchange-upbit-only → should show [EXCHANGE_EXCLUDED:BINANCE]
   - exchange-bybit-only → should show ✓ PASSES (doesn't use Binance)
```

**Strategy Type:**
```
1. Uncheck "Spot-Spot + Hedge"
2. In debug mode, all SPOT_SPOT_HEDGE opportunities should show:
   [STRATEGY_DISABLED:SPOT_SPOT_HEDGE]
```

### 3. Test Combinations

**Multiple Exclusions:**
```
1. Set minGapPct to 1.0%, minNetProfitPct to 0.5%
2. Look for combo-gap-below-net-below
3. Should show 2 reasons:
   - [GAP_BELOW_MIN:0.49%<1.0%]
   - [NET_BELOW_THRESHOLD:0.29%<0.5%]
```

**All Filters Disabled:**
```
1. Disable all toggles (showSpotSpotHedge, showSpotFutures)
2. Normal mode → should show 0 opportunities
3. Debug mode → should show all 25 with STRATEGY_DISABLED reasons
```

---

## Verification Checklist

Use this checklist to verify all filters work correctly:

### Gap Filter
- [ ] Gap below min (0.49%) → excluded with reason
- [ ] Gap at min (0.50%) → included
- [ ] Gap above min (0.51%) → included
- [ ] Gap below max (99.9%) → included
- [ ] Gap at max (100.0%) → included
- [ ] Gap above max (101.0%) → excluded with reason

### Net Profit Filter
- [ ] Net below threshold (0.29%) → excluded with reason
- [ ] Net at threshold (0.30%) → included
- [ ] Net above threshold (0.31%) → included

### Wallet Filter
- [ ] All open → included
- [ ] Withdraw blocked → excluded with WALLET_NOT_OPEN
- [ ] Deposit blocked → excluded with WALLET_NOT_OPEN
- [ ] No common network → excluded with NO_COMMON_NETWORK
- [ ] Toggle OFF → all included

### Bridge Filter
- [ ] DIRECT route → included
- [ ] BRIDGE route → excluded with BRIDGE_DISABLED
- [ ] Toggle ON → bridge included

### Exchange Exclusion
- [ ] Exclude Binance → filters correctly
- [ ] Exclude Upbit → filters correctly
- [ ] Exclude Bybit → filters correctly
- [ ] Exclude OKX → filters correctly
- [ ] Exclude Bithumb → filters correctly
- [ ] Multiple exclusions → cumulative filtering

### Strategy Type
- [ ] Disable Spot+Hedge → filters correctly
- [ ] Disable Spot-Futures → filters correctly
- [ ] Disable both → shows 0 (or all in debug)

### Combinations
- [ ] Multiple reasons shown in debug mode
- [ ] Exact boundaries (0.50%, 0.30%) → included
- [ ] All filters pass → included
- [ ] All filters fail → excluded with all reasons

---

## Expected Results Summary

**With Default Filters:**
- **Included:** 16 opportunities
- **Excluded:** 9 opportunities

**Breakdown:**
```
✅ INCLUDED (16):
  - gap-at-min, gap-above-min, gap-below-max, gap-at-max
  - net-at-threshold, net-above-threshold
  - wallet-all-open, route-direct
  - exchange-* (all when no exclusions)
  - strategy-* (both when enabled)
  - combo-high-gap-high-net-all-good, combo-exact-boundaries

❌ EXCLUDED (9):
  - gap-below-min (gap too small)
  - gap-above-max (gap too large)
  - net-below-threshold (net profit too low)
  - wallet-withdraw-blocked, wallet-deposit-blocked, wallet-no-common-network
  - route-bridge (bridge disabled)
  - combo-gap-below-net-below (2 reasons)
  - combo-bridge-wallet-blocked (2 reasons)
```

---

## Tips for Testing

1. **Always start with default filters** to establish baseline behavior
2. **Change one filter at a time** to isolate effects
3. **Use Debug Mode** to see exact exclusion reasons
4. **Check combination cases** to ensure filters compose correctly
5. **Toggle filters ON/OFF** to verify both inclusion and exclusion
6. **Test edge values** (0.50%, 0.30%, etc.) to verify inclusive boundaries
7. **Check exclusion reason text** matches expected format

---

## Common Issues to Watch For

⚠️ **Boundary Conditions**
- Ensure `>=` and `<=` used correctly (inclusive boundaries)
- Verify 0.50% is included, not excluded

⚠️ **Filter Composition**
- Multiple exclusion reasons should all appear
- Filters should be AND logic (all must pass)

⚠️ **Toggle Behavior**
- Disabling filter should include previously excluded items
- Enabling filter should exclude appropriate items

⚠️ **Exchange Exclusion**
- Should check ALL exchanges involved (buy, sell, futures)
- Multiple exchanges in one opportunity → any exclusion fails it

⚠️ **Wallet Status**
- `onlyOpenNetworks` toggle should control behavior
- `walletStatusOk` and `commonNetworks` both matter

---

## Next Steps

After verifying filters work correctly with golden fixtures:
1. ✅ Add unit tests for each filter function
2. ✅ Add integration tests for filter combinations
3. ✅ Consider adding more edge cases as needed
4. ✅ Use fixtures for regression testing before releases
