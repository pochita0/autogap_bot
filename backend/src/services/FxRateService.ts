/**
 * FX Rate Service
 * Fetches and caches USDT/KRW rate from Bithumb with conservative bid/ask spreads
 */

import { BithumbQuoteConnector } from '../connectors/BithumbQuoteConnector';

export interface FxRate {
  source: string;
  bid: number; // Conservative rate for converting USDT bid to KRW
  ask: number; // Conservative rate for converting USDT ask to KRW
  mid: number; // Midpoint for display
  timestamp: string;
  stale: boolean;
}

export interface FxRateSource {
  getRate(): Promise<FxRate>;
}

/**
 * Live FX Rate Source using Bithumb USDT/KRW
 */
export class BithumbFxRateSource implements FxRateSource {
  private connector: BithumbQuoteConnector;
  private cache: FxRate | null = null;
  private cacheExpiry: number = 0;
  private fallbackCacheExpiry: number = 0;

  // TTL for live cache (1-3 seconds for fresh data)
  private readonly LIVE_TTL_MS = 2000; // 2 seconds

  // TTL for fallback cache (60 seconds for resilience if API fails)
  private readonly FALLBACK_TTL_MS = 60000; // 60 seconds

  constructor(connector?: BithumbQuoteConnector) {
    this.connector = connector || new BithumbQuoteConnector();
  }

  async getRate(): Promise<FxRate> {
    const now = Date.now();

    // Check live cache first
    if (this.cache && now < this.cacheExpiry) {
      return { ...this.cache, stale: false };
    }

    // Try to fetch fresh rate
    try {
      const quote = await this.connector.fetchQuote('USDT');

      if (quote && quote.bid > 0 && quote.ask > 0) {
        const rate: FxRate = {
          source: 'BITHUMB',
          bid: quote.bid,
          ask: quote.ask,
          mid: (quote.bid + quote.ask) / 2,
          timestamp: quote.timestamp,
          stale: false,
        };

        // Update both caches
        this.cache = rate;
        this.cacheExpiry = now + this.LIVE_TTL_MS;
        this.fallbackCacheExpiry = now + this.FALLBACK_TTL_MS;

        return rate;
      }
    } catch (error) {
      console.error('Failed to fetch FX rate from Bithumb:', error);
    }

    // If fresh fetch failed, use fallback cache if available
    if (this.cache && now < this.fallbackCacheExpiry) {
      console.warn('Using stale FX rate from fallback cache');
      return { ...this.cache, stale: true };
    }

    // No cache available, throw error
    throw new Error('Failed to fetch FX rate and no cached data available');
  }
}

/**
 * FX Rate Service
 * Provides access to USDT/KRW exchange rate
 */
export class FxRateService {
  private source: FxRateSource;

  constructor(source?: FxRateSource) {
    this.source = source || new BithumbFxRateSource();
  }

  /**
   * Get current USDT/KRW exchange rate
   */
  async getUsdtKrwRate(): Promise<FxRate> {
    return this.source.getRate();
  }

  /**
   * Convert USDT to KRW using conservative rates
   * Use bid rate for converting USDT bid (lower, conservative for selling)
   * Use ask rate for converting USDT ask (higher, conservative for buying)
   */
  async convertUsdtToKrw(amountUsdt: number, side: 'bid' | 'ask'): Promise<number> {
    const rate = await this.getUsdtKrwRate();
    return side === 'bid' ? amountUsdt * rate.bid : amountUsdt * rate.ask;
  }
}

// Export global singleton instance using Bithumb live source
export const fxRateService = new FxRateService(new BithumbFxRateSource());
