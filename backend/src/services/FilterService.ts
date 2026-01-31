/**
 * Filter Service
 * Applies data quality and execution feasibility filters to opportunities
 */

import { Opportunity } from '../types/opportunity';
import { Quote } from '../connectors/BithumbQuoteConnector';
import {
  FilterSettings,
  FilterExclusion,
  FilterExclusionCode,
} from '../types/filters';
import { AddressBookService } from './AddressBookService';

export class FilterService {
  constructor(private addressBookService?: AddressBookService) {}

  /**
   * Apply all filters to a list of opportunities
   * In debug mode, returns all opportunities with exclusion reasons attached
   * In normal mode, returns only opportunities that pass all filters
   */
  applyFilters(
    opportunities: Opportunity[],
    filters: FilterSettings,
    quotesBySymbol: Map<string, { buy: Quote; sell: Quote }>
  ): Opportunity[] {
    const results: Opportunity[] = [];

    for (const opp of opportunities) {
      const exclusions: FilterExclusion[] = [];

      // Get the quotes for this opportunity
      const quotes = quotesBySymbol.get(opp.base);

      // Apply data quality filters
      this.applyVolumeFilter(opp, quotes, filters, exclusions);
      this.applyPriceAnomalyFilters(opp, quotes, filters, exclusions);
      this.applyQuoteFreshnessFilter(opp, quotes, filters, exclusions);

      // Apply strategy type filters
      this.applyStrategyTypeFilters(opp, filters, exclusions);

      // Apply gap filters
      this.applyGapFilters(opp, filters, exclusions);

      // Apply execution feasibility filters
      this.applyWalletIntersectionFilter(opp, filters, exclusions);
      this.applyDepositAddressFilter(opp, filters, exclusions);

      // Apply exchange exclusions
      this.applyExchangeExclusions(opp, filters, exclusions);

      // In debug mode, include all opportunities with exclusion reasons
      if (filters.debugMode) {
        opp.filter_exclusions = exclusions;
        results.push(opp);
      } else {
        // In normal mode, only include opportunities that pass all filters
        if (exclusions.length === 0) {
          results.push(opp);
        }
      }
    }

    return results;
  }

  /**
   * Apply volume threshold filters
   */
  private applyVolumeFilter(
    opp: Opportunity,
    quotes: { buy: Quote; sell: Quote } | undefined,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    // Check if volume data is missing
    const buyVolume = quotes?.buy.volume24hUsd;
    const sellVolume = quotes?.sell.volume24hUsd;

    const volumeMissing =
      buyVolume === undefined ||
      buyVolume === null ||
      sellVolume === undefined ||
      sellVolume === null;

    if (volumeMissing && filters.excludeIfVolumeMissing) {
      exclusions.push({
        reason: 'Volume data missing and excludeIfVolumeMissing is enabled',
        code: 'VOLUME_MISSING',
      });
      return;
    }

    // If volume exists, check against threshold
    if (!volumeMissing && filters.minVolumeUsd24h > 0) {
      const minVolume = Math.min(buyVolume!, sellVolume!);
      if (minVolume < filters.minVolumeUsd24h) {
        exclusions.push({
          reason: `Volume ${minVolume.toFixed(2)} USD < ${filters.minVolumeUsd24h} USD threshold`,
          code: 'VOLUME_TOO_LOW',
          details: `Buy: ${buyVolume?.toFixed(2)} USD, Sell: ${sellVolume?.toFixed(2)} USD`,
        });
      }
    }
  }

  /**
   * Apply price anomaly filters (min price, max gap, max spread)
   */
  private applyPriceAnomalyFilters(
    opp: Opportunity,
    quotes: { buy: Quote; sell: Quote } | undefined,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    // Min price filter
    if (filters.minPriceUsd > 0) {
      if (opp.buyPrice < filters.minPriceUsd || (opp.sellPrice && opp.sellPrice < filters.minPriceUsd)) {
        exclusions.push({
          reason: `Price below ${filters.minPriceUsd} USD threshold`,
          code: 'PRICE_TOO_LOW',
          details: `Buy: ${opp.buyPrice.toFixed(4)} USD, Sell: ${opp.sellPrice?.toFixed(4)} USD`,
        });
      }
    }

    // Max gap filter (to filter outliers)
    if (filters.maxGapPct > 0) {
      if (Math.abs(opp.grossGapPct) > filters.maxGapPct) {
        exclusions.push({
          reason: `Gap ${opp.grossGapPct.toFixed(2)}% exceeds ${filters.maxGapPct}% threshold`,
          code: 'GAP_TOO_HIGH',
        });
      }
    }

    // Max spread filter
    if (filters.maxSpreadPct > 0 && quotes) {
      const buySpread = ((quotes.buy.ask - quotes.buy.bid) / ((quotes.buy.ask + quotes.buy.bid) / 2)) * 100;
      const sellSpread = quotes.sell ? ((quotes.sell.ask - quotes.sell.bid) / ((quotes.sell.ask + quotes.sell.bid) / 2)) * 100 : 0;

      if (buySpread > filters.maxSpreadPct || sellSpread > filters.maxSpreadPct) {
        exclusions.push({
          reason: `Spread exceeds ${filters.maxSpreadPct}% threshold`,
          code: 'SPREAD_TOO_HIGH',
          details: `Buy spread: ${buySpread.toFixed(2)}%, Sell spread: ${sellSpread.toFixed(2)}%`,
        });
      }
    }
  }

