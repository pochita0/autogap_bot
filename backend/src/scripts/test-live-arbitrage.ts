/**
 * Test Live Arbitrage Opportunities
 * Quick test to verify live arbitrage calculator works
 */

import { BithumbQuoteConnector } from '../connectors/BithumbQuoteConnector';
import { BinanceQuoteConnector } from '../connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from '../connectors/OKXQuoteConnector';
import { UpbitQuoteConnector } from '../connectors/UpbitQuoteConnector';
import { BybitQuoteConnector } from '../connectors/BybitQuoteConnector';
import { ArbitrageCalculator } from '../services/ArbitrageCalculator';

async function main() {
  console.log('🧪 Testing Live Arbitrage Opportunities System\n');

  // Initialize connectors
  const bithumbConnector = new BithumbQuoteConnector();
  const binanceConnector = new BinanceQuoteConnector();
  const okxConnector = new OKXQuoteConnector();
  const upbitConnector = new UpbitQuoteConnector();
  const bybitConnector = new BybitQuoteConnector();
  const arbitrageCalculator = new ArbitrageCalculator();

  // Step 1: Fetch quotes from all exchanges
  console.log('1️⃣ Fetching live quotes from all exchanges...');
  const startTime = Date.now();

  const [bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] = await Promise.all([
    bithumbConnector.fetchQuotes().catch(() => []),
    upbitConnector.fetchQuotes().catch(() => []),
    binanceConnector.fetchQuotes().catch(() => []),
    okxConnector.fetchQuotes().catch(() => []),
    bybitConnector.fetchQuotes().catch(() => []),
  ]);

  const fetchDuration = Date.now() - startTime;
  console.log(`   ✅ Fetched quotes in ${fetchDuration}ms`);
  console.log(`      - Bithumb: ${bithumbQuotes.length} quotes`);
  console.log(`      - Upbit: ${upbitQuotes.length} quotes`);
  console.log(`      - Binance: ${binanceQuotes.length} quotes`);
  console.log(`      - OKX: ${okxQuotes.length} quotes`);
  console.log(`      - Bybit: ${bybitQuotes.length} quotes`);

  // Step 2: Combine all quotes
  const allQuotes = [
    ...bithumbQuotes,
    ...upbitQuotes,
    ...binanceQuotes,
    ...okxQuotes,
    ...bybitQuotes,
  ];
  console.log(`\n2️⃣ Total quotes: ${allQuotes.length}`);

  // Step 3: Calculate arbitrage opportunities
  console.log('\n3️⃣ Calculating arbitrage opportunities...');
  const calcStartTime = Date.now();

  const opportunities = await arbitrageCalculator.calculateArbitrageOpportunities(
    allQuotes,
    0.5, // minGapPct
    20 // top 20
  );

  const calcDuration = Date.now() - calcStartTime;
  console.log(`   ✅ Found ${opportunities.length} opportunities in ${calcDuration}ms`);

  // Step 4: Show top opportunities
  console.log('\n4️⃣ Top 10 Arbitrage Opportunities:\n');
  opportunities.slice(0, 10).forEach((opp, idx) => {
    const typeEmoji =
      opp.type === 'KIMP_OVERSEAS_TO_BITHUMB'
        ? '🇰🇷'
        : opp.type === 'KIMP_BITHUMB_TO_OVERSEAS'
          ? '🌐'
          : '💱';
    console.log(
      `   ${idx + 1}. ${typeEmoji} ${opp.base}/${opp.quote}: ${opp.grossGapPct.toFixed(2)}%`
    );
    console.log(`      Buy:  ${opp.buyExchange} @ ${opp.buyPrice.toLocaleString()}`);
    console.log(`      Sell: ${opp.sellExchange} @ ${opp.sellPrice?.toLocaleString()}`);
    console.log(`      Net:  ${opp.netProfitPct.toFixed(2)}% (after est. fees)`);
  });

  // Step 5: Show stats by type
  console.log('\n5️⃣ Opportunities by type:');
  const byType = opportunities.reduce(
    (acc, opp) => {
      acc[opp.type] = (acc[opp.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  console.log('\n✅ Test completed successfully!');
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

export { main as testLiveArbitrage };
