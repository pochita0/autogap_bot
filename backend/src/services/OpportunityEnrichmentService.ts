/**
 * Opportunity Enrichment Service
 * Enriches opportunities with wallet status and address checks
 */

import { Opportunity } from '../types/opportunity';
import { AddressBookService } from './AddressBookService';
import { WalletEnrichmentService } from './WalletEnrichmentService';

export class OpportunityEnrichmentService {
  constructor(
    private walletService?: WalletEnrichmentService,
    private addressBookService?: AddressBookService
  ) {}

  /**
   * Enrich opportunities with wallet and address checks
   */
  async enrichOpportunities(
    opportunities: Opportunity[],
    enrichWallet: boolean = true,
    enrichAddress: boolean = true
  ): Promise<Opportunity[]> {
    let enriched = opportunities;

    // Enrich with wallet status (batch operation)
    if (enrichWallet && this.walletService) {
      enriched = await this.walletService.enrichOpportunities(enriched);
    }

    // Enrich with address checks (individual operation)
    if (enrichAddress && this.addressBookService) {
      const enrichedWithAddress: Opportunity[] = [];

      for (const opp of enriched) {
        const addressCheck = await this.checkDepositAddress(opp);
        enrichedWithAddress.push({
          ...opp,
          address_check: addressCheck,
        });
      }

      enriched = enrichedWithAddress;
    }

    return enriched;
  }

  /**
   * Check deposit address for an opportunity
   * Returns address_check result
   */
  private async checkDepositAddress(opp: Opportunity): Promise<{
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
        if (!addr.isActive) {
          continue; // Skip inactive addresses
        }

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

      if (addresses.length > 0 && candidateNetworkIds.length > 0) {
        return {
          ok: false,
          reasons: [
            `No deposit address with common open network. Available: ${addresses
              .map((a) => a.networkId)
              .join(', ')}, Required: ${candidateNetworkIds.join(', ')}`,
          ],
        };
      }

      return {
        ok: false,
        reasons: [`No active deposit address found`],
      };
    }

    // For other types (KIMP flows), deposit address check not applicable for now
    // TODO: Implement for KIM flows if needed
    return {
      ok: true,
      reasons: [],
    };
  }
}
