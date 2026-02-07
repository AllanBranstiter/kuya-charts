// Stock data types for the application

export interface OHLCVData {
  timestamp: string; // ISO format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Alpha Vantage API response types
export interface AlphaVantageTimeSeriesDaily {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

export interface AlphaVantageTimeSeriesIntraday {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  [key: string]: any; // Dynamic key for different intervals like "Time Series (15min)"
}

// Supported intraday intervals
export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '60min';

// API error response
export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

// Cache entry type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Stock metadata types for database
export interface StockMetadata {
  id?: number;
  symbol: string;
  name: string;
  sector?: string;
  market_cap?: number;
  exchange?: string;
  currency?: string;
  last_updated?: Date;
  // Technical metrics (when joined with stock_metrics table)
  close_price?: number;
  volume?: number;
  rsi?: number;
  price_vs_sma_20?: number;
  price_vs_sma_50?: number;
  price_vs_sma_200?: number;
  volume_spike?: number;
  avg_volume_20d?: number;
  metrics_date?: string;
}

// Stock list query filters
export interface StockListFilters {
  sector?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  // Technical filters
  rsiMin?: number;
  rsiMax?: number;
  priceVsSma50?: 'above' | 'below';
  priceVsSma200?: 'above' | 'below';
  volumeSpikeMin?: number;
  limit?: number;
  offset?: number;
  page?: number;
}

// Pagination metadata for API responses
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Stock list API response
export interface StockListResponse {
  stocks: StockMetadata[];
  pagination: PaginationMetadata;
  // Legacy fields for backward compatibility
  total: number;
  limit: number;
  offset: number;
}
