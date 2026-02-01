/**
 * Shared utilities for Vercel Serverless Functions
 * Re-exports services from backend
 */

// Re-export services (these will be bundled into serverless functions)
export { fxRateService } from '../backend/src/services/FxRateService';
export { walletStatusCache } from '../backend/src/services/CacheService';
export { BithumbQuoteConnector } from '../backend/src/connectors/BithumbQuoteConnector';
export { BinanceQuoteConnector } from '../backend/src/connectors/BinanceQuoteConnector';
export { OKXQuoteConnector } from '../backend/src/connectors/OKXQuoteConnector';
export { UpbitQuoteConnector } from '../backend/src/connectors/UpbitQuoteConnector';
export { BybitQuoteConnector } from '../backend/src/connectors/BybitQuoteConnector';

// CORS helper
export function setCorsHeaders(res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Handle OPTIONS preflight
export function handleOptions(req: any, res: any): boolean {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}
