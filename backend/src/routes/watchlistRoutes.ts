import { Router, Response } from 'express';
import {
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from '../services/watchlistService.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';

const router = Router();

// Symbol validation regex (uppercase letters and numbers, 1-10 characters)
const SYMBOL_REGEX = /^[A-Z0-9]{1,10}$/;

/**
 * GET /api/watchlist
 * Get current user's watchlist
 * Requires authentication
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Get user's watchlist
    const watchlist = await getUserWatchlist(req.user.userId);

    res.json({
      success: true,
      watchlist,
    });
  } catch (error: unknown) {
    console.error('Get watchlist error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve watchlist',
    });
  }
});

/**
 * POST /api/watchlist
 * Add symbol to user's watchlist
 * Body: { symbol: string }
 * Requires authentication
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { symbol } = req.body;

    // Validate required field
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Symbol is required',
      });
      return;
    }

    // Validate symbol format
    const normalizedSymbol = symbol.toUpperCase().trim();
    if (!SYMBOL_REGEX.test(normalizedSymbol)) {
      res.status(400).json({
        success: false,
        error: 'Invalid symbol format',
        message: 'Symbol must be 1-10 uppercase alphanumeric characters',
      });
      return;
    }

    // Add to watchlist
    await addToWatchlist(req.user.userId, normalizedSymbol);

    res.status(201).json({
      success: true,
      message: 'Added to watchlist',
    });
  } catch (error: unknown) {
    console.error('Add to watchlist error:', error);

    if (error instanceof Error) {
      // Handle duplicate symbol error
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'Symbol already exists in watchlist',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add symbol to watchlist',
    });
  }
});

/**
 * DELETE /api/watchlist/:symbol
 * Remove symbol from user's watchlist
 * URL parameter: symbol
 * Requires authentication
 */
router.delete('/:symbol', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { symbol } = req.params;

    // Validate symbol parameter
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'Symbol parameter is required',
      });
      return;
    }

    const normalizedSymbol = symbol.toUpperCase().trim();

    // Remove from watchlist
    const removed = await removeFromWatchlist(req.user.userId, normalizedSymbol);

    if (!removed) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Symbol not found in watchlist',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Removed from watchlist',
    });
  } catch (error: unknown) {
    console.error('Remove from watchlist error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove symbol from watchlist',
    });
  }
});

/**
 * GET /api/watchlist/check/:symbol
 * Check if symbol is in user's watchlist
 * URL parameter: symbol
 * Requires authentication
 */
router.get('/check/:symbol', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { symbol } = req.params;

    // Validate symbol parameter
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'Symbol parameter is required',
      });
      return;
    }

    const normalizedSymbol = symbol.toUpperCase().trim();

    // Check if in watchlist
    const inWatchlist = await isInWatchlist(req.user.userId, normalizedSymbol);

    res.json({
      success: true,
      inWatchlist,
    });
  } catch (error: unknown) {
    console.error('Check watchlist error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check watchlist',
    });
  }
});

export default router;
