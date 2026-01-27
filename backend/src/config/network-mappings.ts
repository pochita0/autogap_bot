/**
 * Network Normalization Configuration
 *
 * Maps exchange-specific network names to canonical network identifiers.
 * This ensures consistent network matching across different exchanges.
 */

/**
 * Canonical network names (normalized)
 */
export type CanonicalNetwork =
  | 'BTC'
  | 'ETH-ERC20'
  | 'ETH-ARBITRUM'
  | 'ETH-OPTIMISM'
  | 'ETH-BASE'
  | 'BSC-BEP20'
  | 'POLYGON'
  | 'AVAX-C'
  | 'SOLANA'
  | 'TRX-TRC20'
  | 'XRP'
  | 'ADA'
  | 'DOT'
  | 'COSMOS'
  | 'NEAR'
  | 'TON'
  | 'APTOS'
  | 'SUI'
  | 'KLAY-KLAYTN'
  | 'ALGO'
  | 'XLM'
  | 'LUNA'
  | 'OSMO';

/**
 * Network mapping table
 * Maps exchange-specific network identifiers to canonical names
 */
export const NETWORK_MAPPINGS: Record<string, CanonicalNetwork> = {
  // Bitcoin
  'BTC': 'BTC',
  'BITCOIN': 'BTC',
  'Bitcoin': 'BTC',

  // Ethereum
  'ETH': 'ETH-ERC20',
  'ETHEREUM': 'ETH-ERC20',
  'ERC20': 'ETH-ERC20',
  'Ethereum': 'ETH-ERC20',
  'Ethereum (ERC20)': 'ETH-ERC20',

  // Ethereum Layer 2s
  'ARBITRUM': 'ETH-ARBITRUM',
  'ARBITRUMONE': 'ETH-ARBITRUM',
  'Arbitrum One': 'ETH-ARBITRUM',
  'OPTIMISM': 'ETH-OPTIMISM',
  'OP': 'ETH-OPTIMISM',
  'Optimism': 'ETH-OPTIMISM',
  'BASE': 'ETH-BASE',
  'Base': 'ETH-BASE',

  // Binance Smart Chain
  'BSC': 'BSC-BEP20',
  'BNB': 'BSC-BEP20',
  'BEP20': 'BSC-BEP20',
  'BSC (BEP20)': 'BSC-BEP20',
  'BNB Smart Chain': 'BSC-BEP20',
  'Binance Smart Chain': 'BSC-BEP20',

  // Polygon
  'POLYGON': 'POLYGON',
  'MATIC': 'POLYGON',
  'Polygon': 'POLYGON',

  // Avalanche
  'AVAX': 'AVAX-C',
  'AVAXC': 'AVAX-C',
  'Avalanche C-Chain': 'AVAX-C',
  'Avalanche': 'AVAX-C',

  // Solana
  'SOL': 'SOLANA',
  'SOLANA': 'SOLANA',
  'Solana': 'SOLANA',

  // Tron
  'TRX': 'TRX-TRC20',
  'TRON': 'TRX-TRC20',
  'TRC20': 'TRX-TRC20',
  'Tron': 'TRX-TRC20',

  // XRP
  'XRP': 'XRP',
  'RIPPLE': 'XRP',
  'Ripple': 'XRP',

  // Cardano
  'ADA': 'ADA',
  'CARDANO': 'ADA',
  'Cardano': 'ADA',

  // Polkadot
  'DOT': 'DOT',
  'POLKADOT': 'DOT',
  'Polkadot': 'DOT',

  // Cosmos
  'ATOM': 'COSMOS',
  'COSMOS': 'COSMOS',
  'Cosmos': 'COSMOS',

  // NEAR
  'NEAR': 'NEAR',
  'Near': 'NEAR',

  // TON
  'TON': 'TON',
  'Ton': 'TON',

  // Aptos
  'APT': 'APTOS',
  'APTOS': 'APTOS',
  'Aptos': 'APTOS',

  // Sui
  'SUI': 'SUI',
  'Sui': 'SUI',

  // Klaytn
  'KLAY': 'KLAY-KLAYTN',
  'KLAYTN': 'KLAY-KLAYTN',
  'Klaytn': 'KLAY-KLAYTN',

  // Algorand
  'ALGO': 'ALGO',
  'ALGORAND': 'ALGO',
  'Algorand': 'ALGO',

  // Stellar
  'XLM': 'XLM',
  'STELLAR': 'XLM',
  'Stellar': 'XLM',

  // Terra
  'LUNA': 'LUNA',
  'TERRA': 'LUNA',
  'Terra': 'LUNA',

  // Osmosis
  'OSMO': 'OSMO',
  'OSMOSIS': 'OSMO',
  'Osmosis': 'OSMO',
};

/**
 * Normalize a network name to its canonical form
 *
 * @param networkName - Exchange-specific network name
 * @returns Canonical network name, or the original if no mapping exists
 *
 * @example
 * normalizeNetwork('ERC20') // => 'ETH-ERC20'
 * normalizeNetwork('BEP20') // => 'BSC-BEP20'
 * normalizeNetwork('Ethereum') // => 'ETH-ERC20'
 */
export function normalizeNetwork(networkName: string): string {
  if (!networkName) {
    return networkName;
  }

  // Try exact match first
  const normalized = NETWORK_MAPPINGS[networkName];
  if (normalized) {
    return normalized;
  }

  // Try uppercase match
  const upperNormalized = NETWORK_MAPPINGS[networkName.toUpperCase()];
  if (upperNormalized) {
    return upperNormalized;
  }

  // Try case-insensitive search
  const lowerNetworkName = networkName.toLowerCase();
  for (const [key, value] of Object.entries(NETWORK_MAPPINGS)) {
    if (key.toLowerCase() === lowerNetworkName) {
      return value;
    }
  }

  // Return original if no mapping found
  return networkName;
}

/**
 * Check if two network names are equivalent after normalization
 *
 * @param networkA - First network name
 * @param networkB - Second network name
 * @returns True if networks are equivalent
 *
 * @example
 * areNetworksEqual('ERC20', 'ETH') // => true
 * areNetworksEqual('BEP20', 'BSC') // => true
 * areNetworksEqual('BTC', 'ETH') // => false
 */
export function areNetworksEqual(networkA: string, networkB: string): boolean {
  return normalizeNetwork(networkA) === normalizeNetwork(networkB);
}

/**
 * Get all exchange-specific names for a canonical network
 *
 * @param canonicalNetwork - Canonical network name
 * @returns Array of exchange-specific network names
 *
 * @example
 * getNetworkAliases('ETH-ERC20') // => ['ETH', 'ETHEREUM', 'ERC20', ...]
 */
export function getNetworkAliases(canonicalNetwork: CanonicalNetwork): string[] {
  return Object.entries(NETWORK_MAPPINGS)
    .filter(([_, value]) => value === canonicalNetwork)
    .map(([key]) => key);
}
