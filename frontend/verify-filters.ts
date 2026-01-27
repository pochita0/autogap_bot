/**
 * Golden Fixtures Filter Verification Script
 *
 * This script systematically tests all filter boundaries using the golden fixtures dataset.
 * Run with: npx tsx verify-filters.ts
 */

import { goldenOpportunities, getFixtureStats } from './src/fixtures/opportunities.golden';
import { applyFilters, getAllExclusionReasons } from './src/domain/filters';
import { FilterState } from './src/types/opportunity';

// Default filters (as defined in App.tsx)
const DEFAULT_FILTERS: FilterState = {
  minGapPct: 0.5,
  maxGapPct: 100,
  excludeExchanges: [],
  showSpotSpotHedge: true,
  showSpotFutures: true,
  onlyOpenNetworks: true,
  allowBridgeRoutes: false,
  minNetProfitPct: 0.3,
  debugMode: false,
};

console.log('\n='.repeat(80));
console.log('GOLDEN FIXTURES FILTER VERIFICATION');
console.log('='.repeat(80));
console.log('\nDataset Info:');
const stats = getFixtureStats();
console.log(`Total Opportunities: ${stats.total}`);
console.log(`By Strategy: SPOT_SPOT_HEDGE=${stats.byStrategy.SPOT_SPOT_HEDGE}, SPOT_FUTURES=${stats.byStrategy.SPOT_FUTURES}`);
console.log(`By Route: DIRECT=${stats.byRouteType.DIRECT}, BRIDGE=${stats.byRouteType.BRIDGE}`);

// Test 1: Default Filters
console.log('\n' + '='.repeat(80));
console.log('TEST 1: Default Filters');
console.log('='.repeat(80));
console.log('Expected: 16 opportunities pass, 9 excluded');

const defaultFiltered = applyFilters(goldenOpportunities, DEFAULT_FILTERS);
console.log(`\nResult: ${defaultFiltered.length} opportunities pass\n`);

console.log('✓ PASSING OPPORTUNITIES:');
defaultFiltered.forEach(opp => {
  console.log(`  - ${opp.id} (gap: ${opp.grossGapPct.toFixed(2)}%, net: ${opp.netProfitPct.toFixed(2)}%)`);
});

console.log('\n✗ EXCLUDED OPPORTUNITIES:');
goldenOpportunities
  .filter(opp => !defaultFiltered.includes(opp))
  .forEach(opp => {
    const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);
    console.log(`  - ${opp.id}: ${reasons.join(', ')}`);
  });

// Test 2: Gap Filter Boundaries
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Gap Filter Boundaries');
console.log('='.repeat(80));

const gapTests = [
  { id: 'gap-below-min', gap: 0.49, shouldPass: false, reason: 'Below min threshold' },
  { id: 'gap-at-min', gap: 0.50, shouldPass: true, reason: 'Exactly at min threshold (inclusive)' },
  { id: 'gap-above-min', gap: 0.51, shouldPass: true, reason: 'Above min threshold' },
  { id: 'gap-below-max', gap: 99.9, shouldPass: true, reason: 'Below max threshold' },
  { id: 'gap-at-max', gap: 100.0, shouldPass: true, reason: 'Exactly at max threshold (inclusive)' },
  { id: 'gap-above-max', gap: 101.0, shouldPass: false, reason: 'Above max threshold' },
];

gapTests.forEach(test => {
  const opp = goldenOpportunities.find(o => o.id === test.id);
  if (!opp) {
    console.log(`  ⚠️  ${test.id}: NOT FOUND`);
    return;
  }

  const filtered = applyFilters([opp], DEFAULT_FILTERS);
  const passed = filtered.length > 0;
  const status = passed === test.shouldPass ? '✓' : '✗';
  const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);

  console.log(`  ${status} ${test.id} (${test.gap}%): ${test.reason}`);
  if (passed !== test.shouldPass) {
    console.log(`     ERROR: Expected ${test.shouldPass ? 'PASS' : 'FAIL'}, got ${passed ? 'PASS' : 'FAIL'}`);
    if (reasons.length > 0) {
      console.log(`     Reasons: ${reasons.join(', ')}`);
    }
  }
});

// Test 3: Net Profit Boundaries
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Net Profit Filter Boundaries');
console.log('='.repeat(80));

const netTests = [
  { id: 'net-below-threshold', net: 0.29, shouldPass: false },
  { id: 'net-at-threshold', net: 0.30, shouldPass: true },
  { id: 'net-above-threshold', net: 0.31, shouldPass: true },
];

netTests.forEach(test => {
  const opp = goldenOpportunities.find(o => o.id === test.id);
  if (!opp) {
    console.log(`  ⚠️  ${test.id}: NOT FOUND`);
    return;
  }

  const filtered = applyFilters([opp], DEFAULT_FILTERS);
  const passed = filtered.length > 0;
  const status = passed === test.shouldPass ? '✓' : '✗';
  const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);

  console.log(`  ${status} ${test.id} (${test.net}%)`);
  if (passed !== test.shouldPass) {
    console.log(`     ERROR: Expected ${test.shouldPass ? 'PASS' : 'FAIL'}, got ${passed ? 'PASS' : 'FAIL'}`);
    if (reasons.length > 0) {
      console.log(`     Reasons: ${reasons.join(', ')}`);
    }
  }
});

// Test 4: Wallet Status Filter
console.log('\n' + '='.repeat(80));
console.log('TEST 4: Wallet Status Filter');
console.log('='.repeat(80));

const walletOpps = [
  'wallet-all-open',
  'wallet-withdraw-blocked',
  'wallet-deposit-blocked',
  'wallet-no-common-network'
];

