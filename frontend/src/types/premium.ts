/**
 * Premium Opportunity Types (Frontend)
 *
 * Types for Kimchi Premium (김프) and Reverse Premium (역프) monitoring
 */

export type PremiumKind = 'KIMCHI' | 'REVERSE';
export type PremiumDirection = 'GLOBAL_TO_KRW' | 'KRW_TO_GLOBAL';

/**
 * Premium opportunity (김프 or 역프)
 */
export interface PremiumOpportunity {
  id: string;
  kind: PremiumKind;
  canonicalSymbol: string;    // Canonical asset ID (e.g., 'FRAX' for FXS↔FRAX)
  baseSymbol: string;         // Deprecated: use displaySymbol instead
  displaySymbol: string;      // Symbol to display in UI
  krwSymbol: string;          // Symbol used on KRW exchange
  globalSymbol: string;       // Symbol used on global exchange
  krwExchange: string;
  globalExchange: string;
  krwMarket: string;
  globalMarket: string;
  krwBid: number;
  krwAsk: number;
  globalBid: number;          // Global bid price in USDT (before conversion)
  globalAsk: number;          // Global ask price in USDT (before conversion)
  globalBidKRW: number;
  globalAskKRW: number;
  usdtKrw: number;            // FX rate (mid for backwards compatibility)
  fxRateBid: number;          // FX rate bid (conservative for selling global)
  fxRateAsk: number;          // FX rate ask (conservative for buying global)
  fxRateMid: number;          // FX rate midpoint
  fxSource: string;           // FX rate source (e.g., 'BITHUMB')
  fxTimestamp: string;        // FX rate timestamp
  fxStale: boolean;           // Whether FX rate is stale
  gapPct: number;             // Premium percentage (can be negative)
  direction: PremiumDirection;
  updatedAt: string;
  isAliasPair: boolean;       // Whether this is an alias pair (different symbols)
  aliasNote?: string;         // Optional explanation for alias pairs

  // Detailed calculation fields for modal display
  calculation?: {
    usdtBid: number;
    usdtAsk: number;
    formula: string;
  };
}

/**
 * Premium opportunities response
 */
export interface PremiumOpportunitiesResponse {
  count: number;            // Number of opportunities returned (after pagination)
  limit?: number;           // Pagination limit
  offset?: number;          // Pagination offset
  fxRate: number;           // Midpoint FX rate (backwards compatibility)
  fxRateBid: number;        // FX rate bid
  fxRateAsk: number;        // FX rate ask
  fxSource: string;         // FX rate source
  fxRateTimestamp: string;  // FX rate timestamp
  fxStale: boolean;         // Whether FX rate is stale
  data: PremiumOpportunity[];
  error?: string;
  message?: string;
}
