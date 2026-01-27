import {
  WalletStatusConnector,
  WalletStatus,
  CommonNetworksResponse,
  NetworkInfo,
  CommonNetworkInfo,
} from '../types/wallet-status';
import { normalizeNetwork } from '../config/network-mappings';

/**
 * Mock Wallet Status Connector
 *
 * Provides realistic wallet status data from fixtures for testing
 */
export class MockWalletStatusConnector implements WalletStatusConnector {
  /**
   * Mock wallet status fixtures
   * Maps "exchange:symbol" to network information
   */
  private fixtures: Record<string, NetworkInfo[]> = {
    // Binance BTC
    'Binance:BTC': [
      {
        network: 'BTC',
        normalizedNetwork: 'BTC',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.0001,
        minWithdraw: 0.001,
        withdrawFee: 0.0004,
      },
    ],

    // Binance ETH
    'Binance:ETH': [
      {
        network: 'ETH',
        normalizedNetwork: 'ETH-ERC20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.005,
      },
      {
        network: 'ARBITRUM',
        normalizedNetwork: 'ETH-ARBITRUM',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.0001,
      },
      {
        network: 'OPTIMISM',
        normalizedNetwork: 'ETH-OPTIMISM',
        depositEnabled: true,
        withdrawEnabled: false, // Withdraw disabled
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.0001,
      },
    ],

    // Binance USDT
    'Binance:USDT': [
      {
        network: 'ERC20',
        normalizedNetwork: 'ETH-ERC20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 10,
        withdrawFee: 1,
      },
      {
        network: 'TRC20',
        normalizedNetwork: 'TRX-TRC20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 1,
        withdrawFee: 0.1,
      },
      {
        network: 'BEP20',
        normalizedNetwork: 'BSC-BEP20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 1,
        withdrawFee: 0.2,
      },
      {
        network: 'POLYGON',
        normalizedNetwork: 'POLYGON',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 1,
        withdrawFee: 0.1,
      },
    ],

    // Upbit BTC
    'Upbit:BTC': [
      {
        network: 'BTC',
        normalizedNetwork: 'BTC',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.0001,
        minWithdraw: 0.001,
        withdrawFee: 0.0005,
      },
    ],

    // Upbit ETH
    'Upbit:ETH': [
      {
        network: 'Ethereum',
        normalizedNetwork: 'ETH-ERC20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.006,
      },
    ],

    // Upbit XRP
    'Upbit:XRP': [
      {
        network: 'XRP',
        normalizedNetwork: 'XRP',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 20,
        withdrawFee: 0.25,
      },
    ],

    // Bybit BTC
    'Bybit:BTC': [
      {
        network: 'Bitcoin',
        normalizedNetwork: 'BTC',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.0001,
        minWithdraw: 0.001,
        withdrawFee: 0.0004,
      },
    ],

    // Bybit ETH
    'Bybit:ETH': [
      {
        network: 'Ethereum (ERC20)',
        normalizedNetwork: 'ETH-ERC20',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.005,
      },
      {
        network: 'Arbitrum One',
        normalizedNetwork: 'ETH-ARBITRUM',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.0001,
      },
      {
        network: 'Optimism',
        normalizedNetwork: 'ETH-OPTIMISM',
        depositEnabled: false, // Deposit disabled
        withdrawEnabled: true,
        minDeposit: 0.001,
        minWithdraw: 0.01,
        withdrawFee: 0.0001,
      },
    ],

    // OKX BTC (withdraw disabled)
    'OKX:BTC': [
      {
        network: 'Bitcoin',
        normalizedNetwork: 'BTC',
        depositEnabled: true,
        withdrawEnabled: false, // Withdraw disabled
        minDeposit: 0.0001,
        minWithdraw: 0.001,
        withdrawFee: 0.0004,
      },
    ],

    // Bithumb BTC
    'Bithumb:BTC': [
      {
        network: 'BTC',
        normalizedNetwork: 'BTC',
        depositEnabled: true,
        withdrawEnabled: true,
        minDeposit: 0.0001,
        minWithdraw: 0.001,
        withdrawFee: 0.0005,
      },
    ],

    // Bithumb XRP (no common network with Binance)
    'Bithumb:XRP': [
      {
        network: 'Ripple',
        normalizedNetwork: 'XRP',
        depositEnabled: false, // Deposit disabled
        withdrawEnabled: true,
        minDeposit: 1,
        minWithdraw: 20,
        withdrawFee: 0.25,
      },
    ],
  };

  async fetchWalletStatus(exchange: string, symbol: string): Promise<WalletStatus> {
    const key = `${exchange}:${symbol}`;
    const networks = this.fixtures[key];

    if (!networks) {
      // Return empty status for unknown combinations
      return {
        exchange,
        symbol,
        networks: [],
        updatedAt: new Date().toISOString(),
        hasDepositEnabled: false,
        hasWithdrawEnabled: false,
        openNetworksCount: 0,
      };
    }

    // Calculate status flags
    const hasDepositEnabled = networks.some((n) => n.depositEnabled);
    const hasWithdrawEnabled = networks.some((n) => n.withdrawEnabled);
    const openNetworksCount = networks.filter(
      (n) => n.depositEnabled && n.withdrawEnabled
    ).length;

    return {
      exchange,
      symbol,
      networks,
      updatedAt: new Date().toISOString(),
      hasDepositEnabled,
      hasWithdrawEnabled,
      openNetworksCount,
    };
  }

  async fetchCommonNetworks(
    exchangeA: string,
    exchangeB: string,
    symbol: string
  ): Promise<CommonNetworksResponse> {
    // Fetch wallet status from both exchanges
    const statusA = await this.fetchWalletStatus(exchangeA, symbol);
    const statusB = await this.fetchWalletStatus(exchangeB, symbol);

    // Build normalized network maps
    const networksAMap = new Map<string, NetworkInfo>();
    statusA.networks.forEach((network) => {
      networksAMap.set(network.normalizedNetwork, network);
    });

    const networksBMap = new Map<string, NetworkInfo>();
    statusB.networks.forEach((network) => {
      networksBMap.set(network.normalizedNetwork, network);
    });

    // Find common networks
    const commonNetworks: CommonNetworkInfo[] = [];

    for (const [canonicalNetwork, networkA] of networksAMap.entries()) {
      const networkB = networksBMap.get(canonicalNetwork);

      if (networkB) {
        // Both exchanges have this network
        const depositEnabled = networkA.depositEnabled && networkB.depositEnabled;
        const withdrawEnabled = networkA.withdrawEnabled && networkB.withdrawEnabled;
        const isFullyOpen = depositEnabled && withdrawEnabled;

        commonNetworks.push({
          network: canonicalNetwork,
          exchangeANetwork: networkA.network,
          exchangeBNetwork: networkB.network,
          depositEnabled,
          withdrawEnabled,
          isFullyOpen,
        });
      }
    }

    // Count fully open networks
    const fullyOpenNetworksCount = commonNetworks.filter((n) => n.isFullyOpen).length;

    return {
      exchangeA,
      exchangeB,
      symbol,
      commonNetworks,
      fullyOpenNetworksCount,
      updatedAt: new Date().toISOString(),
    };
  }
}
