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
import {
  importOKX,
  importUpbit,
  importBinance,
  importBybit,
  importBithumb,
} from './scripts/import-deposit-addresses';
import * as fs from 'fs';
import * as path from 'path';
import { BithumbQuoteConnector } from './connectors/BithumbQuoteConnector';
import { BinanceQuoteConnector } from './connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from './connectors/OKXQuoteConnector';
import { UpbitQuoteConnector } from './connectors/UpbitQuoteConnector';
import { BybitQuoteConnector } from './connectors/BybitQuoteConnector';
import { SymbolUniverseBuilder } from './services/SymbolUniverseBuilder';
import { ArbitrageCalculator } from './services/ArbitrageCalculator';
import { SymbolUniverseService } from './services/SymbolUniverseService';
import { OpportunityEnrichmentService } from './services/OpportunityEnrichmentService';
import { FilterService } from './services/FilterService';
import { FilterSettings } from './types/filters';
import { parseFilterSettings } from './utils/queryParsers';
import { Quote } from './connectors/BithumbQuoteConnector';

// Load environment variables
dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
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

// Initialize Quote Connectors
const bithumbQuoteConnector = new BithumbQuoteConnector();
const binanceQuoteConnector = new BinanceQuoteConnector();
const okxQuoteConnector = new OKXQuoteConnector();
const upbitQuoteConnector = new UpbitQuoteConnector();
const bybitQuoteConnector = new BybitQuoteConnector();
const symbolUniverseBuilder = new SymbolUniverseBuilder();

// Initialize Arbitrage Calculator
const arbitrageCalculator = new ArbitrageCalculator();

// Initialize Symbol Universe Service
const symbolUniverseService = new SymbolUniverseService(
  bithumbQuoteConnector,
  upbitQuoteConnector,
  binanceQuoteConnector,
  okxQuoteConnector,
  bybitQuoteConnector
);

// Initialize Opportunity Enrichment Service
const opportunityEnrichmentService = new OpportunityEnrichmentService(
  walletEnrichmentService,
  addressBookService
);

// Initialize Filter Service
const filterService = new FilterService(addressBookService);

// Types for responses
interface HealthResponse {
  ok: boolean;
  version: string;
  time: string;
}

interface OpportunitiesResponse {
  dataset: 'dummy' | 'golden' | 'live';
  count: number;            // Number of opportunities returned (after filtering)
  total?: number;           // Total opportunities before filtering
  filteredOut?: number;     // Number filtered out (when debugMode=false)
  data: Opportunity[];
  appliedFilters?: Partial<FilterSettings>; // Echo back filter settings used
  error?: string;
  message?: string;
}

// GET /health - Health check endpoint
server.get<{ Reply: HealthResponse }>('/health', async (request, reply) => {
  return {
    ok: true,
    version: VERSION,
    time: new Date().toISOString(),
  };
});

