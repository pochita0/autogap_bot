/**
 * Alias Pair Tests
 *
 * Tests for asset alias functionality (e.g., FXS/FRAX)
 */

import { PremiumCalculator } from '../src/services/PremiumCalculator';
import { FxRateService, MockFxRateSource } from '../src/services/FxRateService';
import { ExchangeQuote } from '../src/types/premium';
import {
  ASSET_ALIASES,
  getAliasByKrwSymbol,
  getAliasByGlobalSymbol,
  getAliasByDisplaySymbol,
  isAliasPair,
} from '../src/config/asset-aliases';

// Test utilities
function test(description: string, assertion: boolean) {
  if (!assertion) {
    throw new Error(`Test failed: ${description}`);
  }
  console.log(`✓ ${description}`);
}

async function runTests() {
  console.log('\n=== Alias Pair Tests ===\n');

  // Test 1: Alias configuration
  console.log('--- Alias Configuration Tests ---');
  test('ASSET_ALIASES is defined', ASSET_ALIASES !== undefined);
  test('ASSET_ALIASES is an array', Array.isArray(ASSET_ALIASES));
  test('ASSET_ALIASES has at least one alias', ASSET_ALIASES.length > 0);

  const fraxAlias = ASSET_ALIASES.find((a) => a.displaySymbol === 'FRAX');
  test('FRAX alias exists', fraxAlias !== undefined);
  test('FRAX alias has correct KRW symbol', fraxAlias!.krwSymbol === 'FXS');
  test('FRAX alias has correct global symbol', fraxAlias!.globalSymbol === 'FRAX');
  test('FRAX alias has correct display symbol', fraxAlias!.displaySymbol === 'FRAX');

  // Test 2: Alias lookup functions
  console.log('\n--- Alias Lookup Tests ---');

  const byKrwSymbol = getAliasByKrwSymbol('FXS', 'BITHUMB');
  test('getAliasByKrwSymbol finds FRAX alias', byKrwSymbol !== undefined);
  test('getAliasByKrwSymbol returns correct alias', byKrwSymbol!.displaySymbol === 'FRAX');

  const byGlobalSymbol = getAliasByGlobalSymbol('FRAX', 'BINANCE');
  test('getAliasByGlobalSymbol finds FRAX alias', byGlobalSymbol !== undefined);
  test('getAliasByGlobalSymbol returns correct alias', byGlobalSymbol!.krwSymbol === 'FXS');

  const byDisplaySymbol = getAliasByDisplaySymbol('FRAX');
  test('getAliasByDisplaySymbol finds FRAX alias', byDisplaySymbol !== undefined);
  test('getAliasByDisplaySymbol returns correct alias', byDisplaySymbol!.krwSymbol === 'FXS');

  // Test 3: isAliasPair function
  console.log('\n--- isAliasPair Tests ---');

  test('isAliasPair identifies FXS/FRAX as alias pair', isAliasPair('FXS', 'FRAX', 'BITHUMB', 'BINANCE'));
  test('isAliasPair identifies BTC/BTC as NOT alias pair', !isAliasPair('BTC', 'BTC', 'BITHUMB', 'BINANCE'));
  test('isAliasPair is exchange-specific', !isAliasPair('FXS', 'FRAX', 'WRONG', 'BINANCE'));

  // Test 4: Alias pair premium calculation
  console.log('\n--- Alias Pair Premium Calculation Tests ---');

  const mockFxSource = new MockFxRateSource();
  const fxRateService = new FxRateService(mockFxSource, 20);
  const calculator = new PremiumCalculator(fxRateService);

  const fxsQuote: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'FXS',
    market: 'FXS/KRW',
    bid: 4320,
    ask: 4335,
    timestamp: new Date().toISOString(),
  };

  const fraxQuote: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'FRAX',
    market: 'FRAX/USDT',
    bid: 3.175,
    ask: 3.178,
    timestamp: new Date().toISOString(),
  };

  const opportunities = await calculator.calculatePremiumOpportunities(fxsQuote, fraxQuote);

  test('Alias pair creates opportunities', opportunities.length > 0);

  const fraxOpp = opportunities[0];
  test('Alias opportunity has isAliasPair flag', fraxOpp.isAliasPair === true);
  test('Alias opportunity uses displaySymbol', fraxOpp.displaySymbol === 'FRAX');
  test('Alias opportunity has krwSymbol', fraxOpp.krwSymbol === 'FXS');
  test('Alias opportunity has globalSymbol', fraxOpp.globalSymbol === 'FRAX');
  test('Alias opportunity has aliasNote', fraxOpp.aliasNote !== undefined);

  console.log(`  Display Symbol: ${fraxOpp.displaySymbol}`);
  console.log(`  KRW Symbol: ${fraxOpp.krwSymbol}`);
  console.log(`  Global Symbol: ${fraxOpp.globalSymbol}`);
  console.log(`  Gap: ${fraxOpp.gapPct}%`);

  // Test 5: Alias pair in batch calculation
  console.log('\n--- Alias Pair Batch Calculation Tests ---');

  const btcQuote: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'BTC',
    market: 'BTC/KRW',
    bid: 81450000,
    ask: 81470000,
    timestamp: new Date().toISOString(),
  };

  const btcGlobalQuote: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'BTC',
    market: 'BTC/USDT',
    bid: 60100,
    ask: 60150,
    timestamp: new Date().toISOString(),
  };

  const krwQuotes = [fxsQuote, btcQuote];
  const globalQuotes = [fraxQuote, btcGlobalQuote];

  const allOpportunities = await calculator.calculateAllPremiumOpportunities(krwQuotes, globalQuotes);

  test('Batch calculation returns opportunities', allOpportunities.length >= 1);

  const aliasPairs = allOpportunities.filter((opp) => opp.isAliasPair);
  const normalPairs = allOpportunities.filter((opp) => !opp.isAliasPair);

  test('Batch calculation includes alias pairs', aliasPairs.length > 0);
  test('Batch calculation includes normal pairs', normalPairs.length > 0);

  console.log(`  Total opportunities: ${allOpportunities.length}`);
  console.log(`  Alias pairs: ${aliasPairs.length}`);
  console.log(`  Normal pairs: ${normalPairs.length}`);

  // Test 6: Alias pair gap formula consistency
  console.log('\n--- Alias Pair Gap Formula Tests ---');

  const fxRate = await fxRateService.getUsdtKrwRate();
  const globalAskKRW = fraxQuote.ask * fxRate;
  const expectedGap = ((fxsQuote.bid - globalAskKRW) / globalAskKRW) * 100;

  test('Alias pair gap formula matches manual calculation', Math.abs(fraxOpp.gapPct - expectedGap) < 0.1);
  console.log(`  Expected: ${expectedGap.toFixed(2)}%, Actual: ${fraxOpp.gapPct}%`);

  // Test 7: Alias pair ID format
  console.log('\n--- Alias Pair ID Tests ---');

  test('Alias pair ID uses display symbol', fraxOpp.id.includes(fraxOpp.displaySymbol.toLowerCase()));
  test('Alias pair ID does not use KRW symbol', !fraxOpp.id.includes('fxs'));
  console.log(`  ID: ${fraxOpp.id}`);

  // Test 8: Alias pair markets are correctly labeled
  console.log('\n--- Alias Pair Market Labels Tests ---');

  test('Alias pair has correct KRW market', fraxOpp.krwMarket === 'FXS/KRW');
  test('Alias pair has correct global market', fraxOpp.globalMarket === 'FRAX/USDT');
  test('Alias pair has correct KRW exchange', fraxOpp.krwExchange === 'BITHUMB');
  test('Alias pair has correct global exchange', fraxOpp.globalExchange === 'BINANCE');

  // Test 9: Backward compatibility
  console.log('\n--- Backward Compatibility Tests ---');

  test('Alias pair has baseSymbol for backward compatibility', fraxOpp.baseSymbol !== undefined);
  test('baseSymbol contains KRW symbol', fraxOpp.baseSymbol === 'FXS');

  // Test 10: No duplicate opportunities
  console.log('\n--- Duplicate Prevention Tests ---');

  const displaySymbols = allOpportunities.map((opp) => opp.displaySymbol);
  const uniqueDisplaySymbols = new Set(displaySymbols);

  // Note: We may have multiple opportunities per symbol (KIMCHI and REVERSE), so we check unique count
  test('No complete duplicates in opportunities', allOpportunities.length === new Set(allOpportunities.map((o) => o.id)).size);

  console.log('\n=== All Alias Pair Tests Passed ===\n');
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
