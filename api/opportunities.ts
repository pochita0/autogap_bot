/**
 * Vercel Serverless Function: Opportunities
 * GET /api/opportunities
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BithumbQuoteConnector } from '../backend/src/connectors/BithumbQuoteConnector';
import { BinanceQuoteConnector } from '../backend/src/connectors/BinanceQuoteConnector';
import { OKXQuoteConnector } from '../backend/src/connectors/OKXQuoteConnector';
import { UpbitQuoteConnector } from '../backend/src/connectors/UpbitQuoteConnector';
import { BybitQuoteConnector } from '../backend/src/connectors/BybitQuoteConnector';
import { ArbitrageCalculator } from '../backend/src/services/ArbitrageCalculator';
import { Quote } from '../backend/src/connectors/BithumbQuoteConnector';

// CORS helper
function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Initialize connectors (create new instances for each request in serverless)
const bithumbQuoteConnector = new BithumbQuoteConnector();
const binanceQuoteConnector = new BinanceQuoteConnector();
const okxQuoteConnector = new OKXQuoteConnector();
const upbitQuoteConnector = new UpbitQuoteConnector();
const bybitQuoteConnector = new BybitQuoteConnector();
const arbitrageCalculator = new ArbitrageCalculator();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { limit: limitStr, minGapPct: minGapPctStr } = req.query;
        const limit = limitStr ? parseInt(limitStr as string, 10) : 100;
        const minGapPct = minGapPctStr ? parseFloat(minGapPctStr as string) : 0.1;

        console.log(`Fetching live quotes (limit=${limit}, minGapPct=${minGapPct})`);
        const startTime = Date.now();

        // Fetch quotes from all exchanges in parallel
        const [bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] = await Promise.all([
            bithumbQuoteConnector.fetchQuotes().catch((e) => {
                console.error('Bithumb error:', e);
                return [];
            }),
            upbitQuoteConnector.fetchQuotes().catch((e) => {
                console.error('Upbit error:', e);
                return [];
            }),
            binanceQuoteConnector.fetchQuotes().catch((e) => {
                console.error('Binance error:', e);
                return [];
            }),
            okxQuoteConnector.fetchQuotes().catch((e) => {
                console.error('OKX error:', e);
                return [];
            }),
            bybitQuoteConnector.fetchQuotes().catch((e) => {
                console.error('Bybit error:', e);
                return [];
            }),
        ]);

        const fetchDuration = Date.now() - startTime;
        console.log(
            `Fetched quotes in ${fetchDuration}ms: Bithumb=${bithumbQuotes.length}, Upbit=${upbitQuotes.length}, Binance=${binanceQuotes.length}, OKX=${okxQuotes.length}, Bybit=${bybitQuotes.length}`
        );

        // Combine all quotes
        const allQuotes: Quote[] = [
            ...bithumbQuotes,
            ...upbitQuotes,
            ...binanceQuotes,
            ...okxQuotes,
            ...bybitQuotes,
        ];

        // Calculate arbitrage opportunities
        const opportunities = await arbitrageCalculator.calculateArbitrageOpportunities(
            allQuotes,
            minGapPct,
            limit
        );

        console.log(`Found ${opportunities.length} arbitrage opportunities`);

        return res.status(200).json({
            dataset: 'live',
            count: opportunities.length,
            total: opportunities.length,
            data: opportunities,
            meta: {
                fetchDurationMs: fetchDuration,
                quoteCounts: {
                    bithumb: bithumbQuotes.length,
                    upbit: upbitQuotes.length,
                    binance: binanceQuotes.length,
                    okx: okxQuotes.length,
                    bybit: bybitQuotes.length,
                },
            },
        });
    } catch (error) {
        console.error('Opportunities error:', error);
        return res.status(500).json({
            error: 'Failed to fetch opportunities',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
