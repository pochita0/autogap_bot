/**
 * FilterService Unit Tests
 * Tests filtering logic with various filter settings
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from '../FilterService';
import { Opportunity } from '../../types/opportunity';
import { FilterSettings, DEFAULT_FILTER_SETTINGS } from '../../types/filters';
import { Quote } from '../../connectors/BithumbQuoteConnector';

describe('FilterService', () => {
  let filterService: FilterService;

  beforeEach(() => {
    filterService = new FilterService();
  });

  describe('Volume Filter', () => {
    it('should exclude opportunities with missing volume when flag is enabled', () => {
      const opportunities: Opportunity[] = [
        createMockOpportunity('BTC', 5.0),
      ];

      const quotes = new Map<string, { buy: Quote; sell: Quote }>();
      quotes.set('BTC', {
        buy: createMockQuote('BINANCE', 'BTC', 69000, 69100, undefined), // volume missing
        sell: createMockQuote('BYBIT', 'BTC', 72000, 72100, undefined),
      });

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        excludeIfVolumeMissing: true,
        debugMode: false,
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      expect(filtered).toHaveLength(0);
    });

    it('should include opportunities with volume above threshold', () => {
      const opportunities: Opportunity[] = [
        createMockOpportunity('BTC', 5.0),
      ];

      const quotes = new Map<string, { buy: Quote; sell: Quote }>();
      quotes.set('BTC', {
        buy: createMockQuote('BINANCE', 'BTC', 69000, 69100, 500000),
        sell: createMockQuote('BYBIT', 'BTC', 72000, 72100, 500000),
      });

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        minVolumeUsd24h: 200000,
        excludeIfVolumeMissing: false,
        requireCommonOpenNetwork: false,
        requireDepositAddress: false,
        debugMode: false,
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      expect(filtered).toHaveLength(1);
    });
  });

  describe('Quote Freshness Filter', () => {
    it('should exclude opportunities with stale quotes', () => {
      const opportunities: Opportunity[] = [
        createMockOpportunity('BTC', 5.0),
      ];

      const oldTimestamp = Date.now() - 10000; // 10 seconds ago
      const quotes = new Map<string, { buy: Quote; sell: Quote }>();
      quotes.set('BTC', {
        buy: { ...createMockQuote('BINANCE', 'BTC', 69000, 69100), fetchedAt: oldTimestamp },
        sell: { ...createMockQuote('BYBIT', 'BTC', 72000, 72100), fetchedAt: Date.now() },
      });

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        maxQuoteAgeSeconds: 5,
        excludeIfVolumeMissing: false,
        requireCommonOpenNetwork: false,
        requireDepositAddress: false,
        debugMode: false,
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Debug Mode', () => {
    it('should return all opportunities with exclusion reasons in debug mode', () => {
      const opportunities: Opportunity[] = [
        createMockOpportunity('BTC', 5.0),
        createMockOpportunity('ETH', 3.0),
      ];

      const quotes = new Map<string, { buy: Quote; sell: Quote }>();
      quotes.set('BTC', {
        buy: createMockQuote('BINANCE', 'BTC', 69000, 69100, undefined), // volume missing
        sell: createMockQuote('BYBIT', 'BTC', 72000, 72100, undefined),
      });
      quotes.set('ETH', {
        buy: createMockQuote('BINANCE', 'ETH', 3400, 3410, undefined),
        sell: createMockQuote('BYBIT', 'ETH', 3500, 3510, undefined),
      });

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        excludeIfVolumeMissing: true,
        debugMode: true, // Enable debug mode
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      // In debug mode, all opportunities are returned
      expect(filtered).toHaveLength(2);

      // Check that exclusion reasons are attached
      expect(filtered[0].filter_exclusions).toBeDefined();
      expect(filtered[0].filter_exclusions!.length).toBeGreaterThan(0);
      expect(filtered[0].filter_exclusions![0].code).toBe('VOLUME_MISSING');
    });
  });

  describe('Wallet Intersection Filter', () => {
    it('should exclude opportunities without common networks', () => {
      const opportunities: Opportunity[] = [
        {
          ...createMockOpportunity('BTC', 5.0),
          wallet_check: {
            ok: false,
            reasons: ['NO_COMMON_NETWORK'],
          },
          commonNetworks: 0,
        },
      ];

      const quotes = new Map<string, { buy: Quote; sell: Quote }>();

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        excludeIfVolumeMissing: false,
        requireCommonOpenNetwork: true,
        requireDepositAddress: false,
        debugMode: false,
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Deposit Address Filter', () => {
    it('should exclude opportunities without deposit address', () => {
      const opportunities: Opportunity[] = [
        {
          ...createMockOpportunity('BTC', 5.0),
          address_check: {
            ok: false,
            reasons: ['No deposit address found for BTC on BINANCE'],
          },
        },
      ];

      const quotes = new Map<string, { buy: Quote; sell: Quote }>();

      const filters: FilterSettings = {
        ...DEFAULT_FILTER_SETTINGS,
        excludeIfVolumeMissing: false,
        requireCommonOpenNetwork: false,
        requireDepositAddress: true,
        debugMode: false,
      };

      const filtered = filterService.applyFilters(opportunities, filters, quotes);

      expect(filtered).toHaveLength(0);
    });
  });
});

// Helper functions
function createMockOpportunity(base: string, gapPct: number): Opportunity {
  return {
    id: `test-${base}`,
    type: 'SPOT_SPOT_HEDGE',
    base,
    quote: 'USDT',
    buyExchange: 'BINANCE',
    sellExchange: 'BYBIT',
    buyPrice: 1000,
    sellPrice: 1000 * (1 + gapPct / 100),
    grossGapPct: gapPct,
    netProfitPct: gapPct - 0.3,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 15,
    estCostUsd: 5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 0,
  };
}

function createMockQuote(
  exchange: string,
  symbol: string,
  bid: number,
  ask: number,
  volume24hUsd?: number
): Quote {
  return {
    exchange,
    symbol,
    market: `${symbol}/USDT`,
    bid,
    ask,
    timestamp: new Date().toISOString(),
    fetchedAt: Date.now(),
    volume24hUsd,
  };
}
