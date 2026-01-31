/**
 * Binance Quote Connector
 * Fetches live quotes from Binance Public API (USDT markets)
 */

import { Quote, QuoteConnector, MarketInfo } from './BithumbQuoteConnector';

export class BinanceQuoteConnector implements QuoteConnector {
  private baseUrl = 'https://api.binance.com/api/v3';

  getExchangeName(): string {
    return 'BINANCE';
  }

  /**
   * Fetch available markets (symbols) from Binance
   * Returns all USDT spot markets
   */
  async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/exchangeInfo`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data: any = await response.json();
      const symbols = data.symbols || [];

      // Filter and map USDT spot markets
      return symbols
        .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
        .map((s: any) => ({
          symbol: s.symbol,             // BTCUSDT
          base: s.baseAsset,            // BTC
          quote: s.quoteAsset,          // USDT
          active: s.status === 'TRADING',
        }));
    } catch (error) {
      console.error('Failed to fetch Binance markets:', error);
      throw error;
    }
  }

  /**
   * Fetch all USDT market quotes from Binance
   */
  async fetchQuotes(): Promise<Quote[]> {
    try {
      // Fetch all ticker data (24hr ticker)
      const response = await fetch(`${this.baseUrl}/ticker/bookTicker`);

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const tickers = (await response.json()) as any[];

      const quotes: Quote[] = [];
      const timestamp = new Date().toISOString();
      const fetchedAt = Date.now();

      // Filter for USDT markets only
      for (const ticker of tickers) {
        if (!ticker.symbol.endsWith('USDT')) {
          continue;
        }

        // Extract base symbol (e.g., BTCUSDT -> BTC)
        const baseSymbol = ticker.symbol.slice(0, -4); // Remove 'USDT'

        const bid = parseFloat(ticker.bidPrice);
        const ask = parseFloat(ticker.askPrice);

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
          continue;
        }

        quotes.push({
          exchange: 'BINANCE',
          symbol: baseSymbol,
          market: `${baseSymbol}/USDT`,
          bid,
          ask,
          timestamp,
          fetchedAt,
        });
      }

      return quotes;
    } catch (error) {
      console.error('Failed to fetch Binance quotes:', error);
      throw error;
    }
  }

  /**
   * Fetch quote for a specific symbol
   */
  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const binanceSymbol = `${symbol}USDT`;
      const response = await fetch(`${this.baseUrl}/ticker/bookTicker?symbol=${binanceSymbol}`);

      if (!response.ok) {
        return null;
      }

      const ticker: any = await response.json();

      const bid = parseFloat(ticker.bidPrice);
      const ask = parseFloat(ticker.askPrice);

      if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
        return null;
      }

      return {
        exchange: 'BINANCE',
        symbol: symbol,
        market: `${symbol}/USDT`,
        bid,
        ask,
        timestamp: new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch Binance quote for ${symbol}:`, error);
      return null;
    }
  }
}
