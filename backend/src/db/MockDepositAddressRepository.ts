/**
 * Mock Deposit Address Repository (In-Memory)
 *
 * MVP implementation using in-memory storage.
 * Can be replaced with actual Postgres implementation later.
 */

import {
  DepositAddress,
  DepositAddressRepository,
  CreateDepositAddressInput,
  GetDepositAddressQuery,
  ListDepositAddressesQuery,
  UpdateDepositAddressInput,
} from '../types/deposit-address';
import { v4 as uuidv4 } from 'uuid';

export class MockDepositAddressRepository implements DepositAddressRepository {
  private addresses: Map<string, DepositAddress> = new Map();

  /**
   * Generate a unique key for lookup
   */
  private generateKey(exchangeId: string, symbol: string, networkId: string, address: string): string {
    return `${exchangeId.toUpperCase()}:${symbol.toUpperCase()}:${networkId}:${address}`;
  }

  /**
   * Insert or update a deposit address
   */
  async upsert(input: CreateDepositAddressInput): Promise<DepositAddress> {
    const key = this.generateKey(input.exchangeId, input.symbol, input.networkId, input.address);

    // Check if address already exists
    const existing = Array.from(this.addresses.values()).find(
      (addr) =>
        addr.exchangeId.toUpperCase() === input.exchangeId.toUpperCase() &&
        addr.symbol.toUpperCase() === input.symbol.toUpperCase() &&
        addr.networkId === input.networkId &&
        addr.address === input.address
    );

    if (existing) {
      // Update existing address
      const updated: DepositAddress = {
        ...existing,
        memo: input.memo,
        source: input.source,
        updatedAt: new Date().toISOString(),
      };
      this.addresses.set(key, updated);
      return updated;
    }

    // Create new address
    const newAddress: DepositAddress = {
      id: uuidv4(),
      exchangeId: input.exchangeId.toUpperCase(),
      symbol: input.symbol.toUpperCase(),
      networkId: input.networkId,
      address: input.address,
      memo: input.memo,
      isActive: true,
      source: input.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.addresses.set(key, newAddress);
    return newAddress;
  }

  /**
   * Get a deposit address by exchange, symbol, and network
   */
  async get(query: GetDepositAddressQuery): Promise<DepositAddress | null> {
    const { exchangeId, symbol, networkId } = query;

    // Find active address matching the query
    const address = Array.from(this.addresses.values()).find(
      (addr) =>
        addr.exchangeId.toUpperCase() === exchangeId.toUpperCase() &&
        addr.symbol.toUpperCase() === symbol.toUpperCase() &&
        addr.networkId === networkId &&
        addr.isActive
    );

    return address || null;
  }

  /**
   * List deposit addresses by exchange and optionally by symbol
   */
  async list(query: ListDepositAddressesQuery): Promise<DepositAddress[]> {
    const { exchangeId, symbol, isActive } = query;

    let addresses = Array.from(this.addresses.values());

    // Filter by exchange
    addresses = addresses.filter(
      (addr) => addr.exchangeId.toUpperCase() === exchangeId.toUpperCase()
    );

    // Filter by symbol if provided
    if (symbol) {
      addresses = addresses.filter((addr) => addr.symbol.toUpperCase() === symbol.toUpperCase());
    }

    // Filter by active status if provided
    if (isActive !== undefined) {
      addresses = addresses.filter((addr) => addr.isActive === isActive);
    }

    // Sort by createdAt descending
    return addresses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update a deposit address
   */
  async update(id: string, input: UpdateDepositAddressInput): Promise<DepositAddress> {
    const address = Array.from(this.addresses.values()).find((addr) => addr.id === id);

    if (!address) {
      throw new Error(`Deposit address not found: ${id}`);
    }

    const updated: DepositAddress = {
      ...address,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const key = this.generateKey(address.exchangeId, address.symbol, address.networkId, address.address);
    this.addresses.set(key, updated);

    return updated;
  }

  /**
   * Delete a deposit address (soft delete)
   */
  async delete(id: string): Promise<void> {
    const address = Array.from(this.addresses.values()).find((addr) => addr.id === id);

    if (!address) {
      throw new Error(`Deposit address not found: ${id}`);
    }

    await this.update(id, { isActive: false });
  }

  /**
   * Clear all addresses (for testing)
   */
  async clear(): Promise<void> {
    this.addresses.clear();
  }

  /**
   * Get all addresses (for testing)
   */
  async getAll(): Promise<DepositAddress[]> {
    return Array.from(this.addresses.values());
  }
}

// Export singleton instance
export const mockDepositAddressRepository = new MockDepositAddressRepository();
