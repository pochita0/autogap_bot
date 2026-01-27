/**
 * Kimchi Gap Calculator Tests
 *
 * Tests for FX-normalized gap calculations
 */

import { Opportunity } from '../src/types/opportunity';
import { FxRateService, MockFxRateSource } from '../src/services/FxRateService';
import { KimchiGapCalculator } from '../src/services/KimchiGapCalculator';

console.log('='.repeat(80));
console.log('KIMCHI GAP CALCULATOR TESTS');
console.log('='.repeat(80));

// Test counter
let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`✓ ${name}`);
    if (details) {
      console.log(`  ${details}`);
    }
    passed++;
  } else {
    console.log(`✗ ${name}`);
    if (details) {
      console.log(`  ${details}`);
    }
    failed++;
  }
}

// Create a fixed-rate mock for consistent testing
class FixedFxRateSource extends MockFxRateSource {
  constructor(private fixedRate: number) {
    super();
  }

  async fetchUsdtKrwRate(): Promise<number> {
    return this.fixedRate;
  }
}

async function runTests() {
  // Use a fixed rate of 1350 KRW/USDT for testing
  const fxService = new FxRateService(new FixedFxRateSource(1350), 20);
  const calculator = new KimchiGapCalculator(fxService);

  // Test 1: KIMP_OVERSEAS_TO_BITHUMB gap calculation
  console.log('\n--- Test 1: KIMP_OVERSEAS_TO_BITHUMB Gap Calculation ---');
  const kimpOpp: Opportunity = {
    id: 'test-kimp-1',
    type: 'KIMP_OVERSEAS_TO_BITHUMB',
    base: 'BTC',
    quote: 'KRW',
    buyExchange: 'Binance',
    sellExchange: 'Bithumb',
    buyPrice: 60000, // 60,000 USDT
    sellPrice: 81540000, // 81,540,000 KRW
    grossGapPct: 0, // Will be calculated
    netProfitPct: 0, // Will be calculated
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 25,
    estCostUsd: 12.5,
    fromExchangeId: 'Binance',
    toExchangeId: 'Bithumb',
    updatedAt: new Date().toISOString(),
    volume24hUsd: 1000000,
  };

  const kimpResult = await calculator.calculateNormalizedGap(kimpOpp);
  // sellPriceUSDT = 81,540,000 / 1350 = 60,400 USDT
  // gap = (60,400 - 60,000) / 60,000 * 100 = 0.667%
  test('KIMP gap calculation is correct', Math.abs(kimpResult.grossGapPct - 0.67) < 0.01, `Calculated: ${kimpResult.grossGapPct}%`);
  test('KIMP net profit is lower than gross', kimpResult.netProfitPct < kimpResult.grossGapPct);
  test('KIMP FX rate is correct', kimpResult.fxRate === 1350);

  // Test 2: KIMP_BITHUMB_TO_OVERSEAS gap calculation
  console.log('\n--- Test 2: KIMP_BITHUMB_TO_OVERSEAS Gap Calculation ---');
  const revKimpOpp: Opportunity = {
    id: 'test-rev-kimp-1',
    type: 'KIMP_BITHUMB_TO_OVERSEAS',
    base: 'ETH',
    quote: 'KRW',
    buyExchange: 'Bithumb',
    sellExchange: 'Binance',
    buyPrice: 3037500, // 3,037,500 KRW
    sellPrice: 2270, // 2,270 USDT
    grossGapPct: 0, // Will be calculated
    netProfitPct: 0, // Will be calculated
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 18,
    estCostUsd: 8.2,
    fromExchangeId: 'Bithumb',
    toExchangeId: 'Binance',
    updatedAt: new Date().toISOString(),
    volume24hUsd: 850000,
  };

  const revKimpResult = await calculator.calculateNormalizedGap(revKimpOpp);
  // buyPriceUSDT = 3,037,500 / 1350 = 2,250 USDT
  // gap = (2,270 - 2,250) / 2,250 * 100 = 0.889%
  test('REV-KIMP gap calculation is correct', Math.abs(revKimpResult.grossGapPct - 0.89) < 0.01, `Calculated: ${revKimpResult.grossGapPct}%`);
  test('REV-KIMP net profit is lower than gross', revKimpResult.netProfitPct < revKimpResult.grossGapPct);
  test('REV-KIMP FX rate is correct', revKimpResult.fxRate === 1350);

  // Test 3: Non-Kimchi opportunity returns unchanged
  console.log('\n--- Test 3: Non-Kimchi Opportunity (SPOT_FUTURES) ---');
  const spotFuturesOpp: Opportunity = {
    id: 'test-spot-futures',
    type: 'SPOT_FUTURES',
    base: 'BTC',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 60000,
    futuresPrice: 60500,
    grossGapPct: 0.83,
    netProfitPct: 0.55,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.5,
    fundingRate: -0.01,
    nextFundingAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 2000000,
  };

  const spotFuturesResult = await calculator.calculateNormalizedGap(spotFuturesOpp);
  test('Non-Kimchi opportunity returns original gap', spotFuturesResult.grossGapPct === 0.83);
  test('Non-Kimchi opportunity returns original net profit', spotFuturesResult.netProfitPct === 0.55);

  // Test 4: Enrichment adds FX data to opportunity
  console.log('\n--- Test 4: Enrichment Adds FX Data ---');
  const enrichedKimp = await calculator.enrichWithFxGap(kimpOpp);
  test('Enriched opportunity has updated gap', enrichedKimp.grossGapPct !== 0);
  test('Enriched opportunity has fx data', enrichedKimp.fx !== undefined);
  test('Enriched opportunity fx has correct rate', enrichedKimp.fx?.rateValue === 1350);
  test('Enriched opportunity fx has correct ref', enrichedKimp.fx?.rateRef === 'USDT/KRW');
  test('Enriched opportunity fx has source', enrichedKimp.fx?.source === 'FxRateService');

  // Test 5: High Kimchi Premium scenario
  console.log('\n--- Test 5: High Kimchi Premium (5% gap) ---');
  const highKimpOpp: Opportunity = {
    ...kimpOpp,
    id: 'test-high-kimp',
    buyPrice: 60000, // 60,000 USDT
    sellPrice: 84780000, // 84,780,000 KRW (5% premium)
  };

  const highKimpResult = await calculator.calculateNormalizedGap(highKimpOpp);
  // sellPriceUSDT = 84,780,000 / 1350 = 62,800 USDT
  // gap = (62,800 - 60,000) / 60,000 * 100 = 4.67%
  test('High Kimchi Premium gap is calculated correctly', Math.abs(highKimpResult.grossGapPct - 4.67) < 0.1, `Calculated: ${highKimpResult.grossGapPct}%`);
  test('High Kimchi Premium has positive net profit', highKimpResult.netProfitPct > 0);
  test('High Kimchi Premium net profit is significantly positive', highKimpResult.netProfitPct > 4);

  // Test 6: Negative gap (unfavorable rates)
  console.log('\n--- Test 6: Negative Gap (Unfavorable Rates) ---');
  const negativeGapOpp: Opportunity = {
    ...kimpOpp,
    id: 'test-negative-gap',
    buyPrice: 60000, // 60,000 USDT
    sellPrice: 80460000, // 80,460,000 KRW (negative premium)
  };

  const negativeGapResult = await calculator.calculateNormalizedGap(negativeGapOpp);
  // sellPriceUSDT = 80,460,000 / 1350 = 59,600 USDT
  // gap = (59,600 - 60,000) / 60,000 * 100 = -0.67%
  test('Negative gap is calculated correctly', negativeGapResult.grossGapPct < 0, `Calculated: ${negativeGapResult.grossGapPct}%`);
  test('Negative gap results in negative net profit', negativeGapResult.netProfitPct < 0);

  // Test 7: Batch enrichment
  console.log('\n--- Test 7: Batch Enrichment ---');
  const opportunities: Opportunity[] = [kimpOpp, revKimpOpp, spotFuturesOpp];
  const enrichedOpps = await calculator.enrichOpportunitiesWithFxGaps(opportunities);

  test('Batch enrichment processes all opportunities', enrichedOpps.length === 3);
  test('Batch enrichment updates Kimchi opportunities', enrichedOpps[0].grossGapPct !== 0);
  test('Batch enrichment preserves non-Kimchi opportunities', enrichedOpps[2].grossGapPct === 0.83);
  test('All enriched Kimchi opportunities have FX data', enrichedOpps[0].fx !== undefined && enrichedOpps[1].fx !== undefined);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
