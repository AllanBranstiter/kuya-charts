import { useEffect, useState, useMemo } from 'react';
import { StockMetadata, SortConfig, SortField } from '../types/screener';
import { useWatchlist } from '../hooks/useWatchlist';
import { useRealtimePrices } from '../hooks/useWebSocket';

interface StockTableProps {
  stocks: StockMetadata[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onStockClick: (symbol: string) => void;
  loading?: boolean;
}

/**
 * Format market cap into human-readable format
 * @param marketCap - Market cap in dollars
 * @returns Formatted string (e.g., "$123.45B", "$1.23M")
 */
function formatMarketCap(marketCap?: number): string {
  if (!marketCap) return 'N/A';
  
  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  } else if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  } else if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  }
  return `$${marketCap.toFixed(2)}`;
}

/**
 * Get sort icon based on current sort state
 */
function SortIcon({ field, sortConfig }: { field: SortField; sortConfig: SortConfig }) {
  if (sortConfig.field !== field) {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  
  if (sortConfig.direction === 'asc') {
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
}

export default function StockTable({ stocks, sortConfig, onSort, onStockClick, loading }: StockTableProps) {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  
  // Limit live updates to top 20 visible stocks for performance
  const MAX_LIVE_SUBSCRIPTIONS = 20;
  const visibleSymbols = useMemo(() =>
    stocks.slice(0, MAX_LIVE_SUBSCRIPTIONS).map(s => s.symbol),
    [stocks]
  );
  
  // Subscribe to real-time prices for visible stocks
  const { priceUpdates, isConnected } = useRealtimePrices(visibleSymbols, visibleSymbols.length > 0);
  
  // Track price flashes (up/down animations)
  const [priceFlashes, setPriceFlashes] = useState<Map<string, 'up' | 'down'>>(new Map());

  // Handle price change animations
  useEffect(() => {
    const newFlashes = new Map<string, 'up' | 'down'>();
    
    priceUpdates.forEach((update, symbol) => {
      if (update.change !== undefined) {
        newFlashes.set(symbol, update.change >= 0 ? 'up' : 'down');
      }
    });
    
    if (newFlashes.size > 0) {
      setPriceFlashes(newFlashes);
      
      // Clear flashes after animation
      const timer = setTimeout(() => {
        setPriceFlashes(new Map());
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [priceUpdates]);

  const sortableColumns: { field: SortField; label: string; align?: 'left' | 'right' }[] = [
    { field: 'symbol', label: 'Symbol', align: 'left' },
    { field: 'name', label: 'Company Name', align: 'left' },
    { field: 'sector', label: 'Sector', align: 'left' },
    { field: 'market_cap', label: 'Market Cap', align: 'right' },
    { field: 'exchange', label: 'Exchange', align: 'left' },
  ];

  const handleToggleWatchlist = (e: React.MouseEvent, stock: StockMetadata) => {
    e.stopPropagation(); // Prevent row click
    
    if (isInWatchlist(stock.symbol)) {
      removeFromWatchlist(stock.symbol);
    } else {
      addToWatchlist(stock.symbol, stock.name, stock.sector);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stocks...</p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters to see more results
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  ★
                </th>
                {sortableColumns.map((column) => (
                  <th
                    key={column.field}
                    scope="col"
                    className={`px-4 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    onClick={() => onSort(column.field)}
                  >
                    <div className={`flex items-center gap-2 ${column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      <span className="hidden sm:inline">{column.label}</span>
                      <span className="sm:hidden">{column.field === 'symbol' ? 'Symbol' : column.field === 'market_cap' ? 'Cap' : column.label.split(' ')[0]}</span>
                      <SortIcon field={column.field} sortConfig={sortConfig} />
                    </div>
                  </th>
                ))}
                {/* Non-sortable price column */}
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Price</span>
                  <span className="sm:hidden">Price</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stocks.map((stock) => {
                const inWatchlist = isInWatchlist(stock.symbol);
                const liveUpdate = priceUpdates.get(stock.symbol.toUpperCase());
                const priceFlash = priceFlashes.get(stock.symbol.toUpperCase());
                const hasLiveData = liveUpdate !== undefined;
                
                return (
                  <tr
                    key={stock.symbol}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      hasLiveData && priceFlash ? (
                        priceFlash === 'up' ? 'bg-green-50' : 'bg-red-50'
                      ) : ''
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50 px-3 sm:px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleToggleWatchlist(e, stock)}
                        className="p-2 hover:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center mx-auto"
                        title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        {inWatchlist ? (
                          <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 hover:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4 whitespace-nowrap"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <div className="text-sm font-medium text-blue-600">{stock.symbol}</div>
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <div className="text-sm text-gray-900 max-w-xs truncate">{stock.name}</div>
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4 whitespace-nowrap"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {stock.sector || 'N/A'}
                      </span>
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4 whitespace-nowrap text-right"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <div className="text-sm text-gray-900">{formatMarketCap(stock.market_cap)}</div>
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4 whitespace-nowrap text-right"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      {hasLiveData && liveUpdate.price ? (
                        <div className="flex flex-col items-end">
                          <div className={`text-sm font-medium transition-colors ${
                            priceFlash === 'up' ? 'text-green-600' :
                            priceFlash === 'down' ? 'text-red-600' :
                            'text-gray-900'
                          }`}>
                            ${liveUpdate.price.toFixed(2)}
                            {isConnected && (
                              <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            )}
                          </div>
                          {liveUpdate.changePercent !== undefined && (
                            <div className={`text-xs font-medium flex items-center gap-1 ${
                              liveUpdate.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {liveUpdate.change >= 0 ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {liveUpdate.changePercent >= 0 ? '+' : ''}{liveUpdate.changePercent.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : stock.close_price ? (
                        <div className="text-sm text-gray-900">${stock.close_price.toFixed(2)}</div>
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                    </td>
                    <td
                      className="px-4 sm:px-6 py-4 whitespace-nowrap"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <div className="text-sm text-gray-500">{stock.exchange || 'N/A'}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
