import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist, WatchlistItem } from '../hooks/useWatchlist';
import { useRealtimePrices } from '../hooks/useWebSocket';
import { fetchDailyData } from '../services/stockApi';
import { OHLCVData } from '../types/stock';
import { ConnectionStatusLabel } from './ConnectionStatusIndicator';
import ThemeToggle from './ThemeToggle';
import AuthButton from './AuthButton';
import { useAuth } from '../contexts/AuthContext';

interface WatchlistItemWithPrice extends WatchlistItem {
  currentPrice?: number;
  previousClose?: number;
  changePercent?: number;
  loading?: boolean;
  error?: string;
}

type SortField = 'symbol' | 'name' | 'sector' | 'changePercent' | 'addedAt';
type SortDirection = 'asc' | 'desc';

export default function Watchlist() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { watchlist, removeFromWatchlist, loading: watchlistLoading, error: watchlistError, clearError } = useWatchlist();
  const [watchlistWithPrices, setWatchlistWithPrices] = useState<WatchlistItemWithPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<SortField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [apiLimitWarning, setApiLimitWarning] = useState(false);
  const [useLiveData, setUseLiveData] = useState(true); // Toggle for live vs manual refresh
  
  // Subscribe to real-time prices for all watchlist symbols
  const watchlistSymbols = useMemo(() => watchlist.map(item => item.symbol), [watchlist]);
  const { priceUpdates, isConnected: wsConnected } = useRealtimePrices(
    watchlistSymbols,
    useLiveData && watchlistSymbols.length > 0
  );

  // Fetch price data for all watchlist items
  const fetchPricesForWatchlist = useCallback(async () => {
    if (watchlist.length === 0) {
      setWatchlistWithPrices([]);
      return;
    }

    // Warn if trying to fetch too many items
    if (watchlist.length > 5) {
      setApiLimitWarning(true);
    }

    setLoading(true);

    // Initialize watchlist items with loading state
    const itemsWithLoading: WatchlistItemWithPrice[] = watchlist.map(item => ({
      ...item,
      loading: true,
    }));
    setWatchlistWithPrices(itemsWithLoading);

    // Fetch prices sequentially with delay to respect API rate limits
    const updatedItems: WatchlistItemWithPrice[] = [];

    for (let i = 0; i < watchlist.length; i++) {
      const item = watchlist[i];
      
      try {
        // Add delay between requests (1 second) to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await fetchDailyData(item.symbol);
        
        if (response.data && response.data.length >= 2) {
          const latestData: OHLCVData = response.data[0];
          const previousData: OHLCVData = response.data[1];
          
          const currentPrice = latestData.close;
          const previousClose = previousData.close;
          const changePercent = ((currentPrice - previousClose) / previousClose) * 100;

          updatedItems.push({
            ...item,
            currentPrice,
            previousClose,
            changePercent,
            loading: false,
          });
        } else {
          updatedItems.push({
            ...item,
            loading: false,
            error: 'No price data available',
          });
        }
      } catch (error) {
        console.error(`Error fetching price for ${item.symbol}:`, error);
        updatedItems.push({
          ...item,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch price',
        });
      }

      // Update UI after each fetch
      setWatchlistWithPrices([...updatedItems]);
    }

    setLoading(false);
    setLastUpdated(new Date());
  }, [watchlist]);
  
  // Merge live data with watchlist items
  const watchlistWithLiveData = useMemo<WatchlistItemWithPrice[]>(() => {
    return watchlist.map(item => {
      const liveUpdate = priceUpdates.get(item.symbol.toUpperCase());
      
      if (liveUpdate && useLiveData) {
        // Use live data if available and enabled
        return {
          ...item,
          currentPrice: liveUpdate.price,
          previousClose: undefined, // We don't have previous close from WebSocket
          changePercent: liveUpdate.changePercent,
          loading: false,
        };
      }
      
      // Fall back to manually refreshed data
      const existingItem = watchlistWithPrices.find(w => w.symbol === item.symbol);
      return existingItem || { ...item, loading: false };
    });
  }, [watchlist, priceUpdates, useLiveData, watchlistWithPrices]);

  // Fetch prices on mount and when watchlist changes
  useEffect(() => {
    fetchPricesForWatchlist();
  }, [fetchPricesForWatchlist]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort watchlist items - use live data if available
  const sortedWatchlist = [...watchlistWithLiveData].sort((a, b) => {
    let aValue: string | number | undefined;
    let bValue: string | number | undefined;

    switch (sortField) {
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'sector':
        aValue = a.sector || '';
        bValue = b.sector || '';
        break;
      case 'changePercent':
        aValue = a.changePercent ?? -Infinity;
        bValue = b.changePercent ?? -Infinity;
        break;
      case 'addedAt':
        aValue = new Date(a.addedAt).getTime();
        bValue = new Date(b.addedAt).getTime();
        break;
    }

    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }

    return 0;
  });

  // Handle remove from watchlist
  const handleRemove = (symbol: string) => {
    if (window.confirm(`Remove ${symbol} from watchlist?`)) {
      removeFromWatchlist(symbol);
    }
  };

  // Handle view chart
  const handleViewChart = (symbol: string) => {
    navigate(`/?symbol=${symbol}`);
  };

  // Format price
  const formatPrice = (price?: number) => {
    if (price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  // Format change percentage
  const formatChangePercent = (percent?: number) => {
    if (percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Get color class for change percentage
  const getChangeColorClass = (percent?: number) => {
    if (percent === undefined) return 'text-gray-500';
    return percent >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <header className="shadow" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>My Watchlist</h1>
              <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Track your favorite stocks
              </p>
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto flex-wrap">
              <ConnectionStatusLabel className="order-first sm:order-none" />
              <ThemeToggle />
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-white rounded-md transition-colors text-sm sm:text-base min-h-[44px]"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              >
                Charts
              </button>
              <button
                onClick={() => navigate('/screener')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-white rounded-md transition-colors text-sm sm:text-base min-h-[44px]"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              >
                Screener
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Watchlist Loading State */}
            {watchlistLoading && (
              <div className="rounded-lg shadow p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {isAuthenticated ? 'Loading watchlist from server...' : 'Loading watchlist...'}
                  </p>
                </div>
              </div>
            )}

            {/* Watchlist Error Display */}
            {watchlistError && !watchlistLoading && (
              <div className="rounded-lg shadow p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 flex-shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-red-700">
                        {watchlistError}
                      </p>
                      {!isAuthenticated && (
                        <p className="mt-2 text-xs text-red-600">
                          Sign in to sync your watchlist across devices.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={clearError}
                      className="ml-3 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Dismiss error"
                    >
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Auth Status Indicator */}
            {!watchlistLoading && (
              <div className="rounded-lg shadow p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {isAuthenticated ? 'Synced to your account' : 'Local storage only (sign in to sync)'}
                  </span>
                </div>
              </div>
            )}

            {/* Controls Bar */}
            {!watchlistLoading && watchlist.length > 0 && (
              <div className="rounded-lg shadow p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'} in watchlist
                    </span>
                    {useLiveData && wsConnected && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="8" />
                        </svg>
                        Live Updates Active
                      </span>
                    )}
                    {lastUpdated && !useLiveData && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Last manual refresh: {lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseLiveData(prev => !prev)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px] ${
                        useLiveData ? 'bg-green-600 text-white hover:bg-green-700' : ''
                      }`}
                      style={!useLiveData ? {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!useLiveData) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!useLiveData) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      title={useLiveData ? 'Disable live updates' : 'Enable live updates'}
                    >
                      {useLiveData ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          <span className="hidden sm:inline">Live On</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="hidden sm:inline">Live Off</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={fetchPricesForWatchlist}
                      disabled={loading || useLiveData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
                      title={useLiveData ? 'Turn off live updates to manually refresh' : 'Manually refresh prices'}
                    >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Refreshing...</span>
                        <span className="sm:hidden">Refresh</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">Refresh Prices</span>
                        <span className="sm:hidden">Refresh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

                {/* API Rate Limit Warning */}
                {apiLimitWarning && !useLiveData && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="h-5 w-5 flex-shrink-0 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3 flex-1">
                        <p className="text-xs sm:text-sm text-yellow-700">
                          You have {watchlist.length} items in your watchlist. Refreshing prices will make {watchlist.length} API calls.
                          Be mindful of the Alpha Vantage API rate limit (25 calls/day for free tier).
                        </p>
                      </div>
                      <button
                        onClick={() => setApiLimitWarning(false)}
                        className="ml-3 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Dismiss warning"
                      >
                        <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!watchlistLoading && watchlist.length === 0 && (
              <div className="rounded-lg shadow p-12" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12"
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Your watchlist is empty</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Add stocks from the screener or chart page to track them here.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => navigate('/screener')}
                      className="px-4 py-2 text-white rounded-md transition-colors"
                      style={{ backgroundColor: 'var(--accent)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                    >
                      Go to Stock Screener
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="px-4 py-2 text-white rounded-md transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    >
                      Go to Charts
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Watchlist Table */}
            {!watchlistLoading && watchlist.length > 0 && (
              <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="sticky left-0 z-10 bg-gray-50 px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('symbol')}
                          >
                            <div className="flex items-center gap-2">
                              <span>Symbol</span>
                              <SortIcon field="symbol" />
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-2">
                              <span className="hidden sm:inline">Name</span>
                              <span className="sm:hidden">Name</span>
                              <SortIcon field="name" />
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                            onClick={() => handleSort('sector')}
                          >
                            <div className="flex items-center gap-2">
                              <span>Sector</span>
                              <SortIcon field="sector" />
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            <span className="hidden sm:inline">Current Price</span>
                            <span className="sm:hidden">Price</span>
                          </th>
                          <th
                            scope="col"
                            className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                            onClick={() => handleSort('changePercent')}
                          >
                            <div className="flex items-center gap-2 justify-end">
                              <span className="hidden sm:inline">Change %</span>
                              <span className="sm:hidden">%</span>
                              <SortIcon field="changePercent" />
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedWatchlist.map((item) => (
                        <tr
                          key={item.symbol}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              {item.symbol}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.sector ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {item.sector}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {item.loading ? (
                              <div className="flex justify-end">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            ) : item.error ? (
                              <span className="text-xs text-red-500">{item.error}</span>
                            ) : (
                              <div className="text-sm text-gray-900 font-medium">
                                {formatPrice(item.currentPrice)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {item.loading ? (
                              <div className="flex justify-end">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            ) : item.error ? (
                              <span className="text-xs text-red-500">-</span>
                            ) : (
                              <div className={`text-sm font-semibold ${getChangeColorClass(item.changePercent)}`}>
                                {formatChangePercent(item.changePercent)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewChart(item.symbol)}
                                className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                                title="View Chart"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRemove(item.symbol)}
                                className="text-red-600 hover:text-red-900 font-medium text-sm"
                                title="Remove from Watchlist"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
