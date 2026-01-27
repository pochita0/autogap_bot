import { Opportunity, FilterState } from '../types/opportunity';
import { getAllExclusionReasons, passesAllFilters } from '../domain/filters';

/**
 * Utility functions for debug mode.
 * These are thin wrappers around the centralized filter domain logic.
 */

/**
 * Returns a list of human-readable reasons why an opportunity is excluded by filters.
 * Returns empty array if the opportunity passes all filters.
 *
 * @deprecated Use getAllExclusionReasons from domain/filters.ts directly
 */
export function getExclusionReasons(opp: Opportunity, filters: FilterState): string[] {
  return getAllExclusionReasons(opp, filters);
}

/**
 * Returns true if the opportunity passes all filters (no exclusion reasons).
 *
 * @deprecated Use passesAllFilters from domain/filters.ts directly
 */
export function passesFilters(opp: Opportunity, filters: FilterState): boolean {
  return passesAllFilters(opp, filters);
}
