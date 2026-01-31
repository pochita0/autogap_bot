/**
 * Symbol Universe Types
 *
 * Defines the canonical representation of tradeable assets across all exchanges.
 */

export type Exchange =
  | 'BITHUMB'
  | 'UPBIT'
  | 'BINANCE'
  | 'OKX'
  | 'BYBIT';

export type MarketType = 'KRW' | 'USDT';

/**
 * Raw exchange symbol with normalized base/quote
 */
export interface ExchangeSymbol {
  exchange: Exchange;
  base: string;       // Base asset (e.g., 'BTC', 'ETH', 'FXS')
  quote: string;      // Quote asset (e.g., 'KRW', 'USDT')
  raw: string;        // Original exchange format (e.g., 'BTCUSDT', 'BTC-USDT', 'BTC_KRW')
}

/**
 * Canonical asset representation across exchanges
 *
 * Groups the same asset by assetId, mapping to actual symbols on each exchange.
 * Used for matching assets across KRW and global markets.
 */
export interface CanonicalAsset {
  assetId: string;                                // Canonical identifier (e.g., 'BTC', 'FRAX')
  krwSymbols: Record<Exchange, string[]>;        // KRW market symbols per exchange
  globalSymbols: Record<Exchange, string[]>;     // USDT market symbols per exchange
}

/**
 * Statistics about the symbol universe
 */
export interface UniverseStats {
  perExchangeCounts: Record<Exchange, { krw: number; usdt: number }>; // Symbols per exchange
  canonicalCount: number;        // Total canonical assets
  matchedCount: number;          // Assets available on both KRW and USDT markets
  generatedAt: string;           // ISO timestamp
}

/**
 * Complete universe result
 */
export interface UniverseResult {
  assets: CanonicalAsset[];
  stats: UniverseStats;
  generatedAt: string;           // ISO timestamp
}

/**
 * Market info returned from exchange connectors
 */
export interface MarketInfo {
  symbol: string;      // Exchange-specific format (e.g., 'BTCUSDT', 'BTC-USDT')
  base: string;        // Base asset (normalized)
  quote: string;       // Quote asset (normalized)
  active?: boolean;    // Whether market is active for trading
}
