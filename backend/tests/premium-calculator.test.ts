/**
 * PremiumCalculator Tests
 *
 * Tests for Kimchi Premium (김프) and Reverse Premium (역프) calculation
 */

import { PremiumCalculator } from '../src/services/PremiumCalculator';
import { FxRateService, MockFxRateSource } from '../src/services/FxRateService';
import { ExchangeQuote } from '../src/types/premium';

// Test utilities
function test(description: string, assertion: boolean) {
  if (!assertion) {
    throw new Error(`Test failed: ${description}`);
  }
  console.log(`✓ ${description}`);
}

async function runTests() {
  console.log('\n=== PremiumCalculator Tests ===\n');

  // Setup
  const mockFxSource = new MockFxRateSource();
  const fxRateService = new FxRateService(mockFxSource, 20);
  const calculator = new PremiumCalculator(fxRateService);

  // Test 1: Kimchi Premium calculation (positive gap)
  console.log('--- Kimchi Premium Tests ---');

  const krwQuoteKimchi: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'BTC',
    market: 'BTC/KRW',
    bid: 81450000,    // 81,450,000 KRW (higher)
    ask: 81470000,    // 81,470,000 KRW
    timestamp: new Date().toISOString(),
  };

  const globalQuoteKimchi: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'BTC',
    market: 'BTC/USDT',
    bid: 60100,       // 60,100 USDT
    ask: 60150,       // 60,150 USDT (when converted should be lower than KRW: ~81,200,000)
    timestamp: new Date().toISOString(),
  };

  const kimchiOpps = await calculator.calculatePremiumOpportunities(krwQuoteKimchi, globalQuoteKimchi);
  console.log(`  Opportunities created: ${kimchiOpps.length}`);
  if (kimchiOpps.length > 0) {
    kimchiOpps.forEach(opp => console.log(`    - ${opp.kind}: ${opp.gapPct}%`));
  }
  const kimchiOpp = kimchiOpps.find(opp => opp.kind === 'KIMCHI');

  test('Kimchi opportunity is created', kimchiOpp !== undefined);
  test('Kimchi opportunity has correct kind', kimchiOpp!.kind === 'KIMCHI');
  test('Kimchi opportunity has correct direction', kimchiOpp!.direction === 'GLOBAL_TO_KRW');
  test('Kimchi opportunity has positive gap', kimchiOpp!.gapPct > 0);
  test('Kimchi opportunity includes FX rate', kimchiOpp!.usdtKrw > 1300 && kimchiOpp!.usdtKrw < 1400);
  test('Kimchi opportunity has calculation details', kimchiOpp!.calculation !== undefined);
  test('Kimchi opportunity formula includes correct symbols', kimchiOpp!.calculation!.formula.includes('krwBid') && kimchiOpp!.calculation!.formula.includes('globalAskKRW'));

  console.log(`  Kimchi gap: ${kimchiOpp!.gapPct}%`);
  console.log(`  FX rate: ${kimchiOpp!.usdtKrw}`);

  // Test 2: Reverse Premium calculation (positive gap)
  console.log('\n--- Reverse Premium Tests ---');

  const krwQuoteReverse: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'AVAX',
    market: 'AVAX/KRW',
    bid: 48200,       // 48,200 KRW (lower)
    ask: 48250,       // 48,250 KRW
    timestamp: new Date().toISOString(),
  };

  const globalQuoteReverse: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'AVAX',
    market: 'AVAX/USDT',
    bid: 36.25,       // 36.25 USDT (when converted should be higher than KRW)
    ask: 36.27,       // 36.27 USDT
    timestamp: new Date().toISOString(),
  };

  const reverseOpps = await calculator.calculatePremiumOpportunities(krwQuoteReverse, globalQuoteReverse);
  const reverseOpp = reverseOpps.find(opp => opp.kind === 'REVERSE');

  test('Reverse opportunity is created', reverseOpp !== undefined);
  test('Reverse opportunity has correct kind', reverseOpp!.kind === 'REVERSE');
  test('Reverse opportunity has correct direction', reverseOpp!.direction === 'KRW_TO_GLOBAL');
  test('Reverse opportunity has positive gap', reverseOpp!.gapPct > 0);
  test('Reverse opportunity includes FX rate', reverseOpp!.usdtKrw > 1300 && reverseOpp!.usdtKrw < 1400);
  test('Reverse opportunity has calculation details', reverseOpp!.calculation !== undefined);
  test('Reverse opportunity formula includes correct symbols', reverseOpp!.calculation!.formula.includes('globalBidKRW') && reverseOpp!.calculation!.formula.includes('krwAsk'));

  console.log(`  Reverse gap: ${reverseOpp!.gapPct}%`);
  console.log(`  FX rate: ${reverseOpp!.usdtKrw}`);

  // Test 3: Both premium opportunities for same asset
  console.log('\n--- Both Premium Types Tests ---');

  const krwQuoteBoth: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'ETH',
    market: 'ETH/KRW',
    bid: 3036000,     // 3,036,000 KRW
    ask: 3038000,     // 3,038,000 KRW
    timestamp: new Date().toISOString(),
  };

  const globalQuoteBoth: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'ETH',
    market: 'ETH/USDT',
    bid: 2248,        // 2,248 USDT
    ask: 2249,        // 2,249 USDT
    timestamp: new Date().toISOString(),
  };

  const bothOpps = await calculator.calculatePremiumOpportunities(krwQuoteBoth, globalQuoteBoth);

  test('Returns array of opportunities', Array.isArray(bothOpps));
  test('Returns at least one opportunity', bothOpps.length >= 1);
  console.log(`  Created ${bothOpps.length} opportunities`);

  // Test 4: Gap formula verification
  console.log('\n--- Gap Formula Verification ---');

  // Manually calculate expected gap for Kimchi
  const fxRate = await fxRateService.getUsdtKrwRate();
  const globalAskKRW = globalQuoteKimchi.ask * fxRate;
  const expectedKimchiGap = ((krwQuoteKimchi.bid - globalAskKRW) / globalAskKRW) * 100;

  test('Kimchi gap formula is correct', Math.abs(kimchiOpp!.gapPct - expectedKimchiGap) < 0.1);
  console.log(`  Expected: ${expectedKimchiGap.toFixed(2)}%, Actual: ${kimchiOpp!.gapPct}%`);

  // Manually calculate expected gap for Reverse
  const globalBidKRW = globalQuoteReverse.bid * fxRate;
  const expectedReverseGap = ((globalBidKRW - krwQuoteReverse.ask) / krwQuoteReverse.ask) * 100;

  test('Reverse gap formula is correct', Math.abs(reverseOpp!.gapPct - expectedReverseGap) < 0.1);
  console.log(`  Expected: ${expectedReverseGap.toFixed(2)}%, Actual: ${reverseOpp!.gapPct}%`);

  // Test 5: Batch calculation
  console.log('\n--- Batch Calculation Tests ---');

  const krwQuotes: ExchangeQuote[] = [krwQuoteKimchi, krwQuoteReverse, krwQuoteBoth];
  const globalQuotes: ExchangeQuote[] = [globalQuoteKimchi, globalQuoteReverse, globalQuoteBoth];

  const allOpps = await calculator.calculateAllPremiumOpportunities(krwQuotes, globalQuotes);

  test('Batch calculation returns array', Array.isArray(allOpps));
  test('Batch calculation returns multiple opportunities', allOpps.length >= 2);
  test('Batch results are sorted by gap descending', allOpps.length < 2 || allOpps[0].gapPct >= allOpps[1].gapPct);

  console.log(`  Created ${allOpps.length} opportunities from ${krwQuotes.length} quotes`);

  // Test 6: Metadata inclusion
  console.log('\n--- Metadata Tests ---');

  const metadata = await calculator.getPremiumOpportunitiesWithMetadata(krwQuotes, globalQuotes);

  test('Metadata includes count', typeof metadata.count === 'number');
  test('Metadata includes fxRate', typeof metadata.fxRate === 'number');
  test('Metadata includes fxRateTimestamp', typeof metadata.fxRateTimestamp === 'string');
  test('Metadata includes data array', Array.isArray(metadata.data));
  test('Metadata count matches data length', metadata.count === metadata.data.length);

  console.log(`  Count: ${metadata.count}`);
  console.log(`  FX Rate: ${metadata.fxRate}`);

  // Test 7: No matching quotes
  console.log('\n--- No Match Tests ---');

  const krwQuoteNoMatch: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'XYZ',
    market: 'XYZ/KRW',
    bid: 1000,
    ask: 1010,
    timestamp: new Date().toISOString(),
  };

  const noMatchOpps = await calculator.calculateAllPremiumOpportunities([krwQuoteNoMatch], globalQuotes);

  test('No match returns empty array', noMatchOpps.length === 0);

  // Test 8: Negative gap (should not create opportunity)
  console.log('\n--- Negative Gap Tests ---');

  const krwQuoteNegative: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'NEG',
    market: 'NEG/KRW',
    bid: 1000,        // Low KRW price
    ask: 1010,
    timestamp: new Date().toISOString(),
  };

  const globalQuoteNegative: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'NEG',
    market: 'NEG/USDT',
    bid: 1.5,         // High USDT price (will be ~2025 KRW, higher than KRW bid)
    ask: 1.51,
    timestamp: new Date().toISOString(),
  };

  const negativeOpps = await calculator.calculatePremiumOpportunities(krwQuoteNegative, globalQuoteNegative);
  const negativeKimchi = negativeOpps.find(opp => opp.kind === 'KIMCHI');

  test('Negative Kimchi gap does not create opportunity', negativeKimchi === undefined);
  console.log(`  Negative gaps correctly filtered out`);

  // Test 9: ID generation
  console.log('\n--- ID Generation Tests ---');

  test('Kimchi opportunity has valid ID', kimchiOpp!.id.startsWith('kimchi-'));
  test('Reverse opportunity has valid ID', reverseOpp!.id.startsWith('reverse-'));
  test('IDs include symbol', kimchiOpp!.id.includes(krwQuoteKimchi.symbol.toLowerCase()));

  // Test 10: Price conversions
  console.log('\n--- Price Conversion Tests ---');

  test('Global bid converted to KRW is reasonable', kimchiOpp!.globalBidKRW > 0);
  test('Global ask converted to KRW is reasonable', kimchiOpp!.globalAskKRW > 0);
  test('Global bid < Global ask in KRW', kimchiOpp!.globalBidKRW < kimchiOpp!.globalAskKRW);
  test('Conversion uses correct FX rate', Math.abs((kimchiOpp!.globalBidKRW / globalQuoteKimchi.bid) - kimchiOpp!.usdtKrw) < 1);

  console.log('\n=== All PremiumCalculator Tests Passed ===\n');
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
