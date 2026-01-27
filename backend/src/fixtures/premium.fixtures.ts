/**
 * Premium Opportunity Fixtures
 *
 * Mock data for Kimchi Premium (김프) and Reverse Premium (역프) monitoring
 */

import { ExchangeQuote } from '../types/premium';

/**
 * Mock USDT/KRW FX rate
 */
export const mockUsdtKrwRate = 1349.50;

/**
 * Mock KRW exchange quotes (BITHUMB)
 */
export const bithumbQuotes: ExchangeQuote[] = [
  {
    exchange: 'BITHUMB',
    symbol: 'BTC',
    market: 'BTC/KRW',
    bid: 81450000,    // 81,450,000 KRW
    ask: 81470000,    // 81,470,000 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'ETH',
    market: 'ETH/KRW',
    bid: 3036000,     // 3,036,000 KRW
    ask: 3038000,     // 3,038,000 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'XRP',
    market: 'XRP/KRW',
    bid: 2970,        // 2,970 KRW
    ask: 2975,        // 2,975 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'SOL',
    market: 'SOL/KRW',
    bid: 231500,      // 231,500 KRW
    ask: 231800,      // 231,800 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'ADA',
    market: 'ADA/KRW',
    bid: 1215,        // 1,215 KRW
    ask: 1218,        // 1,218 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'DOGE',
    market: 'DOGE/KRW',
    bid: 445.5,       // 445.5 KRW
    ask: 446.2,       // 446.2 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'MATIC',
    market: 'MATIC/KRW',
    bid: 568,         // 568 KRW
    ask: 570,         // 570 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'DOT',
    market: 'DOT/KRW',
    bid: 8920,        // 8,920 KRW
    ask: 8930,        // 8,930 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'AVAX',
    market: 'AVAX/KRW',
    bid: 48200,       // 48,200 KRW (lower than global)
    ask: 48250,       // 48,250 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'LINK',
    market: 'LINK/KRW',
    bid: 25100,       // 25,100 KRW (lower than global)
    ask: 25130,       // 25,130 KRW
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BITHUMB',
    symbol: 'FXS',
    market: 'FXS/KRW',
    bid: 1228,        // 1,228 KRW (real market price ~₩1,229)
    ask: 1230,        // 1,230 KRW
    timestamp: new Date().toISOString(),
  },
];

/**
 * Mock global exchange quotes (BINANCE USDT spot)
 */
export const binanceQuotes: ExchangeQuote[] = [
  {
    exchange: 'BINANCE',
    symbol: 'BTC',
    market: 'BTC/USDT',
    bid: 60350,       // 60,350 USDT
    ask: 60360,       // 60,360 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'ETH',
    market: 'ETH/USDT',
    bid: 2248,        // 2,248 USDT
    ask: 2249,        // 2,249 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'XRP',
    market: 'XRP/USDT',
    bid: 2.198,       // 2.198 USDT
    ask: 2.199,       // 2.199 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'SOL',
    market: 'SOL/USDT',
    bid: 171.5,       // 171.5 USDT
    ask: 171.6,       // 171.6 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'ADA',
    market: 'ADA/USDT',
    bid: 0.901,       // 0.901 USDT
    ask: 0.902,       // 0.902 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'DOGE',
    market: 'DOGE/USDT',
    bid: 0.3302,      // 0.3302 USDT
    ask: 0.3303,      // 0.3303 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'MATIC',
    market: 'MATIC/USDT',
    bid: 0.421,       // 0.421 USDT
    ask: 0.422,       // 0.422 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'DOT',
    market: 'DOT/USDT',
    bid: 6.605,       // 6.605 USDT
    ask: 6.608,       // 6.608 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'AVAX',
    market: 'AVAX/USDT',
    bid: 36.25,       // 36.25 USDT (will be ~48,900 KRW, higher than Bithumb)
    ask: 36.27,       // 36.27 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'LINK',
    market: 'LINK/USDT',
    bid: 18.90,       // 18.90 USDT (will be ~25,480 KRW, higher than Bithumb)
    ask: 18.91,       // 18.91 USDT
    timestamp: new Date().toISOString(),
  },
  {
    exchange: 'BINANCE',
    symbol: 'FRAX',
    market: 'FRAX/USDT',
    bid: 0.838,       // 0.838 USDT (real market price ~$0.84, ≈₩1,226 KRW)
    ask: 0.840,       // 0.840 USDT
    timestamp: new Date().toISOString(),
  },
];

/**
 * Helper to get quote by symbol
 */
export function getBithumbQuote(symbol: string): ExchangeQuote | undefined {
  return bithumbQuotes.find((q) => q.symbol === symbol);
}

export function getBinanceQuote(symbol: string): ExchangeQuote | undefined {
  return binanceQuotes.find((q) => q.symbol === symbol);
}

/**
 * Get all available symbols (intersection of both exchanges)
 */
export function getAvailableSymbols(): string[] {
  const bithumbSymbols = new Set(bithumbQuotes.map((q) => q.symbol));
  const binanceSymbols = new Set(binanceQuotes.map((q) => q.symbol));

  return Array.from(bithumbSymbols).filter((symbol) => binanceSymbols.has(symbol));
}
