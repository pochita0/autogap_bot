import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { dummyOpportunities } from './fixtures/opportunities.dummy';
import { goldenOpportunities } from './fixtures/opportunities.golden';
import { Opportunity } from './types/opportunity';
import { WalletStatus, CommonNetworksResponse } from './types/wallet-status';
import { MockWalletStatusConnector } from './connectors/MockWalletStatusConnector';
import { walletStatusCache } from './services/CacheService';
import { WalletEnrichmentService } from './services/WalletEnrichmentService';
import { fxRateService } from './services/FxRateService';
import { KimchiGapCalculator } from './services/KimchiGapCalculator';
import { mockDepositAddressRepository } from './db/MockDepositAddressRepository';
import { AddressBookService } from './services/AddressBookService';
import { CreateDepositAddressInput } from './types/deposit-address';
import { PrecheckService } from './services/PrecheckService';
import { PremiumCalculator } from './services/PremiumCalculator';
import { PremiumOpportunitiesResponse } from './types/premium';
import {
  bithumbQuotes,
  binanceQuotes,
  getAvailableSymbols,
  getBithumbQuote,
  getBinanceQuote,
} from './fixtures/premium.fixtures';

// Load environment variables
dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001';
const VERSION = '0.1.0';

// Create Fastify instance
const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS plugin
server.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

// Initialize wallet status connector
const walletStatusConnector = new MockWalletStatusConnector();

// Initialize wallet enrichment service
const walletEnrichmentService = new WalletEnrichmentService(walletStatusConnector);

// Initialize Kimchi Gap calculator
const kimchiGapCalculator = new KimchiGapCalculator(fxRateService);

// Initialize Address Book service
const addressBookService = new AddressBookService(mockDepositAddressRepository, 60);

// Initialize Precheck service
const precheckService = new PrecheckService(addressBookService);

// Initialize Premium Calculator
const premiumCalculator = new PremiumCalculator(fxRateService);

// Types for responses
interface HealthResponse {
  ok: boolean;
  version: string;
  time: string;
}

interface OpportunitiesResponse {
  dataset: 'dummy' | 'golden';
  count: number;
  data: Opportunity[];
}

// GET /health - Health check endpoint
server.get<{ Reply: HealthResponse }>('/health', async (request, reply) => {
  return {
    ok: true,
    version: VERSION,
    time: new Date().toISOString(),
  };
});

// GET /opportunities - Get opportunities by dataset
server.get<{
  Querystring: { dataset?: 'dummy' | 'golden'; enrichWallet?: string };
  Reply: OpportunitiesResponse;
}>('/opportunities', async (request, reply) => {
  const { dataset = 'dummy', enrichWallet: enrichWalletParam } = request.query;

  // Parse enrichWallet (default: true)
  const enrichWallet = enrichWalletParam !== 'false';

  // Validate dataset parameter
  if (dataset !== 'dummy' && dataset !== 'golden') {
    return reply.status(400).send({
      error: 'Invalid dataset parameter',
      message: 'dataset must be "dummy" or "golden"',
    });
  }

  // Select appropriate dataset
  let opportunities = dataset === 'golden' ? goldenOpportunities : dummyOpportunities;

  // Enrich Kimchi Premium opportunities with FX-normalized gaps
  server.log.info(`Enriching Kimchi Premium opportunities with FX rates`);
  const fxStartTime = Date.now();
  opportunities = await kimchiGapCalculator.enrichOpportunitiesWithFxGaps(opportunities);
  const fxDuration = Date.now() - fxStartTime;
  server.log.info(`FX enrichment completed in ${fxDuration}ms`);

  // Enrich with wallet status if requested
  if (enrichWallet) {
    server.log.info(`Enriching ${opportunities.length} opportunities with wallet status`);
    const walletStartTime = Date.now();

    opportunities = await walletEnrichmentService.enrichOpportunities(opportunities);

    const walletDuration = Date.now() - walletStartTime;
    server.log.info(`Wallet enrichment completed in ${walletDuration}ms`);
  }

  return {
    dataset,
    count: opportunities.length,
    data: opportunities,
  };
});

