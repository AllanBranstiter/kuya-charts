import express, { Request, Response } from 'express';
import { getStocksList, getDistinctSectors } from '../services/databaseService.js';
import { getMetricsStatus } from '../services/metricsUpdateService.js';
import { StockListFilters } from '../types/stock.js';

const router = express.Router();

/**
 * GET /api/stocks/list
 * Returns a list of stocks with optional filtering and pagination
 *
 * Query parameters:
 * - sector: Filter by sector (string)
 * - minMarketCap: Minimum market cap in USD (number)
 * - maxMarketCap: Maximum market cap in USD (number)
 * - minPrice: Minimum stock price (number)
 * - maxPrice: Maximum stock price (number)
 * - rsiMin: Minimum RSI value (0-100)
 * - rsiMax: Maximum RSI value (0-100)
 * - priceVsSma50: Price vs 50-day SMA ('above' or 'below')
 * - priceVsSma200: Price vs 200-day SMA ('above' or 'below')
 * - volumeSpikeMin: Minimum volume spike ratio (e.g., 1.5 for 1.5x average)
 * - limit: Number of results to return (default: 100, max: 500)
 * - offset: Number of results to skip for pagination (default: 0)
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const filters: StockListFilters = {};

    // Fundamental filters
    if (req.query.sector) {
      filters.sector = req.query.sector as string;
    }

    if (req.query.minMarketCap) {
      const value = parseInt(req.query.minMarketCap as string, 10);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'minMarketCap must be a non-negative number',
        });
      }
      filters.minMarketCap = value;
    }

    if (req.query.maxMarketCap) {
      const value = parseInt(req.query.maxMarketCap as string, 10);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'maxMarketCap must be a non-negative number',
        });
      }
      filters.maxMarketCap = value;
    }

    // Price filters
    if (req.query.minPrice) {
      const value = parseFloat(req.query.minPrice as string);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'minPrice must be a non-negative number',
        });
      }
      filters.minPrice = value;
    }

    if (req.query.maxPrice) {
      const value = parseFloat(req.query.maxPrice as string);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'maxPrice must be a non-negative number',
        });
      }
      filters.maxPrice = value;
    }

    // Technical filters
    if (req.query.rsiMin) {
      const value = parseFloat(req.query.rsiMin as string);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'rsiMin must be between 0 and 100',
        });
      }
      filters.rsiMin = value;
    }

    if (req.query.rsiMax) {
      const value = parseFloat(req.query.rsiMax as string);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'rsiMax must be between 0 and 100',
        });
      }
      filters.rsiMax = value;
    }

    if (req.query.priceVsSma50) {
      const value = req.query.priceVsSma50 as string;
      if (value !== 'above' && value !== 'below') {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'priceVsSma50 must be "above" or "below"',
        });
      }
      filters.priceVsSma50 = value;
    }

    if (req.query.priceVsSma200) {
      const value = req.query.priceVsSma200 as string;
      if (value !== 'above' && value !== 'below') {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'priceVsSma200 must be "above" or "below"',
        });
      }
      filters.priceVsSma200 = value;
    }

    if (req.query.volumeSpikeMin) {
      const value = parseFloat(req.query.volumeSpikeMin as string);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'volumeSpikeMin must be a non-negative number',
        });
      }
      filters.volumeSpikeMin = value;
    }

    // Pagination
    if (req.query.limit) {
      const value = parseInt(req.query.limit as string, 10);
      if (isNaN(value) || value < 1 || value > 500) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'limit must be between 1 and 500',
        });
      }
      filters.limit = value;
    }

    if (req.query.page) {
      const value = parseInt(req.query.page as string, 10);
      if (isNaN(value) || value < 1) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'page must be a positive number',
        });
      }
      filters.page = value;
    }

    if (req.query.offset) {
      const value = parseInt(req.query.offset as string, 10);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'offset must be a non-negative number',
        });
      }
      filters.offset = value;
    }

    // Get stocks from database
    const result = await getStocksList(filters);

    return res.json(result);
  } catch (error) {
    console.error('Error fetching stocks list:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch stocks list',
    });
  }
});

/**
 * GET /api/stocks/sectors
 * Returns a list of distinct sectors available in the database
 */
router.get('/sectors', async (_req: Request, res: Response) => {
  try {
    const sectors = await getDistinctSectors();
    return res.json({ sectors });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sectors',
    });
  }
});

/**
 * GET /api/stocks/metrics/status
 * Returns status information about technical metrics
 * Includes last update date and count of stocks with metrics
 */
router.get('/metrics/status', async (_req: Request, res: Response) => {
  try {
    const status = await getMetricsStatus();
    return res.json(status);
  } catch (error) {
    console.error('Error fetching metrics status:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch metrics status',
    });
  }
});

export default router;
