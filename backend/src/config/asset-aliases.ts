/**
 * Asset Aliases Configuration
 *
 * Defines asset pairs where KRW exchange and global exchange
 * use different symbols for the same economic unit.
 *
 * Example: Bithumb lists FXS/KRW, while Binance uses FRAX/USDT
 */

export interface AssetAlias {
  displaySymbol: string;      // Symbol to display in UI (e.g., "FRAX")
  krwSymbol: string;          // Symbol used on KRW exchange (e.g., "FXS")
  globalSymbol: string;       // Symbol used on global exchange (e.g., "FRAX")
  krwExchange: string;        // KRW exchange (e.g., "BITHUMB")
  globalExchange: string;     // Global exchange (e.g., "BINANCE")
  note?: string;              // Optional explanation
}

/**
 * Asset alias mappings
 */
export const ASSET_ALIASES: AssetAlias[] = [
  {
    displaySymbol: 'FRAX',
    krwSymbol: 'FXS',
    globalSymbol: 'FRAX',
    krwExchange: 'BITHUMB',
    globalExchange: 'BINANCE',
    note: 'Bithumb lists FXS, Binance uses FRAX conversion path',
  },
];

/**
 * Get alias by KRW symbol
 */
export function getAliasByKrwSymbol(
  krwSymbol: string,
  krwExchange: string = 'BITHUMB'
): AssetAlias | undefined {
  return ASSET_ALIASES.find(
    (alias) =>
      alias.krwSymbol === krwSymbol &&
      alias.krwExchange === krwExchange
  );
}

/**
 * Get alias by global symbol
 */
export function getAliasByGlobalSymbol(
  globalSymbol: string,
  globalExchange: string = 'BINANCE'
): AssetAlias | undefined {
  return ASSET_ALIASES.find(
    (alias) =>
      alias.globalSymbol === globalSymbol &&
      alias.globalExchange === globalExchange
  );
}

/**
 * Get alias by display symbol
 */
export function getAliasByDisplaySymbol(displaySymbol: string): AssetAlias | undefined {
  return ASSET_ALIASES.find((alias) => alias.displaySymbol === displaySymbol);
}

/**
 * Check if a symbol pair is an alias pair
 */
export function isAliasPair(
  krwSymbol: string,
  globalSymbol: string,
  krwExchange: string = 'BITHUMB',
  globalExchange: string = 'BINANCE'
): boolean {
  return ASSET_ALIASES.some(
    (alias) =>
      alias.krwSymbol === krwSymbol &&
      alias.globalSymbol === globalSymbol &&
      alias.krwExchange === krwExchange &&
      alias.globalExchange === globalExchange
  );
}
