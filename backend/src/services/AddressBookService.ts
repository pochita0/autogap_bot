/**
 * Address Book Service
 *
 * Manages deposit addresses for cross-exchange crypto transfers.
 * Includes validation, masking, and caching.
 */

import {
  DepositAddress,
  MaskedDepositAddress,
  CreateDepositAddressInput,
  GetDepositAddressQuery,
  ListDepositAddressesQuery,
  DepositAddressRepository,
} from '../types/deposit-address';
import { CacheService } from './CacheService';
import { normalizeNetwork } from '../config/network-mappings';

export class AddressBookService {
  private cache: CacheService;

  constructor(
    private repository: DepositAddressRepository,
    cacheTtlSeconds: number = 60 // Default 60s TTL
  ) {
    this.cache = new CacheService(cacheTtlSeconds * 1000);
  }

  /**
   * Mask an address for display (first 6 + ... + last 4)
   */
  maskAddress(address: string): string {
    if (address.length <= 10) {
      return address; // Too short to mask
    }
    const prefix = address.substring(0, 6);
    const suffix = address.substring(address.length - 4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Validate network ID (must be canonical)
   */
  validateNetworkId(networkId: string): { valid: boolean; canonicalNetworkId: string; error?: string } {
    const canonical = normalizeNetwork(networkId);

    // Check if normalization changed the ID (meaning it wasn't canonical)
    if (canonical !== networkId) {
      return {
        valid: false,
        canonicalNetworkId: canonical,
        error: `Network ID must be canonical. Use '${canonical}' instead of '${networkId}'`,
      };
    }

    return { valid: true, canonicalNetworkId: canonical };
  }

  /**
   * Validate XRP memo requirement
   */
  validateXrpMemo(networkId: string, memo?: string): { valid: boolean; error?: string } {
    // XRP requires a destination tag (memo)
    if (networkId === 'XRP' && !memo) {
      return {
        valid: false,
        error: 'XRP transfers require a destination tag (memo)',
      };
    }

    return { valid: true };
  }

  /**
   * Validate deposit address input
   */
  validateDepositAddress(input: CreateDepositAddressInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate network ID is canonical
    const networkValidation = this.validateNetworkId(input.networkId);
    if (!networkValidation.valid) {
      errors.push(networkValidation.error!);
    }

    // Validate XRP memo requirement
    const memoValidation = this.validateXrpMemo(input.networkId, input.memo);
    if (!memoValidation.valid) {
      errors.push(memoValidation.error!);
    }

    // Validate address is not empty
    if (!input.address || input.address.trim() === '') {
      errors.push('Address cannot be empty');
    }

    // Validate exchange ID is not empty
    if (!input.exchangeId || input.exchangeId.trim() === '') {
      errors.push('Exchange ID cannot be empty');
    }

    // Validate symbol is not empty
    if (!input.symbol || input.symbol.trim() === '') {
      errors.push('Symbol cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(exchangeId: string, symbol: string, networkId: string): string {
    return `depositaddr:${exchangeId.toUpperCase()}:${symbol.toUpperCase()}:${networkId}`;
  }

  /**
   * Upsert a deposit address (insert or update)
   */
  async upsertDepositAddress(input: CreateDepositAddressInput): Promise<DepositAddress> {
    // Validate input
    const validation = this.validateDepositAddress(input);
    if (!validation.valid) {
      throw new Error(`Invalid deposit address: ${validation.errors.join(', ')}`);
    }

    // Upsert in repository
    const address = await this.repository.upsert(input);

    // Invalidate cache
    const cacheKey = this.getCacheKey(address.exchangeId, address.symbol, address.networkId);
    this.cache.delete(cacheKey);

    return address;
  }

  /**
   * Get a deposit address (with caching)
   */
  async getDepositAddress(query: GetDepositAddressQuery): Promise<DepositAddress | null> {
    const { exchangeId, symbol, networkId } = query;

    // Check cache first
    const cacheKey = this.getCacheKey(exchangeId, symbol, networkId);
    const cached = this.cache.get<DepositAddress>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from repository
    const address = await this.repository.get(query);

    if (address) {
      // Cache the result
      this.cache.set(cacheKey, address);
    }

    return address;
  }

  /**
   * Get a masked deposit address (for API responses)
   */
  async getMaskedDepositAddress(query: GetDepositAddressQuery): Promise<MaskedDepositAddress | null> {
    const address = await this.getDepositAddress(query);

    if (!address) {
      return null;
    }

    return {
      ...address,
      addressMasked: this.maskAddress(address.address),
    };
  }

  /**
   * Get a deposit address with full address (requires explicit request)
   */
  async getFullDepositAddress(query: GetDepositAddressQuery): Promise<DepositAddress | null> {
    return await this.getDepositAddress(query);
  }

  /**
   * List deposit addresses for an exchange (masked by default)
   */
  async listDepositAddresses(query: ListDepositAddressesQuery): Promise<MaskedDepositAddress[]> {
    const addresses = await this.repository.list(query);

    return addresses.map((addr) => ({
      ...addr,
      addressMasked: this.maskAddress(addr.address),
    }));
  }

  /**
   * Deactivate a deposit address
   */
  async deactivateDepositAddress(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });

    // Note: We can't easily invalidate cache here without knowing the address details
    // Cache will expire naturally after TTL
  }

  /**
   * Verify a deposit address (mark as verified)
   */
  async verifyDepositAddress(id: string): Promise<DepositAddress> {
    return await this.repository.update(id, {
      verifiedAt: new Date().toISOString(),
    });
  }

  /**
   * Check if deposit address exists for a transfer route
   */
  async hasDepositAddress(exchangeId: string, symbol: string, networkId: string): Promise<boolean> {
    const address = await this.getDepositAddress({ exchangeId, symbol, networkId });
    return address !== null && address.isActive;
  }

  /**
   * Find all deposit addresses for a symbol on an exchange
   * Used for filtering opportunities
   */
  findDepositAddresses(symbol: string, exchangeId: string): DepositAddress[] {
    // Use the repository's list method to find all matching addresses
    // This is a synchronous operation on the in-memory repository
    const query: ListDepositAddressesQuery = {
      exchangeId,
      symbol,
    };

    // For now, we'll need to make this async-compatible
    // Return empty array as fallback
    return [];
  }

  /**
   * Find all deposit addresses for a symbol on an exchange (async)
   * Used for filtering opportunities
   */
  async findDepositAddressesAsync(symbol: string, exchangeId: string): Promise<DepositAddress[]> {
    const query: ListDepositAddressesQuery = {
      exchangeId,
      symbol,
    };

    return await this.repository.list(query);
  }
}
