import { Opportunity, FilterState } from '../types/opportunity';

/**
 * Domain layer for filtering logic.
 * All filter checks are pure functions that can be composed and tested independently.
 */

// ============================================================================
// Individual Filter Functions (Boolean Checks)
// ============================================================================

/**
 * Check if opportunity passes strategy type filter
 */
export function passesStrategyFilter(opp: Opportunity, filters: FilterState): boolean {
  if (opp.type === 'SPOT_SPOT_HEDGE' && !filters.showSpotSpotHedge) {
    return false;
  }
  if (opp.type === 'SPOT_FUTURES' && !filters.showSpotFutures) {
    return false;
  }
  if (opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' && !filters.showKimpOverseasToBithumb) {
    return false;
  }
  if (opp.type === 'KIMP_BITHUMB_TO_OVERSEAS' && !filters.showKimpBithumbToOverseas) {
    return false;
  }
  return true;
}

/**
 * Check if opportunity passes gap range filter (min and max)
 */
export function passesGapRange(opp: Opportunity, filters: FilterState): boolean {
  return opp.grossGapPct >= filters.minGapPct && opp.grossGapPct <= filters.maxGapPct;
}

/**
 * Check if opportunity passes exchange exclusion filter
 */
export function passesExchangeExclusion(opp: Opportunity, filters: FilterState): boolean {
  const exchanges = [opp.buyExchange, opp.sellExchange, opp.futuresExchange].filter(Boolean) as string[];
  return !exchanges.some(ex => filters.excludeExchanges.includes(ex));
}

/**
 * Check if opportunity passes wallet/network open filter
 */
export function passesWalletOpenOnly(opp: Opportunity, filters: FilterState): boolean {
  if (!filters.onlyOpenNetworks) {
    return true; // Filter disabled, pass everything
  }
  return opp.walletStatusOk;
}

/**
 * Check if opportunity passes bridge route filter
 */
export function passesBridgeToggle(opp: Opportunity, filters: FilterState): boolean {
  if (filters.allowBridgeRoutes) {
    return true; // Bridge routes allowed, pass everything
  }
  return opp.routeType !== 'BRIDGE';
}

/**
 * Check if opportunity passes minimum net profit filter
 */
export function passesMinNetProfit(opp: Opportunity, filters: FilterState): boolean {
  return opp.netProfitPct >= filters.minNetProfitPct;
}

// ============================================================================
// Composite Filter Function
// ============================================================================

/**
 * Check if opportunity passes ALL filters
 */
export function passesAllFilters(opp: Opportunity, filters: FilterState): boolean {
  return (
    passesStrategyFilter(opp, filters) &&
    passesGapRange(opp, filters) &&
    passesExchangeExclusion(opp, filters) &&
    passesWalletOpenOnly(opp, filters) &&
    passesBridgeToggle(opp, filters) &&
    passesMinNetProfit(opp, filters)
  );
}

/**
 * Apply filters to a list of opportunities
 * Returns only opportunities that pass all filters
 */
export function applyFilters(opportunities: Opportunity[], filters: FilterState): Opportunity[] {
  return opportunities.filter(opp => passesAllFilters(opp, filters));
}

// ============================================================================
// Exclusion Reason Functions (For Debug Mode)
// ============================================================================

/**
 * Get exclusion reason for strategy filter (if any)
 */
export function getStrategyFilterReason(opp: Opportunity, filters: FilterState): string | null {
  if (opp.type === 'SPOT_SPOT_HEDGE' && !filters.showSpotSpotHedge) {
    return 'STRATEGY_DISABLED:SPOT_SPOT_HEDGE';
  }
  if (opp.type === 'SPOT_FUTURES' && !filters.showSpotFutures) {
    return 'STRATEGY_DISABLED:SPOT_FUTURES';
  }
  if (opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' && !filters.showKimpOverseasToBithumb) {
    return 'STRATEGY_DISABLED:KIMP_OVERSEAS_TO_BITHUMB';
  }
  if (opp.type === 'KIMP_BITHUMB_TO_OVERSEAS' && !filters.showKimpBithumbToOverseas) {
    return 'STRATEGY_DISABLED:KIMP_BITHUMB_TO_OVERSEAS';
  }
  return null;
}

/**
 * Get exclusion reasons for gap range filter (if any)
 */
export function getGapRangeReasons(opp: Opportunity, filters: FilterState): string[] {
  const reasons: string[] = [];
  if (opp.grossGapPct < filters.minGapPct) {
    reasons.push(`GAP_BELOW_MIN:${opp.grossGapPct.toFixed(2)}%<${filters.minGapPct}%`);
  }
  if (opp.grossGapPct > filters.maxGapPct) {
    reasons.push(`GAP_ABOVE_MAX:${opp.grossGapPct.toFixed(2)}%>${filters.maxGapPct}%`);
  }
  return reasons;
}

/**
 * Get exclusion reasons for exchange exclusion filter (if any)
 */
export function getExchangeExclusionReasons(opp: Opportunity, filters: FilterState): string[] {
  const exchanges = [opp.buyExchange, opp.sellExchange, opp.futuresExchange].filter(Boolean) as string[];
  const excludedExchanges = exchanges.filter(ex => filters.excludeExchanges.includes(ex));
  return excludedExchanges.map(ex => `EXCHANGE_EXCLUDED:${ex}`);
}

/**
 * Get exclusion reason for wallet open filter (if any)
 */
export function getWalletOpenReason(opp: Opportunity, filters: FilterState): string | null {
  if (!filters.onlyOpenNetworks) {
    return null; // Filter disabled
  }
  if (!opp.walletStatusOk) {
    if (opp.commonNetworks === 0) {
      return 'NO_COMMON_NETWORK';
    }
    return 'WALLET_NOT_OPEN';
  }
  return null;
}

/**
 * Get exclusion reason for bridge toggle filter (if any)
 */
export function getBridgeToggleReason(opp: Opportunity, filters: FilterState): string | null {
  if (filters.allowBridgeRoutes) {
    return null; // Bridge routes allowed
  }
  if (opp.routeType === 'BRIDGE') {
    return 'BRIDGE_DISABLED';
  }
  return null;
}

/**
 * Get exclusion reason for min net profit filter (if any)
 */
export function getMinNetProfitReason(opp: Opportunity, filters: FilterState): string | null {
  if (opp.netProfitPct < filters.minNetProfitPct) {
    return `NET_BELOW_THRESHOLD:${opp.netProfitPct.toFixed(2)}%<${filters.minNetProfitPct}%`;
  }
  return null;
}

/**
 * Get ALL exclusion reasons for an opportunity
 * Returns empty array if opportunity passes all filters
 */
export function getAllExclusionReasons(opp: Opportunity, filters: FilterState): string[] {
  const reasons: string[] = [];

  // Strategy filter
  const strategyReason = getStrategyFilterReason(opp, filters);
  if (strategyReason) reasons.push(strategyReason);

  // Gap range filter
  reasons.push(...getGapRangeReasons(opp, filters));

  // Net profit filter
  const netProfitReason = getMinNetProfitReason(opp, filters);
  if (netProfitReason) reasons.push(netProfitReason);

  // Exchange exclusion filter
  reasons.push(...getExchangeExclusionReasons(opp, filters));

  // Wallet open filter
  const walletReason = getWalletOpenReason(opp, filters);
  if (walletReason) reasons.push(walletReason);

  // Bridge toggle filter
  const bridgeReason = getBridgeToggleReason(opp, filters);
  if (bridgeReason) reasons.push(bridgeReason);

  return reasons;
}
