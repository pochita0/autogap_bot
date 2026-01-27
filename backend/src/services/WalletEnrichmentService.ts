/**
 * Wallet Enrichment Service
 *
 * Enriches opportunities with real-time wallet status information
 */

import { Opportunity } from '../types/opportunity';
import { WalletStatusConnector } from '../types/wallet-status';

/**
 * Wallet check reason codes
 */
export enum WalletCheckReason {
  // Success
  OK = 'OK',

  // Failures
  NO_COMMON_NETWORK = 'NO_COMMON_NETWORK',
  WALLET_NOT_OPEN = 'WALLET_NOT_OPEN',
  DEPOSIT_DISABLED = 'DEPOSIT_DISABLED',
  WITHDRAW_DISABLED = 'WITHDRAW_DISABLED',

  // Specific exchange issues (format: ISSUE@EXCHANGE:SYMBOL:NETWORK)
  DEPOSIT_DISABLED_ON_EXCHANGE = 'DEPOSIT_DISABLED_ON_EXCHANGE',
  WITHDRAW_DISABLED_ON_EXCHANGE = 'WITHDRAW_DISABLED_ON_EXCHANGE',
  NO_NETWORKS_AVAILABLE = 'NO_NETWORKS_AVAILABLE',
}

/**
 * Format a detailed reason with exchange/symbol/network context
 */
function formatDetailedReason(
  baseReason: string,
  exchange: string,
  symbol: string,
  network?: string
): string {
  if (network) {
    return `${baseReason}@${exchange}:${symbol}:${network}`;
  }
  return `${baseReason}@${exchange}:${symbol}`;
}

export class WalletEnrichmentService {
  constructor(private walletConnector: WalletStatusConnector) {}