// GET /opportunities - Get opportunities by dataset or live data
server.get<{
  Querystring: {
    mode?: 'live' | 'fixture';
    dataset?: 'dummy' | 'golden';
    enrichWallet?: string;
    limit?: string;
    // Filter parameters
    minVolumeUsd24h?: string;
    excludeIfVolumeMissing?: string;
    minPriceUsd?: string;
    maxGapPct?: string;
    maxSpreadPct?: string;
    maxQuoteAgeSeconds?: string;
    requireCommonOpenNetwork?: string;
    requireDepositAddress?: string;
    minGapPct?: string;
    maxGapPctFilter?: string;
    excludeExchanges?: string;
    showSpotSpotHedge?: string;
    showSpotFutures?: string;
    showKimpOverseasToBithumb?: string;
    showKimpBithumbToOverseas?: string;
    onlyOpenNetworks?: string;
    allowBridgeRoutes?: string;
    minNetProfitPct?: string;
    debugMode?: string;
  };
  Reply: OpportunitiesResponse;
}>('/opportunities', async (request, reply) => {
  const {
    mode = 'live', // Changed default to 'live'
    dataset = 'dummy',
    enrichWallet: enrichWalletParam,
    limit: limitStr,
  } = request.query;

  // Enforce live-only mode unless ENABLE_FIXTURES is set
  const fixturesEnabled = process.env.ENABLE_FIXTURES === 'true';
  if (mode === 'fixture' && !fixturesEnabled) {
    return reply.status(400).send({
      error: 'Fixture mode disabled',
      message: 'Fixture data is disabled. Only live mode is available. Set ENABLE_FIXTURES=true to enable fixtures.',
    } as any);
  }

  // Parse enrichWallet (default: true)
  const enrichWallet = enrichWalletParam !== 'false';
  const limit = limitStr ? parseInt(limitStr, 10) : 100;

  // Parse filter settings from query parameters
  const filterSettings = parseFilterSettings(request.query as any);

  server.log.info(`Fetching opportunities (mode=${mode}, dataset=${dataset}, limit=${limit}, debugMode=${filterSettings.debugMode})`);

  // Check cache for live mode (short TTL: 3 seconds)
  const cacheKey = `opportunities:${mode}:${dataset}:${limit}:${enrichWallet}`;
  if (mode === 'live') {
    const cached = walletStatusCache.get<OpportunitiesResponse>(cacheKey);
    if (cached) {
      server.log.info(`Cache HIT: ${cacheKey}`);
      return cached;
    }
  }

  let opportunities: Opportunity[];
  let allQuotes: Quote[] = [];

  if (mode === 'live') {
    // Fetch live quotes from all exchanges
    try {
      server.log.info('Fetching live quotes from all exchanges...');
      const startTime = Date.now();

      const [bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] =
        await Promise.all([
          bithumbQuoteConnector.fetchQuotes().catch(() => []),
          upbitQuoteConnector.fetchQuotes().catch(() => []),
          binanceQuoteConnector.fetchQuotes().catch(() => []),
          okxQuoteConnector.fetchQuotes().catch(() => []),
          bybitQuoteConnector.fetchQuotes().catch(() => []),
        ]);

      const fetchDuration = Date.now() - startTime;
      server.log.info(
        `Fetched quotes in ${fetchDuration}ms: Bithumb=${bithumbQuotes.length}, Upbit=${upbitQuotes.length}, Binance=${binanceQuotes.length}, OKX=${okxQuotes.length}, Bybit=${bybitQuotes.length}`
      );

      // Combine all quotes
      allQuotes = [
        ...bithumbQuotes,
        ...upbitQuotes,
        ...binanceQuotes,
        ...okxQuotes,
        ...bybitQuotes,
      ];

      // Calculate arbitrage opportunities (without limit yet - we'll apply after filtering)
      opportunities = await arbitrageCalculator.calculateArbitrageOpportunities(
        allQuotes,
        0.1, // Lower minGapPct to get more candidates
        1000 // Higher limit to get more candidates
      );

      server.log.info(`Found ${opportunities.length} live arbitrage opportunities (before filtering)`);
    } catch (error) {
      server.log.error(`Failed to fetch live quotes: ${error}`);
      return reply.status(500).send({
        error: 'Failed to fetch live quotes',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as any);
    }
  } else {
    // Use fixture data
    if (dataset !== 'dummy' && dataset !== 'golden') {
      return reply.status(400).send({
        error: 'Invalid dataset parameter',
        message: 'dataset must be "dummy" or "golden"',
      } as any);
    }

    // Select appropriate dataset
    opportunities = dataset === 'golden' ? goldenOpportunities : dummyOpportunities;

    // Enrich Kimchi Premium opportunities with FX-normalized gaps
    server.log.info(`Enriching Kimchi Premium opportunities with FX rates`);
    const fxStartTime = Date.now();
    opportunities = await kimchiGapCalculator.enrichOpportunitiesWithFxGaps(opportunities);
    const fxDuration = Date.now() - fxStartTime;
    server.log.info(`FX enrichment completed in ${fxDuration}ms`);
  }

  const totalBeforeFiltering = opportunities.length;

  // Build quotes map for filtering (symbol -> {buy, sell})
  const quotesBySymbol = new Map<string, { buy: Quote; sell: Quote }>();
  if (mode === 'live' && allQuotes.length > 0) {
    for (const opp of opportunities) {
      const buyQuote = allQuotes.find(q => q.exchange === opp.buyExchange && q.symbol === opp.base);
      const sellQuote = allQuotes.find(q => q.exchange === opp.sellExchange && q.symbol === opp.base);
      if (buyQuote && sellQuote) {
        quotesBySymbol.set(opp.base, { buy: buyQuote, sell: sellQuote });
      }
    }
  }

  // Enrich opportunities with wallet status and address checks
  server.log.info(`Enriching ${opportunities.length} opportunities with wallet & address checks`);
  const enrichStartTime = Date.now();

  opportunities = await opportunityEnrichmentService.enrichOpportunities(
    opportunities,
    enrichWallet, // enrichWallet
    filterSettings.requireDepositAddress // only enrich address if needed
  );

  const enrichDuration = Date.now() - enrichStartTime;
  server.log.info(`Enrichment completed in ${enrichDuration}ms`);

  // Apply filters
  server.log.info(`Applying filters (debugMode=${filterSettings.debugMode})`);
  const filterStartTime = Date.now();

  const filteredOpportunities = filterService.applyFilters(
    opportunities,
    filterSettings,
    quotesBySymbol
  );

  const filterDuration = Date.now() - filterStartTime;
  server.log.info(
    `Filtering completed in ${filterDuration}ms: ${filteredOpportunities.length} of ${totalBeforeFiltering} passed`
  );

  // Apply limit after filtering
  const paginatedOpportunities = filteredOpportunities.slice(0, limit);

  // Prepare response with metadata
  const result: OpportunitiesResponse = {
    dataset: mode === 'live' ? 'live' : dataset,
    count: paginatedOpportunities.length,
    total: totalBeforeFiltering,
    filteredOut: filterSettings.debugMode ? 0 : totalBeforeFiltering - filteredOpportunities.length,
    data: paginatedOpportunities,
    appliedFilters: {
      minVolumeUsd24h: filterSettings.minVolumeUsd24h,
      excludeIfVolumeMissing: filterSettings.excludeIfVolumeMissing,
      minPriceUsd: filterSettings.minPriceUsd,
      maxGapPct: filterSettings.maxGapPct,
      maxSpreadPct: filterSettings.maxSpreadPct,
      maxQuoteAgeSeconds: filterSettings.maxQuoteAgeSeconds,
      requireCommonOpenNetwork: filterSettings.requireCommonOpenNetwork,
      requireDepositAddress: filterSettings.requireDepositAddress,
      debugMode: filterSettings.debugMode,
    },
  };

  // Cache result for live mode (3 seconds TTL)
  if (mode === 'live') {
    walletStatusCache.set(cacheKey, result, 3000);
  }

  return result;
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
    } as any);
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
    } as any);
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
  const rateData = await fxRateService.getUsdtKrwRate();
  return rateData;
});

