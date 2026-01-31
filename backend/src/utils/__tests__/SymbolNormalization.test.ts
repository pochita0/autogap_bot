/**
 * Symbol Normalization Unit Tests
 * Tests parsing and normalization of symbol formats from all exchanges
 */

import { describe, it, expect } from 'vitest';
import {
  parseBithumbSymbol,
  parseUpbitSymbol,
  parseBinanceSymbol,
  parseOKXSymbol,
  parseBybitSymbol,
  parseExchangeSymbol,
  normalizeSymbol,
  filterKRWMarkets,
  filterUSDTMarkets,
} from '../SymbolNormalization';
import { ExchangeSymbol } from '../../types/symbolUniverse';

describe('SymbolNormalization', () => {
  describe('Bithumb Symbol Parsing (BTC_KRW format)', () => {
    it('should parse BTC_KRW correctly', () => {
      const result = parseBithumbSymbol('BTC_KRW');
      expect(result).toEqual({ base: 'BTC', quote: 'KRW' });
    });

    it('should parse FXS_KRW correctly (FRAX alias)', () => {
      const result = parseBithumbSymbol('FXS_KRW');
      expect(result).toEqual({ base: 'FXS', quote: 'KRW' });
    });

    it('should parse ETH_KRW correctly', () => {
      const result = parseBithumbSymbol('ETH_KRW');
      expect(result).toEqual({ base: 'ETH', quote: 'KRW' });
    });

    it('should handle lowercase input', () => {
      const result = parseBithumbSymbol('btc_krw');
      expect(result).toEqual({ base: 'BTC', quote: 'KRW' });
    });

    it('should return null for invalid format', () => {
      expect(parseBithumbSymbol('BTCKRW')).toBeNull();
      expect(parseBithumbSymbol('BTC-KRW')).toBeNull();
      expect(parseBithumbSymbol('BTC')).toBeNull();
    });
  });

  describe('Upbit Symbol Parsing (KRW-BTC format)', () => {
    it('should parse KRW-BTC correctly', () => {
      const result = parseUpbitSymbol('KRW-BTC');
      expect(result).toEqual({ base: 'BTC', quote: 'KRW' });
    });

    it('should parse KRW-ETH correctly', () => {
      const result = parseUpbitSymbol('KRW-ETH');
      expect(result).toEqual({ base: 'ETH', quote: 'KRW' });
    });

    it('should parse KRW-FXS correctly', () => {
      const result = parseUpbitSymbol('KRW-FXS');
      expect(result).toEqual({ base: 'FXS', quote: 'KRW' });
    });

    it('should handle lowercase input', () => {
      const result = parseUpbitSymbol('krw-btc');
      expect(result).toEqual({ base: 'BTC', quote: 'KRW' });
    });

    it('should return null for invalid format', () => {
      expect(parseUpbitSymbol('KRWBTC')).toBeNull();
      expect(parseUpbitSymbol('BTC')).toBeNull();
    });

    it('should parse BTC-KRW even though it is non-standard order', () => {
      // Parser doesn't validate - it just splits and treats first part as quote
      // Real Upbit API will only return KRW-XXX format
      const result = parseUpbitSymbol('BTC-KRW');
      expect(result).toEqual({ base: 'KRW', quote: 'BTC' }); // Treats first as quote
    });
  });

  describe('Binance Symbol Parsing (BTCUSDT format)', () => {
    it('should parse BTCUSDT correctly', () => {
      const result = parseBinanceSymbol('BTCUSDT');
      expect(result).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should parse ETHUSDT correctly', () => {
      const result = parseBinanceSymbol('ETHUSDT');
      expect(result).toEqual({ base: 'ETH', quote: 'USDT' });
    });

    it('should parse FRAXUSDT correctly (FRAX global symbol)', () => {
      const result = parseBinanceSymbol('FRAXUSDT');
      expect(result).toEqual({ base: 'FRAX', quote: 'USDT' });
    });

    it('should parse multi-character symbols correctly', () => {
      const result = parseBinanceSymbol('DOGEUSDT');
      expect(result).toEqual({ base: 'DOGE', quote: 'USDT' });
    });

    it('should handle lowercase input', () => {
      const result = parseBinanceSymbol('btcusdt');
      expect(result).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should parse other quote currencies', () => {
      expect(parseBinanceSymbol('BTCUSDC')).toEqual({ base: 'BTC', quote: 'USDC' });
      expect(parseBinanceSymbol('BTCBUSD')).toEqual({ base: 'BTC', quote: 'BUSD' });
      expect(parseBinanceSymbol('ETHBTC')).toEqual({ base: 'ETH', quote: 'BTC' });
    });

    it('should return null for invalid format', () => {
      expect(parseBinanceSymbol('BTC')).toBeNull();
      expect(parseBinanceSymbol('USDT')).toBeNull();
    });
  });

  describe('OKX Symbol Parsing (BTC-USDT format)', () => {
    it('should parse BTC-USDT correctly', () => {
      const result = parseOKXSymbol('BTC-USDT');
      expect(result).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should parse ETH-USDT correctly', () => {
      const result = parseOKXSymbol('ETH-USDT');
      expect(result).toEqual({ base: 'ETH', quote: 'USDT' });
    });

    it('should parse FRAX-USDT correctly', () => {
      const result = parseOKXSymbol('FRAX-USDT');
      expect(result).toEqual({ base: 'FRAX', quote: 'USDT' });
    });

    it('should handle lowercase input', () => {
      const result = parseOKXSymbol('btc-usdt');
      expect(result).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should return null for invalid format', () => {
      expect(parseOKXSymbol('BTCUSDT')).toBeNull();
      expect(parseOKXSymbol('BTC_USDT')).toBeNull();
      expect(parseOKXSymbol('BTC')).toBeNull();
    });
  });

  describe('Bybit Symbol Parsing (BTCUSDT format)', () => {
    it('should parse BTCUSDT correctly', () => {
      const result = parseBybitSymbol('BTCUSDT');
      expect(result).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should parse FRAXUSDT correctly', () => {
      const result = parseBybitSymbol('FRAXUSDT');
      expect(result).toEqual({ base: 'FRAX', quote: 'USDT' });
    });

    it('should handle same format as Binance', () => {
      expect(parseBybitSymbol('ETHUSDT')).toEqual({ base: 'ETH', quote: 'USDT' });
      expect(parseBybitSymbol('DOGEUSDT')).toEqual({ base: 'DOGE', quote: 'USDT' });
    });
  });

  describe('parseExchangeSymbol (unified interface)', () => {
    it('should route to correct parser based on exchange', () => {
      expect(parseExchangeSymbol('BITHUMB', 'BTC_KRW')).toEqual({ base: 'BTC', quote: 'KRW' });
      expect(parseExchangeSymbol('UPBIT', 'KRW-BTC')).toEqual({ base: 'BTC', quote: 'KRW' });
      expect(parseExchangeSymbol('BINANCE', 'BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
      expect(parseExchangeSymbol('OKX', 'BTC-USDT')).toEqual({ base: 'BTC', quote: 'USDT' });
      expect(parseExchangeSymbol('BYBIT', 'BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    });

    it('should handle FRAX alias symbols', () => {
      // FXS on Bithumb (KRW)
      expect(parseExchangeSymbol('BITHUMB', 'FXS_KRW')).toEqual({ base: 'FXS', quote: 'KRW' });

      // FRAX on global exchanges (USDT)
      expect(parseExchangeSymbol('BINANCE', 'FRAXUSDT')).toEqual({ base: 'FRAX', quote: 'USDT' });
      expect(parseExchangeSymbol('OKX', 'FRAX-USDT')).toEqual({ base: 'FRAX', quote: 'USDT' });
      expect(parseExchangeSymbol('BYBIT', 'FRAXUSDT')).toEqual({ base: 'FRAX', quote: 'USDT' });
    });
  });

  describe('normalizeSymbol', () => {
    it('should create ExchangeSymbol for Bithumb', () => {
      const result = normalizeSymbol('BITHUMB', 'BTC_KRW');
      expect(result).toEqual({
        exchange: 'BITHUMB',
        base: 'BTC',
        quote: 'KRW',
        raw: 'BTC_KRW',
      });
    });

    it('should create ExchangeSymbol for Upbit', () => {
      const result = normalizeSymbol('UPBIT', 'KRW-ETH');
      expect(result).toEqual({
        exchange: 'UPBIT',
        base: 'ETH',
        quote: 'KRW',
        raw: 'KRW-ETH',
      });
    });

    it('should create ExchangeSymbol for Binance', () => {
      const result = normalizeSymbol('BINANCE', 'FRAXUSDT');
      expect(result).toEqual({
        exchange: 'BINANCE',
        base: 'FRAX',
        quote: 'USDT',
        raw: 'FRAXUSDT',
      });
    });

    it('should return null for invalid symbol', () => {
      expect(normalizeSymbol('BITHUMB', 'INVALID')).toBeNull();
      expect(normalizeSymbol('BINANCE', 'BTC')).toBeNull();
    });
  });

  describe('filterKRWMarkets', () => {
    it('should filter only KRW markets', () => {
      const symbols: ExchangeSymbol[] = [
        { exchange: 'BITHUMB', base: 'BTC', quote: 'KRW', raw: 'BTC_KRW' },
        { exchange: 'BINANCE', base: 'BTC', quote: 'USDT', raw: 'BTCUSDT' },
        { exchange: 'UPBIT', base: 'ETH', quote: 'KRW', raw: 'KRW-ETH' },
        { exchange: 'OKX', base: 'ETH', quote: 'USDT', raw: 'ETH-USDT' },
      ];

      const result = filterKRWMarkets(symbols);
      expect(result).toHaveLength(2);
      expect(result[0].quote).toBe('KRW');
      expect(result[1].quote).toBe('KRW');
    });
  });

  describe('filterUSDTMarkets', () => {
    it('should filter only USDT markets', () => {
      const symbols: ExchangeSymbol[] = [
        { exchange: 'BITHUMB', base: 'BTC', quote: 'KRW', raw: 'BTC_KRW' },
        { exchange: 'BINANCE', base: 'BTC', quote: 'USDT', raw: 'BTCUSDT' },
        { exchange: 'UPBIT', base: 'ETH', quote: 'KRW', raw: 'KRW-ETH' },
        { exchange: 'OKX', base: 'ETH', quote: 'USDT', raw: 'ETH-USDT' },
      ];

      const result = filterUSDTMarkets(symbols);
      expect(result).toHaveLength(2);
      expect(result[0].quote).toBe('USDT');
      expect(result[1].quote).toBe('USDT');
    });
  });

  describe('Cross-Exchange Format Consistency', () => {
    it('should normalize same asset from different exchanges to same base symbol', () => {
      const bithumbBTC = normalizeSymbol('BITHUMB', 'BTC_KRW');
      const upbitBTC = normalizeSymbol('UPBIT', 'KRW-BTC');
      const binanceBTC = normalizeSymbol('BINANCE', 'BTCUSDT');
      const okxBTC = normalizeSymbol('OKX', 'BTC-USDT');
      const bybitBTC = normalizeSymbol('BYBIT', 'BTCUSDT');

      expect(bithumbBTC?.base).toBe('BTC');
      expect(upbitBTC?.base).toBe('BTC');
      expect(binanceBTC?.base).toBe('BTC');
      expect(okxBTC?.base).toBe('BTC');
      expect(bybitBTC?.base).toBe('BTC');
    });

    it('should handle FRAX alias correctly across exchanges', () => {
      // KRW exchanges: FXS
      const bithumbFXS = normalizeSymbol('BITHUMB', 'FXS_KRW');
      expect(bithumbFXS?.base).toBe('FXS');

      // Global exchanges: FRAX
      const binanceFRAX = normalizeSymbol('BINANCE', 'FRAXUSDT');
      const okxFRAX = normalizeSymbol('OKX', 'FRAX-USDT');
      const bybitFRAX = normalizeSymbol('BYBIT', 'FRAXUSDT');

      expect(binanceFRAX?.base).toBe('FRAX');
      expect(okxFRAX?.base).toBe('FRAX');
      expect(bybitFRAX?.base).toBe('FRAX');

      // Note: Alias mapping happens at SymbolUniverseService level
      // These tests verify that base symbols are correctly extracted
    });
  });
});
