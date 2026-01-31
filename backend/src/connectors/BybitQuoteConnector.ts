/**
 * Bybit Quote Connector
 * Fetches live quotes from Bybit Public API
 */

import { Quote, QuoteConnector, MarketInfo } from './BithumbQuoteConnector';

export class BybitQuoteConnector implements QuoteConnector {
  private baseUrl = 'https://api.bybit.com/v5';

  getExchangeName(): string {
    return 'BYBIT';
  }

  /**
   * Fetch available markets (symbols) from Bybit
   * Returns all USDT spot markets
   */
  async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market/instruments-info?category=spot`);
      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.status}`);
      }

      const data: any = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`Bybit API returned error: ${data.retCode}`);
      }

      const instruments = data.result.list || [];

      // Filter and map USDT spot markets
      return instruments
        .filter((inst: any) => inst.quoteCoin === 'USDT' && inst.status === 'Trading')
        .map((inst: any) => ({
          symbol: inst.symbol,              // BTCUSDT
          base: inst.baseCoin,              // BTC
          quote: inst.quoteCoin,            // USDT
          active: inst.status === 'Trading',
        }));
    } catch (error) {
      console.error('Failed to fetch Bybit markets:', error);
      throw error;
    }
  }

  /**
   * Fetch all USDT market quotes from Bybit
   */
  async fetchQuotes(): Promise<Quote[]> {
    try {
      // Fetch all tickers for spot markets
      const response = await fetch(`${this.baseUrl}/market/tickers?category=spot`);

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`Bybit API returned error: ${data.retCode} - ${data.retMsg}`);
      }

      const quotes: Quote[] = [];
      const timestamp = new Date().toISOString();
      const fetchedAt = Date.now();

      // Parse ticker data
      for (const ticker of data.result.list) {
        const symbol = ticker.symbol; // e.g., "BTCUSDT"

        // Only process USDT pairs
        if (!symbol.endsWith('USDT')) {
          continue;
        }

        // Extract base symbol (e.g., "BTCUSDT" -> "BTC")
        const baseSymbol = symbol.slice(0, -4);

        const bid = parseFloat(ticker.bid1Price);
        const ask = parseFloat(ticker.ask1Price);

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
          continue;
        }

        quotes.push({
          exchange: 'BYBIT',
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
      console.error('Failed to fetch Bybit quotes:', error);
      throw error;
    }
  }

  /**
   * Fetch quote for a specific symbol
   */
  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const bybitSymbol = `${symbol}USDT`;
      const response = await fetch(
        `${this.baseUrl}/market/tickers?category=spot&symbol=${bybitSymbol}`
      );

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();

      if (data.retCode !== 0 || !data.result.list || data.result.list.length === 0) {
        return null;
      }

      const ticker = data.result.list[0];
      const bid = parseFloat(ticker.bid1Price);
      const ask = parseFloat(ticker.ask1Price);

      if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
        return null;
      }

      return {
        exchange: 'BYBIT',
        symbol: symbol,
        market: `${symbol}/USDT`,
        bid,
        ask,
        timestamp: new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch Bybit quote for ${symbol}:`, error);
      return null;
    }
  }
}
