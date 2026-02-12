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
    changeRate?: number; // 24h Change Rate (e.g. 5.5 for 5.5%)
    timestamp: string;
}

// Premium interface with Volume and Networks
// Premium interface with Volume and Networks
interface Premium {
    id: string;
    kind: 'KIMCHI' | 'REVERSE' | 'DOMESTIC';
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
    krwLast?: number;
    globalBid?: number;
    globalAsk?: number;
    globalLast?: number;
    globalBidKRW: number;
    globalAskKRW: number;
    globalLastKRW?: number;
    usdtKrw: number;
    gapPct: number;
    direction: 'GLOBAL_TO_KRW' | 'KRW_TO_GLOBAL' | 'UPBIT_TO_BITHUMB' | 'BITHUMB_TO_UPBIT';
    updatedAt: string;
    isAliasPair: boolean;
    volume: number; // Combined 24h volume in KRW
    krwVolume24hUsd?: number; // Volume of KRW exchange (in USD approx)
    globalVolume24hUsd?: number; // Volume of Global/Counter exchange (in USD approx)
    krwChangeRate?: number; // 24h Change Rate of KRW exchange (%)
    globalChangeRate?: number; // 24h Change Rate of Global exchange (%)
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

// ... (Fetch functions remain the same) ...

// Include previous fetch functions here or assume they are unchanged if using diff is smarter, but due to file size limits and ReplaceFileContent behavior, I should include the whole modified section if I'm replacing a large chunk.
// I will keep fetch functions as is and only replace from calculatePremiums downwards.

// Fetch Fx Rate
async function fetchFxRate(): Promise<number> {
    try {
        const response = await fetch('https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD');
        const data = await response.json();
        return data[0].basePrice;
    } catch (error) {
        console.error('Failed to fetch FX rate:', error);
        return 1300; // Default or fallback rate
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
            const volume = parseFloat(t.acc_trade_value_24H || '0');
            // Bithumb gives fluctuation rate string "5.21" -> 5.21%
            const changeRate = parseFloat(t['24H_fluctate_rate'] || '0');

            if (bid > 0) {
                quotes.push({
                    exchange: 'BITHUMB',
                    symbol,
                    market: `${symbol}/KRW`,
                    bid,
                    ask,
                    volume,
                    changeRate,
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
        const krwMarkets = markets.filter((m: any) => m.market.startsWith('KRW-'));

        if (krwMarkets.length === 0) return [];

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
                    // Upbit signed_change_rate is e.g. 0.05 for 5% -> multiply by 100
                    const changeRate = (t.signed_change_rate || 0) * 100;

                    quotes.push({
                        exchange: 'UPBIT',
                        symbol,
                        market: `${symbol}/KRW`,
                        bid: t.trade_price,
                        ask: t.trade_price * 1.001,
                        volume: t.acc_trade_price_24h,
                        changeRate,
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
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (!response.ok) return [];

        const data: any[] = await response.json();
        const timestamp = new Date().toISOString();

        return data
            .filter((t: any) => t.symbol.endsWith('USDT'))
            .map((t: any) => {
                const symbol = t.symbol.replace('USDT', '');
                // Binance priceChangePercent is "5.5" -> 5.5%
                const changeRate = parseFloat(t.priceChangePercent);

                return {
                    exchange: 'BINANCE',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bidPrice),
                    ask: parseFloat(t.askPrice),
                    volume: parseFloat(t.quoteVolume),
                    changeRate,
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
                const last = parseFloat(t.last);
                const open24h = parseFloat(t.open24h);
                // Calculate change percent: ((last - open) / open) * 100
                const changeRate = open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;

                return {
                    exchange: 'OKX',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bidPx),
                    ask: parseFloat(t.askPx),
                    volume: parseFloat(t.volCcy24h),
                    changeRate,
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch {
        return [];
    }
}

// Fetch Bybit quotes
async function fetchBybitQuotes(): Promise<Quote[]> {
    try {
        const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
        if (!response.ok) return [];

        const data: any = await response.json();
        if (data.retCode !== 0) return [];

        const timestamp = new Date().toISOString();

        return data.result.list
            .filter((t: any) => t.symbol.endsWith('USDT'))
            .map((t: any) => {
                const symbol = t.symbol.replace('USDT', '');
                // Bybit price24hPcnt is "0.05" -> 5% (Check API docs: it's ratio, so * 100)
                const changeRate = parseFloat(t.price24hPcnt) * 100;

                return {
                    exchange: 'BYBIT',
                    symbol,
                    market: `${symbol}/USDT`,
                    bid: parseFloat(t.bid1Price),
                    ask: parseFloat(t.ask1Price),
                    volume: parseFloat(t.turnover24h),
                    changeRate,
                    timestamp,
                };
            })
            .filter((q: Quote) => q.bid > 0 && q.ask > 0);
    } catch (error) {
        return [];
    }
}

// Calculate Kimchi premiums (KRW vs Global)
function calculateKimchiPremiums(
    krwQuotes: Quote[],
    globalQuotes: Quote[],
    fxRate: number
): Premium[] {
    const premiums: Premium[] = [];

    const krwQuoteMap = new Map<string, Quote[]>();
    for (const q of krwQuotes) {
        if (!krwQuoteMap.has(q.symbol)) krwQuoteMap.set(q.symbol, []);
        krwQuoteMap.get(q.symbol)!.push(q);
    }

    const globalQuoteMap = new Map<string, Quote[]>();
    for (const q of globalQuotes) {
        if (!globalQuoteMap.has(q.symbol)) globalQuoteMap.set(q.symbol, []);
        globalQuoteMap.get(q.symbol)!.push(q);
    }

    for (const [symbol, krwList] of krwQuoteMap.entries()) {
        const globalList = globalQuoteMap.get(symbol);
        if (!globalList) continue;

        for (const krwQuote of krwList) {
            for (const globalQuote of globalList) {
                const globalBidKRW = globalQuote.bid * fxRate;
                const globalAskKRW = globalQuote.ask * fxRate;

                // Gap: (KRW - Global) / Global
                // Use Bid vs Bid (or Last vs Last) for standard Kimchi Premium display.
                // Using Ask(execution price) caused confusion as it includes spread.
                const gapPct = ((krwQuote.bid - globalBidKRW) / globalBidKRW) * 100;

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
                    krwLast: krwQuote.bid, // Approx
                    globalBid: globalQuote.bid,
                    globalAsk: globalQuote.ask,
                    globalLast: globalQuote.bid, // Approx
                    globalBidKRW,
                    globalAskKRW,
                    globalLastKRW: globalBidKRW,
                    usdtKrw: fxRate,
                    gapPct: parseFloat(gapPct.toFixed(2)),
                    direction: gapPct >= 0 ? 'GLOBAL_TO_KRW' : 'KRW_TO_GLOBAL',
                    updatedAt: new Date().toISOString(),
                    isAliasPair: false,
                    volume: totalVolume,
                    krwVolume24hUsd: krwQuote.volume / fxRate,
                    globalVolume24hUsd: globalQuote.volume,
                    krwChangeRate: krwQuote.changeRate,     // Pass KRW Change Rate
                    globalChangeRate: globalQuote.changeRate, // Pass Global Change Rate
                    commonNetworks: [{ network: "Check Exch", status: "Active" }]
                });
            }
        }
    }
    return premiums;
}

// Calculate Domestic premiums (Upbit vs Bithumb)
function calculateDomesticPremiums(
    upbitQuotes: Quote[],
    bithumbQuotes: Quote[],
    fxRate: number
): Premium[] {
    const premiums: Premium[] = [];

    // Map by symbol
    const upbitMap = new Map(upbitQuotes.map(q => [q.symbol, q]));
    const bithumbMap = new Map(bithumbQuotes.map(q => [q.symbol, q]));

    // Find intersection
    for (const [symbol, upbitQuote] of upbitMap.entries()) {
        const bithumbQuote = bithumbMap.get(symbol);
        if (!bithumbQuote) continue;

        // Gap: (Upbit - Bithumb) / Bithumb
        // If > 0: Upbit is more expensive (Sell Upbit, Buy Bithumb) -> Direction BITHUMB_TO_UPBIT
        const gapPct = ((upbitQuote.bid - bithumbQuote.ask) / bithumbQuote.ask) * 100;

        // If < 0: Bithumb is more expensive (Sell Bithumb, Buy Upbit) -> Direction UPBIT_TO_BITHUMB
        // But we usually just show the gap. Let's standardize on Upbit - Bithumb

        const totalVolume = upbitQuote.volume + bithumbQuote.volume;

        premiums.push({
            id: generateId(),
            kind: 'DOMESTIC',
            baseSymbol: symbol,
            displaySymbol: symbol,
            krwSymbol: symbol,
            globalSymbol: symbol,
            krwExchange: 'UPBIT',     // Fixed as Upbit for domestic pair left side
            globalExchange: 'BITHUMB', // Fixed as Bithumb for domestic pair right side
            krwMarket: upbitQuote.market,
            globalMarket: bithumbQuote.market,
            krwBid: upbitQuote.bid,
            krwAsk: upbitQuote.ask,
            krwLast: upbitQuote.bid,
            globalBid: bithumbQuote.bid,
            globalAsk: bithumbQuote.ask,
            globalLast: bithumbQuote.bid,
            globalBidKRW: bithumbQuote.bid,
            globalAskKRW: bithumbQuote.ask,
            globalLastKRW: bithumbQuote.bid,
            usdtKrw: fxRate,
            gapPct: parseFloat(gapPct.toFixed(2)),
            direction: gapPct >= 0 ? 'BITHUMB_TO_UPBIT' : 'UPBIT_TO_BITHUMB',
            updatedAt: new Date().toISOString(),
            isAliasPair: false,
            volume: totalVolume,
            krwVolume24hUsd: upbitQuote.volume / fxRate,   // Upbit Volume in USD
            globalVolume24hUsd: bithumbQuote.volume / fxRate, // Bithumb Volume in USD
            krwChangeRate: upbitQuote.changeRate,     // Upbit Change
            globalChangeRate: bithumbQuote.changeRate, // Bithumb Change (mapped to global slot for domestic logic)
            commonNetworks: [{ network: "Check Exch", status: "Active" }]
        });
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
            type, // 'kimchi' | 'domestic'
            symbol,
            includeNegative: includeNegativeParam,
            limit: limitStr,
            krwExchange: krwExParam,
            globalExchange: globalExParam
        } = req.query;

        const limit = limitStr ? parseInt(limitStr as string, 10) : 200;
        const includeNegative = includeNegativeParam !== 'false';
        const calculationType = type === 'domestic' ? 'domestic' : 'kimchi';

        // Parallel Fetch
        const [fxRate, bithumbQuotes, upbitQuotes, binanceQuotes, okxQuotes, bybitQuotes] = await Promise.all([
            fetchFxRate(),
            fetchBithumbQuotes(),
            fetchUpbitQuotes(),
            fetchBinanceQuotes(),
            fetchOKXQuotes(),
            fetchBybitQuotes(),
        ]);

        let premiums: Premium[] = [];

        if (calculationType === 'domestic') {
            // Domestic: Upbit vs Bithumb
            premiums = calculateDomesticPremiums(upbitQuotes, bithumbQuotes, fxRate);
        } else {
            // Kimchi: KRW vs Global
            const targetKrwEx = (krwExParam as string)?.toUpperCase() || 'UPBIT';
            const targetGlobalEx = (globalExParam as string)?.toUpperCase() || 'BINANCE';

            let krwQuotes = targetKrwEx === 'BITHUMB' ? bithumbQuotes : upbitQuotes;
            let globalQuotes: Quote[] = [];

            if (targetGlobalEx === 'OKX') globalQuotes = okxQuotes;
            else if (targetGlobalEx === 'BYBIT') globalQuotes = bybitQuotes;
            else globalQuotes = binanceQuotes; // Default Binance

            premiums = calculateKimchiPremiums(krwQuotes, globalQuotes, fxRate);
        }

        // Filter by symbol
        if (symbol) {
            premiums = premiums.filter((p) => p.baseSymbol.toUpperCase() === (symbol as string).toUpperCase());
        }

        // Filter negative premiums if requested (optional)
        // if (!includeNegative) { ... } // Usually we want to see negative premiums too for reverse arbitrage

        // Sort by absolute gap descending (interesting opportunities first)
        premiums.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

        // Limit
        premiums = premiums.slice(0, limit);

        return res.status(200).json({
            count: premiums.length,
            fxRate,
            data: premiums,
            meta: {
                timestamp: new Date().toISOString(),
            }
        });
    } catch (error) {
        console.error('Premiums error:', error);
        return res.status(500).json({
            error: 'Failed to fetch premiums',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
