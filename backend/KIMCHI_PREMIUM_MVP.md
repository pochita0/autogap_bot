# Kimchi Premium / Reverse Kimchi Execution MVP - Phase 1

## Overview

Phase 1 extends the opportunity model to support Kimchi Premium and Reverse Kimchi execution flows between overseas exchanges and Bithumb (Korean exchange). This phase focuses on the data model and display infrastructure without implementing actual trading execution.

## New Opportunity Types

### KIMP_OVERSEAS_TO_BITHUMB
Represents a Kimchi Premium opportunity where:
- **Buy**: Cryptocurrency on overseas exchange (Binance, Bybit, OKX, etc.) at lower USD price
- **Transfer**: Move crypto from overseas exchange to Bithumb via blockchain network
- **Sell**: Cryptocurrency on Bithumb at higher KRW price (Kimchi Premium)

**Example**: BTC is $60,000 on Binance but ₩81,500,000 on Bithumb (~₩81,000,000 equivalent at 1350 KRW/USD = $60,000), representing a 2.15% premium.

### KIMP_BITHUMB_TO_OVERSEAS
Represents a Reverse Kimchi Premium opportunity where:
- **Buy**: Cryptocurrency on Bithumb at lower KRW price
- **Transfer**: Move crypto from Bithumb to overseas exchange via blockchain network
- **Sell**: Cryptocurrency on overseas exchange at higher USD price

**Example**: ETH is ₩3,050,000 on Bithumb but $2,250 on Binance, representing a profit opportunity when KRW/USD rate is favorable.

## Data Model Changes

### Opportunity Interface Extensions

```typescript
export type StrategyType =
  | 'SPOT_SPOT_HEDGE'
  | 'SPOT_FUTURES'
  | 'KIMP_OVERSEAS_TO_BITHUMB'  // NEW
  | 'KIMP_BITHUMB_TO_OVERSEAS';  // NEW

export interface Opportunity {
  // ... existing fields ...

  // Kimchi Premium fields (NEW in Phase 1)
  fromExchangeId?: string;        // Source exchange for transfer
  toExchangeId?: string;          // Destination exchange for transfer
  candidateNetworks?: CandidateNetwork[];  // Available transfer networks
  fx?: {
    rateRef: string;              // e.g., "USD/KRW"
    rateValue?: number;           // e.g., 1350.5
    source?: string;              // e.g., "Dunamu API"
  };
}

export interface CandidateNetwork {
  networkId: string;              // e.g., "BTC", "ETH-ERC20"
  feeAmount: number;              // Withdrawal fee in base currency
  minWithdraw: number;            // Minimum withdrawal amount
  estimatedMins: number;          // Estimated transfer time
  depositEnabled: boolean;        // Can deposit on destination
  withdrawEnabled: boolean;       // Can withdraw from source
}
```

### FilterState Extensions

```typescript
export interface FilterState {
  // ... existing fields ...
  showKimpOverseasToBithumb: boolean;  // NEW: Filter for Kimchi Premium
  showKimpBithumbToOverseas: boolean;  // NEW: Filter for Reverse Kimchi
}
```

## Wallet Enrichment

The `WalletEnrichmentService` has been extended to support Kimchi Premium opportunities:

### Logic for KIMP Types
- **Similar to SPOT_SPOT_HEDGE**: Checks for common networks between `fromExchangeId` and `toExchangeId`
- **Wallet Status Calculation**:
  - `walletStatusOk = true` if at least one fully open network exists (both deposit and withdraw enabled)
  - `commonNetworks` = count of fully open networks
- **Enrichment Reasons**:
  - `OK`: At least one fully open network available
  - `NO_COMMON_NETWORK`: No shared networks between exchanges
  - `WALLET_NOT_OPEN`: Common networks exist but none are fully open
  - Detailed reasons with format: `ISSUE@FROM_EXCHANGE/TO_EXCHANGE:SYMBOL:NETWORK`

## Fixtures

### Dummy Dataset (`opportunities.dummy.ts`)
- **12 new opportunities** added across multiple coins:
  - BTC, ETH, XRP, SOL, ADA, MATIC, DOT, LINK, AVAX, ATOM, DOGE, LTC
- **Distribution**:
  - 7 KIMP_OVERSEAS_TO_BITHUMB opportunities
  - 5 KIMP_BITHUMB_TO_OVERSEAS opportunities
- **Variety**:
  - Different exchange combinations (Binance, Bybit, OKX → Bithumb and reverse)
  - Multiple candidate networks per opportunity
  - Mix of wallet statuses (open and blocked)
  - Realistic FX rates (~1348-1355 KRW/USD)

### Golden Dataset (`opportunities.golden.ts`)
- **6 new edge case opportunities** for testing:
  - `kimp-below-min-gap`: Gap below 0.5% threshold
  - `kimp-at-min-gap`: Gap exactly at 0.5% threshold
  - `kimp-no-common-network`: No shared networks (wallet check fails)
  - `kimp-high-gap`: High Kimchi Premium (~4.8%)
  - `kimp-net-profit-below-threshold`: Net profit below 0.3% threshold
  - `kimp-net-profit-at-threshold`: Net profit exactly at 0.3% threshold

## Frontend Display

### OpportunityTable Badges
- **KIMP_OVERSEAS_TO_BITHUMB**: `🌏→🇰🇷 KIMP` (emerald badge)
- **KIMP_BITHUMB_TO_OVERSEAS**: `🇰🇷→🌏 REV-KIMP` (amber badge)

