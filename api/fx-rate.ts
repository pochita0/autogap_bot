/**
 * Vercel Serverless Function: FX Rate
 * GET /api/fx-rate
 * 
 * Fetches USDT/KRW rate from Bithumb
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS helper
function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

interface BithumbTickerResponse {
    status: string;
    data: {
        opening_price: string;
        closing_price: string;
        min_price: string;
        max_price: string;
        units_traded: string;
        units_traded_24H: string;
        fluctate_24H: string;
        fluctate_rate_24H: string;
        prev_closing_price: string;
        acc_trade_value: string;
        acc_trade_value_24H: string;
    };
}

async function fetchBithumbUsdtKrw(): Promise<{ bid: number; ask: number; mid: number }> {
    const response = await fetch('https://api.bithumb.com/public/ticker/USDT_KRW');

    if (!response.ok) {
        throw new Error(`Bithumb API error: ${response.status}`);
    }

    const data: BithumbTickerResponse = await response.json();

    if (data.status !== '0000') {
        throw new Error(`Bithumb API returned status: ${data.status}`);
    }

    const closingPrice = parseFloat(data.data.closing_price);
    // Estimate bid/ask from closing price (typical spread ~0.1%)
    const spread = 0.001;
    const bid = closingPrice * (1 - spread / 2);
    const ask = closingPrice * (1 + spread / 2);

    return {
        bid,
        ask,
        mid: closingPrice,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { bid, ask, mid } = await fetchBithumbUsdtKrw();

        return res.status(200).json({
            source: 'BITHUMB',
            bid,
            ask,
            mid,
            timestamp: new Date().toISOString(),
            stale: false,
        });
    } catch (error) {
        console.error('FX rate error:', error);
        return res.status(500).json({
            error: 'Failed to fetch FX rate',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
