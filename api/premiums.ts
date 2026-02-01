/**
 * Vercel Serverless Function: Premiums (김프/역프)
 * GET /api/premiums
 * 
 * Calculates Kimchi Premium between KRW and USDT exchanges
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
    volume: number; // 24h Trading Volume (Quote Currency -> converted to KRW approx if needed)
    timestamp: string;
}

// Premium interface with Volume and Networks
interface Premium {
    id: string;
    kind: 'KIMCHI' | 'REVERSE';
    baseSymbol: string;
    displaySymbol: string;
    krwSymbol: string;
    globalSymbol: string;
    krwExchange: string;
    globalExchange: string;
    krwMarket: string;
    globalMarket: string;
    krwBid: number;
    krwAsk: number;
    globalBidKRW: number;
    globalAskKRW: number;
    usdtKrw: number;
    gapPct: number;
    direction: 'GLOBAL_TO_KRW' | 'KRW_TO_GLOBAL';
    updatedAt: string;
    isAliasPair: boolean;
    volume: number; // Combined 24h volume in KRW
    commonNetworks?: any[]; // Placeholder for networks
}

// Generate UUID
function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fetch FX rate from Bithumb
async function fetchFxRate(): Promise<number> {
    try {
        const response = await fetch('https://api.bithumb.com/public/ticker/USDT_KRW');
        if (!response.ok) return 1450; // Fallback

        const data: any = await response.json();
        if (data.status !== '0000') return 1450;

        return parseFloat(data.data.closing_price);
    } catch {
        return 1450; // Fallback
    }
}

// Fetch Bithumb quotes
async function fetchBithumbQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
        if (!response.ok) return [];

        const data: any = await response.json();
        if (data.status !== '0000') return [];

        const quotes: Quote[] = [];
        const timestamp = new Date().toISOString();

        for (const [symbol, ticker] of Object.entries(data.data)) {
            if (symbol === 'date' || typeof ticker !== 'object' || ticker === null) continue;

            const t = ticker as any;
            const bid = parseFloat(t.closing_price || '0');
            const ask = bid * 1.001;
            // acc_trade_value_24H is within last 24h in KRW
            const volume = parseFloat(t.acc_trade_value_24H || '0');

            if (bid > 0) {
                quotes.push({
                    exchange: 'BITHUMB',
                    symbol,
                    market: `${symbol}/KRW`,
                    bid,
                    ask,
                    volume,
                    timestamp,
                });
            }
        }

        return quotes;
    } catch {
        return [];
    }
}

// Fetch Upbit quotes (Full list)
async function fetchUpbitQuotes(): Promise<Quote[]> {
    try {
        const marketsRes = await fetch('https://api.upbit.com/v1/market/all');
        if (!marketsRes.ok) return [];

        const markets: any[] = await marketsRes.json();
        // Remove slice(0, 100) to get all KRW markets
        const krwMarkets = markets.filter((m: any) => m.market.startsWith('KRW-'));

        if (krwMarkets.length === 0) return [];

        // Upbit API limitation: Request multiple items by comma-separated market codes
        // But too many codes might cause URL length issues or rate limits.
        // Safe chunk size is around 100-150.
        const CHUNK_SIZE = 100;
        const quotes: Quote[] = [];
        const timestamp = new Date().toISOString();

        for (let i = 0; i < krwMarkets.length; i += CHUNK_SIZE) {
            const chunk = krwMarkets.slice(i, i + CHUNK_SIZE);
            const marketCodes = chunk.map((m: any) => m.market).join(',');

            try {
                const tickerRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${marketCodes}`);
                if (!tickerRes.ok) continue;

                const tickers: any[] = await tickerRes.json();

                tickers.forEach((t: any) => {
                    const symbol = t.market.replace('KRW-', '');
                    quotes.push({
                        exchange: 'UPBIT',
                        symbol,
                        market: `${symbol}/KRW`,
                        bid: t.trade_price,
                        ask: t.trade_price * 1.001,
                        // acc_trade_price_24h is 24h accum in KRW
                        volume: t.acc_trade_price_24h,
                        timestamp,
                    });
                });
            } catch (e) {
                console.error('Upbit chunk error', e);
            }
        }

        return quotes;
    } catch {
        return [];
    }
}

// Fetch Binance quotes
async function fetchBinanceQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr'); // Use 24hr ticker for volume
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
                    // quoteVolume is in USDT
                    volume: parseFloat(t.quoteVolume),
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch {
        return [];
    }
}

// Fetch OKX quotes
async function fetchOKXQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
        if (!response.ok) return [];

        const data: any = await response.json();
        if (data.code !== '0') return [];

        const timestamp = new Date().toISOString();

        return data.data
            .filter((t: any) => t.instId.endsWith('USDT'))
            .map((t: any) => {
                const symbol = t.instId.split('-')[0];
                return {
                    exchange: 'OKX',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bidPx),
                    ask: parseFloat(t.askPx),
                    // volCcy24h is 24h volume in quote currency (USDT)
                    volume: parseFloat(t.volCcy24h),
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch {
        return [];
    }
}

// Fetch Bybit quotes (Corrected)
async function fetchBybitQuotes(): Promise<Quote[]> {
    try {
        // Try requesting without Category first, or check if Spot is valid
        const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
        if (!response.ok) return [];

        const data: any = await response.json();
        if (data.retCode !== 0) return [];

        const timestamp = new Date().toISOString();

        return data.result.list
            .filter((t: any) => t.symbol.endsWith('USDT'))
            .map((t: any) => {
                const symbol = t.symbol.replace('USDT', '');
                return {
                    exchange: 'BYBIT',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bid1Price),
                    ask: parseFloat(t.ask1Price),
                    // turnover24h is 24h turnover (trading volume in quote currency - USDT)
                    volume: parseFloat(t.turnover24h),
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch (error) {
        // console.error('Bybit error', error);
        return [];
    }
}

// Calculate premiums
function calculatePremiums(
    krwQuotes: Quote[],
    globalQuotes: Quote[],
    fxRate: number
): Premium[] {
    const premiums: Premium[] = [];

    // Create lookup maps
    const krwQuoteMap = new Map<string, Quote[]>();
    for (const q of krwQuotes) {
        if (!krwQuoteMap.has(q.symbol)) {
            krwQuoteMap.set(q.symbol, []);
        }
        krwQuoteMap.get(q.symbol)!.push(q);
    }

    const globalQuoteMap = new Map<string, Quote[]>();
    for (const q of globalQuotes) {
        if (!globalQuoteMap.has(q.symbol)) {
            globalQuoteMap.set(q.symbol, []);
        }
        globalQuoteMap.get(q.symbol)!.push(q);
    }

    // Find matching symbols
    for (const [symbol, krwList] of krwQuoteMap.entries()) {
        const globalList = globalQuoteMap.get(symbol);
        if (!globalList) continue;

        for (const krwQuote of krwList) {
            for (const globalQuote of globalList) {
                // Convert global price to KRW
                const globalBidKRW = globalQuote.bid * fxRate;
                const globalAskKRW = globalQuote.ask * fxRate;

                // Calculate premium (KRW Bid vs Global Ask for conservative estimate)
                const gapPct = ((krwQuote.bid - globalAskKRW) / globalAskKRW) * 100;

                // Combined volume in KRW (Global volume is in USDT, so convert)
                const globalVolumeKRW = globalQuote.volume * fxRate;
                const totalVolume = krwQuote.volume + globalVolumeKRW;

                premiums.push({
                    id: generateId(),
                    kind: gapPct >= 0 ? 'KIMCHI' : 'REVERSE',
                    baseSymbol: symbol,
                    displaySymbol: symbol,
                    krwSymbol: symbol,
                    globalSymbol: symbol,
                    krwExchange: krwQuote.exchange,
                    globalExchange: globalQuote.exchange,
                    krwMarket: krwQuote.market,
                    globalMarket: globalQuote.market,
                    krwBid: krwQuote.bid,
                    krwAsk: krwQuote.ask,
                    globalBidKRW,
                    globalAskKRW,
                    usdtKrw: fxRate,
                    gapPct: parseFloat(gapPct.toFixed(2)),
                    direction: gapPct >= 0 ? 'GLOBAL_TO_KRW' : 'KRW_TO_GLOBAL',
                    updatedAt: new Date().toISOString(),
                    isAliasPair: false,
                    volume: totalVolume,
                    commonNetworks: [{ network: "Check Exch", status: "Active" }] // Dummy network status
                });
            }
        }
    }

    return premiums;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const {
            symbol,
            includeNegative: includeNegativeParam,
            limit: limitStr,
        } = req.query;

        const limit = limitStr ? parseInt(limitStr as string, 10) : 200;
        const includeNegative = includeNegativeParam !== 'false';

        console.log(`Fetching premiums (symbol=${symbol || 'all'}, limit=${limit})`);
        const startTime = Date.now();

        // Fetch data in parallel
        const [fxRate, bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] = await Promise.all([
            fetchFxRate(),
            fetchBithumbQuotes(),
            fetchUpbitQuotes(),
            fetchBinanceQuotes(),
            fetchOKXQuotes(),
            fetchBybitQuotes(),
        ]);

        const globalQuotes = [...binanceQuotes, ...okxQuotes, ...bybitQuotes];

        const fetchDuration = Date.now() - startTime;
        console.log(`Fetched in ${fetchDuration}ms: FX=${fxRate}, Bithumb=${bithumbQuotes.length}, Upbit=${upbitQuotes.length}, Binance=${binanceQuotes.length}, OKX=${okxQuotes.length}, Bybit=${bybitQuotes.length}`);

        // Combine KRW quotes
        const krwQuotes = [...bithumbQuotes, ...upbitQuotes];

        // Calculate premiums
        let premiums = calculatePremiums(krwQuotes, globalQuotes, fxRate);

        // Filter by symbol if specified
        if (symbol) {
            premiums = premiums.filter((p) => p.baseSymbol.toUpperCase() === (symbol as string).toUpperCase());
        }

        // Filter negative premiums if not included
        if (!includeNegative) {
            premiums = premiums.filter((p) => p.gapPct >= 0);
        }

        // Sort by gap descending
        premiums.sort((a, b) => b.gapPct - a.gapPct);

        // Apply limit
        premiums = premiums.slice(0, limit);

        return res.status(200).json({
            count: premiums.length,
            fxRate,
            fxRateTimestamp: new Date().toISOString(),
            data: premiums,
            meta: {
                fetchDurationMs: fetchDuration,
                krwQuoteCount: krwQuotes.length,
                globalQuoteCount: globalQuotes.length,
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
