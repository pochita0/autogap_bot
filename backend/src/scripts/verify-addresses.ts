/**
 * Verify Imported Deposit Addresses
 *
 * This script verifies that deposit addresses were properly imported
 * and can be retrieved correctly.
 */

import { mockDepositAddressRepository } from '../db/MockDepositAddressRepository';

async function verifyAddresses() {
  console.log('🔍 Verifying imported deposit addresses...\n');

  // Get all addresses
  const allAddresses = await mockDepositAddressRepository.getAll();
  console.log(`Total addresses in repository: ${allAddresses.length}`);

  // Group by exchange
  const byExchange = allAddresses.reduce((acc, addr) => {
    if (!acc[addr.exchangeId]) {
      acc[addr.exchangeId] = {
        count: 0,
        symbols: new Set<string>(),
        networks: new Set<string>(),
      };
    }
    acc[addr.exchangeId].count++;
    acc[addr.exchangeId].symbols.add(addr.symbol);
    acc[addr.exchangeId].networks.add(addr.networkId);
    return acc;
  }, {} as Record<string, { count: number; symbols: Set<string>; networks: Set<string> }>);

  console.log('\n📊 Summary by Exchange:');
  Object.entries(byExchange).forEach(([exchange, data]) => {
    console.log(`\n${exchange}:`);
    console.log(`  Total addresses: ${data.count}`);
    console.log(`  Unique symbols: ${data.symbols.size}`);
    console.log(`  Unique networks: ${data.networks.size}`);
  });

  // Test specific lookups
  console.log('\n🔎 Testing specific address lookups:');

  const testCases = [
    { exchangeId: 'OKX', symbol: 'BTC', networkId: 'BTC-Bitcoin' },
    { exchangeId: 'UPBIT', symbol: 'BTC', networkId: 'BTC' },
    { exchangeId: 'BINANCE', symbol: 'BTC', networkId: 'BTC' },
    { exchangeId: 'BYBIT', symbol: 'BTC', networkId: 'BTC' },
  ];

  for (const testCase of testCases) {
    const address = await mockDepositAddressRepository.get(testCase);
    if (address) {
      console.log(`\n✅ ${testCase.exchangeId} ${testCase.symbol} (${testCase.networkId}):`);
      console.log(`   Address: ${address.address.substring(0, 10)}...`);
      if (address.memo) {
        console.log(`   Memo: ${address.memo}`);
      }
    } else {
      console.log(`\n❌ ${testCase.exchangeId} ${testCase.symbol} (${testCase.networkId}): NOT FOUND`);
    }
  }

  // List ETH addresses across exchanges
  console.log('\n💎 ETH addresses across exchanges:');
  const exchanges = ['OKX', 'UPBIT', 'BINANCE', 'BYBIT'];
  for (const exchangeId of exchanges) {
    const ethAddresses = await mockDepositAddressRepository.list({
      exchangeId,
      symbol: 'ETH',
    });
    console.log(`  ${exchangeId}: ${ethAddresses.length} ETH address(es)`);
    ethAddresses.forEach((addr) => {
      console.log(`    - ${addr.networkId}: ${addr.address.substring(0, 10)}...`);
    });
  }

  console.log('\n✅ Verification complete!');
}

// Run if called directly
if (require.main === module) {
  verifyAddresses()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyAddresses };
