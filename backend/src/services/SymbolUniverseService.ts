/**
 * Symbol Universe Service
 *
 * Fetches and normalizes symbol lists from all exchanges to produce a canonical
 * universe of tradeable assets across KRW and USDT markets.
 */

import {
  CanonicalAsset,
  Exchange,
  ExchangeSymbol,
  UniverseResult,
  UniverseStats,
  MarketInfo,
} from '../types/symbolUniverse';
import {
  normalizeSymbol,
  filterKRWMarkets,
  filterUSDTMarkets,
} from '../utils/SymbolNormalization';
import { BithumbQuoteConnector } from '../connectors/BithumbQuoteConnector';
import { UpbitQuoteConnector } from '../connectors/UpbitQuoteConnector';
import { BinanceQuoteConnector } from '../connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from '../connectors/OKXQuoteConnector';
import { BybitQuoteConnector } from '../connectors/BybitQuoteConnector';

/**
 * Alias rules for symbol mapping
 * Maps KRW exchange symbols to global exchange symbols
 */
const ALIAS_RULES: Record<string, { krw: string; global: string }> = {
  FRAX: {
    krw: 'FXS',      // Bithumb lists FXS in KRW market
    global: 'FRAX',  // Global exchanges list FRAX in USDT market
  },
};

/**
 * Get canonical asset ID for a symbol
 * Applies alias rules if necessary
 */
function getCanonicalAssetId(symbol: string, marketType: 'KRW' | 'USDT'): string {
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
 * Get actual symbol for a canonical asset ID on a specific market
 */
function getActualSymbol(canonicalId: string, marketType: 'KRW' | 'USDT'): string {
  const rule = ALIAS_RULES[canonicalId];
  if (rule) {
    return marketType === 'KRW' ? rule.krw : rule.global;
  }
  return canonicalId;
}

export class SymbolUniverseService {
  private bithumbConnector: BithumbQuoteConnector;
  private upbitConnector: UpbitQuoteConnector;
  private binanceConnector: BinanceQuoteConnector;
  private okxConnector: OKXQuoteConnector;
  private bybitConnector: BybitQuoteConnector;

  constructor(
    bithumbConnector: BithumbQuoteConnector,
    upbitConnector: UpbitQuoteConnector,
    binanceConnector: BinanceQuoteConnector,
    okxConnector: OKXQuoteConnector,
    bybitConnector: BybitQuoteConnector
  ) {
    this.bithumbConnector = bithumbConnector;
    this.upbitConnector = upbitConnector;
    this.binanceConnector = binanceConnector;
    this.okxConnector = okxConnector;
    this.bybitConnector = bybitConnector;
  }

  /**
   * Build the complete symbol universe
   */
  async buildUniverse(): Promise<UniverseResult> {
    const startTime = Date.now();

    // Fetch markets from all exchanges in parallel
    const [bithumbMarkets, upbitMarkets, binanceMarkets, okxMarkets, bybitMarkets] =
      await Promise.all([
        this.fetchExchangeMarkets('BITHUMB'),
        this.fetchExchangeMarkets('UPBIT'),
        this.fetchExchangeMarkets('BINANCE'),
        this.fetchExchangeMarkets('OKX'),
        this.fetchExchangeMarkets('BYBIT'),
      ]);

    // Combine all markets
    const allMarkets = [
      ...bithumbMarkets,
      ...upbitMarkets,
      ...binanceMarkets,
      ...okxMarkets,
      ...bybitMarkets,
    ];

    // Separate KRW and USDT markets
    const krwMarkets = filterKRWMarkets(allMarkets);
    const usdtMarkets = filterUSDTMarkets(allMarkets);

    // Build canonical assets
    const assets = this.buildCanonicalAssets(krwMarkets, usdtMarkets);

    // Calculate statistics
    const stats = this.calculateStats(allMarkets, assets);

    const endTime = Date.now();
    console.log(`Universe built in ${endTime - startTime}ms`);

    return {
      assets,
      stats,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch and normalize markets from a single exchange
   */
  private async fetchExchangeMarkets(exchange: Exchange): Promise<ExchangeSymbol[]> {
    try {
      let markets: MarketInfo[] = [];

      switch (exchange) {
        case 'BITHUMB':
          markets = await this.bithumbConnector.fetchMarkets();
          break;
        case 'UPBIT':
          markets = await this.upbitConnector.fetchMarkets();
          break;
        case 'BINANCE':
          markets = await this.binanceConnector.fetchMarkets();
          break;
        case 'OKX':
          markets = await this.okxConnector.fetchMarkets();
          break;
        case 'BYBIT':
          markets = await this.bybitConnector.fetchMarkets();
          break;
      }

      // Normalize each market to ExchangeSymbol
      const normalized: ExchangeSymbol[] = [];
      for (const market of markets) {
        // Only include active markets
        if (market.active === false) {
          continue;
        }

        normalized.push({
          exchange,
          base: market.base,
          quote: market.quote,
          raw: market.symbol,
        });
      }

      console.log(`Fetched ${normalized.length} markets from ${exchange}`);
      return normalized;
    } catch (error) {
      console.error(`Failed to fetch markets from ${exchange}:`, error);
      return [];
    }
  }

  /**
   * Build canonical assets from KRW and USDT markets
   */
  private buildCanonicalAssets(
    krwMarkets: ExchangeSymbol[],
    usdtMarkets: ExchangeSymbol[]
  ): CanonicalAsset[] {
    // Group by canonical asset ID
    const assetMap = new Map<string, CanonicalAsset>();

    // Process KRW markets
    for (const market of krwMarkets) {
      const canonicalId = getCanonicalAssetId(market.base, 'KRW');

      if (!assetMap.has(canonicalId)) {
        assetMap.set(canonicalId, {
          assetId: canonicalId,
          krwSymbols: {
            BITHUMB: [],
            UPBIT: [],
            BINANCE: [],
            OKX: [],
            BYBIT: [],
          },
          globalSymbols: {
            BITHUMB: [],
            UPBIT: [],
            BINANCE: [],
            OKX: [],
            BYBIT: [],
          },
        });
      }

      const asset = assetMap.get(canonicalId)!;
      if (!asset.krwSymbols[market.exchange].includes(market.base)) {
        asset.krwSymbols[market.exchange].push(market.base);
      }
    }

    // Process USDT markets
    for (const market of usdtMarkets) {
      const canonicalId = getCanonicalAssetId(market.base, 'USDT');

      if (!assetMap.has(canonicalId)) {
        assetMap.set(canonicalId, {
          assetId: canonicalId,
          krwSymbols: {
            BITHUMB: [],
            UPBIT: [],
            BINANCE: [],
            OKX: [],
            BYBIT: [],
          },
          globalSymbols: {
            BITHUMB: [],
            UPBIT: [],
            BINANCE: [],
            OKX: [],
            BYBIT: [],
          },
        });
      }

      const asset = assetMap.get(canonicalId)!;
      if (!asset.globalSymbols[market.exchange].includes(market.base)) {
        asset.globalSymbols[market.exchange].push(market.base);
      }
    }

    // Convert map to array
    return Array.from(assetMap.values());
  }

  /**
   * Calculate statistics about the universe
   */
  private calculateStats(allMarkets: ExchangeSymbol[], assets: CanonicalAsset[]): UniverseStats {
    // Count per exchange
    const perExchangeCounts: Record<Exchange, { krw: number; usdt: number }> = {
      BITHUMB: { krw: 0, usdt: 0 },
      UPBIT: { krw: 0, usdt: 0 },
      BINANCE: { krw: 0, usdt: 0 },
      OKX: { krw: 0, usdt: 0 },
      BYBIT: { krw: 0, usdt: 0 },
    };

    for (const market of allMarkets) {
      if (market.quote === 'KRW') {
        perExchangeCounts[market.exchange].krw++;
      } else if (market.quote === 'USDT') {
        perExchangeCounts[market.exchange].usdt++;
      }
    }

    // Count assets that have both KRW and USDT markets
    let matchedCount = 0;
    for (const asset of assets) {
      const hasKrw = Object.values(asset.krwSymbols).some((symbols) => symbols.length > 0);
      const hasUsdt = Object.values(asset.globalSymbols).some((symbols) => symbols.length > 0);
      if (hasKrw && hasUsdt) {
        matchedCount++;
      }
    }

    return {
      perExchangeCounts,
      canonicalCount: assets.length,
      matchedCount,
      generatedAt: new Date().toISOString(),
    };
  }
}
