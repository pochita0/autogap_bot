import { Opportunity } from '../types/opportunity';

/**
 * Golden Fixture Dataset for Filter Testing
 *
 * This dataset contains carefully crafted opportunities to test all filter edge cases.
 * Each opportunity is designed to test specific boundary conditions and filter behaviors.
 *
 * DEFAULT FILTER VALUES (for reference):
 * - minGapPct: 0.5%
 * - maxGapPct: 100%
 * - minNetProfitPct: 0.3%
 * - onlyOpenNetworks: true
 * - allowBridgeRoutes: false
 * - showSpotSpotHedge: true
 * - showSpotFutures: true
 * - excludeExchanges: []
 */

export const goldenOpportunities: Opportunity[] = [
  // ============================================================================
  // GAP FILTER EDGE CASES (Testing minGapPct and maxGapPct boundaries)
  // ============================================================================

  {
    id: 'gap-below-min',
    type: 'SPOT_FUTURES',
    base: 'BTC',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 60000,
    futuresPrice: 60294, // Gap: 0.49% (just below min 0.5%)
    grossGapPct: 0.49,
    netProfitPct: 0.35,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.5,
    fundingRate: -0.01,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 1000000,
  },

  {
    id: 'gap-at-min',
    type: 'SPOT_FUTURES',
    base: 'ETH',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 3000,
    futuresPrice: 3015, // Gap: 0.50% (exactly at min)
    grossGapPct: 0.50,
    netProfitPct: 0.35,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.0,
    fundingRate: -0.005,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 800000,
  },

  {
    id: 'gap-above-min',
    type: 'SPOT_FUTURES',
    base: 'SOL',
    quote: 'USDT',
    buyExchange: 'Bybit',
    futuresExchange: 'Bybit',
    buyPrice: 100,
    futuresPrice: 100.51, // Gap: 0.51% (just above min)
    grossGapPct: 0.51,
    netProfitPct: 0.36,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 1.8,
    fundingRate: 0.002,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 500000,
  },

  {
    id: 'gap-below-max',
    type: 'SPOT_SPOT_HEDGE',
    base: 'DOGE',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Upbit',
    futuresExchange: 'Binance',
    buyPrice: 0.10,
    sellPrice: 0.1999, // Gap: 99.9% (just below max 100%)
    futuresPrice: 0.101,
    grossGapPct: 99.9,
    netProfitPct: 95.5,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 15,
    estCostUsd: 8.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 50000,
  },

  {
    id: 'gap-at-max',
    type: 'SPOT_SPOT_HEDGE',
    base: 'SHIB',
    quote: 'USDT',
    buyExchange: 'Bybit',
    sellExchange: 'Bithumb',
    futuresExchange: 'Bybit',
    buyPrice: 0.00001,
    sellPrice: 0.00002, // Gap: 100.0% (exactly at max)
    futuresPrice: 0.0000101,
    grossGapPct: 100.0,
    netProfitPct: 96.0,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 12,
    estCostUsd: 5.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 30000,
  },

  {
    id: 'gap-above-max',
    type: 'SPOT_SPOT_HEDGE',
    base: 'PEPE',
    quote: 'USDT',
    buyExchange: 'OKX',
    sellExchange: 'Upbit',
    futuresExchange: 'OKX',
    buyPrice: 0.000005,
    sellPrice: 0.00001005, // Gap: 101.0% (just above max)
    futuresPrice: 0.00000505,
    grossGapPct: 101.0,
    netProfitPct: 97.0,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 18,
    estCostUsd: 10.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 25000,
  },

  // ============================================================================
  // NET PROFIT FILTER EDGE CASES (Testing minNetProfitPct boundary)
  // ============================================================================

  {
    id: 'net-below-threshold',
    type: 'SPOT_FUTURES',
    base: 'AVAX',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 35,
    futuresPrice: 35.35, // Gap: 1.0%, but net profit: 0.29% (below threshold 0.3%)
    grossGapPct: 1.0,
    netProfitPct: 0.29,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 3.0,
    fundingRate: -0.008,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 400000,
  },

  {
    id: 'net-at-threshold',
    type: 'SPOT_FUTURES',
    base: 'MATIC',
    quote: 'USDT',
    buyExchange: 'OKX',
    futuresExchange: 'OKX',
    buyPrice: 0.85,
    futuresPrice: 0.8543, // Net profit: 0.30% (exactly at threshold)
    grossGapPct: 0.50,
    netProfitPct: 0.30,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 1.5,
    fundingRate: -0.005,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 350000,
  },

  {
    id: 'net-above-threshold',
    type: 'SPOT_FUTURES',
    base: 'ARB',
    quote: 'USDT',
    buyExchange: 'Bybit',
    futuresExchange: 'Bybit',
    buyPrice: 1.20,
    futuresPrice: 1.21, // Net profit: 0.31% (just above threshold)
    grossGapPct: 0.83,
    netProfitPct: 0.31,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.0,
    fundingRate: 0.001,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 300000,
  },

  // ============================================================================
  // WALLET STATUS EDGE CASES (Testing network availability)
  // ============================================================================

  {
    id: 'wallet-all-open',
    type: 'SPOT_SPOT_HEDGE',
    base: 'LINK',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Upbit',
    futuresExchange: 'Binance',
    buyPrice: 14.50,
    sellPrice: 14.95,
    futuresPrice: 14.55,
    grossGapPct: 3.10,
    netProfitPct: 2.50,
    commonNetworks: 2, // Multiple common networks, all open
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 10,
    estCostUsd: 6.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 450000,
  },

  {
    id: 'wallet-withdraw-blocked',
    type: 'SPOT_SPOT_HEDGE',
    base: 'UNI',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Bithumb',
    futuresExchange: 'Binance',
    buyPrice: 6.00,
    sellPrice: 6.30,
    futuresPrice: 6.05,
    grossGapPct: 5.0,
    netProfitPct: 4.2,
    commonNetworks: 1, // Has network, but withdraw blocked
    walletStatusOk: false, // BLOCKED: withdraw disabled
    routeType: 'DIRECT',
    estTimeMins: 12,
    estCostUsd: 7.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 200000,
  },

  {
    id: 'wallet-deposit-blocked',
    type: 'SPOT_SPOT_HEDGE',
    base: 'ATOM',
    quote: 'USDT',
    buyExchange: 'Bybit',
    sellExchange: 'Upbit',
    futuresExchange: 'Bybit',
    buyPrice: 9.20,
    sellPrice: 9.60,
    futuresPrice: 9.25,
    grossGapPct: 4.35,
    netProfitPct: 3.50,
    commonNetworks: 1, // Has network, but deposit blocked
    walletStatusOk: false, // BLOCKED: deposit disabled
    routeType: 'DIRECT',
    estTimeMins: 14,
    estCostUsd: 6.5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 180000,
  },

  {
    id: 'wallet-no-common-network',
    type: 'SPOT_SPOT_HEDGE',
    base: 'ALGO',
    quote: 'USDT',
    buyExchange: 'OKX',
    sellExchange: 'Bithumb',
    futuresExchange: 'OKX',
    buyPrice: 0.15,
    sellPrice: 0.158,
    futuresPrice: 0.151,
    grossGapPct: 5.33,
    netProfitPct: 4.50,
    commonNetworks: 0, // NO COMMON NETWORK between exchanges
    walletStatusOk: false,
    routeType: 'DIRECT',
    estTimeMins: 15,
    estCostUsd: 8.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 120000,
  },

  // ============================================================================
  // ROUTE TYPE EDGE CASES (Testing DIRECT vs BRIDGE)
  // ============================================================================

  {
    id: 'route-direct',
    type: 'SPOT_SPOT_HEDGE',
    base: 'DOT',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Upbit',
    futuresExchange: 'Binance',
    buyPrice: 6.80,
    sellPrice: 7.05,
    futuresPrice: 6.85,
    grossGapPct: 3.68,
    netProfitPct: 2.90,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT', // Direct transfer (common network available)
    estTimeMins: 16,
    estCostUsd: 7.5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 250000,
  },

  {
    id: 'route-bridge',
    type: 'SPOT_SPOT_HEDGE',
    base: 'XRP',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Upbit',
    futuresExchange: 'Binance',
    buyPrice: 0.52,
    sellPrice: 0.54,
    futuresPrice: 0.521,
    grossGapPct: 3.85,
    netProfitPct: 2.50,
    commonNetworks: 0, // No common network, requires bridge
    walletStatusOk: false,
    routeType: 'BRIDGE', // Bridge route required (Kimchi premium case)
    estTimeMins: 25,
    estCostUsd: 15.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 150000,
  },

  // ============================================================================
  // EXCHANGE EXCLUSION EDGE CASES
  // ============================================================================

  {
    id: 'exchange-binance-only',
    type: 'SPOT_FUTURES',
    base: 'BNB',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 300,
    futuresPrice: 302,
    grossGapPct: 0.67,
    netProfitPct: 0.40,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.5,
    fundingRate: -0.003,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 900000,
  },

  {
    id: 'exchange-upbit-only',
    type: 'SPOT_FUTURES',
    base: 'ADA',
    quote: 'USDT',
    buyExchange: 'Upbit',
    futuresExchange: 'Upbit',
    buyPrice: 0.43,
    futuresPrice: 0.447,
    grossGapPct: 3.95,
    netProfitPct: 3.10,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 11,
    estCostUsd: 6.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 220000,
  },

  {
    id: 'exchange-bybit-only',
    type: 'SPOT_FUTURES',
    base: 'FTM',
    quote: 'USDT',
    buyExchange: 'Bybit',
    futuresExchange: 'Bybit',
    buyPrice: 0.34,
    futuresPrice: 0.343,
    grossGapPct: 0.88,
    netProfitPct: 0.55,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 1.5,
    fundingRate: 0.004,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 170000,
  },

  {
    id: 'exchange-okx-only',
    type: 'SPOT_FUTURES',
    base: 'LTC',
    quote: 'USDT',
    buyExchange: 'OKX',
    futuresExchange: 'OKX',
    buyPrice: 72,
    futuresPrice: 72.5,
    grossGapPct: 0.69,
    netProfitPct: 0.42,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.0,
    fundingRate: -0.002,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 380000,
  },

  {
    id: 'exchange-bithumb-only',
    type: 'SPOT_FUTURES',
    base: 'SAND',
    quote: 'USDT',
    buyExchange: 'Bithumb',
    futuresExchange: 'Bithumb',
    buyPrice: 0.38,
    futuresPrice: 0.395,
    grossGapPct: 3.95,
    netProfitPct: 3.05,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 13,
    estCostUsd: 6.5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 140000,
  },

  {
    id: 'exchange-multiple',
    type: 'SPOT_SPOT_HEDGE',
    base: 'MANA',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Bybit',
    futuresExchange: 'Binance',
    buyPrice: 0.42,
    sellPrice: 0.437,
    futuresPrice: 0.422,
    grossGapPct: 4.05,
    netProfitPct: 3.20,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 14,
    estCostUsd: 7.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 190000,
  },

  // ============================================================================
  // STRATEGY TYPE EDGE CASES
  // ============================================================================

  {
    id: 'strategy-spot-hedge',
    type: 'SPOT_SPOT_HEDGE',
    base: 'APE',
    quote: 'USDT',
    buyExchange: 'OKX',
    sellExchange: 'Upbit',
    futuresExchange: 'OKX',
    buyPrice: 1.25,
    sellPrice: 1.30,
    futuresPrice: 1.255,
    grossGapPct: 4.0,
    netProfitPct: 3.15,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 17,
    estCostUsd: 8.5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 110000,
  },

  {
    id: 'strategy-spot-futures',
    type: 'SPOT_FUTURES',
    base: 'OP',
    quote: 'USDT',
    buyExchange: 'Binance',
    futuresExchange: 'Binance',
    buyPrice: 2.10,
    futuresPrice: 2.12,
    grossGapPct: 0.95,
    netProfitPct: 0.65,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.2,
    fundingRate: -0.006,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 420000,
  },

  // ============================================================================
  // COMBINATION EDGE CASES (Multiple filters at once)
  // ============================================================================

  {
    id: 'combo-gap-below-net-below',
    type: 'SPOT_FUTURES',
    base: 'NEAR',
    quote: 'USDT',
    buyExchange: 'Bybit',
    futuresExchange: 'Bybit',
    buyPrice: 3.50,
    futuresPrice: 3.517, // Gap: 0.49%, Net: 0.29%
    grossGapPct: 0.49,
    netProfitPct: 0.29,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 1.8,
    fundingRate: -0.004,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 280000,
  },

  {
    id: 'combo-bridge-wallet-blocked',
    type: 'SPOT_SPOT_HEDGE',
    base: 'FLOW',
    quote: 'USDT',
    buyExchange: 'Binance',
    sellExchange: 'Upbit',
    futuresExchange: 'Binance',
    buyPrice: 0.52,
    sellPrice: 0.54,
    futuresPrice: 0.522,
    grossGapPct: 3.85,
    netProfitPct: 2.20,
    commonNetworks: 0, // No common network
    walletStatusOk: false, // Wallet blocked
    routeType: 'BRIDGE', // Requires bridge
    estTimeMins: 28,
    estCostUsd: 18.0,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 95000,
  },

  {
    id: 'combo-high-gap-high-net-all-good',
    type: 'SPOT_SPOT_HEDGE',
    base: 'GALA',
    quote: 'USDT',
    buyExchange: 'Bybit',
    sellExchange: 'Bithumb',
    futuresExchange: 'Bybit',
    buyPrice: 0.025,
    sellPrice: 0.0265,
    futuresPrice: 0.0252,
    grossGapPct: 6.0,
    netProfitPct: 5.2,
    commonNetworks: 2,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 10,
    estCostUsd: 5.5,
    updatedAt: new Date().toISOString(),
    volume24hUsd: 210000,
  },

  {
    id: 'combo-exact-boundaries',
    type: 'SPOT_FUTURES',
    base: 'ICP',
    quote: 'USDT',
    buyExchange: 'OKX',
    futuresExchange: 'OKX',
    buyPrice: 12.00,
    futuresPrice: 12.06, // Gap: 0.50%, Net: 0.30%
    grossGapPct: 0.50,
    netProfitPct: 0.30,
    commonNetworks: 1,
    walletStatusOk: true,
    routeType: 'DIRECT',
    estTimeMins: 0,
    estCostUsd: 2.5,
    fundingRate: 0.000,
    nextFundingAt: new Date(Date.now() + 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    volume24hUsd: 330000,
  },
];

/**
 * Get count of opportunities by filter criteria
 */
export function getFixtureStats() {
  return {
    total: goldenOpportunities.length,
    byStrategy: {
      spotSpotHedge: goldenOpportunities.filter(o => o.type === 'SPOT_SPOT_HEDGE').length,
      spotFutures: goldenOpportunities.filter(o => o.type === 'SPOT_FUTURES').length,
    },
    byRouteType: {
      direct: goldenOpportunities.filter(o => o.routeType === 'DIRECT').length,
      bridge: goldenOpportunities.filter(o => o.routeType === 'BRIDGE').length,
    },
    byWalletStatus: {
      open: goldenOpportunities.filter(o => o.walletStatusOk).length,
      blocked: goldenOpportunities.filter(o => !o.walletStatusOk).length,
      noCommonNetwork: goldenOpportunities.filter(o => o.commonNetworks === 0).length,
    },
    byGap: {
      belowMin: goldenOpportunities.filter(o => o.grossGapPct < 0.5).length,
      atMin: goldenOpportunities.filter(o => o.grossGapPct === 0.5).length,
      aboveMin: goldenOpportunities.filter(o => o.grossGapPct > 0.5 && o.grossGapPct < 100).length,
      atMax: goldenOpportunities.filter(o => o.grossGapPct === 100).length,
      aboveMax: goldenOpportunities.filter(o => o.grossGapPct > 100).length,
    },
    byNetProfit: {
      belowThreshold: goldenOpportunities.filter(o => o.netProfitPct < 0.3).length,
      atThreshold: goldenOpportunities.filter(o => o.netProfitPct === 0.3).length,
      aboveThreshold: goldenOpportunities.filter(o => o.netProfitPct > 0.3).length,
    },
  };
}
