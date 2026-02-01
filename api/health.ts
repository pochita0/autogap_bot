/**
 * Vercel Serverless Function: Health Check
 * GET /api/health
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VERSION = '0.1.0';

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return res.status(200).json({
        ok: true,
        version: VERSION,
        time: new Date().toISOString(),
        platform: 'vercel',
    });
}
