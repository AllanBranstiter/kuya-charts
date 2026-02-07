import { getStoredToken, clearStoredToken } from './authApi';
import {
  WatchlistApiItem,
  WatchlistSuccessResponse,
  WatchlistErrorResponse,
  AddToWatchlistRequest,
} from '../types/watchlist';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Get the user's watchlist from the backend
 * @returns Promise with array of watchlist items
 * @throws Error if not authenticated or request fails
 */
export async function getWatchlist(): Promise<WatchlistApiItem[]> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: WatchlistErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to get watchlist');
    }

    const data: WatchlistSuccessResponse = await response.json();
    
    // The backend returns { success: true, data: [...] }
    if (data.success && Array.isArray(data.data)) {
      return data.data as WatchlistApiItem[];
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching watchlist');
  }
}

/**
 * Add a stock to the user's watchlist
 * @param symbol - Stock symbol to add
 * @returns Promise with the added watchlist item
 * @throws Error if not authenticated or request fails
 */
export async function addToWatchlist(symbol: string): Promise<WatchlistApiItem> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const requestBody: AddToWatchlistRequest = {
      symbol: symbol.toUpperCase(),
    };

    const response = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      // 409 Conflict means already in watchlist - not really an error
      if (response.status === 409) {
        const errorData: WatchlistErrorResponse = await response.json();
        throw new Error(errorData.message || 'Already in watchlist');
      }
      
      const errorData: WatchlistErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to add to watchlist');
    }

    const data: WatchlistSuccessResponse = await response.json();
    
    if (data.success && data.data && !Array.isArray(data.data)) {
      return data.data as WatchlistApiItem;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while adding to watchlist');
  }
}

/**
 * Remove a stock from the user's watchlist
 * @param symbol - Stock symbol to remove
 * @returns Promise that resolves when removed
 * @throws Error if not authenticated or request fails
 */
export async function removeFromWatchlist(symbol: string): Promise<void> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/watchlist/${symbol.toUpperCase()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      // 404 means not in watchlist - not really an error for deletion
      if (response.status === 404) {
        return; // Already removed or never existed
      }
      
      const errorData: WatchlistErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to remove from watchlist');
    }

    // Success - no return value needed
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while removing from watchlist');
  }
}

/**
 * Check if a stock is in the user's watchlist
 * @param symbol - Stock symbol to check
 * @returns Promise with boolean indicating if in watchlist
 * @throws Error if not authenticated or request fails
 */
export async function checkInWatchlist(symbol: string): Promise<boolean> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/watchlist/check/${symbol.toUpperCase()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: WatchlistErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to check watchlist');
    }

    const data: { success: boolean; inWatchlist: boolean } = await response.json();
    return data.inWatchlist;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while checking watchlist');
  }
}
