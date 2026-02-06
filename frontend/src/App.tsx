import { useState } from 'react';
import Chart from './components/Chart';
import SymbolInput from './components/SymbolInput';
import TimeframeSelector from './components/TimeframeSelector';
import { IndicatorControls, IndicatorConfig } from './components/IndicatorControls';
import { Timeframe, OHLCVData } from './types/stock';
import { fetchDailyData, fetchIntradayData } from './services/stockApi';

function App() {
  const [symbol, setSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Indicator configuration state
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>({
    sma: {
      enabled: false,
      period: 20,
    },
    ema: {
      enabled: false,
      period: 12,
    },
    volume: {
      enabled: false,
    },
  });

  const handleSymbolSubmit = async (newSymbol: string) => {
    setSymbol(newSymbol);
    await fetchChartData(newSymbol, timeframe);
  };

  const handleTimeframeChange = async (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    if (symbol) {
      await fetchChartData(symbol, newTimeframe);
    }
  };

  const handleIndicatorConfigChange = (newConfig: IndicatorConfig) => {
    setIndicatorConfig(newConfig);
  };

  const fetchChartData = async (stockSymbol: string, selectedTimeframe: Timeframe) => {
    setLoading(true);
    setError('');
    setChartData([]);

    try {
      let response;

      // Determine which API endpoint to use based on timeframe
      if (selectedTimeframe === 'daily' || selectedTimeframe === 'weekly') {
        response = await fetchDailyData(stockSymbol);
      } else {
        // Map timeframe to API interval
        const intervalMap: Record<string, string> = {
          '15min': '15min',
          '30min': '30min',
          '1hour': '60min',
        };
        const interval = intervalMap[selectedTimeframe] || '60min';
        response = await fetchIntradayData(stockSymbol, interval);
      }

      if (response.data && response.data.length > 0) {
        // For weekly, we could implement aggregation here in the future
        // For now, we'll just use daily data
        setChartData(response.data);
      } else {
        setError('No data available for this symbol and timeframe');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
      setError(errorMessage);
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Kuya Charts</h1>
          <p className="mt-1 text-sm text-gray-600">Professional Stock Charting Application</p>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Input Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="space-y-4">
                <SymbolInput onSubmit={handleSymbolSubmit} disabled={loading} />
                <TimeframeSelector
                  selected={timeframe}
                  onChange={handleTimeframeChange}
                  disabled={loading || !symbol}
                />
              </div>
            </div>

            {/* Indicator Controls */}
            {chartData.length > 0 && !loading && !error && (
              <div className="mb-6">
                <IndicatorControls
                  config={indicatorConfig}
                  onChange={handleIndicatorConfigChange}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg shadow p-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading chart data...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
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
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Display */}
            {chartData.length > 0 && !loading && !error && (
              <div className="bg-white rounded-lg shadow p-6">
                <Chart 
                  data={chartData} 
                  symbol={symbol} 
                  indicators={indicatorConfig}
                />
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && chartData.length === 0 && !symbol && (
              <div className="bg-white rounded-lg shadow p-12">
                <div className="text-center">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No chart data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter a stock symbol above to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
