/**
 * Vercel Serverless Function: Premiums (김프/역프)
 * GET /api/premiums
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BithumbQuoteConnector } from '../backend/src/connectors/BithumbQuoteConnector';
import { BinanceQuoteConnector } from '../backend/src/connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from '../backend/src/connectors/OKXQuoteConnector';
import { UpbitQuoteConnector } from '../backend/src/connectors/UpbitQuoteConnector';
import { BybitQuoteConnector } from '../backend/src/connectors/BybitQuoteConnector';
import { fxRateService } from '../backend/src/services/FxRateService';
import { PremiumCalculator } from '../backend/src/services/PremiumCalculator';
import { Quote } from '../backend/src/connectors/BithumbQuoteConnector';
import { ExchangeQuote } from '../backend/src/types/premium';

// CORS helper
function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Convert Quote to ExchangeQuote
function toExchangeQuote(quote: Quote): ExchangeQuote {
    return {
        exchange: quote.exchange,
        symbol: quote.symbol,
        market: quote.market,
        bid: quote.bid,
        ask: quote.ask,
        timestamp: quote.timestamp,
    };
}

// Initialize connectors
const bithumbQuoteConnector = new BithumbQuoteConnector();
const binanceQuoteConnector = new BinanceQuoteConnector();
const okxQuoteConnector = new OKXQuoteConnector();
const upbitQuoteConnector = new UpbitQuoteConnector();
const bybitQuoteConnector = new BybitQuoteConnector();
const premiumCalculator = new PremiumCalculator(fxRateService);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const {
            symbol,
            krwExchanges: krwExchangesParam,
            globalExchanges: globalExchangesParam,
            includeNegative: includeNegativeParam,
            limit: limitStr,
            offset: offsetStr,
        } = req.query;

        // Parse query parameters
        const limit = limitStr ? parseInt(limitStr as string, 10) : 200;
        const offset = offsetStr ? parseInt(offsetStr as string, 10) : 0;
        const includeNegative = includeNegativeParam !== 'false';

        // Parse exchange filters
        const requestedKrwExchanges = krwExchangesParam
            ? (krwExchangesParam as string).split(',').map((e) => e.trim().toUpperCase())
            : ['BITHUMB', 'UPBIT'];

        const requestedGlobalExchanges = globalExchangesParam
            ? (globalExchangesParam as string).split(',').map((e) => e.trim().toUpperCase())
            : ['BINANCE', 'OKX', 'BYBIT'];

        console.log(
            `Fetching premiums (symbol=${symbol || 'all'}, krwExchanges=${requestedKrwExchanges.join(',')}, globalExchanges=${requestedGlobalExchanges.join(',')})`
        );

        const startTime = Date.now();

        // Fetch quotes from requested exchanges in parallel
        const fetchPromises: Promise<Quote[]>[] = [];

        // KRW exchanges
        if (requestedKrwExchanges.includes('BITHUMB')) {
            fetchPromises.push(
                bithumbQuoteConnector.fetchQuotes().catch(() => [])
            );
        }
        if (requestedKrwExchanges.includes('UPBIT')) {
            fetchPromises.push(
                upbitQuoteConnector.fetchQuotes().catch(() => [])
            );
        }

        // Global exchanges
        if (requestedGlobalExchanges.includes('BINANCE')) {
            fetchPromises.push(
                binanceQuoteConnector.fetchQuotes().catch(() => [])
            );
        }
        if (requestedGlobalExchanges.includes('OKX')) {
            fetchPromises.push(
                okxQuoteConnector.fetchQuotes().catch(() => [])
            );
        }
        if (requestedGlobalExchanges.includes('BYBIT')) {
            fetchPromises.push(
                bybitQuoteConnector.fetchQuotes().catch(() => [])
            );
        }

        const allQuoteArrays = await Promise.all(fetchPromises);
        const allQuotes = allQuoteArrays.flat();

        const fetchDuration = Date.now() - startTime;
        console.log(`Fetched ${allQuotes.length} quotes in ${fetchDuration}ms`);

        // Convert to ExchangeQuote and separate KRW and global quotes
        const krwExchangeQuotes: ExchangeQuote[] = allQuotes
            .filter((q) =>
                q.market.includes('/KRW') &&
                requestedKrwExchanges.includes(q.exchange.toUpperCase())
            )
            .map(toExchangeQuote);

        const globalExchangeQuotes: ExchangeQuote[] = allQuotes
            .filter((q) =>
                q.market.includes('/USDT') &&
                requestedGlobalExchanges.includes(q.exchange.toUpperCase())
            )
            .map(toExchangeQuote);

        // Calculate premiums using the correct method
        const result = await premiumCalculator.getPremiumOpportunitiesWithMetadata(
            krwExchangeQuotes,
            globalExchangeQuotes,
            limit
        );

        // Filter by symbol if specified
        let filteredData = symbol
            ? result.data.filter((p) => p.baseSymbol.toUpperCase() === (symbol as string).toUpperCase())
            : result.data;

        // Filter out negative premiums if requested
        if (!includeNegative) {
            filteredData = filteredData.filter((p) => p.gapPct >= 0);
        }

        // Sort by gap descending
        filteredData.sort((a, b) => b.gapPct - a.gapPct);

        // Apply pagination
        const paginatedData = filteredData.slice(offset, offset + limit);

        return res.status(200).json({
            count: paginatedData.length,
            total: filteredData.length,
            fxRate: result.fxRate,
            fxRateBid: result.fxRateBid,
            fxRateAsk: result.fxRateAsk,
            fxSource: result.fxSource,
            fxRateTimestamp: result.fxRateTimestamp,
            fxStale: result.fxStale,
            data: paginatedData,
            meta: {
                fetchDurationMs: fetchDuration,
                krwExchanges: requestedKrwExchanges,
                globalExchanges: requestedGlobalExchanges,
            },
        });
    } catch (error) {
        console.error('Premiums error:', error);
        return res.status(500).json({
            error: 'Failed to fetch premiums',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
