/**
 * FxRateService Unit Tests
 * Tests the Bithumb USDT/KRW FX rate service with mock connector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FxRateService, BithumbFxRateSource, FxRate } from '../FxRateService';
import { BithumbQuoteConnector, Quote } from '../../connectors/BithumbQuoteConnector';

describe('FxRateService', () => {
  describe('BithumbFxRateSource', () => {
    let mockConnector: BithumbQuoteConnector;
    let fxRateSource: BithumbFxRateSource;
    const fixedTimestamp = '2026-01-28T10:00:00.000Z';

    // Mock quote response from Bithumb
    const mockQuote: Quote = {
      exchange: 'BITHUMB',
      symbol: 'USDT',
      market: 'USDT/KRW',
      bid: 1447,
      ask: 1448,
      timestamp: fixedTimestamp,
    };

    beforeEach(() => {
      // Create mock connector
      mockConnector = {
        fetchQuote: vi.fn(),
      } as any;

      // Create FX rate source with mock connector
      fxRateSource = new BithumbFxRateSource(mockConnector);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should return FX rate with correct structure', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(mockQuote);

      // Act
      const rate = await fxRateSource.getRate();

      // Assert
      expect(rate).toEqual({
        source: 'BITHUMB',
        bid: 1447,
        ask: 1448,
        mid: 1447.5,
        timestamp: fixedTimestamp,
        stale: false,
      });
    });

    it('should compute mid correctly as (bid + ask) / 2', async () => {
      // Arrange
      const customQuote = { ...mockQuote, bid: 1000, ask: 1010 };
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(customQuote);

      // Act
      const rate = await fxRateSource.getRate();

      // Assert
      expect(rate.mid).toBe(1005); // (1000 + 1010) / 2
      expect(rate.bid).toBe(1000);
      expect(rate.ask).toBe(1010);
    });

    it('should cache rate and not fetch twice within TTL', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(mockQuote);

      // Act
      const rate1 = await fxRateSource.getRate();
      const rate2 = await fxRateSource.getRate(); // Should use cache

      // Assert
      expect(mockConnector.fetchQuote).toHaveBeenCalledTimes(1);
      expect(mockConnector.fetchQuote).toHaveBeenCalledWith('USDT');
      expect(rate1).toEqual(rate2);
      expect(rate2.stale).toBe(false);
    });

    it('should return stale=false for fresh cached data', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(mockQuote);

      // Act
      await fxRateSource.getRate(); // Fetch and cache
      const cachedRate = await fxRateSource.getRate(); // Use cache

      // Assert
      expect(cachedRate.stale).toBe(false);
    });

    it('should return stale cached value on fetch failure', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote)
        .mockResolvedValueOnce(mockQuote) // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Second call fails

      // Act
      const freshRate = await fxRateSource.getRate();

      // Wait for cache to expire (2s + buffer)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      const staleRate = await fxRateSource.getRate();

      // Assert
      expect(mockConnector.fetchQuote).toHaveBeenCalledTimes(2);
      expect(freshRate.stale).toBe(false);
      expect(staleRate.stale).toBe(true);
      expect(staleRate.bid).toBe(1447);
      expect(staleRate.ask).toBe(1448);
      expect(staleRate.mid).toBe(1447.5);
    });

    it('should throw error if no cache available and fetch fails', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote).mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(fxRateSource.getRate()).rejects.toThrow(
        'Failed to fetch FX rate and no cached data available'
      );
    });

    it('should handle null quote response from connector', async () => {
      // Arrange
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(null);

      // Act & Assert
      await expect(fxRateSource.getRate()).rejects.toThrow(
        'Failed to fetch FX rate and no cached data available'
      );
    });

    it('should handle invalid quote with zero prices', async () => {
      // Arrange
      const invalidQuote = { ...mockQuote, bid: 0, ask: 0 };
      vi.mocked(mockConnector.fetchQuote).mockResolvedValue(invalidQuote);

      // Act & Assert
      await expect(fxRateSource.getRate()).rejects.toThrow(
        'Failed to fetch FX rate and no cached data available'
      );
    });
  });

  describe('FxRateService', () => {
    let mockSource: any;
    let fxRateService: FxRateService;

    const mockRate: FxRate = {
      source: 'BITHUMB',
      bid: 1447,
      ask: 1448,
      mid: 1447.5,
      timestamp: '2026-01-28T10:00:00.000Z',
      stale: false,
    };

    beforeEach(() => {
      mockSource = {
        getRate: vi.fn().mockResolvedValue(mockRate),
      };
      fxRateService = new FxRateService(mockSource);
    });

    it('should return USDT/KRW rate', async () => {
      // Act
      const rate = await fxRateService.getUsdtKrwRate();

      // Assert
      expect(rate).toEqual(mockRate);
      expect(mockSource.getRate).toHaveBeenCalledTimes(1);
    });

    it('should convert USDT to KRW using ask rate (conservative for buying)', async () => {
      // Act
      const krw = await fxRateService.convertUsdtToKrw(100, 'ask');

      // Assert
      expect(krw).toBe(144800); // 100 * 1448
    });

    it('should convert USDT to KRW using bid rate (conservative for selling)', async () => {
      // Act
      const krw = await fxRateService.convertUsdtToKrw(100, 'bid');

      // Assert
      expect(krw).toBe(144700); // 100 * 1447
    });

    it('should use different rates for bid vs ask conversion', async () => {
      // Act
      const krwBid = await fxRateService.convertUsdtToKrw(1, 'bid');
      const krwAsk = await fxRateService.convertUsdtToKrw(1, 'ask');

      // Assert
      expect(krwAsk).toBeGreaterThan(krwBid);
      expect(krwAsk - krwBid).toBe(1); // 1448 - 1447 = 1
    });
  });
});