// GET /wallet-status - Get wallet status for a symbol on an exchange
server.get<{
  Querystring: { exchange: string; symbol: string };
  Reply: WalletStatus;
}>('/wallet-status', async (request, reply) => {
  const { exchange, symbol } = request.query;

  // Validate required parameters
  if (!exchange || !symbol) {
    return reply.status(400).send({
      error: 'Missing required parameters',
      message: 'Both exchange and symbol are required',
    });
  }

  // Check cache first
  const cacheKey = `wallet-status:${exchange}:${symbol}`;
  const cached = walletStatusCache.get<WalletStatus>(cacheKey);

  if (cached) {
    server.log.info(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  // Fetch from connector
  server.log.info(`Cache MISS: ${cacheKey}, fetching from connector`);
  const walletStatus = await walletStatusConnector.fetchWalletStatus(exchange, symbol);

  // Store in cache (60s TTL)
  walletStatusCache.set(cacheKey, walletStatus);

  return walletStatus;
});

// GET /wallet-status/common - Get common networks between two exchanges
server.get<{
  Querystring: { exchangeA: string; exchangeB: string; symbol: string };
  Reply: CommonNetworksResponse;
}>('/wallet-status/common', async (request, reply) => {
  const { exchangeA, exchangeB, symbol } = request.query;

  // Validate required parameters
  if (!exchangeA || !exchangeB || !symbol) {
    return reply.status(400).send({
      error: 'Missing required parameters',
      message: 'exchangeA, exchangeB, and symbol are required',
    });
  }

  // Check cache first
  const cacheKey = `wallet-status:common:${exchangeA}:${exchangeB}:${symbol}`;
  const cached = walletStatusCache.get<CommonNetworksResponse>(cacheKey);

  if (cached) {
    server.log.info(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  // Fetch from connector
  server.log.info(`Cache MISS: ${cacheKey}, fetching from connector`);
  const commonNetworks = await walletStatusConnector.fetchCommonNetworks(
    exchangeA,
    exchangeB,
    symbol
  );

  // Store in cache (60s TTL)
  walletStatusCache.set(cacheKey, commonNetworks);

  return commonNetworks;
});

// GET /fx-rate - Get current USDT/KRW FX rate
server.get('/fx-rate', async (request, reply) => {
  const rateData = await fxRateService.getUsdtKrwRateWithMetadata();
  return rateData;
});

// GET /address-book/deposit - Get a deposit address (masked)
server.get<{
  Querystring: { exchange: string; symbol: string; networkId: string };
}>('/address-book/deposit', async (request, reply) => {
  const { exchange, symbol, networkId } = request.query;

  // Validate required parameters
  if (!exchange || !symbol || !networkId) {
    return reply.status(400).send({
      error: 'Missing required parameters',
      message: 'exchange, symbol, and networkId are required',
    });
  }

  // Get masked deposit address
  const address = await addressBookService.getMaskedDepositAddress({
    exchangeId: exchange,
    symbol,
    networkId,
  });

  if (!address) {
    return reply.status(404).send({
      error: 'Not found',
      message: `No deposit address found for ${exchange}/${symbol} on ${networkId}`,
    });
  }

  return address;
});

// POST /address-book/deposit - Register a deposit address manually
server.post<{
  Body: CreateDepositAddressInput;
}>('/address-book/deposit', async (request, reply) => {
  const input = request.body;

  // Validate required fields
  if (!input.exchangeId || !input.symbol || !input.networkId || !input.address || !input.source) {
    return reply.status(400).send({
      error: 'Missing required fields',
      message: 'exchangeId, symbol, networkId, address, and source are required',
    });
  }

  // Validate source
  if (input.source !== 'MANUAL' && input.source !== 'API') {
    return reply.status(400).send({
      error: 'Invalid source',
      message: 'source must be "MANUAL" or "API"',
    });
  }

  try {
    const address = await addressBookService.upsertDepositAddress(input);

    // Return masked version
    return {
      ...address,
      address: addressBookService.maskAddress(address.address),
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /address-book/deposit/list - List deposit addresses for an exchange
server.get<{
  Querystring: { exchange: string; symbol?: string; isActive?: string };
}>('/address-book/deposit/list', async (request, reply) => {
  const { exchange, symbol, isActive } = request.query;

  // Validate required parameters
  if (!exchange) {
    return reply.status(400).send({
      error: 'Missing required parameter',
      message: 'exchange is required',
    });
  }

  // Parse isActive (optional boolean)
  const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

  // List deposit addresses (masked)
  const addresses = await addressBookService.listDepositAddresses({
    exchangeId: exchange,
    symbol,
    isActive: isActiveFilter,
  });

  return {
    exchange,
    symbol: symbol || 'all',
    count: addresses.length,
    data: addresses,
  };
});

// POST /precheck - Precheck an opportunity for execution
server.post<{
  Body: { opportunity: Opportunity };
}>('/precheck', async (request, reply) => {
  const { opportunity } = request.body;

  // Validate required fields
  if (!opportunity || !opportunity.id || !opportunity.type) {
    return reply.status(400).send({
      error: 'Invalid request',
      message: 'opportunity object with id and type is required',
    });
  }

  try {
    const result = await precheckService.precheck(opportunity);

    return {
      opportunityId: opportunity.id,
      ...result,
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Precheck failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /premiums - Get premium opportunities (김프 and 역프)
server.get<{
  Querystring: { symbol?: string; krwExchange?: string; globalExchange?: string };
  Reply: PremiumOpportunitiesResponse;
}>('/premiums', async (request, reply) => {
  const { symbol, krwExchange = 'BITHUMB', globalExchange = 'BINANCE' } = request.query;

  server.log.info(`Fetching premium opportunities for ${symbol || 'all symbols'}`);

  // Filter quotes by symbol if specified
  let krwQuotes = bithumbQuotes;
  let globalQuotes = binanceQuotes;

  if (symbol) {
    const krwQuote = getBithumbQuote(symbol.toUpperCase());
    const globalQuote = getBinanceQuote(symbol.toUpperCase());

    if (!krwQuote || !globalQuote) {
      return reply.status(404).send({
        error: 'Symbol not found',
        message: `No quotes found for symbol ${symbol}`,
      });
    }

    krwQuotes = [krwQuote];
    globalQuotes = [globalQuote];
  }

  // Calculate premium opportunities
  const result = await premiumCalculator.getPremiumOpportunitiesWithMetadata(
    krwQuotes,
    globalQuotes
  );

  server.log.info(`Found ${result.count} premium opportunities`);

  return result;
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });

    // Startup banner
    console.log('\n' + '='.repeat(80));
    console.log('🚀 GAP DASHBOARD BACKEND API');
    console.log('='.repeat(80));
    console.log(`📍 Server URL:        http://localhost:${PORT}`);
    console.log(`🌐 CORS Origin:       ${CORS_ORIGIN}`);
    console.log(`📦 Version:           ${VERSION}`);
    console.log('\n📋 Available Endpoints:');
    console.log(`   GET  /health                                    Health check`);
    console.log(`   GET  /opportunities?dataset=dummy               Get opportunities (default)`);
    console.log(`        &enrichWallet=true                         Enrich with wallet status (default: true)`);
    console.log(`   GET  /opportunities?dataset=golden              Get golden test fixtures`);
    console.log(`   GET  /wallet-status?exchange=...&symbol=...     Get wallet status for symbol`);
    console.log(`   GET  /wallet-status/common?exchangeA=...&       Get common networks (OPEN only)`);
    console.log(`        exchangeB=...&symbol=...`);
    console.log(`   GET  /fx-rate                                    Get current USDT/KRW FX rate`);
    console.log(`   GET  /address-book/deposit?exchange=...&        Get deposit address (masked)`);
    console.log(`        symbol=...&networkId=...`);
    console.log(`   POST /address-book/deposit                      Register deposit address`);
    console.log(`   GET  /address-book/deposit/list?exchange=...    List deposit addresses`);
    console.log(`        &symbol=...&isActive=...`);
    console.log(`   POST /precheck                                   Precheck opportunity for execution`);
    console.log(`   GET  /premiums?symbol=...                        Get premium opportunities (김프/역프)`);
    console.log('='.repeat(80) + '\n');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

// Start the server
start();
