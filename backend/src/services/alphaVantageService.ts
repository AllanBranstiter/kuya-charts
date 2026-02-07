import axios from 'axios';
import {
  OHLCVData,
  AlphaVantageTimeSeriesDaily,
  AlphaVantageTimeSeriesIntraday,
  IntradayInterval,
} from '../types/stock.js';
import { cacheService, CacheTTL, CacheKeys } from './cacheService.js';

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetch daily OHLCV data from Alpha Vantage
 * Implements cache-aside pattern: check cache → miss → fetch API → store cache
 */
export async function fetchDailyData(symbol: string): Promise<OHLCVData[]> {
  const cacheKey = CacheKeys.dailyData(symbol);
  
  // Try to get from cache first
  const cachedData = await cacheService.getJSON<OHLCVData[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Cache miss - fetch from API
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Alpha Vantage API key is not configured');
  }

  try {
    const response = await axios.get<AlphaVantageTimeSeriesDaily>(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        apikey: API_KEY,
        outputsize: 'compact', // Last 100 data points
      },
      timeout: 10000, // 10 second timeout
    });

    // Check for API error messages
    if ('Error Message' in response.data) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    if ('Note' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    if ('Information' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('Invalid response format from Alpha Vantage API');
    }

    const data = transformDailyData(timeSeries);
    
    // Store in cache with 24-hour TTL
    await cacheService.setJSON(cacheKey, data, CacheTTL.DAILY_DATA);
    
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: Alpha Vantage API is not responding');
      }
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.request) {
        throw new Error('Network error: Unable to reach Alpha Vantage API');
      }
    }
    throw error;
  }
}

/**
 * Fetch intraday OHLCV data from Alpha Vantage
 * Implements cache-aside pattern: check cache → miss → fetch API → store cache
 */
export async function fetchIntradayData(
  symbol: string,
  interval: IntradayInterval
): Promise<OHLCVData[]> {
  const cacheKey = CacheKeys.intradayData(symbol, interval);
  
  // Try to get from cache first
  const cachedData = await cacheService.getJSON<OHLCVData[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Cache miss - fetch from API
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Alpha Vantage API key is not configured');
  }

  try {
    const response = await axios.get<AlphaVantageTimeSeriesIntraday>(BASE_URL, {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol: symbol.toUpperCase(),
        interval: interval,
        apikey: API_KEY,
        outputsize: 'compact', // Last 100 data points
      },
      timeout: 10000, // 10 second timeout
    });

    // Check for API error messages
    if ('Error Message' in response.data) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    if ('Note' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    if ('Information' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    // The key format is dynamic: "Time Series (1min)", "Time Series (5min)", etc.
    const timeSeriesKey = `Time Series (${interval})`;
    const timeSeries = response.data[timeSeriesKey];

    if (!timeSeries) {
      throw new Error('Invalid response format from Alpha Vantage API');
    }

    const data = transformIntradayData(timeSeries);
    
    // Store in cache with 5-minute TTL
    await cacheService.setJSON(cacheKey, data, CacheTTL.INTRADAY_DATA);
    
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: Alpha Vantage API is not responding');
      }
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.request) {
        throw new Error('Network error: Unable to reach Alpha Vantage API');
      }
    }
    throw error;
  }
}

/**
 * Transform Alpha Vantage daily data to standardized OHLCV format
 */
function transformDailyData(timeSeries: {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}): OHLCVData[] {
  const data: OHLCVData[] = [];

  for (const [date, values] of Object.entries(timeSeries)) {
    data.push({
      timestamp: new Date(date).toISOString(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume']),
    });
  }

  // Sort by timestamp in descending order (most recent first)
  data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return data;
}

/**
 * Fetch historical daily data (full output size for technical analysis)
 * Implements cache-aside pattern: check cache → miss → fetch API → store cache
 * @param symbol - Stock ticker symbol
 * @returns Array of OHLCV data (most recent first)
 */
export async function fetchHistoricalData(symbol: string): Promise<OHLCVData[]> {
  // Use the same cache key as daily data since historical is just the full dataset
  const cacheKey = CacheKeys.dailyData(symbol);
  
  // Try to get from cache first
  const cachedData = await cacheService.getJSON<OHLCVData[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Cache miss - fetch from API
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Alpha Vantage API key is not configured');
  }

  try {
    const response = await axios.get<AlphaVantageTimeSeriesDaily>(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        apikey: API_KEY,
        outputsize: 'full', // Get full historical data (20+ years)
      },
      timeout: 30000, // 30 second timeout for larger dataset
    });

    // Check for API error messages
    if ('Error Message' in response.data) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    if ('Note' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    if ('Information' in response.data) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('Invalid response format from Alpha Vantage API');
    }

    const data = transformDailyData(timeSeries);
    
    // Store in cache with 24-hour TTL
    await cacheService.setJSON(cacheKey, data, CacheTTL.DAILY_DATA);
    
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: Alpha Vantage API is not responding');
      }
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.request) {
        throw new Error('Network error: Unable to reach Alpha Vantage API');
      }
    }
    throw error;
  }
}

/**
 * Transform Alpha Vantage intraday data to standardized OHLCV format
 */
function transformIntradayData(timeSeries: {
  [datetime: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}): OHLCVData[] {
  const data: OHLCVData[] = [];

  for (const [datetime, values] of Object.entries(timeSeries)) {
    data.push({
      timestamp: new Date(datetime).toISOString(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume']),
    });
  }

  // Sort by timestamp in descending order (most recent first)
  data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return data;
}

/**
 * Filter OHLCV data by date range
 * @param data - Full OHLCV data array (sorted descending by timestamp)
 * @param fromDate - Start date (ISO string or Date object)
 * @param toDate - End date (ISO string or Date object)
 * @returns Filtered OHLCV data array
 */
export function filterDataByDateRange(
  data: OHLCVData[],
  fromDate?: string | Date,
  toDate?: string | Date
): OHLCVData[] {
  if (!fromDate && !toDate) {
    return data;
  }

  const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
  const to = toDate ? new Date(toDate).getTime() : Infinity;

  return data.filter((item) => {
    const timestamp = new Date(item.timestamp).getTime();
    return timestamp >= from && timestamp <= to;
  });
}

/**
 * Get metadata about the data range
 * @param data - OHLCV data array
 * @returns Metadata object with date range info
 */
export function getDataRangeMetadata(data: OHLCVData[]): {
  dataStartDate: string | null;
  dataEndDate: string | null;
  dataPoints: number;
  hasMoreHistory: boolean;
} {
  if (!data || data.length === 0) {
    return {
      dataStartDate: null,
      dataEndDate: null,
      dataPoints: 0,
      hasMoreHistory: false,
    };
  }

  // Data is sorted descending (most recent first)
  const mostRecent = data[0];
  const oldest = data[data.length - 1];

  // Check if we have more than 100 days of history (indicates full dataset)
  const daysDiff = (new Date(mostRecent.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const hasMoreHistory = daysDiff > 100;

  return {
    dataStartDate: oldest.timestamp,
    dataEndDate: mostRecent.timestamp,
    dataPoints: data.length,
    hasMoreHistory,
  };
}