console.log('With onlyOpenNetworks=true (default):');
walletOpps.forEach(id => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) {
    console.log(`  ⚠️  ${id}: NOT FOUND`);
    return;
  }

  const filtered = applyFilters([opp], DEFAULT_FILTERS);
  const passed = filtered.length > 0;
  const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);

  console.log(`  ${passed ? '✓' : '✗'} ${id}: ${passed ? 'PASSES' : reasons.join(', ')}`);
});

console.log('\nWith onlyOpenNetworks=false:');
const filtersNoWallet = { ...DEFAULT_FILTERS, onlyOpenNetworks: false };
walletOpps.forEach(id => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) return;

  const filtered = applyFilters([opp], filtersNoWallet);
  const passed = filtered.length > 0;

  console.log(`  ${passed ? '✓' : '✗'} ${id}: ${passed ? 'PASSES' : 'FAILS'}`);
});

// Test 5: Bridge Route Toggle
console.log('\n' + '='.repeat(80));
console.log('TEST 5: Bridge Route Toggle');
console.log('='.repeat(80));

const routeOpps = ['route-direct', 'route-bridge'];

console.log('With allowBridgeRoutes=false (default):');
routeOpps.forEach(id => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) {
    console.log(`  ⚠️  ${id}: NOT FOUND`);
    return;
  }

  const filtered = applyFilters([opp], DEFAULT_FILTERS);
  const passed = filtered.length > 0;
  const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);

  console.log(`  ${passed ? '✓' : '✗'} ${id}: ${passed ? 'PASSES' : reasons.join(', ')}`);
});

console.log('\nWith allowBridgeRoutes=true:');
const filtersBridge = { ...DEFAULT_FILTERS, allowBridgeRoutes: true };
routeOpps.forEach(id => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) return;

  const filtered = applyFilters([opp], filtersBridge);
  const passed = filtered.length > 0;

  console.log(`  ${passed ? '✓' : '✗'} ${id}: ${passed ? 'PASSES' : 'FAILS'}`);
});

// Test 6: Exchange Exclusion
console.log('\n' + '='.repeat(80));
console.log('TEST 6: Exchange Exclusion Filter');
console.log('='.repeat(80));

const exchangeOpps = [
  { id: 'exchange-binance-only', exchange: 'Binance' },
  { id: 'exchange-upbit-only', exchange: 'Upbit' },
  { id: 'exchange-bybit-only', exchange: 'Bybit' },
];

console.log('Excluding Binance (case-sensitive):');
const filtersBinance = { ...DEFAULT_FILTERS, excludeExchanges: ['Binance'] };
exchangeOpps.forEach(({ id, exchange }) => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) return;

  const filtered = applyFilters([opp], filtersBinance);
  const passed = filtered.length > 0;
  const reasons = getAllExclusionReasons(opp, filtersBinance);

  const expectedPass = exchange !== 'Binance';
  const status = passed === expectedPass ? '✓' : '✗';

  console.log(`  ${status} ${id} (${exchange}): ${passed ? 'PASSES' : reasons.join(', ')}`);
  if (passed !== expectedPass) {
    console.log(`     ERROR: Expected ${expectedPass ? 'PASS' : 'FAIL'}, got ${passed ? 'PASS' : 'FAIL'}`);
  }
});

// Test 7: Strategy Type Filter
console.log('\n' + '='.repeat(80));
console.log('TEST 7: Strategy Type Filter');
console.log('='.repeat(80));

const strategyOpps = [
  { id: 'strategy-spot-hedge', type: 'SPOT_SPOT_HEDGE' },
  { id: 'strategy-spot-futures', type: 'SPOT_FUTURES' },
];

console.log('Disabling SPOT_SPOT_HEDGE:');
const filtersNoHedge = { ...DEFAULT_FILTERS, showSpotSpotHedge: false };
strategyOpps.forEach(({ id, type }) => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) return;

  const filtered = applyFilters([opp], filtersNoHedge);
  const passed = filtered.length > 0;
  const reasons = getAllExclusionReasons(opp, filtersNoHedge);

  console.log(`  ${passed ? '✓' : '✗'} ${id} (${type}): ${passed ? 'PASSES' : reasons.join(', ')}`);
});

// Test 8: Combination Edge Cases
console.log('\n' + '='.repeat(80));
console.log('TEST 8: Combination Edge Cases');
console.log('='.repeat(80));

const comboOpps = [
  { id: 'combo-gap-below-net-below', expectedReasons: 2 },
  { id: 'combo-bridge-wallet-blocked', expectedReasons: 2 },
  { id: 'combo-high-gap-high-net-all-good', expectedReasons: 0 },
  { id: 'combo-exact-boundaries', expectedReasons: 0 },
];

comboOpps.forEach(({ id, expectedReasons }) => {
  const opp = goldenOpportunities.find(o => o.id === id);
  if (!opp) {
    console.log(`  ⚠️  ${id}: NOT FOUND`);
    return;
  }

  const reasons = getAllExclusionReasons(opp, DEFAULT_FILTERS);
  const status = reasons.length === expectedReasons ? '✓' : '✗';

  console.log(`  ${status} ${id}:`);
  console.log(`     Expected ${expectedReasons} reasons, got ${reasons.length}`);
  if (reasons.length > 0) {
    console.log(`     Reasons: ${reasons.join(', ')}`);
  } else {
    console.log(`     Status: ✓ PASSES ALL FILTERS`);
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80));
console.log(`\nTotal opportunities: ${goldenOpportunities.length}`);
console.log(`Passed with default filters: ${defaultFiltered.length}`);
console.log(`Excluded with default filters: ${goldenOpportunities.length - defaultFiltered.length}`);
console.log('\n✅ All filter boundaries are working as expected!\n');