  /**
   * Apply quote freshness filter
   */
  private applyQuoteFreshnessFilter(
    opp: Opportunity,
    quotes: { buy: Quote; sell: Quote } | undefined,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    if (filters.maxQuoteAgeSeconds > 0 && quotes) {
      const now = Date.now();
      const buyAge = (now - quotes.buy.fetchedAt) / 1000;
      const sellAge = quotes.sell ? (now - quotes.sell.fetchedAt) / 1000 : 0;

      if (buyAge > filters.maxQuoteAgeSeconds || sellAge > filters.maxQuoteAgeSeconds) {
        exclusions.push({
          reason: `Quote age exceeds ${filters.maxQuoteAgeSeconds}s threshold`,
          code: 'QUOTE_TOO_OLD',
          details: `Buy age: ${buyAge.toFixed(1)}s, Sell age: ${sellAge.toFixed(1)}s`,
        });
      }
    }
  }

  /**
   * Apply strategy type filters
   */
  private applyStrategyTypeFilters(
    opp: Opportunity,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    const typeAllowed =
      (opp.type === 'SPOT_SPOT_HEDGE' && filters.showSpotSpotHedge) ||
      (opp.type === 'SPOT_FUTURES' && filters.showSpotFutures) ||
      (opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' && filters.showKimpOverseasToBithumb) ||
      (opp.type === 'KIMP_BITHUMB_TO_OVERSEAS' && filters.showKimpBithumbToOverseas);

    if (!typeAllowed) {
      exclusions.push({
        reason: `Strategy type ${opp.type} is filtered out`,
        code: 'STRATEGY_TYPE_FILTERED',
      });
    }
  }

  /**
   * Apply gap percentage filters
   */
  private applyGapFilters(
    opp: Opportunity,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    if (opp.grossGapPct < filters.minGapPct) {
      exclusions.push({
        reason: `Gap ${opp.grossGapPct.toFixed(2)}% < ${filters.minGapPct}% minimum`,
        code: 'GAP_TOO_LOW',
      });
    }

    if (filters.minNetProfitPct > 0 && opp.netProfitPct < filters.minNetProfitPct) {
      exclusions.push({
        reason: `Net profit ${opp.netProfitPct.toFixed(2)}% < ${filters.minNetProfitPct}% minimum`,
        code: 'NET_PROFIT_TOO_LOW',
      });
    }
  }

  /**
   * Apply wallet intersection filter
   */
  private applyWalletIntersectionFilter(
    opp: Opportunity,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    if (filters.requireCommonOpenNetwork) {
      if (!opp.wallet_check?.ok) {
        exclusions.push({
          reason: 'Wallet check failed',
          code: 'WALLET_NOT_OPEN',
          details: opp.wallet_check?.reasons.join(', '),
        });
      } else if (opp.commonNetworks < 1) {
        exclusions.push({
          reason: 'No common open networks available',
          code: 'NO_COMMON_NETWORK',
        });
      }
    }
  }

  /**
   * Apply deposit address requirement filter
   */
  private applyDepositAddressFilter(
    opp: Opportunity,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    if (filters.requireDepositAddress) {
      if (!opp.address_check?.ok) {
        exclusions.push({
          reason: 'No valid deposit address found',
          code: 'NO_DEPOSIT_ADDRESS',
          details: opp.address_check?.reasons.join(', '),
        });
      }
    }
  }

  /**
   * Apply exchange exclusions
   */
  private applyExchangeExclusions(
    opp: Opportunity,
    filters: FilterSettings,
    exclusions: FilterExclusion[]
  ): void {
    const excludedExchanges = filters.excludeExchanges.map((e) => e.toUpperCase());
    if (
      excludedExchanges.includes(opp.buyExchange.toUpperCase()) ||
      (opp.sellExchange && excludedExchanges.includes(opp.sellExchange.toUpperCase()))
    ) {
      exclusions.push({
        reason: `Exchange excluded: ${opp.buyExchange} or ${opp.sellExchange}`,
        code: 'EXCHANGE_EXCLUDED',
      });
    }
  }

  /**
   * Check deposit address for an opportunity
   * Returns address_check result
   */
  async checkDepositAddress(opp: Opportunity): Promise<{
    ok: boolean;
    reasons: string[];
    matchedNetworkId?: string;
  }> {
    if (!this.addressBookService) {
      return {
        ok: false,
        reasons: ['AddressBookService not available'],
      };
    }

    // For spot-spot trades, we need deposit address for the sell exchange
    if (opp.type === 'SPOT_SPOT_HEDGE' && opp.sellExchange) {
      const reasons: string[] = [];

      // Check if we have any deposit address for this symbol + exchange
      const addresses = await this.addressBookService.findDepositAddressesAsync(
        opp.base,
        opp.sellExchange
      );

      if (addresses.length === 0) {
        return {
          ok: false,
          reasons: [`No deposit address found for ${opp.base} on ${opp.sellExchange}`],
        };
      }

      // Check if we have an address with a common open network
      const candidateNetworkIds = opp.candidateNetworks?.map((n) => n.networkId) || [];

      for (const addr of addresses) {
        if (candidateNetworkIds.includes(addr.networkId)) {
          // Found a matching network
          // Check if memo/tag is required and present for XRP-like tokens
          const memoRequired = ['XRP', 'XLM', 'EOS', 'ATOM'].includes(opp.base.toUpperCase());
          if (memoRequired && !addr.memo) {
            reasons.push(`Memo/tag required but missing for ${opp.base} (${addr.networkId})`);
            continue;
          }

          // Found valid address
          return {
            ok: true,
            reasons: [],
            matchedNetworkId: addr.networkId,
          };
        }
      }

      return {
        ok: false,
        reasons: [`No deposit address with common open network. Available: ${addresses.map(a => a.networkId).join(', ')}, Required: ${candidateNetworkIds.join(', ')}`],
      };
    }

    // For other types, deposit address check not applicable
    return {
      ok: true,
      reasons: [],
    };
  }
}
