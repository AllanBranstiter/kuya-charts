// OHLCV data structure for candlestick charts
export interface OHLCVData {
  timestamp: string; // ISO 8601 timestamp or date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Data range metadata
export interface DataRangeMetadata {
  dataStartDate: string | null;
  dataEndDate: string | null;
  dataPoints: number;
  hasMoreHistory: boolean;
}

// API response for daily stock data
export interface DailyStockResponse {
  symbol: string;
  data: OHLCVData[];
  source: 'cache' | 'api';
  cached?: boolean;
  metadata?: DataRangeMetadata;
}

// API response for intraday stock data
export interface IntradayStockResponse {
  symbol: string;
  interval: string;
  data: OHLCVData[];
  source: 'cache' | 'api';
  cached?: boolean;
  metadata?: DataRangeMetadata;
}

// Timeframe options
export type Timeframe = '15min' | '30min' | '1hour' | 'daily' | 'weekly';

// API error response
export interface ApiErrorResponse {
  error: string;
  message: string;
}
