/**
 * Upbit Quote Connector
 * Fetches live quotes from Upbit Public API (KRW markets)
 */

import { Quote, QuoteConnector, MarketInfo } from './BithumbQuoteConnector';

export class UpbitQuoteConnector implements QuoteConnector {
  private baseUrl = 'https://api.upbit.com/v1';

  getExchangeName(): string {
    return 'UPBIT';
  }

  /**
   * Fetch available markets (symbols) from Upbit
   * Returns all KRW markets
   */
  async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market/all?isDetails=false`);
      if (!response.ok) {
        throw new Error(`Upbit API error: ${response.status}`);
      }

      const markets: any[] = (await response.json()) as any[];

      // Filter and map KRW markets
      return markets
        .filter((m) => m.market.startsWith('KRW-'))
        .map((m) => {
          const parts = m.market.split('-'); // KRW-BTC => ['KRW', 'BTC']
          return {
            symbol: m.market,           // KRW-BTC
            base: parts[1],             // BTC
            quote: parts[0],            // KRW
            active: m.market_warning !== 'CAUTION', // Not warned markets are active
          };
        });
    } catch (error) {
      console.error('Failed to fetch Upbit markets:', error);
      throw error;
    }
  }

  /**
   * Fetch all KRW market quotes from Upbit
   */
  async fetchQuotes(): Promise<Quote[]> {
    try {
      // First, get list of all KRW markets
      const marketsResponse = await fetch(`${this.baseUrl}/market/all?isDetails=false`);
      if (!marketsResponse.ok) {
        throw new Error(`Upbit API error: ${marketsResponse.status}`);
      }

      const markets: any[] = (await marketsResponse.json()) as any[];
      const krwMarkets = markets
        .filter((m) => m.market.startsWith('KRW-'))
        .map((m) => m.market);

      if (krwMarkets.length === 0) {
        return [];
      }

      // Fetch ticker data for all KRW markets (max 100 at a time)
      const quotes: Quote[] = [];
      const batchSize = 100;

      for (let i = 0; i < krwMarkets.length; i += batchSize) {
        const batch = krwMarkets.slice(i, i + batchSize);
        const marketsParam = batch.join(',');

        const tickerResponse = await fetch(`${this.baseUrl}/ticker?markets=${marketsParam}`);
        if (!tickerResponse.ok) {
          continue;
        }

        const tickers: any[] = (await tickerResponse.json()) as any[];
        const timestamp = new Date().toISOString();
        const fetchedAt = Date.now();

        for (const ticker of tickers) {
          const market = ticker.market; // e.g., "KRW-BTC"
          const baseSymbol = market.split('-')[1]; // "BTC"

          // Upbit doesn't provide bid/ask in ticker, use trade_price as approximation
          // For better accuracy, we'd need to use orderbook API
          const tradePrice = parseFloat(ticker.trade_price);

          if (isNaN(tradePrice) || tradePrice <= 0) {
            continue;
          }

          // Approximate bid/ask with small spread (0.1%)
          const spread = 0.001;
          const bid = tradePrice * (1 - spread / 2);
          const ask = tradePrice * (1 + spread / 2);

          quotes.push({
            exchange: 'UPBIT',
            symbol: baseSymbol,
            market: `${baseSymbol}/KRW`,
            bid,
            ask,
            timestamp,
            fetchedAt,
          });
        }

        // Small delay between batches
        if (i + batchSize < krwMarkets.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return quotes;
    } catch (error) {
      console.error('Failed to fetch Upbit quotes:', error);
      throw error;
    }
  }

  /**
   * Fetch quote for a specific symbol
   */
  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const market = `KRW-${symbol}`;
      const response = await fetch(`${this.baseUrl}/ticker?markets=${market}`);

      if (!response.ok) {
        return null;
      }

      const tickers: any[] = (await response.json()) as any[];

      if (tickers.length === 0) {
        return null;
      }

      const ticker = tickers[0];
      const tradePrice = parseFloat(ticker.trade_price);

      if (isNaN(tradePrice) || tradePrice <= 0) {
        return null;
      }

      // Approximate bid/ask with small spread (0.1%)
      const spread = 0.001;
      const bid = tradePrice * (1 - spread / 2);
      const ask = tradePrice * (1 + spread / 2);

      return {
        exchange: 'UPBIT',
        symbol: symbol,
        market: `${symbol}/KRW`,
        bid,
        ask,
        timestamp: new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch Upbit quote for ${symbol}:`, error);
      return null;
    }
  }
}
