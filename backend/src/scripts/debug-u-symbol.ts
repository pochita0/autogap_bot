/**
 * Debug U symbol issue
 */

import { BinanceQuoteConnector } from '../connectors/BinanceQuoteConnector';
import { BybitQuoteConnector } from '../connectors/BybitQuoteConnector';

async function main() {
  console.log('🔍 Debugging U symbol quotes\n');

  const binanceConnector = new BinanceQuoteConnector();
  const bybitConnector = new BybitQuoteConnector();

  const [binanceQuotes, bybitQuotes] = await Promise.all([
    binanceConnector.fetchQuotes(),
    bybitConnector.fetchQuotes(),
  ]);

  // Find U symbol quotes
  const binanceU = binanceQuotes.filter(q => q.symbol === 'U');
  const bybitU = bybitQuotes.filter(q => q.symbol === 'U');

  console.log('Binance U quotes:', JSON.stringify(binanceU, null, 2));
  console.log('\nBybit U quotes:', JSON.stringify(bybitU, null, 2));
}

main();
