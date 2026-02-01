/**
 * Vercel Serverless Function: Opportunities
 * GET /api/opportunities
 * 
 * Fetches live quotes from exchanges and calculates arbitrage opportunities
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS helper
function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Quote interface
interface Quote {
    exchange: string;
    symbol: string;
    market: string;
    bid: number;
    ask: number;
    timestamp: string;
}

// Opportunity interface
interface Opportunity {
    id: string;
    type: string;
    base: string;
    quote: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    grossGapPct: number;
    netProfitPct: number;
    updatedAt: string;
}

// Generate UUID
function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Stablecoins to exclude
const EXCLUDED_SYMBOLS = new Set([
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FDUSD', 'PYUSD', 'U'
]);

// Fetch Bithumb quotes
async function fetchBithumbQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
        if (!response.ok) return [];

        const data = await response.json();
        if (data.status !== '0000') return [];

        const quotes: Quote[] = [];
        const timestamp = new Date().toISOString();

        for (const [symbol, ticker] of Object.entries(data.data)) {
            if (symbol === 'date' || typeof ticker !== 'object' || ticker === null) continue;

            const t = ticker as any;
            const bid = parseFloat(t.closing_price || '0');
            const ask = bid * 1.001; // Estimate ask

            if (bid > 0) {
                quotes.push({
                    exchange: 'BITHUMB',
                    symbol,
                    market: `${symbol}/KRW`,
                    bid,
                    ask,
                    timestamp,
                });
            }
        }

        return quotes;
    } catch (error) {
        console.error('Bithumb fetch error:', error);
        return [];
    }
}

// Fetch Upbit quotes
async function fetchUpbitQuotes(): Promise<Quote[]> {
    try {
        // First get markets
        const marketsRes = await fetch('https://api.upbit.com/v1/market/all');
        if (!marketsRes.ok) return [];

        const markets: any[] = await marketsRes.json();
        const krwMarkets = markets
            .filter((m: any) => m.market.startsWith('KRW-'))
            .slice(0, 100); // Limit to 100 markets

        if (krwMarkets.length === 0) return [];

        const marketCodes = krwMarkets.map((m: any) => m.market).join(',');
        const tickerRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${marketCodes}`);
        if (!tickerRes.ok) return [];

        const tickers: any[] = await tickerRes.json();
        const timestamp = new Date().toISOString();

        return tickers.map((t: any) => {
            const symbol = t.market.replace('KRW-', '');
            return {
                exchange: 'UPBIT',
                symbol,
                market: `${symbol}/KRW`,
                bid: t.trade_price,
                ask: t.trade_price * 1.001,
                timestamp,
            };
        });
    } catch (error) {
        console.error('Upbit fetch error:', error);
        return [];
    }
}

// Fetch Binance quotes
async function fetchBinanceQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker');
        if (!response.ok) return [];

        const data: any[] = await response.json();
        const timestamp = new Date().toISOString();

        return data
            .filter((t: any) => t.symbol.endsWith('USDT'))
            .map((t: any) => {
                const symbol = t.symbol.replace('USDT', '');
                return {
                    exchange: 'BINANCE',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bidPrice),
                    ask: parseFloat(t.askPrice),
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch (error) {
        console.error('Binance fetch error:', error);
        return [];
    }
}

// Calculate arbitrage opportunities
function calculateOpportunities(
    quotes: Quote[],
    minGapPct: number = 0.5,
    limit: number = 100
): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Filter out stablecoins
    const validQuotes = quotes.filter((q) => !EXCLUDED_SYMBOLS.has(q.symbol) && q.ask >= 0.01);

    // Group by symbol
    const quotesBySymbol = new Map<string, Quote[]>();
    for (const quote of validQuotes) {
        if (!quotesBySymbol.has(quote.symbol)) {
            quotesBySymbol.set(quote.symbol, []);
        }
        quotesBySymbol.get(quote.symbol)!.push(quote);
    }

    // Find opportunities within same currency pairs
    for (const [symbol, symbolQuotes] of quotesBySymbol.entries()) {
        if (symbolQuotes.length < 2) continue;

        // Group by quote currency
        const krwQuotes = symbolQuotes.filter((q) => q.market.includes('/KRW'));
        const usdtQuotes = symbolQuotes.filter((q) => q.market.includes('/USDT'));

        // KRW-KRW arbitrage
        findArbitrageInGroup(symbol, krwQuotes, opportunities, minGapPct);

        // USDT-USDT arbitrage
        findArbitrageInGroup(symbol, usdtQuotes, opportunities, minGapPct);
    }

    // Sort by gap and limit
    opportunities.sort((a, b) => b.grossGapPct - a.grossGapPct);
    return opportunities.slice(0, limit);
}

function findArbitrageInGroup(
    symbol: string,
    quotes: Quote[],
    opportunities: Opportunity[],
    minGapPct: number
): void {
    const MAX_GAP = 50; // Filter out unrealistic gaps

    for (let i = 0; i < quotes.length; i++) {
        for (let j = i + 1; j < quotes.length; j++) {
            const quoteA = quotes[i];
            const quoteB = quotes[j];

            // A -> B opportunity
            const gapAB = ((quoteB.bid - quoteA.ask) / quoteA.ask) * 100;
            if (gapAB > minGapPct && gapAB < MAX_GAP) {
                opportunities.push(createOpportunity(symbol, quoteA, quoteB, gapAB));
            }

            // B -> A opportunity
            const gapBA = ((quoteA.bid - quoteB.ask) / quoteB.ask) * 100;
            if (gapBA > minGapPct && gapBA < MAX_GAP) {
                opportunities.push(createOpportunity(symbol, quoteB, quoteA, gapBA));
            }
        }
    }
}

function createOpportunity(
    symbol: string,
    buyQuote: Quote,
    sellQuote: Quote,
    gapPct: number
): Opportunity {
    const marketParts = buyQuote.market.split('/');

    return {
        id: generateId(),
        type: 'SPOT_SPOT_HEDGE',
        base: marketParts[0] || symbol,
        quote: marketParts[1] || 'USDT',
        buyExchange: buyQuote.exchange,
        sellExchange: sellQuote.exchange,
        buyPrice: buyQuote.ask,
        sellPrice: sellQuote.bid,
        grossGapPct: parseFloat(gapPct.toFixed(2)),
        netProfitPct: parseFloat(Math.max(0, gapPct - 0.3).toFixed(2)),
        updatedAt: new Date().toISOString(),
    };
}

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

        // Fetch quotes from exchanges in parallel
        const [bithumbQuotes, upbitQuotes, binanceQuotes] = await Promise.all([
            fetchBithumbQuotes(),
            fetchUpbitQuotes(),
            fetchBinanceQuotes(),
        ]);

        const fetchDuration = Date.now() - startTime;
        console.log(
            `Fetched quotes in ${fetchDuration}ms: Bithumb=${bithumbQuotes.length}, Upbit=${upbitQuotes.length}, Binance=${binanceQuotes.length}`
        );

        // Combine all quotes
        const allQuotes: Quote[] = [...bithumbQuotes, ...upbitQuotes, ...binanceQuotes];

        // Calculate opportunities
        const opportunities = calculateOpportunities(allQuotes, minGapPct, limit);

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
