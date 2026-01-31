export type StrategyType =
  | 'SPOT_SPOT_HEDGE'
  | 'SPOT_FUTURES'
  | 'KIMP_OVERSEAS_TO_BITHUMB'
  | 'KIMP_BITHUMB_TO_OVERSEAS';

export type RouteType = 'DIRECT' | 'BRIDGE';

export interface Opportunity {
  id: string;
  type: StrategyType;
  base: string;
  quote: string;

  // Exchanges
  buyExchange: string;
  sellExchange?: string;
  futuresExchange?: string;

  // Prices
  buyPrice: number;
  sellPrice?: number;
  futuresPrice?: number;

  // Gap & Profit
  grossGapPct: number;
  netProfitPct: number;

  // Funding (for futures)
  fundingRate?: number;
  nextFundingAt?: string;

  // Networks
  commonNetworks: number;
  walletStatusOk: boolean;

  // Wallet check (enriched by backend)
  wallet_check?: {
    ok: boolean;
    reasons: string[];
    checkedAt?: string;
  };

  // Address check (enriched by backend for deposit address validation)
  address_check?: {
    ok: boolean;
    reasons: string[];
    matchedNetworkId?: string; // Canonical network ID if address found
  };

  // Filter exclusions (populated in debug mode)
  filter_exclusions?: Array<{
    reason: string;
    code: string;
    details?: string;
  }>;

  // Route info (NEW in v0.3)
  routeType: RouteType;
  estTimeMins: number;
  estCostUsd: number;

  // Kimchi Premium fields (NEW in Phase 1)
  fromExchangeId?: string; // For KIMP flows: source exchange
  toExchangeId?: string; // For KIMP flows: destination exchange
  candidateNetworks?: CandidateNetwork[]; // Available transfer networks
  fx?: {
    // FX rate placeholder (to be filled in Step 2)
    rateRef: string; // e.g., "USD/KRW"
    rateValue?: number; // e.g., 1350.5
    source?: string; // e.g., "Dunamu API"
  };

  // Metadata
  updatedAt: string;
  volume24hUsd: number;
}

export interface CandidateNetwork {
  networkId: string; // e.g., "BTC", "ETH-ERC20"
  feeAmount: number; // Withdrawal fee in base currency
  minWithdraw: number; // Minimum withdrawal amount
  estimatedMins: number; // Estimated transfer time
  depositEnabled: boolean;
  withdrawEnabled: boolean;
}

export interface OpportunityDetail extends Opportunity {
  legs: {
    spotBuy: {
      market: string;
      priceRef: string;
      volume24h: number;
      estSlippageBps: number;
    };
    spotSell?: {
      market: string;
      priceRef: string;
      volume24h: number;
      estSlippageBps: number;
    };
    futuresShort?: {
      market: string;
      priceRef: string;
      markPrice: number;
      indexPrice: number;
    };
  };

  transferRoute: {
    routeType: RouteType;
    destRequiredNetworkId?: string;
    commonNetworks?: string[];
    steps: RouteStep[];
    estTotalTimeMins: number;
    estTotalCostUsd: number;
    riskFlags: string[];
  };

  profitBreakdown: {
    grossPct: number;
    tradingFeesPct: number;
    withdrawFeePct?: number;
    bridgeCostPct?: number;
    slippagePct: number;
    timeRiskPct?: number;
    netPct: number;
  };
}

export interface RouteStep {
  type: 'CEX_WITHDRAW' | 'ONCHAIN_SWAP' | 'BRIDGE_TRANSFER' | 'UNWRAP_TO_NATIVE' | 'CEX_DEPOSIT_WAIT';
  fromNetworkId?: string;
  toNetworkId?: string;
  providerId?: string;
  estTimeMins: number;
  estCostUsd: number;
  required: boolean;
}

export interface FilterState {
  minGapPct: number;
  maxGapPct: number;
  excludeExchanges: string[];
  showSpotSpotHedge: boolean;
  showSpotFutures: boolean;
  showKimpOverseasToBithumb: boolean; // NEW: Kimchi Premium filter
  showKimpBithumbToOverseas: boolean; // NEW: Reverse Kimchi filter
  onlyOpenNetworks: boolean;
  allowBridgeRoutes: boolean;
  minNetProfitPct: number;
  debugMode: boolean;
}
