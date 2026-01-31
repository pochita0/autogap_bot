/**
 * Symbol Universe Builder
 * Builds the symbol universe from KRW/USDT market intersection
 * Plus manual alias mappings (e.g., FRAX)
 */

import { Quote } from '../connectors/BithumbQuoteConnector';

export interface SymbolPair {
  displaySymbol: string;
  krwSymbol: string;
  globalSymbol: string;
  isAlias: boolean;
  note?: string;
}

export class SymbolUniverseBuilder {
  /**
   * Manual alias mappings
   * Only FRAX for now (Bithumb FXS ↔ Binance FRAX)
   */
  private readonly MANUAL_ALIASES: SymbolPair[] = [
    {
      displaySymbol: 'FRAX',
      krwSymbol: 'FXS',
      globalSymbol: 'FRAX',
      isAlias: true,
      note: 'Bithumb FXS ↔ Binance FRAX convert path',
    },
  ];

  /**
   * Build symbol universe from quotes
   */
  buildUniverse(
    krwQuotes: Quote[],
    globalQuotes: Quote[],
    includeAlias: boolean = true
  ): SymbolPair[] {
    const pairs: SymbolPair[] = [];

    // Build symbol sets
    const krwSymbols = new Set(krwQuotes.map((q) => q.symbol));
    const globalSymbols = new Set(globalQuotes.map((q) => q.symbol));

    // Find intersection (normal pairs)
    for (const symbol of krwSymbols) {
      if (globalSymbols.has(symbol)) {
        pairs.push({
          displaySymbol: symbol,
          krwSymbol: symbol,
          globalSymbol: symbol,
          isAlias: false,
        });
      }
    }

    // Add manual aliases if requested
    if (includeAlias) {
      for (const alias of this.MANUAL_ALIASES) {
        // Check if both sides exist in quotes
        const krwExists = krwSymbols.has(alias.krwSymbol);
        const globalExists = globalSymbols.has(alias.globalSymbol);

        if (krwExists && globalExists) {
          pairs.push(alias);
        }
      }
    }

    return pairs;
  }

  /**
   * Get manual aliases list
   */
  getManualAliases(): SymbolPair[] {
    return [...this.MANUAL_ALIASES];
  }
}
