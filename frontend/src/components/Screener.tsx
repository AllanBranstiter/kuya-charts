import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenerFiltersComponent from './ScreenerFilters';
import StockTable from './StockTable';
import Pagination from './Pagination';
import ThemeToggle from './ThemeToggle';
import AuthButton from './AuthButton';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../contexts/ThemeContext';
import { exportToCSV } from '../utils/csvExport';
import {
  ScreenerFilters,
  StockMetadata,
  SortConfig,
  SortField,
  MARKET_CAP_RANGES,
  StockListQuery,
  PaginationMetadata,
} from '../types/screener';
import { fetchStocksList, fetchSectors } from '../services/screenerApi';

// Initial filter state
const getInitialFilters = (): ScreenerFilters => ({
  marketCapRange: 'all',
  sectors: [],
});

// Initial sort configuration
const getInitialSort = (): SortConfig => ({
  field: 'market_cap',
  direction: 'desc',
});

// Get initial page size from localStorage or default to 25
const getInitialPageSize = (): number => {
  const stored = localStorage.getItem('screener_page_size');
  return stored ? parseInt(stored, 10) : 25;
};

export default function Screener() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  
  // State management
  const [filters, setFilters] = useState<ScreenerFilters>(getInitialFilters());
  const [stocks, setStocks] = useState<StockMetadata[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(getInitialSort());
  const [showFilters, setShowFilters] = useState(false); // Mobile filter drawer state
  const [showHelp, setShowHelp] = useState(false); // Keyboard shortcuts help modal
  const [exportingCSV, setExportingCSV] = useState(false); // CSV export loading state
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(getInitialPageSize());
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch sectors on mount
  useEffect(() => {
    const loadSectors = async () => {
      setLoadingSectors(true);
      try {
        const response = await fetchSectors();
        setSectors(response.sectors);
      } catch (err) {
        console.error('Error loading sectors:', err);
        setError('Failed to load sectors');
      } finally {
        setLoadingSectors(false);
      }
    };

    loadSectors();
  }, []);

  // Build query from filters
  const buildQuery = useCallback((): StockListQuery => {
    const query: StockListQuery = {
      page: currentPage,
      limit: pageSize,
    };

    // Market cap filter
    if (filters.marketCapRange !== 'all') {
      const range = MARKET_CAP_RANGES[filters.marketCapRange];
      if (range.min !== undefined) {
        query.minMarketCap = range.min;
      }
      if (range.max !== undefined) {
        query.maxMarketCap = range.max;
      }
    }

    // Custom market cap overrides
    if (filters.customMinMarketCap !== undefined) {
      query.minMarketCap = filters.customMinMarketCap;
    }
    if (filters.customMaxMarketCap !== undefined) {
      query.maxMarketCap = filters.customMaxMarketCap;
    }

    // Price filters
    if (filters.minPrice !== undefined) {
      query.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      query.maxPrice = filters.maxPrice;
    }

    // Technical filters
    if (filters.rsiMin !== undefined) {
      query.rsiMin = filters.rsiMin;
    }
    if (filters.rsiMax !== undefined) {
      query.rsiMax = filters.rsiMax;
    }
    if (filters.priceVsSma50) {
      query.priceVsSma50 = filters.priceVsSma50;
    }
    if (filters.priceVsSma200) {
      query.priceVsSma200 = filters.priceVsSma200;
    }
    if (filters.volumeSpikeMin !== undefined) {
      query.volumeSpikeMin = filters.volumeSpikeMin;
    }

    return query;
  }, [filters, currentPage, pageSize]);

  // Fetch stocks based on filters and pagination
  const loadStocks = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const query = buildQuery();
      
      // If sectors are selected, fetch each sector separately and combine
      // Note: This is a limitation - proper pagination with multiple sectors would require backend changes
      if (filters.sectors.length > 0) {
        const stocksPromises = filters.sectors.map(sector =>
          fetchStocksList({ ...query, sector })
        );
        const results = await Promise.all(stocksPromises);
        
        // Combine and deduplicate stocks
        const combinedStocks = new Map<string, StockMetadata>();
        let totalCount = 0;
        results.forEach(result => {
          result.stocks.forEach(stock => {
            combinedStocks.set(stock.symbol, stock);
          });
          totalCount += result.pagination.total;
        });
        
        const uniqueStocks = Array.from(combinedStocks.values());
        setStocks(uniqueStocks);
        setPagination({
          page: currentPage,
          limit: pageSize,
          total: uniqueStocks.length,
          totalPages: Math.ceil(uniqueStocks.length / pageSize),
          hasNext: false,
          hasPrev: currentPage > 1,
        });
      } else {
        // No sector filter - use proper server-side pagination
        const response = await fetchStocksList(query);
        setStocks(response.stocks);
        setPagination(response.pagination);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stocks';
      setError(errorMessage);
      setStocks([]);
      setPagination({
        page: currentPage,
        limit: pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setLoading(false);
    }
  }, [buildQuery, filters.sectors, currentPage, pageSize]);

  // Load stocks when filters or pagination changes
  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Handle sort change
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => ({
      field,
      direction:
        prevConfig.field === field && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: ScreenerFilters) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(getInitialFilters());
    setSortConfig(getInitialSort());
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
    // Save to localStorage
    localStorage.setItem('screener_page_size', newPageSize.toString());
  };

  // Handle stock click - navigate to chart
  const handleStockClick = (symbol: string) => {
    navigate(`/?symbol=${symbol}`);
  };

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    if (stocks.length === 0) {
      alert('No data to export');
      return;
    }

    setExportingCSV(true);
    try {
      // Format data for CSV export
      const exportData = stocks.map(stock => ({
        Symbol: stock.symbol,
        Name: stock.name,
        Sector: stock.sector || 'N/A',
        'Market Cap': stock.market_cap
          ? `${(stock.market_cap / 1_000_000_000).toFixed(2)}B`
          : 'N/A',
        Price: stock.close_price ? `$${stock.close_price.toFixed(2)}` : 'N/A',
        Volume: stock.volume ? stock.volume.toLocaleString() : 'N/A',
        RSI: stock.rsi ? stock.rsi.toFixed(2) : 'N/A',
        'Price vs SMA50': stock.price_vs_sma_50
          ? `${(stock.price_vs_sma_50 * 100).toFixed(2)}%`
          : 'N/A',
        'Price vs SMA200': stock.price_vs_sma_200
          ? `${(stock.price_vs_sma_200 * 100).toFixed(2)}%`
          : 'N/A',
        'Volume Spike': stock.volume_spike
          ? `${stock.volume_spike.toFixed(2)}x`
          : 'N/A',
        Exchange: stock.exchange || 'N/A',
      }));

      exportToCSV(exportData, 'screener_results');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  }, [stocks]);

  // Keyboard shortcuts handlers
  useKeyboardShortcuts({
    onToggleFilters: () => setShowFilters(prev => !prev),
    onExportCSV: handleExportCSV,
    onToggleTheme: toggleTheme,
    onShowHelp: () => setShowHelp(true),
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <header className="shadow" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Stock Screener</h1>
              <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Browse and filter stocks • Press <kbd className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>?</kbd> for shortcuts
              </p>
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <ThemeToggle />
              <button
                onClick={() => navigate('/watchlist')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base min-h-[44px]"
              >
                Watchlist
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-white rounded-md transition-colors text-sm sm:text-base min-h-[44px]"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              >
                Charts
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile Filter Toggle Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Error State */}
            {error && !loading && (
              <div className="rounded-lg p-4" style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)'
              }}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5"
                      style={{ color: 'var(--color-error)' }}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Error</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Filters Panel - Mobile Drawer / Desktop Sidebar */}
              <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                <ScreenerFiltersComponent
                  filters={filters}
                  sectors={sectors}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  loadingSectors={loadingSectors}
                />
              </div>

              {/* Results Panel */}
              <div className="lg:col-span-3">
                <div className="rounded-lg shadow" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  {/* Results Count & Export Button */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {loading ? (
                        'Loading stocks...'
                      ) : (
                        <>
                          Showing <span className="font-semibold">{stocks.length}</span> of{' '}
                          <span className="font-semibold">{pagination.total}</span> stocks
                          {pagination.totalPages > 1 && (
                            <span className="ml-2">
                              (Page {pagination.page} of {pagination.totalPages})
                            </span>
                          )}
                        </>
                      )}
                    </p>
                    <button
                      onClick={handleExportCSV}
                      disabled={stocks.length === 0 || exportingCSV}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-white transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--accent)' }}
                      onMouseEnter={(e) => !exportingCSV && stocks.length > 0 && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      title="Export results as CSV (E)"
                    >
                      {exportingCSV ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="hidden sm:inline">Export CSV</span>
                          <span className="sm:hidden">Export</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Stock Table */}
                  <div className="overflow-hidden">
                    <StockTable
                      stocks={stocks}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      onStockClick={handleStockClick}
                      loading={loading}
                    />
                  </div>

                  {/* Pagination Controls */}
                  {!loading && pagination.total > 0 && (
                    <Pagination
                      pagination={pagination}
                      onPageChange={handlePageChange}
                      onLimitChange={handlePageSizeChange}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
