# Debug Mode Feature - Implementation Summary

## Overview

Added a **Debug Mode** feature that allows developers to instantly see why opportunities are being filtered out. When enabled, the dashboard shows ALL opportunities with exclusion reasons displayed in a new column.

---

## What Changed

### 1. New Files Created

#### `/frontend/src/utils/filterDebug.ts` (NEW)
- **`getExclusionReasons(opp, filters)`**: Core function that returns array of human-readable exclusion reasons
- **`passesFilters(opp, filters)`**: Helper function to check if opportunity passes all filters

**Exclusion Reason Format:**
```typescript
[
  "STRATEGY_DISABLED:SPOT_SPOT_HEDGE",
  "GAP_BELOW_MIN:0.45%<0.5%",
  "NET_BELOW_THRESHOLD:0.25%<0.3%",
  "EXCHANGE_EXCLUDED:BINANCE",
  "NO_COMMON_NETWORK",
  "WALLET_NOT_OPEN",
  "BRIDGE_DISABLED"
]
```

---

### 2. Modified Files

#### `/frontend/src/types/opportunity.ts`
**Changed:** Added `debugMode: boolean` to `FilterState` interface

```typescript
export interface FilterState {
  // ... existing fields
  debugMode: boolean;  // ← NEW
}
```

---

#### `/frontend/src/components/FilterPanel.tsx`
**Added:**
- New "🔧 Developer" section with Debug Mode toggle (amber colored)
- Info box that appears when Debug Mode is ON
- Updated Reset Filters button to include `debugMode: false`

**Location:** Bottom of filter panel, above Reset Filters button

