/**
 * Query Parameter Parsing Utilities
 * Safe parsing with defaults for filter parameters
 */

import { FilterSettings, DEFAULT_FILTER_SETTINGS } from '../types/filters';

/**
 * Parse boolean from string query parameter
 * Returns default if param is undefined
 */
export function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true';
}

/**
 * Parse number from string query parameter
 * Returns default if param is undefined or invalid
 */
export function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse comma-separated string array from query parameter
 * Returns default if param is undefined
 */
export function parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
  if (value === undefined || value === '') return defaultValue;
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Parse filter settings from query parameters
 * Uses conservative defaults specified in the requirements
 */
export function parseFilterSettings(query: Record<string, string | undefined>): FilterSettings {
  // Conservative defaults for production use
  const conservativeDefaults: FilterSettings = {
    ...DEFAULT_FILTER_SETTINGS,
    // Data quality filters (conservative)
    minVolumeUsd24h: 200000,           // $200k minimum volume
    excludeIfVolumeMissing: true,      // Exclude missing volume by default
    minPriceUsd: 0.01,                 // $0.01 minimum price
    maxGapPct: 50,                     // 50% max gap to filter outliers
    maxSpreadPct: 1.0,                 // 1% max spread
    maxQuoteAgeSeconds: 5,             // 5 second max age

    // Execution feasibility filters
    requireCommonOpenNetwork: true,    // Require common network
    requireDepositAddress: true,       // Require deposit address

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

  return {
    // Data quality
    minVolumeUsd24h: parseNumber(query.minVolumeUsd24h, conservativeDefaults.minVolumeUsd24h),
    excludeIfVolumeMissing: parseBool(query.excludeIfVolumeMissing, conservativeDefaults.excludeIfVolumeMissing),
    minPriceUsd: parseNumber(query.minPriceUsd, conservativeDefaults.minPriceUsd),
    maxGapPct: parseNumber(query.maxGapPct, conservativeDefaults.maxGapPct),
    maxSpreadPct: parseNumber(query.maxSpreadPct, conservativeDefaults.maxSpreadPct),
    maxQuoteAgeSeconds: parseNumber(query.maxQuoteAgeSeconds, conservativeDefaults.maxQuoteAgeSeconds),

    // Execution feasibility
    requireCommonOpenNetwork: parseBool(query.requireCommonOpenNetwork, conservativeDefaults.requireCommonOpenNetwork),
    requireDepositAddress: parseBool(query.requireDepositAddress, conservativeDefaults.requireDepositAddress),

    // Existing filters
    minGapPct: parseNumber(query.minGapPct, conservativeDefaults.minGapPct),
    maxGapPctFilter: parseNumber(query.maxGapPctFilter, conservativeDefaults.maxGapPctFilter),
    excludeExchanges: parseStringArray(query.excludeExchanges, conservativeDefaults.excludeExchanges),
    showSpotSpotHedge: parseBool(query.showSpotSpotHedge, conservativeDefaults.showSpotSpotHedge),
    showSpotFutures: parseBool(query.showSpotFutures, conservativeDefaults.showSpotFutures),
    showKimpOverseasToBithumb: parseBool(query.showKimpOverseasToBithumb, conservativeDefaults.showKimpOverseasToBithumb),
    showKimpBithumbToOverseas: parseBool(query.showKimpBithumbToOverseas, conservativeDefaults.showKimpBithumbToOverseas),
    onlyOpenNetworks: parseBool(query.onlyOpenNetworks, conservativeDefaults.onlyOpenNetworks),
    allowBridgeRoutes: parseBool(query.allowBridgeRoutes, conservativeDefaults.allowBridgeRoutes),
    minNetProfitPct: parseNumber(query.minNetProfitPct, conservativeDefaults.minNetProfitPct),
    debugMode: parseBool(query.debugMode, conservativeDefaults.debugMode),
  };
}
