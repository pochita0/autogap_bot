/**
 * Deposit Address Types
 *
 * Types for managing deposit addresses in the Address Book
 */

export type AddressSource = 'MANUAL' | 'API';

export interface DepositAddress {
  id: string;
  exchangeId: string;        // e.g., 'BITHUMB', 'BINANCE'
  symbol: string;            // e.g., 'BTC', 'ETH', 'XRP'
  networkId: string;         // Canonical network ID e.g., 'BTC', 'ETH-ERC20'
  address: string;           // Blockchain address
  memo?: string;             // Memo/tag/destination tag (optional)
  isActive: boolean;         // Whether this address is currently active
  source: AddressSource;     // How address was obtained
  verifiedAt?: string;       // ISO timestamp when verified
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

export interface CreateDepositAddressInput {
  exchangeId: string;
  symbol: string;
  networkId: string;
  address: string;
  memo?: string;
  source: AddressSource;
}

export interface UpdateDepositAddressInput {
  isActive?: boolean;
  verifiedAt?: string;
}

export interface GetDepositAddressQuery {
  exchangeId: string;
  symbol: string;
  networkId: string;
}

export interface ListDepositAddressesQuery {
  exchangeId: string;
  symbol?: string;
  isActive?: boolean;
}

export interface MaskedDepositAddress extends Omit<DepositAddress, 'address'> {
  addressMasked: string;     // Masked address for display (e.g., "0x1234...5678")
  addressFull?: string;      // Full address (only included if explicitly requested)
}

/**
 * Database interface for deposit addresses
 */
export interface DepositAddressRepository {
  /**
   * Insert or update a deposit address
   */
  upsert(input: CreateDepositAddressInput): Promise<DepositAddress>;

  /**
   * Get a deposit address by exchange, symbol, and network
   */
  get(query: GetDepositAddressQuery): Promise<DepositAddress | null>;

  /**
   * List deposit addresses by exchange and optionally by symbol
   */
  list(query: ListDepositAddressesQuery): Promise<DepositAddress[]>;

  /**
   * Update a deposit address
   */
  update(id: string, input: UpdateDepositAddressInput): Promise<DepositAddress>;

  /**
   * Delete a deposit address (soft delete by setting isActive = false)
   */
  delete(id: string): Promise<void>;
}