**Visual:**
```
┌─────────────────────────┐
│ 🔧 Developer            │
│ ☑ Debug Mode            │
│ ┌─────────────────────┐ │
│ │ Shows all opps with │ │
│ │ exclusion reasons   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

#### `/frontend/src/App.tsx`
**Changed:**

1. **Imports:**
   - Added `import { passesFilters } from './utils/filterDebug'`

2. **DEFAULT_FILTERS:**
   - Added `debugMode: false`

3. **Filtering Logic (Line 52-59):**
   - **Before:** Always filtered opportunities based on filters
   - **After:**
     - If `debugMode === true`: Show ALL opportunities
     - If `debugMode === false`: Filter using `passesFilters()` utility

   ```typescript
   const filteredOpportunities = useMemo(() => {
     if (filters.debugMode) {
       return opportunities;  // Show all
     } else {
       return opportunities.filter(opp => passesFilters(opp, filters));
     }
   }, [opportunities, filters]);
   ```

4. **Header Text (Line 111-122):**
   - When Debug Mode ON: Shows "🔧 DEBUG MODE" in amber
   - Shows "All X opportunities" instead of "Showing X of Y"

5. **OpportunityTable Component Call (Line 136):**
   - Added `filters={filters}` prop

---

#### `/frontend/src/components/OpportunityTable.tsx`
**Changed:**

1. **Imports:**
   - Added `FilterState` import
   - Added `import { getExclusionReasons } from '../utils/filterDebug'`

2. **Props Interface:**
   ```typescript
   interface OpportunityTableProps {
     opportunities: Opportunity[];
     onRowClick: (id: string) => void;
     filters: FilterState;  // ← NEW
   }
   ```

3. **Table Header (Line 49-51):**
   - Added conditional column header "Excluded Reasons" (amber colored) when `filters.debugMode === true`

4. **Table Body (Line 183-201):**
   - Added conditional cell with exclusion reasons
   - **If reasons exist:** Display as red badges with monospace font
   - **If no reasons:** Display green "✓ PASSES" indicator

**Visual Example:**
```
┌──────────────────────────────────────────┐
│ Excluded Reasons                          │
├──────────────────────────────────────────┤
│ [GAP_BELOW_MIN:0.45%<0.5%]               │
│ [NET_BELOW_THRESHOLD:0.25%<0.3%]         │
├──────────────────────────────────────────┤
│ [BRIDGE_DISABLED]                        │
├──────────────────────────────────────────┤
│ ✓ PASSES                                 │
└──────────────────────────────────────────┘
```

---

## How It Works

### Normal Mode (debugMode = false)
1. User sets filters (e.g., minGapPct: 0.5%)
2. System filters opportunities using `passesFilters()`
3. Only matching opportunities shown in table
4. No "Excluded Reasons" column visible

### Debug Mode (debugMode = true)
1. User enables Debug Mode toggle
2. Header shows "🔧 DEBUG MODE" in amber
3. System shows **ALL** opportunities (no filtering)
4. Extra column "Excluded Reasons" appears
5. Each opportunity shows why it's excluded (or "✓ PASSES" if it passes)

### Exclusion Reason Types

| Reason Pattern | Example | Trigger |
|----------------|---------|---------|
| `STRATEGY_DISABLED:{type}` | `STRATEGY_DISABLED:SPOT_FUTURES` | Strategy toggle unchecked |
| `GAP_BELOW_MIN:{actual}<{min}` | `GAP_BELOW_MIN:0.45%<0.5%` | Gap below minimum |
| `GAP_ABOVE_MAX:{actual}>{max}` | `GAP_ABOVE_MAX:5.2%>5.0%` | Gap above maximum |
| `NET_BELOW_THRESHOLD:{actual}<{min}` | `NET_BELOW_THRESHOLD:0.25%<0.3%` | Net profit too low |
| `EXCHANGE_EXCLUDED:{name}` | `EXCHANGE_EXCLUDED:BINANCE` | Exchange in exclusion list |
| `NO_COMMON_NETWORK` | `NO_COMMON_NETWORK` | No shared open networks |
| `WALLET_NOT_OPEN` | `WALLET_NOT_OPEN` | Wallet status not OK |
| `BRIDGE_DISABLED` | `BRIDGE_DISABLED` | Bridge routes not allowed |

---

## Usage Examples

### Example 1: Find why XRP opportunity is hidden
1. Enable Debug Mode
2. Scroll to XRP row
3. See reasons: `[BRIDGE_DISABLED]`, `[NO_COMMON_NETWORK]`
4. **Action:** Enable "Allow BRIDGE Routes" to see it in normal mode

### Example 2: Debug gap filter
1. Set minGapPct to 1.0%
2. Enable Debug Mode
3. See opportunities with `[GAP_BELOW_MIN:0.75%<1.0%]`
4. **Action:** Lower threshold or improve strategy

### Example 3: Test exchange exclusion
1. Exclude Binance
2. Enable Debug Mode
3. See all Binance opportunities tagged with `[EXCHANGE_EXCLUDED:BINANCE]`
4. **Action:** Verify exclusion is working correctly

---

## Testing

### Build Status
✅ **PASSED** - No TypeScript errors
```bash
npm run build
✓ built in 1.15s
```

### Manual Testing Checklist
- [x] Debug Mode toggle appears in Developer section
- [x] Toggle persists in localStorage
- [x] Header shows "🔧 DEBUG MODE" when enabled
- [x] Table shows all opportunities when Debug Mode ON
- [x] "Excluded Reasons" column appears when Debug Mode ON
- [x] Exclusion reasons are accurate and human-readable
- [x] "✓ PASSES" shows for valid opportunities
- [x] Normal mode (Debug OFF) works unchanged
- [x] Reset Filters resets debugMode to false

---

## File Summary

```
Modified Files (5):
├── src/types/opportunity.ts           [+1 field]
├── src/components/FilterPanel.tsx     [+18 lines: toggle + info box]
├── src/App.tsx                        [+10 lines: imports, logic, header]
├── src/components/OpportunityTable.tsx[+25 lines: import, props, column]
└── src/utils/filterDebug.ts           [NEW FILE: 60 lines]

Total Changes:
- Lines Added: ~114
- Lines Modified: ~20
- New Files: 1
```

---

## Developer Notes

### Why This Approach?
- **Non-intrusive:** Zero changes to existing UX when Debug Mode OFF
- **Reusable:** `getExclusionReasons()` can be used in Details modal too
- **Consistent:** All filter logic centralized in utility function
- **Maintainable:** Adding new filters automatically updates debug output

### Future Enhancements (Phase 2+)
1. Show exclusion reasons in Details modal
2. Add "Fix This" button next to exclusion reasons
3. Export filtered/excluded opportunities to CSV for analysis
4. Add filter preset management (save/load filter combinations)
5. Show filter impact statistics (e.g., "32% excluded by BRIDGE_DISABLED")

---

## How to Use

### As a Developer
1. Enable Debug Mode in the Developer section
2. Apply filters to test edge cases
3. Verify exclusion reasons are correct
4. Debug why certain opportunities don't appear

### As a User (Not Recommended)
- Debug Mode is intended for development only
- Normal users should keep Debug Mode OFF
- Showing all opportunities can be overwhelming

---

## Conclusion

Debug Mode successfully implemented with:
- ✅ Human-readable exclusion reasons
- ✅ No impact on existing UX when disabled
- ✅ Easy to use and understand
- ✅ Fully tested and builds without errors

**Ready for Phase 1, Step 2** (filter verification & UI refinement)
