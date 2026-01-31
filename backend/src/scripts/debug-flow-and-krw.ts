/**
 * Debug FLOW prices and check for KRW arbitrage
 */

import { BithumbQuoteConnector } from '../connectors/BithumbQuoteConnector';
import { UpbitQuoteConnector } from '../connectors/UpbitQuoteConnector';
import { BinanceQuoteConnector } from '../connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from '../connectors/OKXQuoteConnector';
import { BybitQuoteConnector } from '../connectors/BybitQuoteConnector';

async function main() {
  console.log('🔍 Debugging FLOW prices and KRW opportunities\n');

  const [bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] = await Promise.all([
    new BithumbQuoteConnector().fetchQuotes(),
    new UpbitQuoteConnector().fetchQuotes(),
    new BinanceQuoteConnector().fetchQuotes(),
    new OKXQuoteConnector().fetchQuotes(),
    new BybitQuoteConnector().fetchQuotes(),
  ]);

  // Check FLOW prices across exchanges
  console.log('FLOW prices:');
  const flowQuotes = [...binanceQuotes, ...okxQuotes, ...bybitQuotes]
    .filter(q => q.symbol === 'FLOW');
  flowQuotes.forEach(q => {
    console.log(`  ${q.exchange}: bid=${q.bid.toFixed(4)} ask=${q.ask.toFixed(4)}`);
  });

  // Check for common KRW symbols across Bithumb and Upbit
  console.log('\n\nCommon KRW symbols (sample of 5):');
  const bithumbSymbols = new Set(bithumbQuotes.map(q => q.symbol));
  const upbitSymbols = new Set(upbitQuotes.map(q => q.symbol));
  const commonSymbols = [...bithumbSymbols].filter(s => upbitSymbols.has(s)).slice(0, 5);

  for (const symbol of commonSymbols) {
    const bithumbQuote = bithumbQuotes.find(q => q.symbol === symbol);
    const upbitQuote = upbitQuotes.find(q => q.symbol === symbol);

    if (bithumbQuote && upbitQuote) {
      const gap = ((upbitQuote.bid - bithumbQuote.ask) / bithumbQuote.ask) * 100;
      console.log(`  ${symbol}:`);
      console.log(`    Bithumb: ${bithumbQuote.ask.toLocaleString()} KRW (ask)`);
      console.log(`    Upbit: ${upbitQuote.bid.toLocaleString()} KRW (bid)`);
      console.log(`    Gap: ${gap.toFixed(2)}%`);
    }
  }
}

main();
