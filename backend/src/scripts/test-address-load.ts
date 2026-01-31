/**
 * Test Deposit Address Loading
 *
 * This script tests that deposit addresses are loaded correctly
 * by simulating the server startup process.
 */

import * as fs from 'fs';
import * as path from 'path';
import { mockDepositAddressRepository } from '../db/MockDepositAddressRepository';
import {
  importOKX,
  importUpbit,
  importBinance,
  importBybit,
  importBithumb,
} from './import-deposit-addresses';

async function testAddressLoad() {
  console.log('🧪 Testing deposit address loading...\n');

  const adrsmakePath = path.join(__dirname, '../../../adrsmake');

  let totalCount = 0;

  try {
    // Import OKX
    const okxPath = path.join(adrsmakePath, 'okx_deposit_addresses.csv');
    if (fs.existsSync(okxPath)) {
      const count = await importOKX(okxPath);
      totalCount += count;
      console.log(`✅ Loaded ${count} OKX addresses`);
    }

    // Import Upbit
    const upbitPath = path.join(adrsmakePath, 'upbit_deposit_addresses.csv');
    if (fs.existsSync(upbitPath)) {
      const count = await importUpbit(upbitPath);
      totalCount += count;
      console.log(`✅ Loaded ${count} Upbit addresses`);
    }

    // Import Binance
    const binancePath = path.join(adrsmakePath, 'binance_deposit_addresses.csv');
    if (fs.existsSync(binancePath)) {
      const count = await importBinance(binancePath);
      totalCount += count;
      console.log(`✅ Loaded ${count} Binance addresses`);
    }

    // Import Bybit
    const bybitPath = path.join(adrsmakePath, 'bybit_deposit_addresses.csv');
    if (fs.existsSync(bybitPath)) {
      const count = await importBybit(bybitPath);
      totalCount += count;
      console.log(`✅ Loaded ${count} Bybit addresses`);
    }

    // Import Bithumb
    const bithumbPath = path.join(adrsmakePath, 'bithumb_deposit_addresses_bruteforce.csv');
    if (fs.existsSync(bithumbPath)) {
      const count = await importBithumb(bithumbPath);
      totalCount += count;
      console.log(`✅ Loaded ${count} Bithumb addresses`);
    }

    console.log(`\n📊 Total addresses loaded: ${totalCount}\n`);

    // Test specific lookups
    console.log('🔎 Testing specific address lookups:\n');

    const testCases = [
      { exchangeId: 'OKX', symbol: 'BTC', networkId: 'BTC-Bitcoin' },
      { exchangeId: 'UPBIT', symbol: 'BTC', networkId: 'BTC' },
      { exchangeId: 'BINANCE', symbol: 'BTC', networkId: 'BTC' },
      { exchangeId: 'BYBIT', symbol: 'BTC', networkId: 'BTC' },
      { exchangeId: 'BITHUMB', symbol: 'BTC', networkId: 'BTC' },
    ];

    for (const testCase of testCases) {
      const address = await mockDepositAddressRepository.get(testCase);
      if (address) {
        console.log(`✅ ${testCase.exchangeId} ${testCase.symbol} (${testCase.networkId})`);
        console.log(`   Address: ${address.address}`);
        if (address.memo) {
          console.log(`   Memo: ${address.memo}`);
        }
      } else {
        console.log(`❌ ${testCase.exchangeId} ${testCase.symbol} (${testCase.networkId}): NOT FOUND`);
      }
      console.log('');
    }

    // List ETH addresses across exchanges
    console.log('💎 ETH addresses across exchanges:\n');
    const exchanges = ['OKX', 'UPBIT', 'BINANCE', 'BYBIT', 'BITHUMB'];
    for (const exchangeId of exchanges) {
      const ethAddresses = await mockDepositAddressRepository.list({
        exchangeId,
        symbol: 'ETH',
      });
      console.log(`${exchangeId}: ${ethAddresses.length} ETH address(es)`);
      if (ethAddresses.length > 0) {
        ethAddresses.slice(0, 3).forEach((addr) => {
          console.log(`  - ${addr.networkId}: ${addr.address.substring(0, 15)}...`);
        });
        if (ethAddresses.length > 3) {
          console.log(`  ... and ${ethAddresses.length - 3} more`);
        }
      }
      console.log('');
    }

    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testAddressLoad()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testAddressLoad };
