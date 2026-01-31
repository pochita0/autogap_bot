/**
 * Import Deposit Addresses from CSV Files
 *
 * This script imports deposit addresses from exchange CSV files
 * and adds them to the MockDepositAddressRepository.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { mockDepositAddressRepository } from '../db/MockDepositAddressRepository';

interface OKXRecord {
  currency: string;
  chain: string;
  address: string;
  tag: string;
  selected: string;
}

interface UpbitRecord {
  currency: string;
  net_type: string;
  deposit_address: string;
  secondary_address: string;
}

interface BinanceRecord {
  coin: string;
  network: string;
  address: string;
  tag: string;
  url: string;
  full_response: string;
}

interface BybitRecord {
  coin: string;
  chain: string;
  chainType: string;
  addressDeposit: string;
  tagDeposit: string;
  [key: string]: string;
}

interface BithumbRecord {
  currency: string;
  net_type: string;
  address: string;
  secondary_address: string;
  response_msg: string;
}

async function importOKX(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: OKXRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    if (!record.address || record.address.trim() === '') continue;

    await mockDepositAddressRepository.upsert({
      exchangeId: 'OKX',
      symbol: record.currency,
      networkId: record.chain,
      address: record.address,
      memo: record.tag || undefined,
      source: 'MANUAL',
    });
    count++;
  }

  return count;
}

async function importUpbit(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: UpbitRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    if (!record.deposit_address || record.deposit_address.trim() === '') continue;

    await mockDepositAddressRepository.upsert({
      exchangeId: 'UPBIT',
      symbol: record.currency,
      networkId: record.net_type,
      address: record.deposit_address,
      memo: record.secondary_address || undefined,
      source: 'MANUAL',
    });
    count++;
  }

  return count;
}

async function importBinance(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: BinanceRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    if (!record.address || record.address.trim() === '') continue;

    await mockDepositAddressRepository.upsert({
      exchangeId: 'BINANCE',
      symbol: record.coin,
      networkId: record.network,
      address: record.address,
      memo: record.tag || undefined,
      source: 'MANUAL',
    });
    count++;
  }

  return count;
}

async function importBybit(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: BybitRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    if (!record.addressDeposit || record.addressDeposit.trim() === '') continue;

    await mockDepositAddressRepository.upsert({
      exchangeId: 'BYBIT',
      symbol: record.coin,
      networkId: record.chain,
      address: record.addressDeposit,
      memo: record.tagDeposit || undefined,
      source: 'MANUAL',
    });
    count++;
  }

  return count;
}

async function importBithumb(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: BithumbRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    // Skip if no address or failed response
    if (!record.address || record.address.trim() === '' || record.response_msg !== 'Success') {
      continue;
    }

    await mockDepositAddressRepository.upsert({
      exchangeId: 'BITHUMB',
      symbol: record.currency,
      networkId: record.net_type,
      address: record.address,
      memo: record.secondary_address || undefined,
      source: 'MANUAL',
    });
    count++;
  }

  return count;
}

async function main() {
  const adrsmakePath = path.join(__dirname, '../../../adrsmake');

  let totalCount = 0;

  // Import OKX
  const okxPath = path.join(adrsmakePath, 'okx_deposit_addresses.csv');
  if (fs.existsSync(okxPath)) {
    totalCount += await importOKX(okxPath);
  } else {
    console.log(`OKX file not found: ${okxPath}`);
  }

  // Import Upbit
  const upbitPath = path.join(adrsmakePath, 'upbit_deposit_addresses.csv');
  if (fs.existsSync(upbitPath)) {
    totalCount += await importUpbit(upbitPath);
  } else {
    console.log(`Upbit file not found: ${upbitPath}`);
  }

  // Import Binance
  const binancePath = path.join(adrsmakePath, 'binance_deposit_addresses.csv');
  if (fs.existsSync(binancePath)) {
    totalCount += await importBinance(binancePath);
  } else {
    console.log(`Binance file not found: ${binancePath}`);
  }

  // Import Bybit
  const bybitPath = path.join(adrsmakePath, 'bybit_deposit_addresses.csv');
  if (fs.existsSync(bybitPath)) {
    totalCount += await importBybit(bybitPath);
  } else {
    console.log(`Bybit file not found: ${bybitPath}`);
  }

  // Import Bithumb
  const bithumbPath = path.join(adrsmakePath, 'bithumb_deposit_addresses_bruteforce.csv');
  if (fs.existsSync(bithumbPath)) {
    totalCount += await importBithumb(bithumbPath);
  } else {
    console.log(`Bithumb file not found: ${bithumbPath}`);
  }

  console.log(`\n✅ Total addresses imported: ${totalCount}`);

  // Show summary
  const allAddresses = await mockDepositAddressRepository.getAll();
  const byExchange = allAddresses.reduce((acc, addr) => {
    acc[addr.exchangeId] = (acc[addr.exchangeId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 Summary by Exchange:');
  Object.entries(byExchange).forEach(([exchange, count]) => {
    console.log(`  ${exchange}: ${count} addresses`);
  });
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

export { importOKX, importUpbit, importBinance, importBybit, importBithumb };
