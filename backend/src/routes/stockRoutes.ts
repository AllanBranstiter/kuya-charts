import { Router, Request, Response } from 'express';
import {
  fetchDailyData,
  fetchIntradayData,
  fetchHistoricalData,
  filterDataByDateRange,
  getDataRangeMetadata
} from '../services/alphaVantageService.js';
import { cache } from '../utils/cache.js';
import { stockDataLimiter } from '../middleware/rateLimiter.js';
import { OHLCVData, IntradayInterval } from '../types/stock.js';

const router = Router();

// Valid intraday intervals
const VALID_INTERVALS: IntradayInterval[] = ['1min', '5min', '15min', '30min', '60min'];

/**
 * GET /api/stock/:symbol/daily
 * Fetch daily OHLCV data for a stock symbol
 * Query params (optional):
 *   - from: Start date (YYYY-MM-DD or ISO string)
 *   - to: End date (YYYY-MM-DD or ISO string)
 *   - full: Request full historical data (true/false, default: false)
 */
router.get(
  '/:symbol/daily',
  stockDataLimiter.middleware(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const fromDate = req.query.from as string | undefined;
      const toDate = req.query.to as string | undefined;
      const requestFull = req.query.full === 'true';

      // Validate symbol format (basic validation)
      if (!symbol || symbol.length > 10 || !/^[A-Z]+$/.test(symbol)) {
        res.status(400).json({
          error: 'Invalid Symbol',
          message: 'Please provide a valid stock symbol (letters only, max 10 characters)',
        });
        return;
      }

      // Check cache first
      const cachedData = cache.get<OHLCVData[]>(symbol);
      if (cachedData) {
        console.log(`Cache hit for daily data: ${symbol}`);
        
        // Apply date range filter if requested
        const filteredData = filterDataByDateRange(cachedData, fromDate, toDate);
        const metadata = getDataRangeMetadata(cachedData);
        
        res.json({
          symbol,
          interval: 'daily',
          data: filteredData,
          cached: true,
          metadata,
        });
        return;
      }

      // Fetch from Alpha Vantage API
      // Use fetchHistoricalData if full data is requested, otherwise use fetchDailyData
      console.log(`Fetching ${requestFull ? 'full historical' : 'recent'} daily data from API: ${symbol}`);
      const data = requestFull ? await fetchHistoricalData(symbol) : await fetchDailyData(symbol);

      // Store in cache
      cache.set(symbol, data);

      // Apply date range filter if requested
      const filteredData = filterDataByDateRange(data, fromDate, toDate);
      const metadata = getDataRangeMetadata(data);

      res.json({
        symbol,
        interval: 'daily',
        data: filteredData,
        cached: false,
        metadata,
      });
    } catch (error: unknown) {
      console.error('Error fetching daily data:', error);
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Invalid symbol')) {
          res.status(404).json({
            error: 'Symbol Not Found',
            message: error.message,
          });
          return;
        }
        
        if (error.message.includes('rate limit')) {
          res.status(429).json({
            error: 'API Rate Limit',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('API key')) {
          res.status(503).json({
            error: 'Service Configuration Error',
            message: 'API service is not properly configured',
          });
          return;
        }
        
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }
);

/**
 * GET /api/stock/:symbol/intraday?interval=15min
 * Fetch intraday OHLCV data for a stock symbol
 * Query params:
 *   - interval: Required, one of: 1min, 5min, 15min, 30min, 60min
 */
router.get(
  '/:symbol/intraday',
  stockDataLimiter.middleware(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const interval = req.query.interval as string;

      // Validate symbol format
      if (!symbol || symbol.length > 10 || !/^[A-Z]+$/.test(symbol)) {
        res.status(400).json({
          error: 'Invalid Symbol',
          message: 'Please provide a valid stock symbol (letters only, max 10 characters)',
        });
        return;
      }

      // Validate interval parameter
      if (!interval) {
        res.status(400).json({
          error: 'Missing Parameter',
          message: 'Interval parameter is required. Valid values: 1min, 5min, 15min, 30min, 60min',
        });
        return;
      }

      if (!VALID_INTERVALS.includes(interval as IntradayInterval)) {
        res.status(400).json({
          error: 'Invalid Interval',
          message: `Invalid interval: ${interval}. Valid values: ${VALID_INTERVALS.join(', ')}`,
        });
        return;
      }

      // Check cache first
      const cachedData = cache.get<OHLCVData[]>(symbol, interval);
      if (cachedData) {
        console.log(`Cache hit for intraday data: ${symbol} (${interval})`);
        res.json({
          symbol,
          interval,
          data: cachedData,
          cached: true,
        });
        return;
      }

      // Fetch from Alpha Vantage API
      console.log(`Fetching intraday data from API: ${symbol} (${interval})`);
      const data = await fetchIntradayData(symbol, interval as IntradayInterval);

      // Store in cache
      cache.set(symbol, data, interval);

      res.json({
        symbol,
        interval,
        data,
        cached: false,
      });
    } catch (error: unknown) {
      console.error('Error fetching intraday data:', error);
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Invalid symbol')) {
          res.status(404).json({
            error: 'Symbol Not Found',
            message: error.message,
          });
          return;
        }
        
        if (error.message.includes('rate limit')) {
          res.status(429).json({
            error: 'API Rate Limit',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('API key')) {
          res.status(503).json({
            error: 'Service Configuration Error',
            message: 'API service is not properly configured',
          });
          return;
        }
        
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }
);

export default router;
