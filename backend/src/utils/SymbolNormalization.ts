/**
 * Symbol Normalization Utilities
 *
 * Parses and normalizes symbol formats from different exchanges into base/quote pairs.
 */

import { Exchange, ExchangeSymbol } from '../types/symbolUniverse';

/**
 * Parse Bithumb symbol format: BTC_KRW, ETH_KRW, FXS_KRW
 * Format: {BASE}_{QUOTE}
 */
export function parseBithumbSymbol(raw: string): { base: string; quote: string } | null {
  // Bithumb uses underscore separator
  const parts = raw.split('_');
  if (parts.length !== 2) {
    return null;
  }
  return {
    base: parts[0].toUpperCase(),
    quote: parts[1].toUpperCase(),
  };
}

/**
 * Parse Upbit symbol format: KRW-BTC, KRW-ETH
 * Format: {QUOTE}-{BASE}
 */
export function parseUpbitSymbol(raw: string): { base: string; quote: string } | null {
  // Upbit uses hyphen separator with quote-base order
  const parts = raw.split('-');
  if (parts.length !== 2) {
    return null;
  }
  return {
    base: parts[1].toUpperCase(),    // Base is second
    quote: parts[0].toUpperCase(),   // Quote is first
  };
}

/**
 * Parse Binance symbol format: BTCUSDT, ETHUSDT, FRAXUSDT
 * Format: {BASE}{QUOTE} (concatenated, no separator)
 *
 * Strategy: Remove known quote suffixes (USDT, USDC, BUSD, etc.)
 */
export function parseBinanceSymbol(raw: string): { base: string; quote: string } | null {
  const upperRaw = raw.toUpperCase();

  // Try common quote currencies in order of specificity
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'TUSD', 'FDUSD', 'BTC', 'ETH', 'BNB'];

  for (const quote of quoteCurrencies) {
    if (upperRaw.endsWith(quote)) {
      const base = upperRaw.slice(0, -quote.length);
      if (base.length > 0) {
        return { base, quote };
      }
    }
  }

  return null;
}

/**
 * Parse OKX symbol format: BTC-USDT, ETH-USDT, FRAX-USDT
 * Format: {BASE}-{QUOTE}
 */
export function parseOKXSymbol(raw: string): { base: string; quote: string } | null {
  // OKX uses hyphen separator with base-quote order
  const parts = raw.split('-');
  if (parts.length !== 2) {
    return null;
  }
  return {
    base: parts[0].toUpperCase(),
    quote: parts[1].toUpperCase(),
  };
}

/**
 * Parse Bybit symbol format: BTCUSDT, ETHUSDT, FRAXUSDT
 * Format: {BASE}{QUOTE} (concatenated, no separator)
 *
 * Same strategy as Binance
 */
export function parseBybitSymbol(raw: string): { base: string; quote: string } | null {
  // Bybit uses same format as Binance
  return parseBinanceSymbol(raw);
}

/**
 * Parse symbol for any exchange
 */
export function parseExchangeSymbol(
  exchange: Exchange,
  raw: string
): { base: string; quote: string } | null {
  switch (exchange) {
    case 'BITHUMB':
      return parseBithumbSymbol(raw);
    case 'UPBIT':
      return parseUpbitSymbol(raw);
    case 'BINANCE':
      return parseBinanceSymbol(raw);
    case 'OKX':
      return parseOKXSymbol(raw);
    case 'BYBIT':
      return parseBybitSymbol(raw);
    default:
      return null;
  }
}

/**
 * Create normalized ExchangeSymbol from raw symbol string
 */
export function normalizeSymbol(exchange: Exchange, raw: string): ExchangeSymbol | null {
  const parsed = parseExchangeSymbol(exchange, raw);
  if (!parsed) {
    return null;
  }

  return {
    exchange,
    base: parsed.base,
    quote: parsed.quote,
    raw,
  };
}

/**
 * Filter symbols by quote currency
 */
export function filterByQuote(symbols: ExchangeSymbol[], quote: string): ExchangeSymbol[] {
  return symbols.filter((s) => s.quote === quote.toUpperCase());
}

/**
 * Filter KRW market symbols
 */
export function filterKRWMarkets(symbols: ExchangeSymbol[]): ExchangeSymbol[] {
  return filterByQuote(symbols, 'KRW');
}

/**
 * Filter USDT market symbols
 */
export function filterUSDTMarkets(symbols: ExchangeSymbol[]): ExchangeSymbol[] {
  return filterByQuote(symbols, 'USDT');
}
