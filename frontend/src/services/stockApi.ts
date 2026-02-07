import { DailyStockResponse, IntradayStockResponse, ApiErrorResponse } from '../types/stock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Fetch daily stock data from the backend API
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param options - Optional parameters for date range and full data
 * @returns Promise with daily stock data
 * @throws Error if the API request fails
 */
export async function fetchDailyData(
  symbol: string,
  options?: {
    from?: string;
    to?: string;
    full?: boolean;
  }
): Promise<DailyStockResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.full) params.append('full', 'true');

    const url = `${API_BASE_URL}/stock/${symbol.toUpperCase()}/daily${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to fetch daily data');
    }
    
    const data: DailyStockResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching daily data');
  }
}

/**
 * Fetch intraday stock data from the backend API
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param interval - Time interval ('15min', '30min', '1hour')
 * @returns Promise with intraday stock data
 * @throws Error if the API request fails
 */
export async function fetchIntradayData(
  symbol: string,
  interval: string
): Promise<IntradayStockResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/stock/${symbol.toUpperCase()}/intraday?interval=${interval}`
    );
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to fetch intraday data');
    }
    
    const data: IntradayStockResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching intraday data');
  }
}

/**
 * Check if the backend API is healthy
 * @returns Promise with boolean indicating API health status
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
