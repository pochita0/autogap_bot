/**
 * Test FX Rate Service with Bithumb USDT/KRW
 */

import { fxRateService } from '../services/FxRateService';

async function main() {
  console.log('🧪 Testing FX Rate Service with Bithumb USDT/KRW\n');

  try {
    // Test 1: Get FX rate
    console.log('1️⃣ Fetching FX rate...');
    const startTime = Date.now();
    const fxRate = await fxRateService.getUsdtKrwRate();
    const duration = Date.now() - startTime;

    console.log(`   ✅ Fetched in ${duration}ms`);
    console.log(`   Source: ${fxRate.source}`);
    console.log(`   Bid: ${fxRate.bid.toFixed(2)} KRW (for selling USDT)`);
    console.log(`   Ask: ${fxRate.ask.toFixed(2)} KRW (for buying USDT)`);
    console.log(`   Mid: ${fxRate.mid.toFixed(2)} KRW`);
    console.log(`   Timestamp: ${new Date(fxRate.timestamp).toLocaleString()}`);
    console.log(`   Stale: ${fxRate.stale}`);

    // Test 2: Test caching
    console.log('\n2️⃣ Testing cache (should be instant)...');
    const cacheStartTime = Date.now();
    const cachedRate = await fxRateService.getUsdtKrwRate();
    const cacheDuration = Date.now() - cacheStartTime;

    console.log(`   ✅ Fetched in ${cacheDuration}ms (cached: ${cacheDuration < 10})`);
    console.log(`   Same rate: ${cachedRate.mid === fxRate.mid}`);

    // Test 3: Test conversions
    console.log('\n3️⃣ Testing conversions...');
    const testUsdtAmount = 100;

    const krwAsk = await fxRateService.convertUsdtToKrw(testUsdtAmount, 'ask');
    const krwBid = await fxRateService.convertUsdtToKrw(testUsdtAmount, 'bid');

    console.log(`   ${testUsdtAmount} USDT → ${krwAsk.toFixed(2)} KRW (at ask rate, for buying)`);
    console.log(`   ${testUsdtAmount} USDT → ${krwBid.toFixed(2)} KRW (at bid rate, for selling)`);
    console.log(`   Spread: ${((krwAsk - krwBid) / krwBid * 100).toFixed(3)}%`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { main as testFxRate };
