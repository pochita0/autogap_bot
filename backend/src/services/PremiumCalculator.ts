/**
 * Premium Calculator Service
 *
 * Calculates Kimchi Premium (김프) and Reverse Premium (역프) opportunities
 * Supports both normal pairs (same symbol) and alias pairs (different symbols)
 */

import { PremiumOpportunity, ExchangeQuote } from '../types/premium';
import { FxRateService } from './FxRateService';
import { ASSET_ALIASES, isAliasPair, getAliasByKrwSymbol } from '../config/asset-aliases';
import { SymbolMatchingService } from './SymbolMatchingService';

export class PremiumCalculator {
  private symbolMatchingService: SymbolMatchingService;

  constructor(private fxRateService: FxRateService) {
    this.symbolMatchingService = new SymbolMatchingService();
  }

  /**
   * Calculate both Kimchi and Reverse Premium opportunities for a symbol
   * Supports both normal pairs (same symbol) and alias pairs (different symbols)
   * @param includeNegative If true, include opportunities with negative gaps
   */
  async calculatePremiumOpportunities(
    krwQuote: ExchangeQuote,
    globalQuote: ExchangeQuote,
    includeNegative: boolean = false
  ): Promise<PremiumOpportunity[]> {
    const opportunities: PremiumOpportunity[] = [];

    // Get FX rate with bid/ask
    const fxRate = await this.fxRateService.getUsdtKrwRate();

    // Determine if this is an alias pair and get display symbol
    const isAlias = isAliasPair(
      krwQuote.symbol,
      globalQuote.symbol,
      krwQuote.exchange,
      globalQuote.exchange
    );
    const aliasConfig = isAlias ? getAliasByKrwSymbol(krwQuote.symbol, krwQuote.exchange) : undefined;
    const displaySymbol = aliasConfig?.displaySymbol || krwQuote.symbol;
    const aliasNote = aliasConfig?.note;

    // Convert global prices to KRW using conservative rates
    // Use fxBid for globalBid (conservative for selling global)
    // Use fxAsk for globalAsk (conservative for buying global)
    const globalBidKRW = globalQuote.bid * fxRate.bid;
    const globalAskKRW = globalQuote.ask * fxRate.ask;

    // Calculate Kimchi Premium (김프)
    // Direction: Buy global -> Sell KRW
    // Gap: ((krwBid - globalAskKRW) / globalAskKRW) * 100
    const kimchiGapPct = ((krwQuote.bid - globalAskKRW) / globalAskKRW) * 100;

    if (kimchiGapPct > 0 || includeNegative) {
      const kimchiOpp: PremiumOpportunity = {
        id: `kimchi-${displaySymbol.toLowerCase()}-${krwQuote.exchange.toLowerCase()}-${globalQuote.exchange.toLowerCase()}`,
        kind: 'KIMCHI',
        canonicalSymbol: displaySymbol,
        baseSymbol: krwQuote.symbol,  // Deprecated, kept for backwards compatibility
        displaySymbol: displaySymbol,
        krwSymbol: krwQuote.symbol,
        globalSymbol: globalQuote.symbol,
        krwExchange: krwQuote.exchange,
        globalExchange: globalQuote.exchange,
        krwMarket: krwQuote.market,
        globalMarket: globalQuote.market,
        krwBid: krwQuote.bid,
        krwAsk: krwQuote.ask,
        globalBid: globalQuote.bid,
        globalAsk: globalQuote.ask,
        globalBidKRW: Number(globalBidKRW.toFixed(2)),
        globalAskKRW: Number(globalAskKRW.toFixed(2)),
        usdtKrw: Number(fxRate.mid.toFixed(2)),
        fxRateBid: Number(fxRate.bid.toFixed(2)),
        fxRateAsk: Number(fxRate.ask.toFixed(2)),
        fxRateMid: Number(fxRate.mid.toFixed(2)),
        fxSource: fxRate.source,
        fxTimestamp: fxRate.timestamp,
        fxStale: fxRate.stale,
        gapPct: Number(kimchiGapPct.toFixed(2)),
        direction: 'GLOBAL_TO_KRW',
        updatedAt: new Date().toISOString(),
        isAliasPair: isAlias,
        aliasNote: aliasNote,
        calculation: {
          usdtBid: globalQuote.bid,
          usdtAsk: globalQuote.ask,
          formula: `((krwBid - globalAskKRW) / globalAskKRW) * 100 = ((${krwQuote.bid} - ${globalAskKRW.toFixed(2)}) / ${globalAskKRW.toFixed(2)}) * 100 = ${kimchiGapPct.toFixed(2)}%`,
        },
      };
      opportunities.push(kimchiOpp);
    }

    // Calculate Reverse Premium (역프)
    // Direction: Buy KRW -> Sell global
    // Gap: ((globalBidKRW - krwAsk) / krwAsk) * 100
    const reverseGapPct = ((globalBidKRW - krwQuote.ask) / krwQuote.ask) * 100;

    if (reverseGapPct > 0 || includeNegative) {
      const reverseOpp: PremiumOpportunity = {
        id: `reverse-${displaySymbol.toLowerCase()}-${krwQuote.exchange.toLowerCase()}-${globalQuote.exchange.toLowerCase()}`,
        kind: 'REVERSE',
        canonicalSymbol: displaySymbol,
        baseSymbol: krwQuote.symbol,  // Deprecated, kept for backwards compatibility
        displaySymbol: displaySymbol,
        krwSymbol: krwQuote.symbol,
        globalSymbol: globalQuote.symbol,
        krwExchange: krwQuote.exchange,
        globalExchange: globalQuote.exchange,
        krwMarket: krwQuote.market,
        globalMarket: globalQuote.market,
        krwBid: krwQuote.bid,
        krwAsk: krwQuote.ask,
        globalBid: globalQuote.bid,
        globalAsk: globalQuote.ask,
        globalBidKRW: Number(globalBidKRW.toFixed(2)),
        globalAskKRW: Number(globalAskKRW.toFixed(2)),
        usdtKrw: Number(fxRate.mid.toFixed(2)),
        fxRateBid: Number(fxRate.bid.toFixed(2)),
        fxRateAsk: Number(fxRate.ask.toFixed(2)),
        fxRateMid: Number(fxRate.mid.toFixed(2)),
        fxSource: fxRate.source,
        fxTimestamp: fxRate.timestamp,
        fxStale: fxRate.stale,
        gapPct: Number(reverseGapPct.toFixed(2)),
        direction: 'KRW_TO_GLOBAL',
        updatedAt: new Date().toISOString(),
        isAliasPair: isAlias,
        aliasNote: aliasNote,
        calculation: {
          usdtBid: globalQuote.bid,
          usdtAsk: globalQuote.ask,
          formula: `((globalBidKRW - krwAsk) / krwAsk) * 100 = ((${globalBidKRW.toFixed(2)} - ${krwQuote.ask}) / ${krwQuote.ask}) * 100 = ${reverseGapPct.toFixed(2)}%`,
        },
      };
      opportunities.push(reverseOpp);
    }

    return opportunities;
  }

