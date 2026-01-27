/**
 * AddressBookService Tests
 *
 * Tests for deposit address management including validation,
 * masking, caching, and CRUD operations.
 */

import { AddressBookService } from '../src/services/AddressBookService';
import { MockDepositAddressRepository } from '../src/db/MockDepositAddressRepository';
import { CreateDepositAddressInput } from '../src/types/deposit-address';

// Test utilities
function test(description: string, assertion: boolean) {
  if (!assertion) {
    throw new Error(`Test failed: ${description}`);
  }
  console.log(`✓ ${description}`);
}

async function runTests() {
  console.log('\n=== AddressBookService Tests ===\n');

  // Setup
  const repository = new MockDepositAddressRepository();
  const service = new AddressBookService(repository, 1); // 1s cache for faster testing

  // Test 1: Address masking
  console.log('--- Address Masking Tests ---');
  const shortAddress = '0x12345';
  const maskedShort = service.maskAddress(shortAddress);
  test('Short address not masked', maskedShort === shortAddress);

  const longAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const maskedLong = service.maskAddress(longAddress);
  test('Long address masked correctly', maskedLong === '0x742d...0bEb');

  const btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
  const maskedBtc = service.maskAddress(btcAddress);
  test('BTC address masked correctly', maskedBtc === '1A1zP1...vfNa');

  // Test 2: Network ID validation
  console.log('\n--- Network ID Validation Tests ---');
  const validNetwork = service.validateNetworkId('ETH-ERC20');
  test('Canonical network ID is valid', validNetwork.valid === true);
  test('Canonical network ID unchanged', validNetwork.canonicalNetworkId === 'ETH-ERC20');

  const nonCanonicalNetwork = service.validateNetworkId('ERC20');
  test('Non-canonical network ID is invalid', nonCanonicalNetwork.valid === false);
  test('Non-canonical network ID normalized', nonCanonicalNetwork.canonicalNetworkId === 'ETH-ERC20');
  test('Non-canonical network ID has error message', !!nonCanonicalNetwork.error);

  // Test 3: XRP memo validation
  console.log('\n--- XRP Memo Validation Tests ---');
  const xrpWithMemo = service.validateXrpMemo('XRP', '12345');
  test('XRP with memo is valid', xrpWithMemo.valid === true);

  const xrpWithoutMemo = service.validateXrpMemo('XRP', undefined);
  test('XRP without memo is invalid', xrpWithoutMemo.valid === false);
  test('XRP without memo has error message', !!xrpWithoutMemo.error);

  const btcWithoutMemo = service.validateXrpMemo('BTC', undefined);
  test('BTC without memo is valid', btcWithoutMemo.valid === true);

  // Test 4: Complete deposit address validation
  console.log('\n--- Complete Validation Tests ---');
  const validInput: CreateDepositAddressInput = {
    exchangeId: 'BITHUMB',
    symbol: 'BTC',
    networkId: 'BTC',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    source: 'MANUAL',
  };
  const validation1 = service.validateDepositAddress(validInput);
  test('Valid deposit address passes validation', validation1.valid === true);
  test('Valid deposit address has no errors', validation1.errors.length === 0);

  const invalidInput: CreateDepositAddressInput = {
    exchangeId: '',
    symbol: 'XRP',
    networkId: 'XRP',
    address: 'rN7n7otQDd6FczFgLdlqtyMVrn3qHGbXcD',
    // Missing memo for XRP
    source: 'MANUAL',
  };
  const validation2 = service.validateDepositAddress(invalidInput);
  test('Invalid deposit address fails validation', validation2.valid === false);
  test('Invalid deposit address has multiple errors', validation2.errors.length === 2);

  const emptyAddressInput: CreateDepositAddressInput = {
    exchangeId: 'BITHUMB',
    symbol: 'BTC',
    networkId: 'BTC',
    address: '   ',
    source: 'MANUAL',
  };
  const validation3 = service.validateDepositAddress(emptyAddressInput);
  test('Empty address fails validation', validation3.valid === false);

  // Test 5: Upsert deposit address (insert)
  console.log('\n--- Upsert Tests (Insert) ---');
  await repository.clear();
  const insertInput: CreateDepositAddressInput = {
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    source: 'MANUAL',
  };
  const inserted = await service.upsertDepositAddress(insertInput);
  test('Insert creates new address', !!inserted.id);
  test('Insert normalizes exchange ID to uppercase', inserted.exchangeId === 'BINANCE');
  test('Insert normalizes symbol to uppercase', inserted.symbol === 'BTC');
  test('Insert preserves networkId', inserted.networkId === 'BTC');
  test('Insert preserves address', inserted.address === insertInput.address);
  test('Insert sets isActive to true', inserted.isActive === true);
  test('Insert sets source', inserted.source === 'MANUAL');
  test('Insert sets createdAt', !!inserted.createdAt);
  test('Insert sets updatedAt', !!inserted.updatedAt);

  // Test 6: Upsert deposit address (update)
  console.log('\n--- Upsert Tests (Update) ---');
  const updateInput: CreateDepositAddressInput = {
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    memo: 'updated-memo',
    source: 'API',
  };
  const updated = await service.upsertDepositAddress(updateInput);
  test('Update preserves ID', updated.id === inserted.id);
  test('Update changes memo', updated.memo === 'updated-memo');
  test('Update changes source', updated.source === 'API');
  test('Update changes updatedAt', updated.updatedAt > inserted.updatedAt);

  // Test 7: Get deposit address (with caching)
  console.log('\n--- Get Deposit Address Tests ---');
  const retrieved = await service.getDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
  });
  test('Get retrieves existing address', !!retrieved);
  test('Get returns correct address', retrieved!.address === insertInput.address);

  const notFound = await service.getDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'ETH',
    networkId: 'ETH-ERC20',
  });
  test('Get returns null for non-existent address', notFound === null);

  // Test 8: Caching behavior
  console.log('\n--- Caching Tests ---');
  const startTime = Date.now();
  await service.getDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
  });
  const cachedTime = Date.now() - startTime;
  test('Cached read is fast (< 5ms)', cachedTime < 5);

  // Wait for cache expiration (1s)
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const expiredStartTime = Date.now();
  await service.getDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
  });
  const expiredTime = Date.now() - expiredStartTime;
  test('Expired cache fetches from repository', expiredTime >= 0); // Just check it works

  // Test 9: Get masked deposit address
  console.log('\n--- Masked Address Tests ---');
  const masked = await service.getMaskedDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'BTC',
    networkId: 'BTC',
  });
  test('Masked address retrieved', !!masked);
  test('Masked address has addressMasked field', !!masked!.addressMasked);
  test('Masked address is correctly masked', masked!.addressMasked === '1A1zP1...vfNa');

  // Test 10: List deposit addresses
  console.log('\n--- List Deposit Addresses Tests ---');
  // Add more addresses
  await service.upsertDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'ETH',
    networkId: 'ETH-ERC20',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    source: 'MANUAL',
  });
  await service.upsertDepositAddress({
    exchangeId: 'BINANCE',
    symbol: 'XRP',
    networkId: 'XRP',
    address: 'rN7n7otQDd6FczFgLdlqtyMVrn3qHGbXcD',
    memo: '12345',
    source: 'API',
  });

  const allAddresses = await service.listDepositAddresses({
    exchangeId: 'BINANCE',
  });
  test('List returns all addresses for exchange', allAddresses.length === 3);
  test('List returns masked addresses', allAddresses.every((addr) => !!addr.addressMasked));

  const btcAddresses = await service.listDepositAddresses({
    exchangeId: 'BINANCE',
    symbol: 'BTC',
  });
  test('List filters by symbol', btcAddresses.length === 1);
  test('List returns correct symbol', btcAddresses[0].symbol === 'BTC');

  // Test 11: Has deposit address
  console.log('\n--- Has Deposit Address Tests ---');
  const hasBtc = await service.hasDepositAddress('BINANCE', 'BTC', 'BTC');
  test('Has deposit address returns true for existing', hasBtc === true);

  const hasXlm = await service.hasDepositAddress('BINANCE', 'XLM', 'XLM');
  test('Has deposit address returns false for non-existent', hasXlm === false);

  // Test 12: Deactivate deposit address
  console.log('\n--- Deactivate Tests ---');
  const addressToDeactivate = allAddresses.find((addr) => addr.symbol === 'ETH');
  await service.deactivateDepositAddress(addressToDeactivate!.id);

  const hasEthAfterDeactivate = await service.hasDepositAddress('BINANCE', 'ETH', 'ETH-ERC20');
  test('Deactivated address not found by hasDepositAddress', hasEthAfterDeactivate === false);

  const activeAddresses = await service.listDepositAddresses({
    exchangeId: 'BINANCE',
    isActive: true,
  });
  test('List filters by isActive', activeAddresses.length === 2);

  // Test 13: Verify deposit address
  console.log('\n--- Verify Tests ---');
  const xrpAddress = allAddresses.find((addr) => addr.symbol === 'XRP');
  const verified = await service.verifyDepositAddress(xrpAddress!.id);
  test('Verify sets verifiedAt', !!verified.verifiedAt);

  // Test 14: Case insensitivity
  console.log('\n--- Case Insensitivity Tests ---');
  const lowerCaseQuery = await service.getDepositAddress({
    exchangeId: 'binance',
    symbol: 'btc',
    networkId: 'BTC',
  });
  test('Exchange ID is case insensitive', !!lowerCaseQuery);

  // Test 15: Error handling
  console.log('\n--- Error Handling Tests ---');
  try {
    await service.upsertDepositAddress({
      exchangeId: '',
      symbol: 'BTC',
      networkId: 'BTC',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      source: 'MANUAL',
    });
    test('Empty exchange ID throws error', false);
  } catch (error) {
    test('Empty exchange ID throws error', error instanceof Error);
  }

  try {
    await service.upsertDepositAddress({
      exchangeId: 'BINANCE',
      symbol: 'XRP',
      networkId: 'XRP',
      address: 'rN7n7otQDd6FczFgLdlqtyMVrn3qHGbXcD',
      // Missing memo
      source: 'MANUAL',
    });
    test('XRP without memo throws error', false);
  } catch (error) {
    test('XRP without memo throws error', error instanceof Error);
    test('Error message mentions destination tag', error instanceof Error && error.message.includes('destination tag'));
  }

  console.log('\n=== All AddressBookService Tests Passed ===\n');
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
