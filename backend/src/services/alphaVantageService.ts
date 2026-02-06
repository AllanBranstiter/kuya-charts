import axios from 'axios';
import {
  OHLCVData,
  AlphaVantageTimeSeriesDaily,
  AlphaVantageTimeSeriesIntraday,
  IntradayInterval,
} from '../types/stock.js';

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetch daily OHLCV data from Alpha Vantage
 */
export async function fetchDailyData(symbol: string): Promise<OHLCVData[]> {
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

    return transformDailyData(timeSeries);
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
 */
export async function fetchIntradayData(
  symbol: string,
  interval: IntradayInterval
): Promise<OHLCVData[]> {
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

    return transformIntradayData(timeSeries);
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
