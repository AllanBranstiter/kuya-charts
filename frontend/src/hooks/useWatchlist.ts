import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as watchlistApi from '../services/watchlistApi';
import { WatchlistApiItem } from '../types/watchlist';

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector?: string;
  addedAt: string; // ISO timestamp
}

const WATCHLIST_KEY = 'kuya-charts-watchlist';

/**
 * Convert backend API format to local format
 */
function apiItemToLocal(apiItem: WatchlistApiItem, existing?: WatchlistItem): WatchlistItem {
  // Try to preserve name and sector from existing local data if available
  return {
    symbol: apiItem.symbol,
    name: existing?.name || apiItem.symbol, // Backend doesn't store name, use existing or fallback to symbol
    sector: existing?.sector,
    addedAt: apiItem.added_at,
  };
}

/**
 * Custom hook for managing stock watchlist with localStorage and backend persistence
 * 
 * Behavior:
 * - If user is authenticated: Uses backend API as source of truth, syncs to localStorage as cache
 * - If user is not authenticated: Uses localStorage only
 * - On login: Merges local watchlist with backend
 * - On logout: Keeps localStorage but stops syncing to backend
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const hasInitialized = useRef(false);
  const lastAuthState = useRef(isAuthenticated);

  // Load watchlist from localStorage
  const loadFromStorage = useCallback((): WatchlistItem[] => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
    }
    return [];
  }, []);

  // Save watchlist to localStorage
  const saveToStorage = useCallback((items: WatchlistItem[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        setError('Storage limit reached. Please remove some items.');
      }
    }
  }, []);

  // Load watchlist from backend
  const loadFromBackend = useCallback(async (): Promise<WatchlistItem[]> => {
    try {
      const apiItems = await watchlistApi.getWatchlist();
      const localItems = loadFromStorage();
      
      // Convert API items to local format, preserving name/sector from local cache
      const items = apiItems.map(apiItem => {
        const existing = localItems.find(local => local.symbol === apiItem.symbol);
        return apiItemToLocal(apiItem, existing);
      });
      
      return items;
    } catch (error) {
      console.error('Error loading watchlist from backend:', error);
      throw error;
    }
  }, [loadFromStorage]);

  // Sync local watchlist to backend (called on login)
  const syncToBackend = useCallback(async (localItems: WatchlistItem[]) => {
    if (!isAuthenticated || localItems.length === 0) {
      return;
    }

    try {
      // Get current backend watchlist
      const backendItems = await watchlistApi.getWatchlist();
      const backendSymbols = new Set(backendItems.map(item => item.symbol));

      // Add any local items that aren't in the backend
      for (const item of localItems) {
        if (!backendSymbols.has(item.symbol)) {
          try {
            await watchlistApi.addToWatchlist(item.symbol);
          } catch (error) {
            console.error(`Error syncing ${item.symbol} to backend:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing to backend:', error);
    }
  }, [isAuthenticated]);

  // Initialize watchlist on mount or auth change
  useEffect(() => {
    const initializeWatchlist = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // Detect auth state change (login/logout)
      const authChanged = lastAuthState.current !== isAuthenticated;
      lastAuthState.current = isAuthenticated;

      if (isAuthenticated) {
        try {
          setLoading(true);
          setError(null);
          
          // If user just logged in, sync local data to backend first
          if (authChanged && !hasInitialized.current) {
            const localItems = loadFromStorage();
            if (localItems.length > 0) {
              await syncToBackend(localItems);
            }
          }
          
          // Load from backend
          const items = await loadFromBackend();
          setWatchlist(items);
          saveToStorage(items); // Cache in localStorage
        } catch (error) {
          console.error('Failed to load watchlist from backend:', error);
          setError('Failed to load watchlist from server');
          // Fallback to localStorage
          const localItems = loadFromStorage();
          setWatchlist(localItems);
        } finally {
          setLoading(false);
        }
      } else {
        // Not authenticated - use localStorage only
        setLoading(true);
        const localItems = loadFromStorage();
        setWatchlist(localItems);
        setLoading(false);
      }

      hasInitialized.current = true;
    };

    initializeWatchlist();
  }, [isAuthenticated, authLoading, loadFromStorage, loadFromBackend, saveToStorage, syncToBackend]);

  // Add a stock to the watchlist
  const addToWatchlist = useCallback(async (symbol: string, name: string, sector?: string) => {
    const symbolUpper = symbol.toUpperCase();
    
    // Check for duplicates
    if (watchlist.some(item => item.symbol === symbolUpper)) {
      return;
    }

    const newItem: WatchlistItem = {
      symbol: symbolUpper,
      name,
      sector,
      addedAt: new Date().toISOString(),
    };

    // Optimistic update
    const updated = [...watchlist, newItem];
    setWatchlist(updated);
    saveToStorage(updated);

    // If authenticated, sync to backend
    if (isAuthenticated) {
      try {
        const apiItem = await watchlistApi.addToWatchlist(symbolUpper);
        // Update with backend timestamp
        const backendItem = apiItemToLocal(apiItem, newItem);
        const finalUpdated = updated.map(item => 
          item.symbol === symbolUpper ? backendItem : item
        );
        setWatchlist(finalUpdated);
        saveToStorage(finalUpdated);
      } catch (error) {
        console.error('Failed to add to backend watchlist:', error);
        setError(`Failed to sync ${symbolUpper} to server`);
        // Keep the optimistic update - it's still in localStorage
        // User can retry later or it will sync on next login
      }
    }
  }, [watchlist, isAuthenticated, saveToStorage]);

  // Remove a stock from the watchlist
  const removeFromWatchlist = useCallback(async (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();
    
    // Optimistic update
    const updated = watchlist.filter(item => item.symbol !== symbolUpper);
    setWatchlist(updated);
    saveToStorage(updated);

    // If authenticated, sync to backend
    if (isAuthenticated) {
      try {
        await watchlistApi.removeFromWatchlist(symbolUpper);
      } catch (error) {
        console.error('Failed to remove from backend watchlist:', error);
        setError(`Failed to remove ${symbolUpper} from server`);
        // Keep the optimistic update - it's still removed from localStorage
      }
    }
  }, [watchlist, isAuthenticated, saveToStorage]);

  // Check if a stock is in the watchlist
  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.some(item => item.symbol === symbol.toUpperCase());
  }, [watchlist]);

  // Get the entire watchlist
  const getWatchlist = useCallback(() => {
    return watchlist;
  }, [watchlist]);

  // Clear the entire watchlist
  const clearWatchlist = useCallback(async () => {
    // Optimistic update
    setWatchlist([]);
    saveToStorage([]);

    // If authenticated, remove all from backend
    if (isAuthenticated) {
      try {
        const symbols = watchlist.map(item => item.symbol);
        await Promise.all(symbols.map(symbol => watchlistApi.removeFromWatchlist(symbol)));
      } catch (error) {
        console.error('Failed to clear backend watchlist:', error);
        setError('Failed to clear watchlist from server');
      }
    }
  }, [watchlist, isAuthenticated, saveToStorage]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    watchlist,
    loading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    getWatchlist,
    clearWatchlist,
    clearError,
  };
}
