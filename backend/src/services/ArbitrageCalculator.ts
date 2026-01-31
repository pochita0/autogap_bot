/**
 * Arbitrage Calculator Service
 * Calculates arbitrage opportunities from live exchange quotes
 */

import { Quote } from '../connectors/BithumbQuoteConnector';
import { Opportunity } from '../types/opportunity';
import { v4 as uuidv4 } from 'uuid';

export class ArbitrageCalculator {
  // Stablecoins and tokens to exclude from arbitrage
  private readonly EXCLUDED_SYMBOLS = new Set([
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD',
    'FDUSD', 'PYUSD', 'U', // U is UUSDT stablecoin
  ]);

  /**
   * Calculate arbitrage opportunities from quotes across exchanges
   * Groups by symbol and finds price differences
   */
  async calculateArbitrageOpportunities(
    allQuotes: Quote[],
    minGapPct: number = 0.5,
    limit: number = 100
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Filter out stablecoins and invalid data
    const validQuotes = allQuotes.filter((quote) => {
      // Exclude stablecoins
      if (this.EXCLUDED_SYMBOLS.has(quote.symbol)) {
        return false;
      }
      // Exclude quotes with suspiciously low prices (< $0.01)
      if (quote.ask < 0.01) {
        return false;
      }
      return true;
    });

    // Group quotes by symbol
    const quotesBySymbol = new Map<string, Quote[]>();
    for (const quote of validQuotes) {
      if (!quotesBySymbol.has(quote.symbol)) {
        quotesBySymbol.set(quote.symbol, []);
      }
      quotesBySymbol.get(quote.symbol)!.push(quote);
    }

    // For each symbol, find arbitrage opportunities between exchanges
    for (const [symbol, quotes] of quotesBySymbol.entries()) {
      // Need at least 2 exchanges for arbitrage
      if (quotes.length < 2) {
        continue;
      }

      // Group quotes by quote currency (KRW vs USDT)
      const krwQuotes = quotes.filter((q) => q.market.includes('/KRW'));
      const usdtQuotes = quotes.filter((q) => q.market.includes('/USDT'));

      // Only compare within same currency group
      // KRW-KRW arbitrage
      if (krwQuotes.length >= 2) {
        this.findArbitrageInGroup(symbol, krwQuotes, opportunities, minGapPct);
      }

      // USDT-USDT arbitrage
      if (usdtQuotes.length >= 2) {
        this.findArbitrageInGroup(symbol, usdtQuotes, opportunities, minGapPct);
      }
    }

    // Sort by gap descending
    opportunities.sort((a, b) => b.grossGapPct - a.grossGapPct);

    // Apply limit
    return opportunities.slice(0, limit);
  }

  /**
   * Find arbitrage opportunities within a group of quotes (same currency)
   */
  private findArbitrageInGroup(
    symbol: string,
    quotes: Quote[],
    opportunities: Opportunity[],
    minGapPct: number
  ): void {
    const MAX_REALISTIC_GAP = 50; // Filter out gaps > 50% as likely data errors

    // Find all pairs of exchanges where price difference exists
    for (let i = 0; i < quotes.length; i++) {
      for (let j = i + 1; j < quotes.length; j++) {
        const quoteA = quotes[i];
        const quoteB = quotes[j];

          // Calculate potential arbitrage: buy on cheaper exchange, sell on expensive
          // Buy at ask price, sell at bid price
          const buyPriceA = quoteA.ask;
          const sellPriceB = quoteB.bid;
          const buyPriceB = quoteB.ask;
          const sellPriceA = quoteA.bid;

          // Opportunity A -> B
          const gapAB = ((sellPriceB - buyPriceA) / buyPriceA) * 100;
          if (gapAB > minGapPct && gapAB < MAX_REALISTIC_GAP) {
            opportunities.push(
              this.createOpportunity(symbol, quoteA, quoteB, 'BUY_A_SELL_B', gapAB)
            );
          }

          // Opportunity B -> A
          const gapBA = ((sellPriceA - buyPriceB) / buyPriceB) * 100;
          if (gapBA > minGapPct && gapBA < MAX_REALISTIC_GAP) {
            opportunities.push(
              this.createOpportunity(symbol, quoteB, quoteA, 'BUY_B_SELL_A', gapBA)
            );
          }
      }
    }
  }

  /**
   * Create an opportunity object from quotes
   */
  private createOpportunity(
    symbol: string,
    buyQuote: Quote,
    sellQuote: Quote,
    direction: string,
    gapPct: number
  ): Opportunity {
    const buyExchange = buyQuote.exchange;
    const sellExchange = sellQuote.exchange;

    // Determine if this is a KRW-USDT cross or same-currency arbitrage
    const buyIsKRW = buyQuote.market.includes('/KRW');
    const sellIsKRW = sellQuote.market.includes('/KRW');

    let type: Opportunity['type'];
    if (buyIsKRW && !sellIsKRW) {
      type = 'KIMP_BITHUMB_TO_OVERSEAS';
    } else if (!buyIsKRW && sellIsKRW) {
      type = 'KIMP_OVERSEAS_TO_BITHUMB';
    } else {
      type = 'SPOT_SPOT_HEDGE';
    }

    // Determine base and quote currencies
    const marketParts = buyQuote.market.split('/');
    const base = marketParts[0] || symbol;
    const quote = marketParts[1] || 'USDT';

    // Create opportunity
    return {
      id: uuidv4(),
      type,
      base,
      quote,
      buyExchange,
      sellExchange,
      buyPrice: buyQuote.ask,
      sellPrice: sellQuote.bid,
      grossGapPct: gapPct,
      netProfitPct: Math.max(0, gapPct - 0.3), // Rough estimate minus fees
      commonNetworks: 1, // Placeholder
      walletStatusOk: false, // Will be enriched later
      routeType: 'DIRECT',
      estTimeMins: 15,
      estCostUsd: 5,
      updatedAt: new Date().toISOString(),
      volume24hUsd: 0,
      fromExchangeId: buyExchange,
      toExchangeId: sellExchange,
      candidateNetworks: [
        {
          networkId: 'ETH-ERC20',
          feeAmount: 0.001,
          minWithdraw: 0.01,
          estimatedMins: 15,
          depositEnabled: true,
          withdrawEnabled: true,
        },
      ],
      fx:
        buyIsKRW || sellIsKRW
          ? {
              rateRef: 'USDT/KRW',
              rateValue: 1460,
              source: 'Mock',
            }
          : undefined,
    };
  }
}
