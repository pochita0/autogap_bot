/**
 * Bithumb Quote Connector
 * Fetches live quotes from Bithumb Public API (KRW markets)
 * Uses orderbook endpoint to get bid/ask prices
 */

export interface Quote {
  exchange: string;
  symbol: string;
  market: string;
  bid: number;
  ask: number;
  timestamp: string;
  volume24hUsd?: number; // 24h volume in USD (optional, may not be available from all exchanges)
  fetchedAt: number; // Timestamp in milliseconds when quote was fetched
}

export interface MarketInfo {
  symbol: string;
  base: string;
  quote: string;
  active: boolean;
}

export interface QuoteConnector {
  fetchQuotes(): Promise<Quote[]>;
  fetchQuote(symbol: string): Promise<Quote | null>;
  fetchMarkets(): Promise<MarketInfo[]>;
  getExchangeName(): string;
}

export class BithumbQuoteConnector implements QuoteConnector {
  private baseUrl = 'https://api.bithumb.com/public';

  // Top symbols to fetch (to avoid fetching all 400+ symbols via orderbook)
  private readonly TOP_SYMBOLS = [
    'BTC',
    'ETH',
    'XRP',
    'SOL',
    'DOGE',
    'ADA',
    'TRX',
    'DOT',
    'AVAX',
    'LINK',
    'MATIC',
    'UNI',
    'ATOM',
    'NEAR',
    'APT',
    'ARB',
    'OP',
    'AAVE',
    'FXS', // For FRAX alias
    'CRV',
    'LDO',
  ];

  getExchangeName(): string {
    return 'BITHUMB';
  }

  /**
   * Fetch available markets (symbols) from Bithumb
   * Returns the curated list of top symbols as KRW markets
   */
  async fetchMarkets(): Promise<MarketInfo[]> {
    return this.TOP_SYMBOLS.map((base) => ({
      symbol: `${base}_KRW`,
      base: base,
      quote: 'KRW',
      active: true,
    }));
  }

  /**
   * Fetch KRW market quotes from Bithumb orderbook
   * Only fetches top symbols to avoid rate limiting
   */
  async fetchQuotes(): Promise<Quote[]> {
    const quotes: Quote[] = [];

    // Fetch quotes in parallel (with some rate limiting)
    const batchSize = 5;
    for (let i = 0; i < this.TOP_SYMBOLS.length; i += batchSize) {
      const batch = this.TOP_SYMBOLS.slice(i, i + batchSize);
      const batchQuotes = await Promise.all(batch.map((symbol) => this.fetchQuote(symbol)));

      for (const quote of batchQuotes) {
        if (quote) {
          quotes.push(quote);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < this.TOP_SYMBOLS.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return quotes;
  }

  /**
   * Fetch quote for a specific symbol using orderbook
   */
  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orderbook/${symbol}_KRW`);

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();

      if (data.status !== '0000' || !data.data) {
        return null;
      }

      const orderbook = data.data;

      // Get best bid (highest buy price) and best ask (lowest sell price)
      if (!orderbook.bids || orderbook.bids.length === 0) {
        return null;
      }
      if (!orderbook.asks || orderbook.asks.length === 0) {
        return null;
      }

      const bestBid = parseFloat(orderbook.bids[0].price);
      const bestAsk = parseFloat(orderbook.asks[0].price);

      if (isNaN(bestBid) || isNaN(bestAsk) || bestBid <= 0 || bestAsk <= 0) {
        return null;
      }

      return {
        exchange: 'BITHUMB',
        symbol: symbol,
        market: `${symbol}/KRW`,
        bid: bestBid,
        ask: bestAsk,
        timestamp: new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch Bithumb quote for ${symbol}:`, error);
      return null;
    }
  }
}