  /**
   * Calculate all premium opportunities from quote lists
   * Supports both normal pairs (same symbol) and alias pairs (different symbols)
   */
  async calculateAllPremiumOpportunities(
    krwQuotes: ExchangeQuote[],
    globalQuotes: ExchangeQuote[],
    limit: number = 100
  ): Promise<PremiumOpportunity[]> {
    const allOpportunities: PremiumOpportunity[] = [];

    // Match quotes by symbol (normal pairs)
    for (const krwQuote of krwQuotes) {
      const globalQuote = globalQuotes.find((q) => q.symbol === krwQuote.symbol);

      if (globalQuote) {
        const opportunities = await this.calculatePremiumOpportunities(krwQuote, globalQuote);
        allOpportunities.push(...opportunities);
      }
    }

    // Match alias pairs
    for (const alias of ASSET_ALIASES) {
      const krwQuote = krwQuotes.find(
        (q) => q.symbol === alias.krwSymbol && q.exchange === alias.krwExchange
      );
      const globalQuote = globalQuotes.find(
        (q) => q.symbol === alias.globalSymbol && q.exchange === alias.globalExchange
      );

      if (krwQuote && globalQuote) {
        const opportunities = await this.calculatePremiumOpportunities(krwQuote, globalQuote);
        allOpportunities.push(...opportunities);
      }
    }

    // Sort by gap % descending
    allOpportunities.sort((a, b) => b.gapPct - a.gapPct);

    // Apply limit
    return allOpportunities.slice(0, limit);
  }

