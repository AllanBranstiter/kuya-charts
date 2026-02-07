import { useState, useEffect, useCallback, memo } from 'react';
import Chart from './Chart';
import SymbolInput from './SymbolInput';
import TimeframeSelector from './TimeframeSelector';
import { IndicatorConfig } from './IndicatorControls';
import { useRealtimePrice } from '../hooks/useWebSocket';
import { Timeframe, OHLCVData } from '../types/stock';
import { fetchDailyData, fetchIntradayData } from '../services/stockApi';

interface ChartPaneProps {
  paneId: string;
  symbol: string;
  timeframe: Timeframe;
  indicators: IndicatorConfig;
  isActive: boolean;
  liveUpdatesEnabled: boolean;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onActivate: () => void;
}

/**
 * Individual Chart Pane Component
 * Represents a single chart in a multi-chart layout
 */
const ChartPane = memo(function ChartPane({
  symbol,
  timeframe,
  indicators,
  isActive,
  liveUpdatesEnabled,
  onSymbolChange,
  onTimeframeChange,
  onActivate,
}: ChartPaneProps) {
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Real-time price updates
  const {
    price: livePrice,
    change: liveChange,
    changePercent: liveChangePercent,
    isConnected: wsConnected,
  } = useRealtimePrice(symbol, liveUpdatesEnabled && isActive);

  // Fetch chart data
  const fetchChartData = useCallback(
    async (stockSymbol: string, selectedTimeframe: Timeframe) => {
      if (!stockSymbol) return;

      setLoading(true);
      setError('');
      setChartData([]);

      try {
        let response;

        if (selectedTimeframe === 'daily' || selectedTimeframe === 'weekly') {
          response = await fetchDailyData(stockSymbol);
        } else {
          const intervalMap: Record<string, string> = {
            '15min': '15min',
            '30min': '30min',
            '1hour': '60min',
          };
          const interval = intervalMap[selectedTimeframe] || '60min';
          response = await fetchIntradayData(stockSymbol, interval);
        }

        if (response.data && response.data.length > 0) {
          setChartData(response.data);
        } else {
          setError('No data available for this symbol and timeframe');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch chart data';
        setError(errorMessage);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load data when symbol or timeframe changes
  useEffect(() => {
    if (symbol) {
      fetchChartData(symbol, timeframe);
    }
  }, [symbol, timeframe, fetchChartData]);

  // Handle symbol submit
  const handleSymbolSubmit = useCallback(
    async (newSymbol: string) => {
      onSymbolChange(newSymbol);
    },
    [onSymbolChange]
  );

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    async (newTimeframe: Timeframe) => {
      onTimeframeChange(newTimeframe);
    },
    [onTimeframeChange]
  );

  return (
    <div
      className={`
        rounded-lg border-2 transition-all duration-200
        ${isActive ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: isActive ? 'var(--accent)' : 'var(--border-primary)',
      }}
      onClick={onActivate}
    >
      {/* Compact Header */}
      <div
        className="px-3 py-2 border-b flex items-center justify-between gap-2"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Symbol Display or Input */}
          {symbol && chartData.length > 0 ? (
            <div className="flex items-center gap-2">
              <span
                className="text-sm sm:text-base font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {symbol}
              </span>
              {liveUpdatesEnabled && wsConnected && livePrice && (
                <span
                  className={`
                    inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold
                    bg-blue-100 text-blue-800
                  `}
                >
                  ${livePrice.toFixed(2)}
                </span>
              )}
              {liveChange !== undefined && liveChangePercent !== undefined && (
                <span
                  className={`text-xs font-medium ${
                    liveChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {liveChange >= 0 ? '+' : ''}
                  {liveChangePercent.toFixed(2)}%
                </span>
              )}
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <SymbolInput onSubmit={handleSymbolSubmit} disabled={loading} />
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex-shrink-0">
          <TimeframeSelector
            selected={timeframe}
            onChange={handleTimeframeChange}
            disabled={loading || !symbol}
          />
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-2 sm:p-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: 'var(--accent)' }}
              ></div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Loading...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div
            className="rounded p-3 text-sm"
            style={{
              backgroundColor: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              border: '1px solid var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        {chartData.length > 0 && !loading && !error && (
          <Chart data={chartData} symbol={symbol} indicators={indicators} />
        )}

        {!loading && !error && chartData.length === 0 && !symbol && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-8 w-8 mb-2"
              style={{ color: 'var(--text-tertiary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Enter a symbol to view chart
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChartPane;
