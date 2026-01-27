/**
 * Precheck Service
 *
 * Performs pre-execution validation for arbitrage opportunities.
 * Checks deposit address availability before execution.
 */

import { Opportunity } from '../types/opportunity';
import { AddressBookService } from './AddressBookService';

export interface PrecheckResult {
  approved: boolean;
  blockingReason?: string;
  warnings?: string[];
  details?: {
    depositAddressChecked?: boolean;
    depositAddressAvailable?: boolean;
    networkId?: string;
  };
}

export class PrecheckService {
  constructor(private addressBookService: AddressBookService) {}

  /**
   * Perform comprehensive precheck for an opportunity
   */
  async precheck(opportunity: Opportunity): Promise<PrecheckResult> {
    const { type, fromExchangeId, toExchangeId, base } = opportunity;

    // Only check Kimchi Premium opportunities that require transfers
    if (type !== 'KIMP_OVERSEAS_TO_BITHUMB' && type !== 'KIMP_BITHUMB_TO_OVERSEAS') {
      return {
        approved: true,
        details: {
          depositAddressChecked: false,
        },
      };
    }

    // Validate required fields
    if (!fromExchangeId || !toExchangeId || !base) {
      return {
        approved: false,
        blockingReason: 'MISSING_ROUTE_INFO',
        details: {
          depositAddressChecked: false,
        },
      };
    }

    // Determine which exchange needs deposit address
    const targetExchangeId = type === 'KIMP_OVERSEAS_TO_BITHUMB' ? toExchangeId : fromExchangeId;

    // Check if we have candidate networks
    const candidateNetworks = opportunity.candidateNetworks || [];
    if (candidateNetworks.length === 0) {
      return {
        approved: false,
        blockingReason: 'NO_CANDIDATE_NETWORKS',
        details: {
          depositAddressChecked: false,
        },
      };
    }

    // Check deposit address for each candidate network
    const warnings: string[] = [];
    let hasAnyDepositAddress = false;
    let checkedNetworkId: string | undefined;

    for (const network of candidateNetworks) {
      const { networkId, depositEnabled, withdrawEnabled } = network;

      // Skip if network is not fully operational
      if (!depositEnabled || !withdrawEnabled) {
        warnings.push(`Network ${networkId} not fully operational (deposit: ${depositEnabled}, withdraw: ${withdrawEnabled})`);
        continue;
      }

      // Check if deposit address exists
      const hasAddress = await this.addressBookService.hasDepositAddress(
        targetExchangeId,
        base,
        networkId
      );

      if (hasAddress) {
        hasAnyDepositAddress = true;
        checkedNetworkId = networkId;
        break;
      } else {
        warnings.push(`No deposit address found for ${targetExchangeId}/${base} on ${networkId}`);
      }
    }

    // If no deposit address found for any network, block execution
    if (!hasAnyDepositAddress) {
      return {
        approved: false,
        blockingReason: 'MISSING_DEPOSIT_ADDRESS',
        warnings,
        details: {
          depositAddressChecked: true,
          depositAddressAvailable: false,
        },
      };
    }

    // All checks passed
    return {
      approved: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      details: {
        depositAddressChecked: true,
        depositAddressAvailable: true,
        networkId: checkedNetworkId,
      },
    };
  }

  /**
   * Batch precheck multiple opportunities
   */
  async precheckBatch(opportunities: Opportunity[]): Promise<Map<string, PrecheckResult>> {
    const results = new Map<string, PrecheckResult>();

    for (const opportunity of opportunities) {
      const result = await this.precheck(opportunity);
      results.set(opportunity.id, result);
    }

    return results;
  }

  /**
   * Quick check if deposit address is missing (for filtering)
   */
  async hasDepositAddressIssue(opportunity: Opportunity): Promise<boolean> {
    const result = await this.precheck(opportunity);
    return !result.approved && result.blockingReason === 'MISSING_DEPOSIT_ADDRESS';
  }
}
