/**
 * PremiumCalculator Unit Tests
 * Tests conservative FX rate usage in premium calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PremiumCalculator } from '../PremiumCalculator';
import { FxRateService, FxRate } from '../FxRateService';
import { ExchangeQuote } from '../../types/premium';

describe('PremiumCalculator', () => {
  let mockFxRateService: FxRateService;
  let premiumCalculator: PremiumCalculator;

  // Fixed FX rate for testing
  const mockFxRate: FxRate = {
    source: 'BITHUMB',
    bid: 1447, // Conservative for selling USDT (converting USDT bid to KRW)
    ask: 1448, // Conservative for buying USDT (converting USDT ask to KRW)
    mid: 1447.5,
    timestamp: '2026-01-28T10:00:00.000Z',
    stale: false,
  };

  // Fixed test quotes that will create BOTH Kimchi and Reverse opportunities
  // Strategy: Make KRW bid higher than global ask (Kimchi), and global bid higher than KRW ask (Reverse)
  const bithumbQuote: ExchangeQuote = {
    exchange: 'BITHUMB',
    symbol: 'BTC',
    market: 'BTC/KRW',
    bid: 101000000, // 101M KRW (higher for Kimchi)
    ask: 99000000, // 99M KRW (lower for Reverse)
    timestamp: '2026-01-28T10:00:00.000Z',
  };

  const binanceQuote: ExchangeQuote = {
    exchange: 'BINANCE',
    symbol: 'BTC',
    market: 'BTC/USDT',
    bid: 69000, // $69,000 USDT
    ask: 69500, // $69,500 USDT
    timestamp: '2026-01-28T10:00:00.000Z',
  };

  beforeEach(() => {
    // Create mock FX rate service
    mockFxRateService = {
      getUsdtKrwRate: vi.fn().mockResolvedValue(mockFxRate),
    } as any;

    premiumCalculator = new PremiumCalculator(mockFxRateService);
  });

  describe('Conservative FX Rate Usage', () => {
    it('should use fxAsk for converting globalAsk to KRW (conservative for buying global)', async () => {
      // Arrange
      const expectedGlobalAskKRW = binanceQuote.ask * mockFxRate.ask;
      // 69500 * 1448 = 100,636,000 KRW

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        bithumbQuote,
        binanceQuote
      );

      // Assert
      expect(mockFxRateService.getUsdtKrwRate).toHaveBeenCalled();

      // Should create opportunities (both Kimchi and Reverse based on test data)
      expect(opportunities.length).toBeGreaterThan(0);

      // Find any opportunity - they all should have correct FX conversion
      const opp = opportunities[0];
      expect(opp).toBeDefined();
      expect(opp.globalAskKRW).toBe(Number(expectedGlobalAskKRW.toFixed(2)));
    });

    it('should use fxBid for converting globalBid to KRW (conservative for selling global)', async () => {
      // Arrange
      const expectedGlobalBidKRW = binanceQuote.bid * mockFxRate.bid;
      // 69000 * 1447 = 99,843,000 KRW

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        bithumbQuote,
        binanceQuote
      );

      // Assert
      expect(opportunities.length).toBeGreaterThan(0);
      const opp = opportunities[0];
      expect(opp).toBeDefined();
      expect(opp.globalBidKRW).toBe(Number(expectedGlobalBidKRW.toFixed(2)));
    });

    it('should include FX rate details in opportunity', async () => {
      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        bithumbQuote,
        binanceQuote
      );

      // Assert
      const opp = opportunities[0];
      expect(opp.fxRateBid).toBe(mockFxRate.bid);
      expect(opp.fxRateAsk).toBe(mockFxRate.ask);
      expect(opp.fxRateMid).toBe(mockFxRate.mid);
      expect(opp.fxSource).toBe('BITHUMB');
      expect(opp.fxTimestamp).toBe(mockFxRate.timestamp);
      expect(opp.fxStale).toBe(false);
    });
  });

  describe('Kimchi Premium Calculation', () => {
    it('should calculate Kimchi premium correctly when KRW price > global price', async () => {
      // Arrange: Create scenario where KRW is more expensive
      const krwQuote: ExchangeQuote = {
        exchange: 'BITHUMB',
        symbol: 'ETH',
        market: 'ETH/KRW',
        bid: 3500000, // 3.5M KRW
        ask: 3510000, // 3.51M KRW
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      const globalQuote: ExchangeQuote = {
        exchange: 'BINANCE',
        symbol: 'ETH',
        market: 'ETH/USDT',
        bid: 2400, // $2400
        ask: 2405, // $2405
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      // Expected conversions:
      // globalAskKRW = 2405 * 1448 = 3,482,440 KRW
      // Gap = ((krwBid - globalAskKRW) / globalAskKRW) * 100
      //     = ((3,500,000 - 3,482,440) / 3,482,440) * 100
      //     = 0.50%

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        krwQuote,
        globalQuote
      );

      // Assert
      const kimchiOpp = opportunities.find((o) => o.kind === 'KIMCHI');
      expect(kimchiOpp).toBeDefined();
      expect(kimchiOpp!.gapPct).toBeCloseTo(0.50, 1);
      expect(kimchiOpp!.direction).toBe('GLOBAL_TO_KRW');
    });

    it('should calculate Kimchi premium formula correctly', async () => {
      // Arrange
      const krwQuote: ExchangeQuote = {
        exchange: 'BITHUMB',
        symbol: 'SOL',
        market: 'SOL/KRW',
        bid: 200000, // 200K KRW
        ask: 201000, // 201K KRW
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      const globalQuote: ExchangeQuote = {
        exchange: 'BINANCE',
        symbol: 'SOL',
        market: 'SOL/USDT',
        bid: 136.5, // $136.5
        ask: 137, // $137
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      // Expected:
      // globalAskKRW = 137 * 1448 = 198,376 KRW
      // kimchiGap = ((200,000 - 198,376) / 198,376) * 100 = 0.82%

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        krwQuote,
        globalQuote
      );

      // Assert
      const kimchiOpp = opportunities.find((o) => o.kind === 'KIMCHI');
      expect(kimchiOpp).toBeDefined();
      expect(kimchiOpp!.globalAskKRW).toBeCloseTo(198376, 0);
      expect(kimchiOpp!.gapPct).toBeCloseTo(0.82, 1);
    });
  });

  describe('Reverse Premium Calculation', () => {
    it('should calculate Reverse premium correctly when global price > KRW price', async () => {
      // Arrange: Create scenario where global is more expensive
      const krwQuote: ExchangeQuote = {
        exchange: 'BITHUMB',
        symbol: 'DOGE',
        market: 'DOGE/KRW',
        bid: 170, // 170 KRW
        ask: 171, // 171 KRW
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      const globalQuote: ExchangeQuote = {
        exchange: 'BINANCE',
        symbol: 'DOGE',
        market: 'DOGE/USDT',
        bid: 0.119, // $0.119
        ask: 0.120, // $0.120
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      // Expected conversions:
      // globalBidKRW = 0.119 * 1447 = 172.19 KRW
      // Gap = ((globalBidKRW - krwAsk) / krwAsk) * 100
      //     = ((172.19 - 171) / 171) * 100
      //     = 0.70%

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        krwQuote,
        globalQuote
      );

      // Assert
      const reverseOpp = opportunities.find((o) => o.kind === 'REVERSE');
      expect(reverseOpp).toBeDefined();
      expect(reverseOpp!.gapPct).toBeCloseTo(0.70, 1);
      expect(reverseOpp!.direction).toBe('KRW_TO_GLOBAL');
    });

    it('should calculate Reverse premium formula correctly', async () => {
      // Arrange
      const krwQuote: ExchangeQuote = {
        exchange: 'UPBIT',
        symbol: 'ATOM',
        market: 'ATOM/KRW',
        bid: 3200, // 3200 KRW
        ask: 3210, // 3210 KRW
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      const globalQuote: ExchangeQuote = {
        exchange: 'BINANCE',
        symbol: 'ATOM',
        market: 'ATOM/USDT',
        bid: 2.25, // $2.25
        ask: 2.26, // $2.26
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      // Expected:
      // globalBidKRW = 2.25 * 1447 = 3255.75 KRW
      // reverseGap = ((3255.75 - 3210) / 3210) * 100 = 1.42%

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        krwQuote,
        globalQuote
      );

      // Assert
      const reverseOpp = opportunities.find((o) => o.kind === 'REVERSE');
      expect(reverseOpp).toBeDefined();
      expect(reverseOpp!.globalBidKRW).toBeCloseTo(3255.75, 1);
      expect(reverseOpp!.gapPct).toBeCloseTo(1.42, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should not create opportunities when gap is negative', async () => {
      // Arrange: Prices are equal
      const krwQuote: ExchangeQuote = {
        exchange: 'BITHUMB',
        symbol: 'XRP',
        market: 'XRP/KRW',
        bid: 1447, // Equal to FX mid
        ask: 1448,
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      const globalQuote: ExchangeQuote = {
        exchange: 'BINANCE',
        symbol: 'XRP',
        market: 'XRP/USDT',
        bid: 1.0, // $1
        ask: 1.001,
        timestamp: '2026-01-28T10:00:00.000Z',
      };

      // Expected: No opportunities (gap too small or negative)

      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        krwQuote,
        globalQuote
      );

      // Assert
      expect(opportunities.length).toBe(0);
    });

    it('should include backward-compatible usdtKrw field', async () => {
      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        bithumbQuote,
        binanceQuote
      );

      // Assert
      expect(opportunities.length).toBeGreaterThan(0);
      const opp = opportunities[0];
      expect(opp.usdtKrw).toBe(mockFxRate.mid); // Backward compatibility
    });

    it('should generate unique IDs for each opportunity type', async () => {
      // Act
      const opportunities = await premiumCalculator.calculatePremiumOpportunities(
        bithumbQuote,
        binanceQuote
      );

      // Assert
      if (opportunities.length >= 2) {
        const ids = opportunities.map((o) => o.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });
  });

  describe('getPremiumOpportunitiesWithMetadata', () => {
    it('should return metadata with FX rate details', async () => {
      // Act
      const result = await premiumCalculator.getPremiumOpportunitiesWithMetadata(
        [bithumbQuote],
        [binanceQuote],
        100
      );

      // Assert
      expect(result.fxRate).toBe(mockFxRate.mid);
      expect(result.fxRateBid).toBe(mockFxRate.bid);
      expect(result.fxRateAsk).toBe(mockFxRate.ask);
      expect(result.fxSource).toBe(mockFxRate.source);
      expect(result.fxRateTimestamp).toBe(mockFxRate.timestamp);
      expect(result.fxStale).toBe(false);
    });

    it('should return correct count of opportunities', async () => {
      // Act
      const result = await premiumCalculator.getPremiumOpportunitiesWithMetadata(
        [bithumbQuote],
        [binanceQuote],
        100
      );

      // Assert
      expect(result.count).toBe(result.data.length);
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });
  });
});