// GET /symbols/universe - Get canonical symbol universe across all exchanges
server.get('/symbols/universe', async (request, reply) => {
  try {
    const universe = await symbolUniverseService.buildUniverse();
    return universe;
  } catch (error) {
    server.log.error('Failed to build symbol universe:', error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: 'Failed to fetch symbol universe',
    });
  }
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

// GET /premiums - Get premium opportunities (김프 and 역프) across all exchanges
server.get<{
  Querystring: {
    mode?: 'live' | 'fixture';
    symbol?: string;
    krwExchanges?: string;
    globalExchanges?: string;
    includeNegative?: string;
    limit?: string;
    offset?: string;
  };
  Reply: PremiumOpportunitiesResponse;
}>('/premiums', async (request, reply) => {
  const {
    mode = 'live',
    symbol,
    krwExchanges: krwExchangesParam,
    globalExchanges: globalExchangesParam,
    includeNegative: includeNegativeParam,
    limit: limitStr,
    offset: offsetStr,
  } = request.query;

  // Enforce live-only mode unless ENABLE_FIXTURES is set
  const fixturesEnabled = process.env.ENABLE_FIXTURES === 'true';
  if (mode === 'fixture' && !fixturesEnabled) {
    return reply.status(400).send({
      error: 'Fixture mode disabled',
      message: 'Fixture data is disabled. Only live mode is available. Set ENABLE_FIXTURES=true to enable fixtures.',
    } as any);
  }

  // Parse query parameters
  const limit = limitStr ? parseInt(limitStr, 10) : 200;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
  const includeNegative = includeNegativeParam !== 'false'; // Default true

  // Parse exchange filters
  const requestedKrwExchanges = krwExchangesParam
    ? krwExchangesParam.split(',').map((e) => e.trim().toUpperCase())
    : ['BITHUMB', 'UPBIT']; // Default: all KRW exchanges

  const requestedGlobalExchanges = globalExchangesParam
    ? globalExchangesParam.split(',').map((e) => e.trim().toUpperCase())
    : ['BINANCE', 'OKX', 'BYBIT']; // Default: all global exchanges

  server.log.info(
    `Fetching premium opportunities (mode=${mode}, symbol=${symbol || 'all'}, ` +
      `krwExchanges=${requestedKrwExchanges.join(',')}, globalExchanges=${requestedGlobalExchanges.join(',')}, ` +
      `includeNegative=${includeNegative}, limit=${limit}, offset=${offset})`
  );

  // Check cache for live mode (short TTL: 2 seconds)
  const cacheKey = `premiums:${mode}:${symbol || 'all'}:${requestedKrwExchanges.join(',')}:${requestedGlobalExchanges.join(',')}:${includeNegative}:${limit}:${offset}`;
  if (mode === 'live') {
    const cached = walletStatusCache.get<any>(cacheKey);
    if (cached) {
      server.log.info(`Cache HIT: ${cacheKey}`);
      return cached;
    }
  }

  if (mode === 'live') {
    // Fetch live quotes from ALL exchanges in parallel
    try {
      const fetchPromises = [];

      // KRW exchanges
      if (requestedKrwExchanges.includes('BITHUMB')) {
        fetchPromises.push(
          bithumbQuoteConnector.fetchQuotes().catch((err) => {
            server.log.error(`Bithumb fetch failed: ${err}`);
            return [];
          })
        );
      }
      if (requestedKrwExchanges.includes('UPBIT')) {
        fetchPromises.push(
          upbitQuoteConnector.fetchQuotes().catch((err) => {
            server.log.error(`Upbit fetch failed: ${err}`);
            return [];
          })
        );
      }

      // Global exchanges
      if (requestedGlobalExchanges.includes('BINANCE')) {
        fetchPromises.push(
          binanceQuoteConnector.fetchQuotes().catch((err) => {
            server.log.error(`Binance fetch failed: ${err}`);
            return [];
          })
        );
      }
      if (requestedGlobalExchanges.includes('OKX')) {
        fetchPromises.push(
          okxQuoteConnector.fetchQuotes().catch((err) => {
            server.log.error(`OKX fetch failed: ${err}`);
            return [];
          })
        );
      }
      if (requestedGlobalExchanges.includes('BYBIT')) {
        fetchPromises.push(
          bybitQuoteConnector.fetchQuotes().catch((err) => {
            server.log.error(`Bybit fetch failed: ${err}`);
            return [];
          })
        );
      }

      const results = await Promise.all(fetchPromises);

      // Group quotes by exchange
      const krwQuotesByExchange = new Map<string, any[]>();
      const globalQuotesByExchange = new Map<string, any[]>();

      let idx = 0;
      if (requestedKrwExchanges.includes('BITHUMB')) {
        krwQuotesByExchange.set('BITHUMB', results[idx++]);
      }
      if (requestedKrwExchanges.includes('UPBIT')) {
        krwQuotesByExchange.set('UPBIT', results[idx++]);
      }
      if (requestedGlobalExchanges.includes('BINANCE')) {
        globalQuotesByExchange.set('BINANCE', results[idx++]);
      }
      if (requestedGlobalExchanges.includes('OKX')) {
        globalQuotesByExchange.set('OKX', results[idx++]);
      }
      if (requestedGlobalExchanges.includes('BYBIT')) {
        globalQuotesByExchange.set('BYBIT', results[idx++]);
      }

      // Log fetched counts
      const krwTotal = Array.from(krwQuotesByExchange.values()).reduce(
        (sum, quotes) => sum + quotes.length,
        0
      );
      const globalTotal = Array.from(globalQuotesByExchange.values()).reduce(
        (sum, quotes) => sum + quotes.length,
        0
      );
      server.log.info(
        `Fetched ${krwTotal} KRW quotes (${Array.from(krwQuotesByExchange.entries())
          .map(([ex, q]) => `${ex}=${q.length}`)
          .join(', ')}) and ${globalTotal} USDT quotes (${Array.from(globalQuotesByExchange.entries())
          .map(([ex, q]) => `${ex}=${q.length}`)
          .join(', ')})`
      );

      // Calculate multi-exchange premiums
      const opportunities = await premiumCalculator.calculateMultiExchangePremiums(
        krwQuotesByExchange,
        globalQuotesByExchange,
        includeNegative,
        limit,
        offset
      );

      // Get FX rate metadata
      const fxRateData = await fxRateService.getUsdtKrwRate();

      const result = {
        count: opportunities.length,
        limit,
        offset,
        fxRate: fxRateData.mid,
        fxRateBid: fxRateData.bid,
        fxRateAsk: fxRateData.ask,
        fxSource: fxRateData.source,
        fxRateTimestamp: fxRateData.timestamp,
        fxStale: fxRateData.stale,
        data: opportunities,
      };

      server.log.info(`Found ${result.count} premium opportunities (after pagination)`);

      // Cache result for live mode (2 seconds TTL)
      walletStatusCache.set(cacheKey, result, 2000);

      return result;
    } catch (error) {
      server.log.error(`Failed to fetch live quotes: ${error}`);
      return reply.status(500).send({
        error: 'Failed to fetch live quotes',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as any);
    }
  } else {
    // Fixture mode (testing only)
    const krwQuotesByExchange = new Map<string, any[]>();
    const globalQuotesByExchange = new Map<string, any[]>();

    krwQuotesByExchange.set('BITHUMB', bithumbQuotes);
    globalQuotesByExchange.set('BINANCE', binanceQuotes);

    const opportunities = await premiumCalculator.calculateMultiExchangePremiums(
      krwQuotesByExchange,
      globalQuotesByExchange,
      includeNegative,
      limit,
      offset
    );

    const fxRateData = await fxRateService.getUsdtKrwRate();

    const result = {
      count: opportunities.length,
      limit,
      offset,
      fxRate: fxRateData.mid,
      fxRateBid: fxRateData.bid,
      fxRateAsk: fxRateData.ask,
      fxSource: fxRateData.source,
      fxRateTimestamp: fxRateData.timestamp,
      fxStale: fxRateData.stale,
      data: opportunities,
    };

    server.log.info(`Found ${result.count} premium opportunities (fixture mode)`);

    return result;
  }
});

// Initialize deposit addresses from CSV files
const initializeDepositAddresses = async () => {
  const adrsmakePath = path.join(__dirname, '../../adrsmake');

  // Check if adrsmake directory exists
  if (!fs.existsSync(adrsmakePath)) {
    server.log.warn(`adrsmake directory not found at ${adrsmakePath}, skipping address import`);
    return 0;
  }

  let totalCount = 0;
  server.log.info('Loading deposit addresses from CSV files...');

  try {
    // Import OKX
    const okxPath = path.join(adrsmakePath, 'okx_deposit_addresses.csv');
    if (fs.existsSync(okxPath)) {
      const count = await importOKX(okxPath);
      totalCount += count;
      server.log.info(`Loaded ${count} OKX addresses`);
    }

    // Import Upbit
    const upbitPath = path.join(adrsmakePath, 'upbit_deposit_addresses.csv');
    if (fs.existsSync(upbitPath)) {
      const count = await importUpbit(upbitPath);
      totalCount += count;
      server.log.info(`Loaded ${count} Upbit addresses`);
    }

    // Import Binance
    const binancePath = path.join(adrsmakePath, 'binance_deposit_addresses.csv');
    if (fs.existsSync(binancePath)) {
      const count = await importBinance(binancePath);
      totalCount += count;
      server.log.info(`Loaded ${count} Binance addresses`);
    }

    // Import Bybit
    const bybitPath = path.join(adrsmakePath, 'bybit_deposit_addresses.csv');
    if (fs.existsSync(bybitPath)) {
      const count = await importBybit(bybitPath);
      totalCount += count;
      server.log.info(`Loaded ${count} Bybit addresses`);
    }

    // Import Bithumb
    const bithumbPath = path.join(adrsmakePath, 'bithumb_deposit_addresses_bruteforce.csv');
    if (fs.existsSync(bithumbPath)) {
      const count = await importBithumb(bithumbPath);
      totalCount += count;
      server.log.info(`Loaded ${count} Bithumb addresses`);
    }

    server.log.info(`✅ Total ${totalCount} deposit addresses loaded successfully`);
    return totalCount;
  } catch (error) {
    server.log.error(`❌ Failed to load deposit addresses: ${error}`);
    throw error;
  }
};

// Start server
const start = async () => {
  try {
    // Initialize deposit addresses before starting server
    await initializeDepositAddresses();

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
