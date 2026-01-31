/**
 * SymbolMatchingService Unit Tests
 * Tests pairwise symbol matching with FRAX↔FXS alias support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SymbolMatchingService } from '../SymbolMatchingService';
import { ExchangeQuote } from '../../types/premium';

describe('SymbolMatchingService', () => {
  let service: SymbolMatchingService;

  beforeEach(() => {
    service = new SymbolMatchingService();
  });

  describe('Direct Symbol Matching', () => {
    it('should match symbols with same name', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100000000,
          ask: 100100000,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'UPBIT',
          symbol: 'ETH',
          market: 'ETH/KRW',
          bid: 5000000,
          ask: 5010000,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69000,
          ask: 69500,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'OKX',
          symbol: 'ETH',
          market: 'ETH/USDT',
          bid: 3400,
          ask: 3405,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      expect(matches).toHaveLength(2);

      const btcMatch = matches.find((m) => m.canonicalSymbol === 'BTC');
      expect(btcMatch).toBeDefined();
      expect(btcMatch?.krwSymbol).toBe('BTC');
      expect(btcMatch?.globalSymbol).toBe('BTC');
      expect(btcMatch?.isAlias).toBe(false);
      expect(btcMatch?.krwQuote.exchange).toBe('BITHUMB');
      expect(btcMatch?.globalQuote.exchange).toBe('BINANCE');

      const ethMatch = matches.find((m) => m.canonicalSymbol === 'ETH');
      expect(ethMatch).toBeDefined();
      expect(ethMatch?.krwSymbol).toBe('ETH');
      expect(ethMatch?.globalSymbol).toBe('ETH');
      expect(ethMatch?.isAlias).toBe(false);
    });

    it('should not match symbols that exist only on one side', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100000000,
          ask: 100100000,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'UPBIT',
          symbol: 'KLAY',
          market: 'KLAY/KRW',
          bid: 100,
          ask: 101,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69000,
          ask: 69500,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'OKX',
          symbol: 'SOL',
          market: 'SOL/USDT',
          bid: 140,
          ask: 141,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      // Only BTC should match
      expect(matches).toHaveLength(1);
      expect(matches[0].canonicalSymbol).toBe('BTC');
    });
  });

  describe('FRAX↔FXS Alias Matching', () => {
    it('should match Bithumb FXS with Binance FRAX', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'FXS',
          market: 'FXS/KRW',
          bid: 3500,
          ask: 3510,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'FRAX',
          market: 'FRAX/USDT',
          bid: 2.40,
          ask: 2.41,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      expect(matches).toHaveLength(1);

      const fraxMatch = matches[0];
      expect(fraxMatch.canonicalSymbol).toBe('FRAX');
      expect(fraxMatch.krwSymbol).toBe('FXS');
      expect(fraxMatch.globalSymbol).toBe('FRAX');
      expect(fraxMatch.isAlias).toBe(true);
      expect(fraxMatch.krwQuote.symbol).toBe('FXS');
      expect(fraxMatch.globalQuote.symbol).toBe('FRAX');
    });

    it('should match Upbit FXS with OKX FRAX', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'UPBIT',
          symbol: 'FXS',
          market: 'FXS/KRW',
          bid: 3500,
          ask: 3510,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'OKX',
          symbol: 'FRAX',
          market: 'FRAX/USDT',
          bid: 2.40,
          ask: 2.41,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      expect(matches).toHaveLength(1);
      expect(matches[0].canonicalSymbol).toBe('FRAX');
      expect(matches[0].isAlias).toBe(true);
    });

    it('should match Bithumb FXS with Bybit FRAX', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'FXS',
          market: 'FXS/KRW',
          bid: 3500,
          ask: 3510,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BYBIT',
          symbol: 'FRAX',
          market: 'FRAX/USDT',
          bid: 2.40,
          ask: 2.41,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      expect(matches).toHaveLength(1);
      expect(matches[0].canonicalSymbol).toBe('FRAX');
      expect(matches[0].isAlias).toBe(true);
    });

    it('should generate correct alias note', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'FXS',
          market: 'FXS/KRW',
          bid: 3500,
          ask: 3510,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'FRAX',
          market: 'FRAX/USDT',
          bid: 2.40,
          ask: 2.41,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);
      const aliasNote = service.getAliasNote(matches[0]);

      expect(aliasNote).toBe('FXS (KRW) ↔ FRAX (Global)');
    });
  });

  describe('Multi-Exchange Matching', () => {
    it('should match symbols across multiple KRW and global exchanges', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100000000,
          ask: 100100000,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'UPBIT',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100050000,
          ask: 100150000,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'BITHUMB',
          symbol: 'FXS',
          market: 'FXS/KRW',
          bid: 3500,
          ask: 3510,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69000,
          ask: 69500,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'OKX',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69100,
          ask: 69600,
          timestamp: '2026-01-28T10:00:00Z',
        },
        {
          exchange: 'BINANCE',
          symbol: 'FRAX',
          market: 'FRAX/USDT',
          bid: 2.40,
          ask: 2.41,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);

      // Should match: Bithumb BTC, Upbit BTC, Bithumb FXS
      // But pairwise matching uses first match per canonical symbol
      expect(matches.length).toBeGreaterThanOrEqual(2);

      const btcMatch = matches.find((m) => m.canonicalSymbol === 'BTC');
      expect(btcMatch).toBeDefined();

      const fraxMatch = matches.find((m) => m.canonicalSymbol === 'FRAX');
      expect(fraxMatch).toBeDefined();
      expect(fraxMatch?.isAlias).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty KRW quotes', () => {
      const krwQuotes: ExchangeQuote[] = [];
      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69000,
          ask: 69500,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);
      expect(matches).toHaveLength(0);
    });

    it('should handle empty global quotes', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100000000,
          ask: 100100000,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];
      const globalQuotes: ExchangeQuote[] = [];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);
      expect(matches).toHaveLength(0);
    });

    it('should not return alias note for non-alias matches', () => {
      const krwQuotes: ExchangeQuote[] = [
        {
          exchange: 'BITHUMB',
          symbol: 'BTC',
          market: 'BTC/KRW',
          bid: 100000000,
          ask: 100100000,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const globalQuotes: ExchangeQuote[] = [
        {
          exchange: 'BINANCE',
          symbol: 'BTC',
          market: 'BTC/USDT',
          bid: 69000,
          ask: 69500,
          timestamp: '2026-01-28T10:00:00Z',
        },
      ];

      const matches = service.matchSymbols(krwQuotes, globalQuotes);
      const aliasNote = service.getAliasNote(matches[0]);

      expect(aliasNote).toBeUndefined();
    });
  });
});
