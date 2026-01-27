import { Opportunity } from '../types/opportunity';
import { PremiumOpportunity, PremiumOpportunitiesResponse } from '../types/premium';

/**
 * API Service for Gap Dashboard Backend
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type DataSource = 'dummy' | 'golden';

interface OpportunitiesResponse {
  dataset: DataSource;
  count: number;
  data: Opportunity[];
}

interface HealthResponse {
  ok: boolean;
  version: string;
  time: string;
}

/**
 * Fetch opportunities from backend API
 */
export async function fetchOpportunities(dataset: DataSource = 'dummy'): Promise<Opportunity[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/opportunities?dataset=${dataset}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OpportunitiesResponse = await response.json();
    return data.data;
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
 * Get current data source from localStorage
 */
export function getCurrentDataSource(): DataSource {
  const stored = localStorage.getItem('gap-dashboard-data-source');
  if (stored === 'golden' || stored === 'dummy') {
    return stored;
  }

  const envSource = import.meta.env.VITE_DATA_SOURCE;
  if (envSource === 'golden' || envSource === 'dummy') {
    return envSource;
  }

  return 'dummy';
}

/**
 * Set data source in localStorage
 */
export function setDataSource(source: DataSource): void {
  localStorage.setItem('gap-dashboard-data-source', source);
}

/**
 * Get data source display info
 */
export function getDataSourceInfo(source: DataSource): {
  source: DataSource;
  label: string;
  description: string;
} {
  const info = {
    dummy: {
      source: 'dummy' as DataSource,
      label: 'Dummy Data',
      description: 'Realistic sample data for UI development',
    },
    golden: {
      source: 'golden' as DataSource,
      label: 'Golden Fixtures',
      description: 'Edge case testing dataset with boundary conditions',
    },
  };

  return info[source];
}

/**
 * Fetch premium opportunities (김프/역프) from backend API
 */
export async function fetchPremiumOpportunities(symbol?: string): Promise<PremiumOpportunity[]> {
  try {
    const url = symbol
      ? `${API_BASE_URL}/premiums?symbol=${symbol}`
      : `${API_BASE_URL}/premiums`;

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
