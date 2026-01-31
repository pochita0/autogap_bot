/**
 * Test Live Premium Quotes
 * Quick test to verify live quote connectors work
 */

import { BithumbQuoteConnector } from '../connectors/BithumbQuoteConnector';
import { BinanceQuoteConnector } from '../connectors/BinanceQuoteConnector';
import { SymbolUniverseBuilder } from '../services/SymbolUniverseBuilder';
import { PremiumCalculator } from '../services/PremiumCalculator';
import { fxRateService } from '../services/FxRateService';

async function main() {
  console.log('🧪 Testing Live Premium Quotes System\n');

  // Initialize connectors
  const bithumbConnector = new BithumbQuoteConnector();
  const binanceConnector = new BinanceQuoteConnector();
  const symbolBuilder = new SymbolUniverseBuilder();
  const premiumCalculator = new PremiumCalculator(fxRateService);

  // Step 1: Fetch quotes
  console.log('1️⃣ Fetching live quotes...');
  const [krwQuotes, globalQuotes] = await Promise.all([
    bithumbConnector.fetchQuotes(),
    binanceConnector.fetchQuotes(),
  ]);

  console.log(`   ✅ Fetched ${krwQuotes.length} Bithumb KRW quotes`);
  console.log(`   ✅ Fetched ${globalQuotes.length} Binance USDT quotes`);

  // Step 2: Build symbol universe
  console.log('\n2️⃣ Building symbol universe...');
  const symbolPairs = symbolBuilder.buildUniverse(krwQuotes, globalQuotes, true);
  console.log(`   ✅ Found ${symbolPairs.length} tradeable pairs`);

  const normalPairs = symbolPairs.filter((p) => !p.isAlias);
  const aliasPairs = symbolPairs.filter((p) => p.isAlias);
  console.log(`      - Normal pairs: ${normalPairs.length}`);
  console.log(`      - Alias pairs: ${aliasPairs.length}`);

  if (aliasPairs.length > 0) {
    console.log(`      - Aliases: ${aliasPairs.map((p) => p.displaySymbol).join(', ')}`);
  }

  // Step 3: Calculate premium opportunities
  console.log('\n3️⃣ Calculating premium opportunities...');
  const result = await premiumCalculator.getPremiumOpportunitiesWithMetadata(
    krwQuotes,
    globalQuotes,
    20 // Top 20
  );

  console.log(`   ✅ Found ${result.count} premium opportunities`);
  console.log(`   📊 FX Rate: ${result.fxRate.toFixed(2)} KRW/USDT`);

  // Step 4: Show top opportunities
  console.log('\n4️⃣ Top 10 Premium Opportunities:\n');
  result.data.slice(0, 10).forEach((opp, idx) => {
    const kindEmoji = opp.kind === 'KIMCHI' ? '🇰🇷' : '🌐';
    const aliasTag = opp.isAliasPair ? ' [ALIAS]' : '';
    console.log(
      `   ${idx + 1}. ${kindEmoji} ${opp.displaySymbol}${aliasTag}: ${opp.gapPct.toFixed(2)}%`
    );
    console.log(
      `      ${opp.kind === 'KIMCHI' ? 'Buy' : 'Buy'}: ₩${(opp.kind === 'KIMCHI' ? opp.globalAskKRW : opp.krwAsk).toLocaleString()}`
    );
    console.log(
      `      ${opp.kind === 'KIMCHI' ? 'Sell' : 'Sell'}: ₩${(opp.kind === 'KIMCHI' ? opp.krwBid : opp.globalBidKRW).toLocaleString()}`
    );
  });

  // Step 5: Check if FRAX is included
  console.log('\n5️⃣ Checking for FRAX alias pair...');
  const fraxOpp = result.data.find((o) => o.displaySymbol === 'FRAX');
  if (fraxOpp) {
    console.log(
      `   ✅ FRAX found: ${fraxOpp.kind} ${fraxOpp.gapPct.toFixed(2)}% (${fraxOpp.krwSymbol} ↔ ${fraxOpp.globalSymbol})`
    );
  } else {
    console.log('   ❌ FRAX not found (might be below gap threshold or missing quotes)');
  }

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

export { main as testLivePremiums };
