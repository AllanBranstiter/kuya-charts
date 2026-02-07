/**
 * Types for watchlist data and API responses
 */

/**
 * Watchlist item as stored locally and used in the UI
 */
export interface WatchlistItem {
  symbol: string;
  name: string;
  sector?: string;
  addedAt: string; // ISO timestamp
}

/**
 * Watchlist item as returned by the backend API
 */
export interface WatchlistApiItem {
  symbol: string;
  added_at: string; // ISO timestamp (snake_case from backend)
}

/**
 * Request body for adding to watchlist
 */
export interface AddToWatchlistRequest {
  symbol: string;
}

/**
 * Success response from watchlist API endpoints
 */
export interface WatchlistSuccessResponse {
  success: boolean;
  message: string;
  data?: WatchlistApiItem | WatchlistApiItem[];
}

/**
 * Error response from watchlist API endpoints
 */
export interface WatchlistErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Union type for all watchlist API responses
 */
export type WatchlistResponse = WatchlistSuccessResponse | WatchlistErrorResponse;
