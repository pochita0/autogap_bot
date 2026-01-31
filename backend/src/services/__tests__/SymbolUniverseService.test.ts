/**
 * SymbolUniverseService Unit Tests
 * Tests canonical asset building and FRAX↔FXS alias mapping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SymbolUniverseService } from '../SymbolUniverseService';
import { MarketInfo } from '../../types/symbolUniverse';

describe('SymbolUniverseService', () => {
  let service: SymbolUniverseService;
  let mockBithumbConnector: any;
  let mockUpbitConnector: any;
  let mockBinanceConnector: any;
  let mockOKXConnector: any;
  let mockBybitConnector: any;

  beforeEach(() => {
    // Create mock connectors
    mockBithumbConnector = {
      fetchMarkets: vi.fn(),
    };
    mockUpbitConnector = {
      fetchMarkets: vi.fn(),
    };
    mockBinanceConnector = {
      fetchMarkets: vi.fn(),
    };
    mockOKXConnector = {
      fetchMarkets: vi.fn(),
    };
    mockBybitConnector = {
      fetchMarkets: vi.fn(),
    };

    service = new SymbolUniverseService(
      mockBithumbConnector,
      mockUpbitConnector,
      mockBinanceConnector,
      mockOKXConnector,
      mockBybitConnector
    );
  });

  describe('FRAX↔FXS Alias Mapping', () => {
    it('should map Bithumb FXS_KRW and Binance FRAXUSDT to canonical asset FRAX', async () => {
      // Arrange: Setup mock data
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
        { symbol: 'FXS_KRW', base: 'FXS', quote: 'KRW', active: true }, // Bithumb lists FXS
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
        { symbol: 'FRAXUSDT', base: 'FRAX', quote: 'USDT', active: true }, // Global lists FRAX
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      const fraxAsset = result.assets.find((a) => a.assetId === 'FRAX');
      expect(fraxAsset).toBeDefined();
      expect(fraxAsset?.assetId).toBe('FRAX');

      // Check KRW symbols (should have FXS from Bithumb)
      expect(fraxAsset?.krwSymbols.BITHUMB).toContain('FXS');

      // Check global symbols (should have FRAX from Binance)
      expect(fraxAsset?.globalSymbols.BINANCE).toContain('FRAX');
    });

    it('should count FRAX as matched when both FXS_KRW and FRAXUSDT exist', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'FXS_KRW', base: 'FXS', quote: 'KRW', active: true },
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'FRAXUSDT', base: 'FRAX', quote: 'USDT', active: true },
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      expect(result.stats.matchedCount).toBeGreaterThanOrEqual(1);

      const fraxAsset = result.assets.find((a) => a.assetId === 'FRAX');
      expect(fraxAsset).toBeDefined();

      // Verify it has both KRW and USDT markets
      const hasKrw = fraxAsset!.krwSymbols.BITHUMB.length > 0;
      const hasUsdt = fraxAsset!.globalSymbols.BINANCE.length > 0;
      expect(hasKrw).toBe(true);
      expect(hasUsdt).toBe(true);
    });
  });

  describe('Canonical Asset Building', () => {
    it('should create canonical assets from KRW and USDT markets', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
        { symbol: 'ETH_KRW', base: 'ETH', quote: 'KRW', active: true },
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
        { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', active: true },
        { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', active: true }, // SOL only on USDT
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      expect(result.assets.length).toBeGreaterThanOrEqual(3); // BTC, ETH, SOL

      const btcAsset = result.assets.find((a) => a.assetId === 'BTC');
      expect(btcAsset).toBeDefined();
      expect(btcAsset?.krwSymbols.BITHUMB).toContain('BTC');
      expect(btcAsset?.globalSymbols.BINANCE).toContain('BTC');

      const ethAsset = result.assets.find((a) => a.assetId === 'ETH');
      expect(ethAsset).toBeDefined();
      expect(ethAsset?.krwSymbols.BITHUMB).toContain('ETH');
      expect(ethAsset?.globalSymbols.BINANCE).toContain('ETH');

      const solAsset = result.assets.find((a) => a.assetId === 'SOL');
      expect(solAsset).toBeDefined();
      expect(solAsset?.krwSymbols.BITHUMB).toHaveLength(0); // No KRW market
      expect(solAsset?.globalSymbols.BINANCE).toContain('SOL');
    });

    it('should count matched assets correctly', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
        { symbol: 'ETH_KRW', base: 'ETH', quote: 'KRW', active: true },
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true }, // Matched
        { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', active: true }, // Not matched
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      // BTC has both KRW and USDT
      // ETH has only KRW
      // SOL has only USDT
      // So matchedCount should be 1 (BTC)
      expect(result.stats.matchedCount).toBe(1);
    });
  });

  describe('Multi-Exchange Support', () => {
    it('should aggregate symbols from all exchanges', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
      ];

      const upbitMarkets: MarketInfo[] = [
        { symbol: 'KRW-ETH', base: 'ETH', quote: 'KRW', active: true },
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
      ];

      const okxMarkets: MarketInfo[] = [
        { symbol: 'ETH-USDT', base: 'ETH', quote: 'USDT', active: true },
      ];

      const bybitMarkets: MarketInfo[] = [
        { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', active: true },
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue(upbitMarkets);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue(okxMarkets);
      mockBybitConnector.fetchMarkets.mockResolvedValue(bybitMarkets);

      // Act
      const result = await service.buildUniverse();

      // Assert
      expect(result.assets.length).toBeGreaterThanOrEqual(3); // BTC, ETH, SOL

      // Check per-exchange counts
      expect(result.stats.perExchangeCounts.BITHUMB.krw).toBe(1);
      expect(result.stats.perExchangeCounts.UPBIT.krw).toBe(1);
      expect(result.stats.perExchangeCounts.BINANCE.usdt).toBe(1);
      expect(result.stats.perExchangeCounts.OKX.usdt).toBe(1);
      expect(result.stats.perExchangeCounts.BYBIT.usdt).toBe(1);
    });

    it('should handle same symbol from multiple KRW exchanges', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
      ];

      const upbitMarkets: MarketInfo[] = [
        { symbol: 'KRW-BTC', base: 'BTC', quote: 'KRW', active: true },
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue(upbitMarkets);
      mockBinanceConnector.fetchMarkets.mockResolvedValue([]);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      const btcAsset = result.assets.find((a) => a.assetId === 'BTC');
      expect(btcAsset).toBeDefined();
      expect(btcAsset?.krwSymbols.BITHUMB).toContain('BTC');
      expect(btcAsset?.krwSymbols.UPBIT).toContain('BTC');
    });

    it('should handle same symbol from multiple global exchanges', async () => {
      // Arrange
      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
      ];

      const okxMarkets: MarketInfo[] = [
        { symbol: 'BTC-USDT', base: 'BTC', quote: 'USDT', active: true },
      ];

      const bybitMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue([]);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue(okxMarkets);
      mockBybitConnector.fetchMarkets.mockResolvedValue(bybitMarkets);

      // Act
      const result = await service.buildUniverse();

      // Assert
      const btcAsset = result.assets.find((a) => a.assetId === 'BTC');
      expect(btcAsset).toBeDefined();
      expect(btcAsset?.globalSymbols.BINANCE).toContain('BTC');
      expect(btcAsset?.globalSymbols.OKX).toContain('BTC');
      expect(btcAsset?.globalSymbols.BYBIT).toContain('BTC');
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', async () => {
      // Arrange
      const bithumbMarkets: MarketInfo[] = [
        { symbol: 'BTC_KRW', base: 'BTC', quote: 'KRW', active: true },
        { symbol: 'ETH_KRW', base: 'ETH', quote: 'KRW', active: true },
      ];

      const binanceMarkets: MarketInfo[] = [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
        { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', active: true },
        { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', active: true },
      ];

      mockBithumbConnector.fetchMarkets.mockResolvedValue(bithumbMarkets);
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue(binanceMarkets);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert
      expect(result.stats.canonicalCount).toBe(3); // BTC, ETH, SOL
      expect(result.stats.matchedCount).toBe(2); // BTC and ETH have both markets
      expect(result.stats.perExchangeCounts.BITHUMB.krw).toBe(2);
      expect(result.stats.perExchangeCounts.BINANCE.usdt).toBe(3);
      expect(result.stats.generatedAt).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle exchange connector failures gracefully', async () => {
      // Arrange
      mockBithumbConnector.fetchMarkets.mockRejectedValue(new Error('Network error'));
      mockUpbitConnector.fetchMarkets.mockResolvedValue([]);
      mockBinanceConnector.fetchMarkets.mockResolvedValue([
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', active: true },
      ]);
      mockOKXConnector.fetchMarkets.mockResolvedValue([]);
      mockBybitConnector.fetchMarkets.mockResolvedValue([]);

      // Act
      const result = await service.buildUniverse();

      // Assert: Should still succeed with available exchanges
      expect(result.assets.length).toBeGreaterThanOrEqual(1);
      expect(result.stats.perExchangeCounts.BITHUMB.krw).toBe(0); // Failed exchange
      expect(result.stats.perExchangeCounts.BINANCE.usdt).toBe(1); // Successful exchange
    });
  });
});