  /**
   * Enrich a single opportunity with wallet status information
   */
  async enrichOpportunity(opportunity: Opportunity): Promise<Opportunity> {
    const { type, base, buyExchange, sellExchange, futuresExchange } = opportunity;

    try {
      if (type === 'SPOT_SPOT_HEDGE') {
        return await this.enrichSpotSpotHedge(opportunity);
      } else if (type === 'SPOT_FUTURES') {
        return await this.enrichSpotFutures(opportunity);
      } else if (type === 'KIMP_OVERSEAS_TO_BITHUMB' || type === 'KIMP_BITHUMB_TO_OVERSEAS') {
        return await this.enrichKimchiPremium(opportunity);
      }

      // Unknown type, return as-is
      return opportunity;
    } catch (error) {
      console.error('Failed to enrich opportunity:', error);
      // Return original opportunity with error reason
      return {
        ...opportunity,
        wallet_check: {
          ok: false,
          reasons: ['ENRICHMENT_ERROR'],
          checkedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Enrich SPOT_SPOT_HEDGE opportunity
   * Requires common networks between buyExchange and sellExchange
   */
  private async enrichSpotSpotHedge(opportunity: Opportunity): Promise<Opportunity> {
    const { base, buyExchange, sellExchange } = opportunity;

    if (!sellExchange) {
      return {
        ...opportunity,
        commonNetworks: 0,
        walletStatusOk: false,
        wallet_check: {
          ok: false,
          reasons: ['NO_SELL_EXCHANGE'],
          checkedAt: new Date().toISOString(),
        },
      };
    }

    // Fetch common networks between buy and sell exchanges
    const commonNetworks = await this.walletConnector.fetchCommonNetworks(
      buyExchange,
      sellExchange,
      base
    );

    const fullyOpenCount = commonNetworks.fullyOpenNetworksCount;
    const reasons: string[] = [];

    // Determine wallet status
    const walletOk = fullyOpenCount > 0;

    if (!walletOk) {
      if (commonNetworks.commonNetworks.length === 0) {
        reasons.push(WalletCheckReason.NO_COMMON_NETWORK);
      } else {
        // Has common networks but none are fully open
        reasons.push(WalletCheckReason.WALLET_NOT_OPEN);

        // Add detailed reasons for each network
        for (const network of commonNetworks.commonNetworks) {
          if (!network.depositEnabled) {
            if (!network.depositEnabled) {
              reasons.push(formatDetailedReason(
                'DEPOSIT_DISABLED',
                `${buyExchange}/${sellExchange}`,
                base,
                network.network
              ));
            }
          }
          if (!network.withdrawEnabled) {
            reasons.push(formatDetailedReason(
              'WITHDRAW_DISABLED',
              `${buyExchange}/${sellExchange}`,
              base,
              network.network
            ));
          }
        }
      }
    } else {
      reasons.push(WalletCheckReason.OK);
    }

    return {
      ...opportunity,
      commonNetworks: fullyOpenCount,
      walletStatusOk: walletOk,
      wallet_check: {
        ok: walletOk,
        reasons,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Enrich SPOT_FUTURES opportunity
   * Only requires that the spot exchange has at least one open network
   * (no transfer needed, can trade on same exchange)
   */
  private async enrichSpotFutures(opportunity: Opportunity): Promise<Opportunity> {
    const { base, buyExchange } = opportunity;

    // Fetch wallet status for buy exchange
    const walletStatus = await this.walletConnector.fetchWalletStatus(buyExchange, base);

    const hasOpenNetwork = walletStatus.openNetworksCount > 0;
    const reasons: string[] = [];

    if (!hasOpenNetwork) {
      if (walletStatus.networks.length === 0) {
        reasons.push(WalletCheckReason.NO_NETWORKS_AVAILABLE);
        reasons.push(formatDetailedReason('NO_NETWORKS', buyExchange, base));
      } else {
        reasons.push(WalletCheckReason.WALLET_NOT_OPEN);

        // Add specific reasons for each network
        for (const network of walletStatus.networks) {
          if (!network.depositEnabled) {
            reasons.push(formatDetailedReason(
              'DEPOSIT_DISABLED',
              buyExchange,
              base,
              network.network
            ));
          }
          if (!network.withdrawEnabled) {
            reasons.push(formatDetailedReason(
              'WITHDRAW_DISABLED',
              buyExchange,
              base,
              network.network
            ));
          }
        }
      }
    } else {
      reasons.push(WalletCheckReason.OK);
    }

    return {
      ...opportunity,
      commonNetworks: walletStatus.openNetworksCount,
      walletStatusOk: hasOpenNetwork,
      wallet_check: {
        ok: hasOpenNetwork,
        reasons,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Enrich KIMCHI PREMIUM opportunities (both directions)
   * Requires common networks between fromExchange and toExchange
   * Similar logic to SPOT_SPOT_HEDGE but uses fromExchangeId/toExchangeId fields
   */
  private async enrichKimchiPremium(opportunity: Opportunity): Promise<Opportunity> {
    const { base, fromExchangeId, toExchangeId } = opportunity;

    if (!fromExchangeId || !toExchangeId) {
      return {
        ...opportunity,
        commonNetworks: 0,
        walletStatusOk: false,
        wallet_check: {
          ok: false,
          reasons: ['MISSING_EXCHANGE_INFO'],
          checkedAt: new Date().toISOString(),
        },
      };
    }

    // Fetch common networks between from and to exchanges
    const commonNetworks = await this.walletConnector.fetchCommonNetworks(
      fromExchangeId,
      toExchangeId,
      base
    );

    const fullyOpenCount = commonNetworks.fullyOpenNetworksCount;
    const reasons: string[] = [];

    // Determine wallet status
    const walletOk = fullyOpenCount > 0;

    if (!walletOk) {
      if (commonNetworks.commonNetworks.length === 0) {
        reasons.push(WalletCheckReason.NO_COMMON_NETWORK);
      } else {
        // Has common networks but none are fully open
        reasons.push(WalletCheckReason.WALLET_NOT_OPEN);

        // Add detailed reasons for each network
        for (const network of commonNetworks.commonNetworks) {
          if (!network.depositEnabled) {
            reasons.push(formatDetailedReason(
              'DEPOSIT_DISABLED',
              `${fromExchangeId}/${toExchangeId}`,
              base,
              network.network
            ));
          }
          if (!network.withdrawEnabled) {
            reasons.push(formatDetailedReason(
              'WITHDRAW_DISABLED',
              `${fromExchangeId}/${toExchangeId}`,
              base,
              network.network
            ));
          }
        }
      }
    } else {
      reasons.push(WalletCheckReason.OK);
    }

    return {
      ...opportunity,
      commonNetworks: fullyOpenCount,
      walletStatusOk: walletOk,
      wallet_check: {
        ok: walletOk,
        reasons,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Enrich multiple opportunities in parallel
   */
  async enrichOpportunities(opportunities: Opportunity[]): Promise<Opportunity[]> {
    return Promise.all(opportunities.map((opp) => this.enrichOpportunity(opp)));
  }
}
