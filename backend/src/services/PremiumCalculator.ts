/**
 * Premium Calculator Service
 *
 * Calculates Kimchi Premium (김프) and Reverse Premium (역프) opportunities
 * Supports both normal pairs (same symbol) and alias pairs (different symbols)
 */

import { PremiumOpportunity, ExchangeQuote } from '../types/premium';
import { FxRateService } from './FxRateService';
import { ASSET_ALIASES, isAliasPair, getAliasByKrwSymbol } from '../config/asset-aliases';

export class PremiumCalculator {
  constructor(private fxRateService: FxRateService) {}

  /**
   * Calculate both Kimchi and Reverse Premium opportunities for a symbol
   * Supports both normal pairs (same symbol) and alias pairs (different symbols)
   */
  async calculatePremiumOpportunities(
    krwQuote: ExchangeQuote,
    globalQuote: ExchangeQuote
  ): Promise<PremiumOpportunity[]> {
    const opportunities: PremiumOpportunity[] = [];

    // Get FX rate
    const usdtKrw = await this.fxRateService.getUsdtKrwRate();

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

    // Convert global prices to KRW
    const globalBidKRW = globalQuote.bid * usdtKrw;
    const globalAskKRW = globalQuote.ask * usdtKrw;

    // Calculate Kimchi Premium (김프)
    // Direction: Buy global -> Sell KRW
    // Gap: ((krwBid - globalAskKRW) / globalAskKRW) * 100
    const kimchiGapPct = ((krwQuote.bid - globalAskKRW) / globalAskKRW) * 100;

    if (kimchiGapPct > 0) {
      const kimchiOpp: PremiumOpportunity = {
        id: `kimchi-${displaySymbol.toLowerCase()}-${krwQuote.exchange.toLowerCase()}-${globalQuote.exchange.toLowerCase()}`,
        kind: 'KIMCHI',
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
        globalBidKRW: Number(globalBidKRW.toFixed(2)),
        globalAskKRW: Number(globalAskKRW.toFixed(2)),
        usdtKrw: Number(usdtKrw.toFixed(2)),
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

    if (reverseGapPct > 0) {
      const reverseOpp: PremiumOpportunity = {
        id: `reverse-${displaySymbol.toLowerCase()}-${krwQuote.exchange.toLowerCase()}-${globalQuote.exchange.toLowerCase()}`,
        kind: 'REVERSE',
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
        globalBidKRW: Number(globalBidKRW.toFixed(2)),
        globalAskKRW: Number(globalAskKRW.toFixed(2)),
        usdtKrw: Number(usdtKrw.toFixed(2)),
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
    globalQuotes: ExchangeQuote[]
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

    return allOpportunities;
  }

  /**
   * Get premium opportunity details with FX rate metadata
   */
  async getPremiumOpportunitiesWithMetadata(
    krwQuotes: ExchangeQuote[],
    globalQuotes: ExchangeQuote[]
  ): Promise<{
    count: number;
    fxRate: number;
    fxRateTimestamp: string;
    data: PremiumOpportunity[];
  }> {
    const opportunities = await this.calculateAllPremiumOpportunities(krwQuotes, globalQuotes);
    const fxRateData = await this.fxRateService.getUsdtKrwRateWithMetadata();

    return {
      count: opportunities.length,
      fxRate: fxRateData.rate,
      fxRateTimestamp: fxRateData.timestamp,
      data: opportunities,
    };
  }
}
