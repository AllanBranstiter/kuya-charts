// Watchlist service for database operations related to user watchlists

import { query } from '../utils/db.js';

// Watchlist item structure
export interface WatchlistItem {
  id: number;
  user_id: number;
  stock_symbol: string;
  added_at: Date;
}

// Watchlist item for API responses (without internal IDs)
export interface WatchlistResponse {
  symbol: string;
  added_at: Date;
}

/**
 * Get all watchlist symbols for a user
 * @param userId - User's ID
 * @returns Array of watchlist items
 */
export async function getUserWatchlist(userId: number): Promise<WatchlistResponse[]> {
  try {
    const result = await query<WatchlistResponse>(
      `SELECT stock_symbol as symbol, added_at
       FROM user_watchlists
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user watchlist:', error);
    throw new Error('Failed to retrieve watchlist');
  }
}

/**
 * Add a symbol to user's watchlist
 * @param userId - User's ID
 * @param symbol - Stock symbol to add
 * @returns Added watchlist item
 * @throws Error if symbol already exists (duplicate)
 */
export async function addToWatchlist(
  userId: number,
  symbol: string
): Promise<WatchlistResponse> {
  try {
    const result = await query<WatchlistResponse>(
      `INSERT INTO user_watchlists (user_id, stock_symbol)
       VALUES ($1, $2)
       RETURNING stock_symbol as symbol, added_at`,
      [userId, symbol.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to add symbol to watchlist');
    }

    return result.rows[0];
  } catch (error: any) {
    // Handle unique constraint violation (duplicate entry)
    if (error.code === '23505') {
      throw new Error('Symbol already exists in watchlist');
    }

    // Re-throw other errors
    console.error('Error adding to watchlist:', error);
    throw error;
  }
}

/**
 * Remove a symbol from user's watchlist
 * @param userId - User's ID
 * @param symbol - Stock symbol to remove
 * @returns true if symbol was removed, false if not found
 */
export async function removeFromWatchlist(
  userId: number,
  symbol: string
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM user_watchlists
       WHERE user_id = $1 AND stock_symbol = $2`,
      [userId, symbol.toUpperCase()]
    );

    // Return true if at least one row was deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw new Error('Failed to remove symbol from watchlist');
  }
}

/**
 * Check if a symbol is in user's watchlist
 * @param userId - User's ID
 * @param symbol - Stock symbol to check
 * @returns true if symbol is in watchlist, false otherwise
 */
export async function isInWatchlist(
  userId: number,
  symbol: string
): Promise<boolean> {
  try {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM user_watchlists
         WHERE user_id = $1 AND stock_symbol = $2
       ) as exists`,
      [userId, symbol.toUpperCase()]
    );

    return result.rows[0]?.exists ?? false;
  } catch (error) {
    console.error('Error checking watchlist:', error);
    throw new Error('Failed to check watchlist');
  }
}
