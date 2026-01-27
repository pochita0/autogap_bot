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
  globalBidKRW: number;
  globalAskKRW: number;
  usdtKrw: number;
  gapPct: number;
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
  count: number;
  fxRate: number;
  fxRateTimestamp: string;
  data: PremiumOpportunity[];
}
