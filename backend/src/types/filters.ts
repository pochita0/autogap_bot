/**
 * Filter Settings for Arbitrage Opportunities
 * Supports data quality and execution feasibility filtering
 */

export interface DataQualityFilters {
  // Volume filters
  minVolumeUsd24h: number; // Minimum 24h volume in USD (default 0)
  excludeIfVolumeMissing: boolean; // Drop opportunities where volume is null/undefined (default false)

  // Price anomaly filters
  minPriceUsd: number; // Minimum price in USD (default 0.01)
  maxGapPct: number; // Maximum gap percentage to filter outliers (default 50)
  maxSpreadPct: number; // Maximum spread percentage (default 2)

  // Quote freshness filter
  maxQuoteAgeSeconds: number; // Maximum age of quotes in seconds (default 10)
}

export interface ExecutionFilters {
  // Wallet intersection
  requireCommonOpenNetwork: boolean; // Require wallet_check.ok and commonNetworks >= 1 (default true)

  // Deposit address requirement
  requireDepositAddress: boolean; // Require valid deposit address for destination (default true)
}

export interface FilterSettings extends DataQualityFilters, ExecutionFilters {
  // Existing filters (from opportunity.ts FilterState)
  minGapPct: number;
  maxGapPctFilter: number; // Renamed from maxGapPct in FilterState to avoid conflict
  excludeExchanges: string[];
  showSpotSpotHedge: boolean;
  showSpotFutures: boolean;
  showKimpOverseasToBithumb: boolean;
  showKimpBithumbToOverseas: boolean;
  onlyOpenNetworks: boolean;
  allowBridgeRoutes: boolean;
  minNetProfitPct: number;
  debugMode: boolean;
}

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  // Data quality
  minVolumeUsd24h: 0,
  excludeIfVolumeMissing: false,
  minPriceUsd: 0.01,
  maxGapPct: 50,
  maxSpreadPct: 2,
  maxQuoteAgeSeconds: 10,

  // Execution feasibility
  requireCommonOpenNetwork: true,
  requireDepositAddress: true,

  // Existing filters
  minGapPct: 0.5,
  maxGapPctFilter: 100,
  excludeExchanges: [],
  showSpotSpotHedge: true,
  showSpotFutures: true,
  showKimpOverseasToBithumb: true,
  showKimpBithumbToOverseas: true,
  onlyOpenNetworks: false,
  allowBridgeRoutes: true,
  minNetProfitPct: 0,
  debugMode: false,
};

/**
 * Filter exclusion reasons for debug mode
 */
export interface FilterExclusion {
  reason: string;
  code: FilterExclusionCode;
  details?: string;
}

export type FilterExclusionCode =
  | 'VOLUME_TOO_LOW'
  | 'VOLUME_MISSING'
  | 'PRICE_TOO_LOW'
  | 'GAP_TOO_HIGH'
  | 'SPREAD_TOO_HIGH'
  | 'QUOTE_TOO_OLD'
  | 'NO_COMMON_NETWORK'
  | 'WALLET_NOT_OPEN'
  | 'NO_DEPOSIT_ADDRESS'
  | 'DEPOSIT_ADDRESS_MISSING_MEMO'
  | 'GAP_TOO_LOW'
  | 'NET_PROFIT_TOO_LOW'
  | 'EXCHANGE_EXCLUDED'
  | 'STRATEGY_TYPE_FILTERED';
