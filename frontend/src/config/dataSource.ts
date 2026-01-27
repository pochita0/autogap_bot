import { Opportunity } from '../types/opportunity';
import { dummyOpportunities } from '../data/dummyOpportunities';
import { goldenOpportunities } from '../fixtures/opportunities.golden';

/**
 * Data source configuration
 *
 * Control which dataset to use via environment variable or localStorage
 */

export type DataSource = 'dummy' | 'golden';

const DEFAULT_DATA_SOURCE: DataSource = 'dummy';

/**
 * Get the current data source from localStorage or environment
 */
export function getCurrentDataSource(): DataSource {
  // Check localStorage first (runtime override)
  const stored = localStorage.getItem('gap-dashboard-data-source');
  if (stored === 'golden' || stored === 'dummy') {
    return stored;
  }

  // Check environment variable (build-time config)
  const envSource = import.meta.env.VITE_DATA_SOURCE;
  if (envSource === 'golden' || envSource === 'dummy') {
    return envSource;
  }

  return DEFAULT_DATA_SOURCE;
}

/**
 * Set the data source (persisted to localStorage)
 */
export function setDataSource(source: DataSource): void {
  localStorage.setItem('gap-dashboard-data-source', source);
}

/**
 * Get opportunities based on current data source
 */
export function getOpportunities(): Opportunity[] {
  const source = getCurrentDataSource();

  switch (source) {
    case 'golden':
      return goldenOpportunities;
    case 'dummy':
    default:
      return dummyOpportunities;
  }
}

/**
 * Get data source display info
 */
export function getDataSourceInfo(): {
  source: DataSource;
  label: string;
  count: number;
  description: string;
} {
  const source = getCurrentDataSource();

  const info = {
    dummy: {
      source: 'dummy' as DataSource,
      label: 'Dummy Data',
      count: dummyOpportunities.length,
      description: 'Realistic sample data for UI development',
    },
    golden: {
      source: 'golden' as DataSource,
      label: 'Golden Fixtures',
      count: goldenOpportunities.length,
      description: 'Edge case testing dataset with boundary conditions',
    },
  };

  return info[source];
}