  /**
   * Get premium opportunity details with FX rate metadata
   */
  async getPremiumOpportunitiesWithMetadata(
    krwQuotes: ExchangeQuote[],
    globalQuotes: ExchangeQuote[],
    limit: number = 100
  ): Promise<{
    count: number;
    fxRate: number;
    fxRateBid: number;
    fxRateAsk: number;
    fxSource: string;
    fxRateTimestamp: string;
    fxStale: boolean;
    data: PremiumOpportunity[];
  }> {
    const opportunities = await this.calculateAllPremiumOpportunities(krwQuotes, globalQuotes, limit);
    const fxRateData = await this.fxRateService.getUsdtKrwRate();

    return {
      count: opportunities.length,
      fxRate: fxRateData.mid,
      fxRateBid: fxRateData.bid,
      fxRateAsk: fxRateData.ask,
      fxSource: fxRateData.source,
      fxRateTimestamp: fxRateData.timestamp,
      fxStale: fxRateData.stale,
      data: opportunities,
    };
  }

  /**
   * Calculate premiums for multi-exchange pairs
   * Computes opportunities for all KRW-Global exchange combinations
   *
   * @param krwQuotesByExchange Map of KRW quotes grouped by exchange
   * @param globalQuotesByExchange Map of global quotes grouped by exchange
   * @param includeNegative Include opportunities with negative gaps
   * @param limit Maximum number of opportunities to return
   * @param offset Offset for pagination
   */
  async calculateMultiExchangePremiums(
    krwQuotesByExchange: Map<string, ExchangeQuote[]>,
    globalQuotesByExchange: Map<string, ExchangeQuote[]>,
    includeNegative: boolean = true,
    limit: number = 200,
    offset: number = 0
  ): Promise<PremiumOpportunity[]> {
    const allOpportunities: PremiumOpportunity[] = [];

    // Get FX rate once for all calculations
    const fxRate = await this.fxRateService.getUsdtKrwRate();

    // For each KRW exchange paired with each Global exchange
    for (const [krwExchange, krwQuotes] of krwQuotesByExchange.entries()) {
      for (const [globalExchange, globalQuotes] of globalQuotesByExchange.entries()) {
        // Match symbols using pairwise intersection with alias support
        const matches = this.symbolMatchingService.matchSymbols(krwQuotes, globalQuotes);

        // For each matched symbol, calculate BOTH KIMCHI and REVERSE
        for (const match of matches) {
          const { canonicalSymbol, krwSymbol, globalSymbol, krwQuote, globalQuote, isAlias } = match;

          // Convert global prices to KRW using conservative rates
          const globalBidKRW = globalQuote.bid * fxRate.bid;
          const globalAskKRW = globalQuote.ask * fxRate.ask;

          // Calculate Kimchi Premium
          const kimchiGapPct = ((krwQuote.bid - globalAskKRW) / globalAskKRW) * 100;

          const kimchiOpp: PremiumOpportunity = {
            id: `kimchi-${canonicalSymbol.toLowerCase()}-${krwExchange.toLowerCase()}-${globalExchange.toLowerCase()}`,
            kind: 'KIMCHI',
            canonicalSymbol,
            baseSymbol: krwSymbol,
            displaySymbol: canonicalSymbol,
            krwSymbol,
            globalSymbol,
            krwExchange,
            globalExchange,
            krwMarket: krwQuote.market,
            globalMarket: globalQuote.market,
            krwBid: krwQuote.bid,
            krwAsk: krwQuote.ask,
            globalBid: globalQuote.bid,
            globalAsk: globalQuote.ask,
            globalBidKRW: Number(globalBidKRW.toFixed(2)),
            globalAskKRW: Number(globalAskKRW.toFixed(2)),
            usdtKrw: Number(fxRate.mid.toFixed(2)),
            fxRateBid: Number(fxRate.bid.toFixed(2)),
            fxRateAsk: Number(fxRate.ask.toFixed(2)),
            fxRateMid: Number(fxRate.mid.toFixed(2)),
            fxSource: fxRate.source,
            fxTimestamp: fxRate.timestamp,
            fxStale: fxRate.stale,
            gapPct: Number(kimchiGapPct.toFixed(2)),
            direction: 'GLOBAL_TO_KRW',
            updatedAt: new Date().toISOString(),
            isAliasPair: isAlias,
            aliasNote: isAlias ? this.symbolMatchingService.getAliasNote(match) : undefined,
            calculation: {
              usdtBid: globalQuote.bid,
              usdtAsk: globalQuote.ask,
              formula: `((krwBid - globalAskKRW) / globalAskKRW) * 100`,
            },
          };
          allOpportunities.push(kimchiOpp);

          // Calculate Reverse Premium
          const reverseGapPct = ((globalBidKRW - krwQuote.ask) / krwQuote.ask) * 100;

          const reverseOpp: PremiumOpportunity = {
            id: `reverse-${canonicalSymbol.toLowerCase()}-${krwExchange.toLowerCase()}-${globalExchange.toLowerCase()}`,
            kind: 'REVERSE',
            canonicalSymbol,
            baseSymbol: krwSymbol,
            displaySymbol: canonicalSymbol,
            krwSymbol,
            globalSymbol,
            krwExchange,
            globalExchange,
            krwMarket: krwQuote.market,
            globalMarket: globalQuote.market,
            krwBid: krwQuote.bid,
            krwAsk: krwQuote.ask,
            globalBid: globalQuote.bid,
            globalAsk: globalQuote.ask,
            globalBidKRW: Number(globalBidKRW.toFixed(2)),
            globalAskKRW: Number(globalAskKRW.toFixed(2)),
            usdtKrw: Number(fxRate.mid.toFixed(2)),
            fxRateBid: Number(fxRate.bid.toFixed(2)),
            fxRateAsk: Number(fxRate.ask.toFixed(2)),
            fxRateMid: Number(fxRate.mid.toFixed(2)),
            fxSource: fxRate.source,
            fxTimestamp: fxRate.timestamp,
            fxStale: fxRate.stale,
            gapPct: Number(reverseGapPct.toFixed(2)),
            direction: 'KRW_TO_GLOBAL',
            updatedAt: new Date().toISOString(),
            isAliasPair: isAlias,
            aliasNote: isAlias ? this.symbolMatchingService.getAliasNote(match) : undefined,
            calculation: {
              usdtBid: globalQuote.bid,
              usdtAsk: globalQuote.ask,
              formula: `((globalBidKRW - krwAsk) / krwAsk) * 100`,
            },
          };
          allOpportunities.push(reverseOpp);
        }
      }
    }

    // Filter by includeNegative
    const filtered = includeNegative
      ? allOpportunities
      : allOpportunities.filter((opp) => opp.gapPct > 0);

    // Sort by absolute gap % descending
    filtered.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

    // Apply pagination
    return filtered.slice(offset, offset + limit);
  }
}
