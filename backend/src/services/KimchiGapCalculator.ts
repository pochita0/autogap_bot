/**
 * Kimchi Gap Calculator
 *
 * Calculates FX-normalized gaps for Kimchi Premium opportunities
 */

import { Opportunity } from '../types/opportunity';
import { FxRateService } from './FxRateService';

export class KimchiGapCalculator {
  constructor(private fxRateService: FxRateService) { }

  /**
   * Calculate FX-normalized gap for a Kimchi Premium opportunity
   * Converts all prices to USDT before calculating the gap
   */
  async calculateNormalizedGap(opportunity: Opportunity): Promise<{
    grossGapPct: number;
    netProfitPct: number;
    fxRate: number;
  }> {
    const { type, buyPrice, sellPrice } = opportunity;

    // Get current FX rate
    const fxRate = await this.fxRateService.getUsdtKrwRate();

    // Only process Kimchi Premium opportunities
    if (type !== 'KIMP_OVERSEAS_TO_BITHUMB' && type !== 'KIMP_BITHUMB_TO_OVERSEAS') {
      // Not a Kimchi Premium opportunity, return as-is
      return {
        grossGapPct: opportunity.grossGapPct,
        netProfitPct: opportunity.netProfitPct,
        fxRate,
      };
    }

    if (!sellPrice) {
      throw new Error('Sell price is required for Kimchi Premium gap calculation');
    }

    let buyPriceUsdt: number | undefined;
    let sellPriceUsdt: number | undefined;

    if (type === 'KIMP_OVERSEAS_TO_BITHUMB') {
      // Buy overseas in USDT, sell on Bithumb in KRW
      buyPriceUsdt = buyPrice; // Already in USDT
      sellPriceUsdt = sellPrice / fxRate; // Convert KRW to USDT
    } else if (type === 'KIMP_BITHUMB_TO_OVERSEAS') {
      // Buy on Bithumb in KRW, sell overseas in USDT
      buyPriceUsdt = buyPrice / fxRate; // Convert KRW to USDT
      sellPriceUsdt = sellPrice; // Already in USDT
    }

    if (sellPriceUsdt === undefined || buyPriceUsdt === undefined || buyPriceUsdt === 0) {
      throw new Error("Missing buy/sell price for gap calculation");
    }

    // Calculate gap percentage
    const grossGapPct = ((sellPriceUsdt - buyPriceUsdt) / buyPriceUsdt) * 100;

    // Estimate net profit (rough calculation)
    // Trading fees: ~0.1% on each side = 0.2%
    // Withdrawal fees: varies by coin, assume ~0.15%
    // Total costs: ~0.35%
    const estimatedCosts = 0.35;
    const netProfitPct = grossGapPct - estimatedCosts;

    return {
      grossGapPct: Number(grossGapPct.toFixed(2)),
      netProfitPct: Number(netProfitPct.toFixed(2)),
      fxRate: Number(fxRate.toFixed(2)),
    };
  }

  /**
   * Enrich a Kimchi Premium opportunity with FX-normalized gaps
   */
  async enrichWithFxGap(opportunity: Opportunity): Promise<Opportunity> {
    const { type } = opportunity;

    // Only process Kimchi Premium opportunities
    if (type !== 'KIMP_OVERSEAS_TO_BITHUMB' && type !== 'KIMP_BITHUMB_TO_OVERSEAS') {
      return opportunity;
    }

    try {
      const { grossGapPct, netProfitPct, fxRate } = await this.calculateNormalizedGap(opportunity);

      return {
        ...opportunity,
        grossGapPct,
        netProfitPct,
        fx: {
          rateRef: 'USDT/KRW',
          rateValue: fxRate,
          source: 'FxRateService',
        },
      };
    } catch (error) {
      console.error('Failed to calculate FX-normalized gap:', error);
      return opportunity;
    }
  }

  /**
   * Enrich multiple opportunities with FX-normalized gaps
   */
  async enrichOpportunitiesWithFxGaps(opportunities: Opportunity[]): Promise<Opportunity[]> {
    return Promise.all(opportunities.map((opp) => this.enrichWithFxGap(opp)));
  }
}
