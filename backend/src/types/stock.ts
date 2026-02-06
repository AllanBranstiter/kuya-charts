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
