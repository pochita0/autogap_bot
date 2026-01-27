/**
 * Wallet Status Types
 *
 * Types for wallet deposit/withdraw status and network information
 */

/**
 * Network information for a specific symbol on an exchange
 */
export interface NetworkInfo {
  /** Network identifier (exchange-specific) */
  network: string;

  /** Canonical network name (normalized) */
  normalizedNetwork: string;

  /** Is deposit enabled on this network? */
  depositEnabled: boolean;

  /** Is withdraw enabled on this network? */
  withdrawEnabled: boolean;

  /** Minimum deposit amount (optional) */
  minDeposit?: number;

  /** Minimum withdraw amount (optional) */
  minWithdraw?: number;

  /** Withdraw fee (optional) */
  withdrawFee?: number;

  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Wallet status for a symbol on an exchange
 */
export interface WalletStatus {
  /** Exchange identifier */
  exchange: string;

  /** Trading symbol (e.g., 'BTC', 'ETH') */
  symbol: string;

  /** List of available networks */
  networks: NetworkInfo[];

  /** When this status was last updated */
  updatedAt: string;

  /** Whether any network has deposit enabled */
  hasDepositEnabled: boolean;

  /** Whether any network has withdraw enabled */
  hasWithdrawEnabled: boolean;

  /** Count of networks with both deposit and withdraw enabled */
  openNetworksCount: number;
}

/**
 * Common network information between two exchanges
 */
export interface CommonNetworkInfo {
  /** Canonical network name */
  network: string;

  /** Network name on exchange A */
  exchangeANetwork: string;

  /** Network name on exchange B */
  exchangeBNetwork: string;

  /** Both exchanges have deposit enabled? */
  depositEnabled: boolean;

  /** Both exchanges have withdraw enabled? */
  withdrawEnabled: boolean;

  /** Is this network fully operational on both exchanges? */
  isFullyOpen: boolean;
}

/**
 * Common networks response between two exchanges
 */
export interface CommonNetworksResponse {
  /** First exchange */
  exchangeA: string;

  /** Second exchange */
  exchangeB: string;

  /** Trading symbol */
  symbol: string;

  /** List of common networks */
  commonNetworks: CommonNetworkInfo[];

  /** Count of fully open common networks */
  fullyOpenNetworksCount: number;

  /** When this data was last updated */
  updatedAt: string;
}

/**
 * WalletStatusConnector interface
 *
 * Abstract interface for fetching wallet status from exchanges
 */
export interface WalletStatusConnector {
  /**
   * Fetch wallet status for a symbol on an exchange
   *
   * @param exchange - Exchange identifier
   * @param symbol - Trading symbol
   * @returns Wallet status with network information
   */
  fetchWalletStatus(exchange: string, symbol: string): Promise<WalletStatus>;

  /**
   * Fetch common networks between two exchanges for a symbol
   *
   * @param exchangeA - First exchange
   * @param exchangeB - Second exchange
   * @param symbol - Trading symbol
   * @returns Common networks information
   */
  fetchCommonNetworks(
    exchangeA: string,
    exchangeB: string,
    symbol: string
  ): Promise<CommonNetworksResponse>;
}
