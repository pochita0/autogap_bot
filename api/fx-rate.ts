/**
 * Vercel Serverless Function: FX Rate
 * GET /api/fx-rate
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fxRateService, setCorsHeaders, handleOptions } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);
    if (handleOptions(req, res)) return;

    try {
        const rateData = await fxRateService.getUsdtKrwRate();
        return res.status(200).json(rateData);
    } catch (error) {
        console.error('FX rate error:', error);
        return res.status(500).json({
            error: 'Failed to fetch FX rate',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
