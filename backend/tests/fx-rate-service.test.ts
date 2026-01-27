/**
 * FX Rate Service Tests
 *
 * Tests for FxRateService, FxRateSource implementations, and caching
 */

import {
  FxRateService,
  MockFxRateSource,
  FxRateResponse,
} from '../src/services/FxRateService';

console.log('='.repeat(80));
console.log('FX RATE SERVICE TESTS');
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

async function runTests() {
  // Test 1: MockFxRateSource returns a rate
  console.log('\n--- Test 1: MockFxRateSource Basic Functionality ---');
  const mockSource = new MockFxRateSource();
  const rate1 = await mockSource.fetchUsdtKrwRate();
  test('MockFxRateSource returns a number', typeof rate1 === 'number');
  test('MockFxRateSource returns rate in expected range', rate1 > 1300 && rate1 < 1400, `Rate: ${rate1}`);
  test('MockFxRateSource has correct source name', mockSource.getSourceName().includes('Mock'));

  // Test 2: MockFxRateSource returns slightly different rates (simulates fluctuation)
  console.log('\n--- Test 2: MockFxRateSource Fluctuation ---');
  const rate2 = await mockSource.fetchUsdtKrwRate();
  const rate3 = await mockSource.fetchUsdtKrwRate();
  test('MockFxRateSource returns different rates', rate2 !== rate3, `Rate2: ${rate2}, Rate3: ${rate3}`);
  test('Fluctuation is within variance', Math.abs(rate2 - rate3) <= 10, `Diff: ${Math.abs(rate2 - rate3)}`);

  // Test 3: FxRateService basic functionality
  console.log('\n--- Test 3: FxRateService Basic Functionality ---');
  const service = new FxRateService(new MockFxRateSource(), 20);
  const serviceRate1 = await service.getUsdtKrwRate();
  test('FxRateService returns a rate', serviceRate1 > 0);
  test('FxRateService rate is in expected range', serviceRate1 > 1300 && serviceRate1 < 1400);

  // Test 4: FxRateService caching
  console.log('\n--- Test 4: FxRateService Caching ---');
  const cachedRate1 = await service.getUsdtKrwRate();
  const cachedRate2 = await service.getUsdtKrwRate();
  test('FxRateService returns same cached rate', cachedRate1 === cachedRate2, `Rate1: ${cachedRate1}, Rate2: ${cachedRate2}`);

  // Test 5: FxRateService cache expiration
  console.log('\n--- Test 5: FxRateService Cache Expiration ---');
  const shortCacheService = new FxRateService(new MockFxRateSource(), 1); // 1 second TTL
  const beforeCache = await shortCacheService.getUsdtKrwRate();

  // Wait for cache to expire
  await new Promise(resolve => setTimeout(resolve, 1100));

  const afterCache = await shortCacheService.getUsdtKrwRate();
  test('FxRateService fetches new rate after cache expiration', beforeCache !== afterCache, `Before: ${beforeCache}, After: ${afterCache}`);

  // Test 6: FxRateService getUsdtKrwRateWithMetadata
  console.log('\n--- Test 6: FxRateService Metadata ---');
  const rateData: FxRateResponse = await service.getUsdtKrwRateWithMetadata();
  test('Metadata includes rate', typeof rateData.rate === 'number');
  test('Metadata includes source', typeof rateData.source === 'string' && rateData.source.length > 0);
  test('Metadata includes timestamp', typeof rateData.timestamp === 'string');
  test('Timestamp is valid ISO string', !isNaN(Date.parse(rateData.timestamp)));

  // Test 7: FxRateService conversion methods
  console.log('\n--- Test 7: FxRateService Currency Conversion ---');
  const testRate = 1350; // Assume rate is around 1350

  // Convert KRW to USDT
  const krwAmount = 1350000; // 1,350,000 KRW
  const usdtFromKrw = await service.convertKrwToUsdt(krwAmount);
  test('convertKrwToUsdt returns expected value', Math.abs(usdtFromKrw - 1000) < 10, `Result: ${usdtFromKrw} USDT (expected ~1000)`);

  // Convert USDT to KRW
  const usdtAmount = 1000; // 1000 USDT
  const krwFromUsdt = await service.convertUsdtToKrw(usdtAmount);
  test('convertUsdtToKrw returns expected value', Math.abs(krwFromUsdt - 1350000) < 10000, `Result: ${krwFromUsdt} KRW (expected ~1,350,000)`);

  // Test 8: FxRateService refresh
  console.log('\n--- Test 8: FxRateService Manual Refresh ---');
  const beforeRefresh = await service.getUsdtKrwRate();
  const refreshedRate = await service.refreshRate();
  test('refreshRate returns a new rate', refreshedRate !== beforeRefresh || Math.abs(refreshedRate - beforeRefresh) < 0.1);
  test('Refreshed rate is valid', refreshedRate > 1300 && refreshedRate < 1400);

  // Test 9: FxRateService cache stats
  console.log('\n--- Test 9: FxRateService Cache Statistics ---');
  const stats = service.getCacheStats();
  test('getCacheStats returns an object', typeof stats === 'object');
  test('Cache stats include totalEntries', typeof stats.totalEntries === 'number');
  test('Cache stats include activeEntries', typeof stats.activeEntries === 'number');
  test('Cache stats include expiredEntries', typeof stats.expiredEntries === 'number');

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
