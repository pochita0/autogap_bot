import { Opportunity, FilterState } from '../types/opportunity';
import { PremiumOpportunity, PremiumOpportunitiesResponse } from '../types/premium';

/**
 * API Service for Gap Dashboard Backend
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Live-only mode - no fixtures
export type DataSource = 'live';

interface OpportunitiesResponse {
  dataset: 'live' | 'dummy' | 'golden';
  count: number;
  total?: number;
  filteredOut?: number;
  data: Opportunity[];
  appliedFilters?: Partial<FilterState>;
}

interface HealthResponse {
  ok: boolean;
  version: string;
  time: string;
}

/**
 * Fetch opportunities from backend API (live mode only)
 */
export async function fetchOpportunities(filters?: FilterState): Promise<{
  opportunities: Opportunity[];
  metadata: {
    count: number;
    total?: number;
    filteredOut?: number;
  };
}> {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      mode: 'live',
      limit: '200',
    });

    // Add filter parameters if provided
    if (filters) {
      // Data Quality Filters
      params.append('minVolumeUsd24h', filters.minVolumeUsd24h.toString());
      params.append('excludeIfVolumeMissing', filters.excludeIfVolumeMissing.toString());
      params.append('minPriceUsd', filters.minPriceUsd.toString());
      params.append('maxGapPct', filters.maxGapPct.toString());
      params.append('maxSpreadPct', filters.maxSpreadPct.toString());
      params.append('maxQuoteAgeSeconds', filters.maxQuoteAgeSeconds.toString());

      // Execution Feasibility Filters
      params.append('requireCommonOpenNetwork', filters.requireCommonOpenNetwork.toString());
      params.append('requireDepositAddress', filters.requireDepositAddress.toString());

      // Existing Filters
      params.append('minGapPct', filters.minGapPct.toString());
      params.append('minNetProfitPct', filters.minNetProfitPct.toString());
      params.append('debugMode', filters.debugMode.toString());

      // Strategy filters (not sent to backend, applied client-side for now)
      // Exchange exclusions (not sent to backend yet)
    }

    const url = `${API_BASE_URL}/opportunities?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OpportunitiesResponse = await response.json();
    return {
      opportunities: data.data,
      metadata: {
        count: data.count,
        total: data.total,
        filteredOut: data.filteredOut,
      },
    };
  } catch (error) {
    console.error('Failed to fetch opportunities:', error);
    throw error;
  }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check health:', error);
    throw error;
  }
}

/**
 * Get current data source (always live)
 */
export function getCurrentDataSource(): DataSource {
  return 'live';
}

/**
 * Set data source (no-op, always live)
 */
export function setDataSource(_source: DataSource): void {
  // No-op: always live mode
}

/**
 * Get data source display info
 */
export function getDataSourceInfo(): {
  source: DataSource;
  label: string;
  description: string;
} {
  return {
    source: 'live',
    label: 'Live Market Data',
    description: 'Real-time prices from 5 exchanges with Bithumb USDT/KRW FX rate',
  };
}

/**
 * Fetch premium opportunities (김프/역프) from backend API (live mode only)
 */
export async function fetchPremiumOpportunities(symbol?: string): Promise<PremiumOpportunity[]> {
  try {
    // Always use live mode
    const url = symbol
      ? `${API_BASE_URL}/premiums?mode=live&symbol=${symbol}`
      : `${API_BASE_URL}/premiums?mode=live`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PremiumOpportunitiesResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to fetch premium opportunities:', error);
    throw error;
  }
}