### Price Display
- **KRW prices**: Displayed with `₩` symbol
- **USD prices**: Displayed with `$` symbol
- **Exchange columns**: Show `fromExchangeId` and `toExchangeId` for KIMP types

### Filter Panel
New checkboxes added:
- ✅ 🌏→🇰🇷 Kimchi Premium
- ✅ 🇰🇷→🌏 Reverse Kimchi

## API Response Example

### KIMP_OVERSEAS_TO_BITHUMB Opportunity
```json
{
  "id": "kimp-1",
  "type": "KIMP_OVERSEAS_TO_BITHUMB",
  "base": "BTC",
  "quote": "KRW",
  "buyExchange": "Binance",
  "sellExchange": "Bithumb",
  "buyPrice": 59800,
  "sellPrice": 81500000,
  "grossGapPct": 2.15,
  "netProfitPct": 1.42,
  "commonNetworks": 1,
  "walletStatusOk": true,
  "routeType": "DIRECT",
  "estTimeMins": 25,
  "estCostUsd": 12.5,
  "fromExchangeId": "Binance",
  "toExchangeId": "Bithumb",
  "candidateNetworks": [
    {
      "networkId": "BTC",
      "feeAmount": 0.0005,
      "minWithdraw": 0.001,
      "estimatedMins": 25,
      "depositEnabled": true,
      "withdrawEnabled": true
    }
  ],
  "fx": {
    "rateRef": "USD/KRW",
    "rateValue": 1350,
    "source": "Dunamu API"
  },
  "wallet_check": {
    "ok": true,
    "reasons": ["OK"],
    "checkedAt": "2026-01-26T08:56:12.389Z"
  }
}
```

## Testing

### Endpoint Tests
```bash
# Get mixed opportunities (all types)
curl 'http://localhost:4000/opportunities?dataset=dummy' | jq '.count'
# Output: 32 (20 original + 12 Kimchi Premium)

# Check strategy distribution
curl 'http://localhost:4000/opportunities?dataset=dummy' | \
  jq '[.data[].type] | group_by(.) | map({type: .[0], count: length})'

# Get specific Kimchi Premium opportunity
curl 'http://localhost:4000/opportunities?dataset=dummy' | \
  jq '.data[] | select(.id == "kimp-1")'

# Test golden dataset edge cases
curl 'http://localhost:4000/opportunities?dataset=golden' | \
  jq '.data[] | select(.type == "KIMP_OVERSEAS_TO_BITHUMB" or .type == "KIMP_BITHUMB_TO_OVERSEAS")'
```

### Frontend Tests
1. Open dashboard: http://localhost:3001
2. Verify new strategy badges appear in opportunity table
3. Test filter toggles for Kimchi Premium types
4. Check Debug Mode shows correct exclusion reasons
5. Verify wallet badge correctly shows network status
6. Confirm prices display with correct currency symbols (₩ vs $)

## Known Limitations

### Phase 1 Scope
- **No execution**: This phase only extends the data model and display
- **Mock wallet data**: Many Bithumb-related opportunities show `NO_COMMON_NETWORK` because `MockWalletStatusConnector` doesn't have Bithumb fixtures yet
- **FX rate placeholder**: FX rates are hardcoded in fixtures; Step 2 will fetch from Dunamu API
- **No hedge support**: Kimchi Premium opportunities don't yet support futures hedge (planned for later)

### Next Steps (Future Phases)
- **Step 2**: Implement FX rate fetching from Dunamu API
- **Step 3**: Add real Bithumb wallet status to `MockWalletStatusConnector`
- **Step 4**: Implement execution endpoints for Kimchi Premium trades
- **Step 5**: Add hedge support for Kimchi Premium opportunities

## Statistics

### Dataset Summary
```
Dummy Dataset (32 total):
  - SPOT_SPOT_HEDGE: 12
  - SPOT_FUTURES: 8
  - KIMP_OVERSEAS_TO_BITHUMB: 7
  - KIMP_BITHUMB_TO_OVERSEAS: 5

Golden Dataset (33 total):
  - Original edge cases: 27
  - Kimchi Premium edge cases: 6
```

## Files Modified

### Backend
- `src/types/opportunity.ts` - Added new types and fields
- `src/fixtures/opportunities.dummy.ts` - Added 12 Kimchi Premium opportunities
- `src/fixtures/opportunities.golden.ts` - Added 6 edge case opportunities
- `src/services/WalletEnrichmentService.ts` - Added `enrichKimchiPremium()` method

### Frontend
- `src/types/opportunity.ts` - Synced with backend types
- `src/components/OpportunityTable.tsx` - Added badges and price display logic
- `src/components/FilterPanel.tsx` - Added filter checkboxes
- `src/domain/filters.ts` - Added filter logic for new types
- `src/App.tsx` - Updated default filters

## Acceptance Criteria ✅

- ✅ Backend `/opportunities` returns mixed opportunities including new types
- ✅ Frontend loads without TypeScript errors
- ✅ Frontend displays Kimchi Premium badges correctly
- ✅ Debug mode shows exclusion reasons correctly
- ✅ Wallet enrichment works for Kimchi Premium types
- ✅ Filter panel includes toggles for new opportunity types
- ✅ Documentation created explaining new types

## Summary

Phase 1 successfully extends the Gap Dashboard to support Kimchi Premium execution flows without implementing actual trading. The infrastructure is now in place for:
- Displaying opportunities between overseas exchanges and Bithumb
- Tracking wallet status across exchange boundaries
- Filtering and analyzing Kimchi Premium opportunities
- Preparing for future execution implementation

The model is flexible and can be extended in future phases to support real-time FX rates, actual wallet status from Bithumb, and execution endpoints.
