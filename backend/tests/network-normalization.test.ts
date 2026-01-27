/**
 * Network Normalization Tests
 *
 * Tests for normalizeNetwork() and network mapping functionality
 */

import {
  normalizeNetwork,
  areNetworksEqual,
  getNetworkAliases,
} from '../src/config/network-mappings';

console.log('='.repeat(80));
console.log('NETWORK NORMALIZATION TESTS');
console.log('='.repeat(80));

// Test counter
let passed = 0;
let failed = 0;

function test(name: string, actual: unknown, expected: unknown) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

// Test 1: Exact matches
console.log('\n--- Test 1: Exact Matches ---');
test('BTC → BTC', normalizeNetwork('BTC'), 'BTC');
test('ETH → ETH-ERC20', normalizeNetwork('ETH'), 'ETH-ERC20');
test('ERC20 → ETH-ERC20', normalizeNetwork('ERC20'), 'ETH-ERC20');
test('BSC → BSC-BEP20', normalizeNetwork('BSC'), 'BSC-BEP20');
test('BEP20 → BSC-BEP20', normalizeNetwork('BEP20'), 'BSC-BEP20');
test('TRX → TRX-TRC20', normalizeNetwork('TRX'), 'TRX-TRC20');
test('TRC20 → TRX-TRC20', normalizeNetwork('TRC20'), 'TRX-TRC20');

// Test 2: Case-insensitive matches
console.log('\n--- Test 2: Case-Insensitive Matches ---');
test('bitcoin → BTC', normalizeNetwork('bitcoin'), 'BTC');
test('ETHEREUM → ETH-ERC20', normalizeNetwork('ETHEREUM'), 'ETH-ERC20');
test('ethereum → ETH-ERC20', normalizeNetwork('ethereum'), 'ETH-ERC20');
test('bsc → BSC-BEP20', normalizeNetwork('bsc'), 'BSC-BEP20');
test('solana → SOLANA', normalizeNetwork('solana'), 'SOLANA');

// Test 3: Layer 2 networks
console.log('\n--- Test 3: Layer 2 Networks ---');
test('ARBITRUM → ETH-ARBITRUM', normalizeNetwork('ARBITRUM'), 'ETH-ARBITRUM');
test('Arbitrum One → ETH-ARBITRUM', normalizeNetwork('Arbitrum One'), 'ETH-ARBITRUM');
test('OPTIMISM → ETH-OPTIMISM', normalizeNetwork('OPTIMISM'), 'ETH-OPTIMISM');
test('OP → ETH-OPTIMISM', normalizeNetwork('OP'), 'ETH-OPTIMISM');
test('BASE → ETH-BASE', normalizeNetwork('BASE'), 'ETH-BASE');

// Test 4: Exchange-specific formats
console.log('\n--- Test 4: Exchange-Specific Formats ---');
test('Ethereum (ERC20) → ETH-ERC20', normalizeNetwork('Ethereum (ERC20)'), 'ETH-ERC20');
test('BSC (BEP20) → BSC-BEP20', normalizeNetwork('BSC (BEP20)'), 'BSC-BEP20');
test('Binance Smart Chain → BSC-BEP20', normalizeNetwork('Binance Smart Chain'), 'BSC-BEP20');
test('Avalanche C-Chain → AVAX-C', normalizeNetwork('Avalanche C-Chain'), 'AVAX-C');

// Test 5: Unknown networks (should return original)
console.log('\n--- Test 5: Unknown Networks ---');
test('UNKNOWN → UNKNOWN', normalizeNetwork('UNKNOWN'), 'UNKNOWN');
test('CUSTOM-NET → CUSTOM-NET', normalizeNetwork('CUSTOM-NET'), 'CUSTOM-NET');

// Test 6: Empty/null handling
console.log('\n--- Test 6: Empty/Null Handling ---');
test('Empty string → empty string', normalizeNetwork(''), '');

// Test 7: Network equality
console.log('\n--- Test 7: Network Equality ---');
test('ERC20 == ETH', areNetworksEqual('ERC20', 'ETH'), true);
test('BEP20 == BSC', areNetworksEqual('BEP20', 'BSC'), true);
test('TRC20 == TRON', areNetworksEqual('TRC20', 'TRON'), true);
test('BTC == BITCOIN', areNetworksEqual('BTC', 'BITCOIN'), true);
test('BTC != ETH', areNetworksEqual('BTC', 'ETH'), false);
test('ERC20 != TRC20', areNetworksEqual('ERC20', 'TRC20'), false);

// Test 8: Network aliases
console.log('\n--- Test 8: Network Aliases ---');
const ethAliases = getNetworkAliases('ETH-ERC20');
test(
  'ETH-ERC20 has multiple aliases',
  ethAliases.length >= 3,
  true
);
test('ETH-ERC20 aliases include ETH', ethAliases.includes('ETH'), true);
test('ETH-ERC20 aliases include ERC20', ethAliases.includes('ERC20'), true);
test('ETH-ERC20 aliases include ETHEREUM', ethAliases.includes('ETHEREUM'), true);

const bscAliases = getNetworkAliases('BSC-BEP20');
test('BSC-BEP20 has multiple aliases', bscAliases.length >= 3, true);
test('BSC-BEP20 aliases include BSC', bscAliases.includes('BSC'), true);
test('BSC-BEP20 aliases include BEP20', bscAliases.includes('BEP20'), true);

// Test 9: Real-world exchange examples
console.log('\n--- Test 9: Real-World Exchange Examples ---');
// Binance uses "ERC20", Upbit uses "Ethereum"
test('Binance ERC20 == Upbit Ethereum', areNetworksEqual('ERC20', 'Ethereum'), true);

// Binance uses "TRC20", other exchanges might use "TRON"
test('Binance TRC20 == Generic TRON', areNetworksEqual('TRC20', 'TRON'), true);

// Binance uses "BEP20", other exchanges might use "BSC"
test('Binance BEP20 == Generic BSC', areNetworksEqual('BEP20', 'BSC'), true);

// Test 10: Multi-word network names
console.log('\n--- Test 10: Multi-Word Network Names ---');
test('BNB Smart Chain → BSC-BEP20', normalizeNetwork('BNB Smart Chain'), 'BSC-BEP20');
test('Binance Smart Chain → BSC-BEP20', normalizeNetwork('Binance Smart Chain'), 'BSC-BEP20');
test('Avalanche C-Chain → AVAX-C', normalizeNetwork('Avalanche C-Chain'), 'AVAX-C');
test('Arbitrum One → ETH-ARBITRUM', normalizeNetwork('Arbitrum One'), 'ETH-ARBITRUM');

// Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log('='.repeat(80));

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED\n');
  process.exit(1);
}
