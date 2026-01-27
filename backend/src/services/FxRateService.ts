/**
 * FX Rate Service
 *
 * Provides USDT/KRW exchange rate for Kimchi Premium gap calculations.
 * Structured to support both mock (MVP) and live API implementations.
 */

import { CacheService } from './CacheService';

/**
 * FX Rate source interface
 */
export interface FxRateSource {
  /**
   * Get current USDT/KRW exchange rate
   * @returns Promise resolving to the exchange rate (e.g., 1350.5 means 1 USDT = 1350.5 KRW)
   */
  fetchUsdtKrwRate(): Promise<number>;

  /**
   * Get the name/identifier of this rate source
   */
  getSourceName(): string;
}

/**
 * FX Rate response
 */
export interface FxRateResponse {
  rate: number; // USDT/KRW rate
  source: string; // Source identifier
  timestamp: string; // ISO timestamp when rate was fetched
}

/**
 * Mock FX Rate Source (for MVP)
 * Uses a realistic fixed rate that can be updated periodically
 */
export class MockFxRateSource implements FxRateSource {
  private baseRate = 1462; // Base rate: 1 USDT = 1462 KRW (updated to match real market Jan 2026)
  private variance = 5; // Random variance of ±5 KRW

  async fetchUsdtKrwRate(): Promise<number> {
    // Simulate slight market fluctuations
    const fluctuation = (Math.random() - 0.5) * this.variance * 2;
    return this.baseRate + fluctuation;
  }

  getSourceName(): string {
    return 'Mock (Upbit USDT/KRW simulated)';
  }
}

/**
 * Live FX Rate Source (placeholder for future implementation)
 * Can fetch from Upbit or Bithumb USDT/KRW market
 */
export class LiveFxRateSource implements FxRateSource {
  constructor(
    private apiUrl: string = 'https://api.upbit.com/v1/ticker?markets=KRW-USDT'
  ) {}

  async fetchUsdtKrwRate(): Promise<number> {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();

      // Upbit API returns trade_price for KRW-USDT market
      if (Array.isArray(data) && data.length > 0 && data[0].trade_price) {
        return data[0].trade_price;
      }

      throw new Error('Invalid response from Upbit API');
    } catch (error) {
      console.error('Failed to fetch live FX rate, falling back to mock:', error);
      // Fallback to mock rate
      return 1350;
    }
  }

  getSourceName(): string {
    return 'Upbit USDT/KRW';
  }
}

/**
 * FX Rate Service
 * Main service for fetching and caching FX rates
 */
export class FxRateService {
  private cache: CacheService;
  private cacheKey = 'fx:usdt-krw';

  constructor(
    private source: FxRateSource,
    cacheTtlSeconds: number = 20 // Default 20s TTL
  ) {
    this.cache = new CacheService(cacheTtlSeconds * 1000);
  }

  /**
   * Get current USDT/KRW exchange rate (cached)
   * @returns Current exchange rate (e.g., 1350.5)
   */
  async getUsdtKrwRate(): Promise<number> {
    // Check cache first
    const cached = this.cache.get<number>(this.cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from source
    const rate = await this.source.fetchUsdtKrwRate();

    // Cache the rate
    this.cache.set(this.cacheKey, rate);

    return rate;
  }

  /**
   * Get FX rate with metadata
   * @returns FX rate response with source and timestamp
   */
  async getUsdtKrwRateWithMetadata(): Promise<FxRateResponse> {
    const rate = await this.getUsdtKrwRate();

    return {
      rate,
      source: this.source.getSourceName(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert KRW to USDT
   * @param krwAmount Amount in KRW
   * @returns Equivalent amount in USDT
   */
  async convertKrwToUsdt(krwAmount: number): Promise<number> {
    const rate = await this.getUsdtKrwRate();
    return krwAmount / rate;
  }

  /**
   * Convert USDT to KRW
   * @param usdtAmount Amount in USDT
   * @returns Equivalent amount in KRW
   */
  async convertUsdtToKrw(usdtAmount: number): Promise<number> {
    const rate = await this.getUsdtKrwRate();
    return usdtAmount * rate;
  }

  /**
   * Force refresh the cached rate
   */
  async refreshRate(): Promise<number> {
    this.cache.delete(this.cacheKey);
    return await this.getUsdtKrwRate();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Export global singleton instance (using Mock for MVP)
export const fxRateService = new FxRateService(new MockFxRateSource(), 20);

// Alternative: To use live rate source, uncomment:
// export const fxRateService = new FxRateService(new LiveFxRateSource(), 20);
