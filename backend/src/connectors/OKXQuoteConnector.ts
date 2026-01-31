/**
 * OKX Quote Connector
 * Fetches live quotes from OKX Public API
 */

import { Quote, QuoteConnector, MarketInfo } from './BithumbQuoteConnector';

export class OKXQuoteConnector implements QuoteConnector {
  private baseUrl = 'https://www.okx.com/api/v5';

  getExchangeName(): string {
    return 'OKX';
  }

  /**
   * Fetch available markets (symbols) from OKX
   * Returns all USDT spot markets
   */
  async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/public/instruments?instType=SPOT`);
      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
      }

      const data: any = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API returned error: ${data.code}`);
      }

      const instruments = data.data || [];

      // Filter and map USDT spot markets
      return instruments
        .filter((inst: any) => inst.instId.endsWith('-USDT') && inst.state === 'live')
        .map((inst: any) => {
          const parts = inst.instId.split('-'); // BTC-USDT => ['BTC', 'USDT']
          return {
            symbol: inst.instId,              // BTC-USDT
            base: parts[0],                   // BTC
            quote: parts[1],                  // USDT
            active: inst.state === 'live',
          };
        });
    } catch (error) {
      console.error('Failed to fetch OKX markets:', error);
      throw error;
    }
  }

  /**
   * Fetch all USDT market quotes from OKX
   */
  async fetchQuotes(): Promise<Quote[]> {
    try {
      // Fetch all tickers for spot markets
      const response = await fetch(`${this.baseUrl}/market/tickers?instType=SPOT`);

      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API returned error: ${data.code} - ${data.msg}`);
      }

      const quotes: Quote[] = [];
      const timestamp = new Date().toISOString();
      const fetchedAt = Date.now();

      // Parse ticker data
      for (const ticker of data.data) {
        const instId = ticker.instId; // e.g., "BTC-USDT"

        // Only process USDT pairs
        if (!instId.endsWith('-USDT')) {
          continue;
        }

        // Extract base symbol (e.g., "BTC-USDT" -> "BTC")
        const baseSymbol = instId.split('-')[0];

        const bid = parseFloat(ticker.bidPx);
        const ask = parseFloat(ticker.askPx);

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
          continue;
        }

        quotes.push({
          exchange: 'OKX',
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
      console.error('Failed to fetch OKX quotes:', error);
      throw error;
    }
  }

  /**
   * Fetch quote for a specific symbol
   */
  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const instId = `${symbol}-USDT`;
      const response = await fetch(`${this.baseUrl}/market/ticker?instId=${instId}`);

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();

      if (data.code !== '0' || !data.data || data.data.length === 0) {
        return null;
      }

      const ticker = data.data[0];
      const bid = parseFloat(ticker.bidPx);
      const ask = parseFloat(ticker.askPx);

      if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) {
        return null;
      }

      return {
        exchange: 'OKX',
        symbol: symbol,
        market: `${symbol}/USDT`,
        bid,
        ask,
        timestamp: new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch OKX quote for ${symbol}:`, error);
      return null;
    }
  }
}
