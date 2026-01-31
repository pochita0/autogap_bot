/**
 * Symbol Matching Service
 *
 * Matches symbols between KRW and Global exchanges with alias support.
 * Handles pairwise intersection for multi-exchange premium calculations.
 */

import { ExchangeQuote } from '../types/premium';

/**
 * Alias rules for symbol mapping
 * Maps symbols that represent the same asset but have different names
 */
const ALIAS_RULES: Record<string, { krw: string; global: string }> = {
  FRAX: {
    krw: 'FXS',      // KRW exchanges list FXS
    global: 'FRAX',  // Global exchanges list FRAX
  },
};

/**
 * Symbol match result
 */
export interface SymbolMatch {
  canonicalSymbol: string;   // Canonical asset ID (e.g., 'FRAX')
  krwSymbol: string;         // Symbol on KRW exchange (e.g., 'FXS')
  globalSymbol: string;      // Symbol on global exchange (e.g., 'FRAX')
  krwQuote: ExchangeQuote;
  globalQuote: ExchangeQuote;
  isAlias: boolean;          // Whether this match uses an alias rule
}

export class SymbolMatchingService {
  /**
   * Get canonical symbol for a given symbol on a market type
   */
  private getCanonicalSymbol(symbol: string, marketType: 'KRW' | 'USDT'): string {
    // Check if this symbol is part of an alias rule
    for (const [canonicalId, rule] of Object.entries(ALIAS_RULES)) {
      if (marketType === 'KRW' && symbol === rule.krw) {
        return canonicalId;
      }
      if (marketType === 'USDT' && symbol === rule.global) {
        return canonicalId;
      }
    }
    // No alias applies, use symbol as-is
    return symbol;
  }

  /**
   * Find matching symbols between KRW and Global quotes (pairwise intersection)
   *
   * For each KRW symbol, try to find a matching Global symbol by:
   * 1. Direct match (same symbol name)
   * 2. Alias match (e.g., FXS ↔ FRAX)
   */
  public matchSymbols(
    krwQuotes: ExchangeQuote[],
    globalQuotes: ExchangeQuote[]
  ): SymbolMatch[] {
    const matches: SymbolMatch[] = [];

    // Build a map of canonical symbols to global quotes for fast lookup
    const globalByCanonical = new Map<string, ExchangeQuote>();
    for (const globalQuote of globalQuotes) {
      const canonical = this.getCanonicalSymbol(globalQuote.symbol, 'USDT');
      globalByCanonical.set(canonical, globalQuote);
    }

    // For each KRW quote, try to find a match
    for (const krwQuote of krwQuotes) {
      const krwCanonical = this.getCanonicalSymbol(krwQuote.symbol, 'KRW');

      // Look for matching global quote by canonical symbol
      const globalQuote = globalByCanonical.get(krwCanonical);
      if (globalQuote) {
        // Found a match!
        const isAlias = krwQuote.symbol !== globalQuote.symbol;

        matches.push({
          canonicalSymbol: krwCanonical,
          krwSymbol: krwQuote.symbol,
          globalSymbol: globalQuote.symbol,
          krwQuote,
          globalQuote,
          isAlias,
        });
      }
    }

    return matches;
  }

  /**
   * Filter matches by canonical symbols
   */
  public filterBySymbols(matches: SymbolMatch[], symbols: string[]): SymbolMatch[] {
    if (symbols.length === 0) {
      return matches;
    }

    const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));
    return matches.filter((match) => symbolSet.has(match.canonicalSymbol.toUpperCase()));
  }

  /**
   * Get all canonical symbols from matches
   */
  public getCanonicalSymbols(matches: SymbolMatch[]): string[] {
    return Array.from(new Set(matches.map((m) => m.canonicalSymbol)));
  }

  /**
   * Get alias information for a symbol match
   */
  public getAliasNote(match: SymbolMatch): string | undefined {
    if (!match.isAlias) {
      return undefined;
    }

    return `${match.krwSymbol} (KRW) ↔ ${match.globalSymbol} (Global)`;
  }
}
