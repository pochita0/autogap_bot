/**
 * Common Networks Intersection Tests
 *
 * Tests for wallet status and common network detection
 */

import { MockWalletStatusConnector } from '../src/connectors/MockWalletStatusConnector';

const connector = new MockWalletStatusConnector();

console.log('='.repeat(80));
console.log('COMMON NETWORKS INTERSECTION TESTS');
console.log('='.repeat(80));

// Test counter
let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`✓ ${name}`);
    if (details) {
      console.log(`  ${details}`);
    }
    passed++;
  } else {
    console.log(`✗ ${name}`);
    if (details) {
      console.log(`  ${details}`);
    }
    failed++;
  }
}

async function runTests() {
  // Test 1: Binance BTC wallet status
  console.log('\n--- Test 1: Binance BTC Wallet Status ---');
  const binanceBtc = await connector.fetchWalletStatus('Binance', 'BTC');
  test('Binance BTC has networks', binanceBtc.networks.length > 0);
  test('Binance BTC has deposit enabled', binanceBtc.hasDepositEnabled);
  test('Binance BTC has withdraw enabled', binanceBtc.hasWithdrawEnabled);
  test(
    'Binance BTC has 1 open network',
    binanceBtc.openNetworksCount === 1,
    `Got: ${binanceBtc.openNetworksCount}`
  );
  test('Binance BTC has BTC network', binanceBtc.networks[0].network === 'BTC');
  test(
    'Binance BTC network is normalized to BTC',
    binanceBtc.networks[0].normalizedNetwork === 'BTC'
  );

  // Test 2: Binance ETH wallet status (multiple networks)
  console.log('\n--- Test 2: Binance ETH Wallet Status (Multiple Networks) ---');
  const binanceEth = await connector.fetchWalletStatus('Binance', 'ETH');
  test(
    'Binance ETH has 3 networks',
    binanceEth.networks.length === 3,
    `Got: ${binanceEth.networks.length}`
  );
  test('Binance ETH has deposit enabled', binanceEth.hasDepositEnabled);
  test('Binance ETH has withdraw enabled', binanceEth.hasWithdrawEnabled);
  test(
    'Binance ETH has 2 open networks (OPTIMISM withdraw disabled)',
    binanceEth.openNetworksCount === 2,
    `Got: ${binanceEth.openNetworksCount}`
  );

  // Test 3: OKX BTC wallet status (withdraw disabled)
  console.log('\n--- Test 3: OKX BTC Wallet Status (Withdraw Disabled) ---');
  const okxBtc = await connector.fetchWalletStatus('OKX', 'BTC');
  test('OKX BTC has networks', okxBtc.networks.length > 0);
  test('OKX BTC has deposit enabled', okxBtc.hasDepositEnabled);
  test('OKX BTC has withdraw DISABLED', !okxBtc.hasWithdrawEnabled);
  test(
    'OKX BTC has 0 open networks',
    okxBtc.openNetworksCount === 0,
    `Got: ${okxBtc.openNetworksCount}`
  );

  // Test 4: Unknown exchange/symbol
  console.log('\n--- Test 4: Unknown Exchange/Symbol ---');
  const unknown = await connector.fetchWalletStatus('UnknownExchange', 'UNKNOWN');
  test('Unknown exchange returns empty networks', unknown.networks.length === 0);
  test('Unknown exchange has no deposit enabled', !unknown.hasDepositEnabled);
  test('Unknown exchange has no withdraw enabled', !unknown.hasWithdrawEnabled);
  test('Unknown exchange has 0 open networks', unknown.openNetworksCount === 0);

  // Test 5: Common networks - Binance ↔ Upbit BTC
  console.log('\n--- Test 5: Common Networks - Binance ↔ Upbit BTC ---');
  const binanceUpbitBtc = await connector.fetchCommonNetworks('Binance', 'Upbit', 'BTC');
  test(
    'Binance ↔ Upbit BTC has 1 common network',
    binanceUpbitBtc.commonNetworks.length === 1,
    `Got: ${binanceUpbitBtc.commonNetworks.length}`
  );
  test(
    'Binance ↔ Upbit BTC common network is BTC',
    binanceUpbitBtc.commonNetworks[0].network === 'BTC'
  );
  test(
    'Binance ↔ Upbit BTC common network is fully open',
    binanceUpbitBtc.commonNetworks[0].isFullyOpen
  );
  test(
    'Binance ↔ Upbit BTC has 1 fully open network',
    binanceUpbitBtc.fullyOpenNetworksCount === 1
  );

  // Test 6: Common networks - Binance ↔ Bybit ETH (multiple networks)
  console.log('\n--- Test 6: Common Networks - Binance ↔ Bybit ETH ---');
  const binanceBybitEth = await connector.fetchCommonNetworks('Binance', 'Bybit', 'ETH');
  test(
    'Binance ↔ Bybit ETH has 3 common networks',
    binanceBybitEth.commonNetworks.length === 3,
    `Got: ${binanceBybitEth.commonNetworks.length}`
  );

  // Check ERC20 network
  const erc20Network = binanceBybitEth.commonNetworks.find((n) => n.network === 'ETH-ERC20');
  test('Binance ↔ Bybit ETH has ERC20 network', !!erc20Network);
  if (erc20Network) {
    test('ERC20 network is fully open', erc20Network.isFullyOpen);
    test(
      'ERC20 network names match after normalization',
      erc20Network.exchangeANetwork === 'ETH' &&
        erc20Network.exchangeBNetwork === 'Ethereum (ERC20)'
    );
  }

  // Check ARBITRUM network
  const arbitrumNetwork = binanceBybitEth.commonNetworks.find(
    (n) => n.network === 'ETH-ARBITRUM'
  );
  test('Binance ↔ Bybit ETH has ARBITRUM network', !!arbitrumNetwork);
  if (arbitrumNetwork) {
    test('ARBITRUM network is fully open', arbitrumNetwork.isFullyOpen);
  }

  // Check OPTIMISM network (partially disabled)
  const optimismNetwork = binanceBybitEth.commonNetworks.find(
    (n) => n.network === 'ETH-OPTIMISM'
  );
  test('Binance ↔ Bybit ETH has OPTIMISM network', !!optimismNetwork);
  if (optimismNetwork) {
    test(
      'OPTIMISM network is NOT fully open (Binance withdraw disabled, Bybit deposit disabled)',
      !optimismNetwork.isFullyOpen
    );
    test(
      'OPTIMISM network has deposit disabled',
      !optimismNetwork.depositEnabled,
      'Bybit has deposit disabled for OPTIMISM'
    );
    test(
      'OPTIMISM network has withdraw disabled',
      !optimismNetwork.withdrawEnabled,
      'Binance has withdraw disabled for OPTIMISM'
    );
  }

  // Count fully open networks
  test(
    'Binance ↔ Bybit ETH has 2 fully open networks (ERC20, ARBITRUM)',
    binanceBybitEth.fullyOpenNetworksCount === 2,
    `Got: ${binanceBybitEth.fullyOpenNetworksCount}`
  );

  // Test 7: Common networks - Binance ↔ OKX BTC (one side disabled)
  console.log('\n--- Test 7: Common Networks - Binance ↔ OKX BTC (OKX Withdraw Disabled) ---');
  const binanceOkxBtc = await connector.fetchCommonNetworks('Binance', 'OKX', 'BTC');
  test(
    'Binance ↔ OKX BTC has 1 common network',
    binanceOkxBtc.commonNetworks.length === 1
  );
  test('Binance ↔ OKX BTC common network is BTC', binanceOkxBtc.commonNetworks[0].network === 'BTC');
  test(
    'Binance ↔ OKX BTC common network is NOT fully open',
    !binanceOkxBtc.commonNetworks[0].isFullyOpen
  );
  test(
    'Binance ↔ OKX BTC has deposit enabled (both sides)',
    binanceOkxBtc.commonNetworks[0].depositEnabled
  );
  test(
    'Binance ↔ OKX BTC has withdraw DISABLED (OKX side)',
    !binanceOkxBtc.commonNetworks[0].withdrawEnabled
  );
  test(
    'Binance ↔ OKX BTC has 0 fully open networks',
    binanceOkxBtc.fullyOpenNetworksCount === 0
  );

  // Test 8: Common networks - Binance ↔ Bithumb XRP (deposit disabled on Bithumb)
  console.log('\n--- Test 8: Common Networks - Binance ↔ Bithumb XRP (No Shared Networks) ---');
  const binanceBithumbXrp = await connector.fetchCommonNetworks('Binance', 'Bithumb', 'XRP');
  test(
    'Binance ↔ Bithumb XRP has 0 common networks (Binance has no XRP)',
    binanceBithumbXrp.commonNetworks.length === 0,
    `Got: ${binanceBithumbXrp.commonNetworks.length}`
  );
  test(
    'Binance ↔ Bithumb XRP has 0 fully open networks',
    binanceBithumbXrp.fullyOpenNetworksCount === 0
  );

  // Test 9: Common networks - Upbit ↔ Bithumb XRP
  console.log('\n--- Test 9: Common Networks - Upbit ↔ Bithumb XRP (Partial Disable) ---');
  const upbitBithumbXrp = await connector.fetchCommonNetworks('Upbit', 'Bithumb', 'XRP');
  test(
    'Upbit ↔ Bithumb XRP has 1 common network',
    upbitBithumbXrp.commonNetworks.length === 1
  );
  if (upbitBithumbXrp.commonNetworks.length > 0) {
    test(
      'Upbit ↔ Bithumb XRP common network is NOT fully open (Bithumb deposit disabled)',
      !upbitBithumbXrp.commonNetworks[0].isFullyOpen
    );
    test(
      'Upbit ↔ Bithumb XRP has 0 fully open networks',
      upbitBithumbXrp.fullyOpenNetworksCount === 0
    );
  }

  // Test 10: Same exchange (should work)
  console.log('\n--- Test 10: Same Exchange - Binance ↔ Binance BTC ---');
  const binanceBinanceBtc = await connector.fetchCommonNetworks('Binance', 'Binance', 'BTC');
  test(
    'Binance ↔ Binance BTC has 1 common network',
    binanceBinanceBtc.commonNetworks.length === 1
  );
  test(
    'Binance ↔ Binance BTC is fully open',
    binanceBinanceBtc.commonNetworks[0].isFullyOpen
  );
  test(
    'Binance ↔ Binance BTC has 1 fully open network',
    binanceBinanceBtc.fullyOpenNetworksCount === 1
  );

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
}

runTests().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
