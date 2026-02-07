import { StockListResponse, SectorsResponse, StockListQuery, MetricsStatus } from '../types/screener';
import { ApiErrorResponse } from '../types/stock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Fetch list of stocks with optional filters
 * @param filters - Query parameters for filtering stocks
 * @returns Promise with stock list data
 * @throws Error if the API request fails
 */
export async function fetchStocksList(filters: StockListQuery = {}): Promise<StockListResponse> {
  try {
    // Build query string from filters
    const params = new URLSearchParams();
    
    // Fundamental filters
    if (filters.sector) {
      params.append('sector', filters.sector);
    }
    if (filters.minMarketCap !== undefined) {
      params.append('minMarketCap', filters.minMarketCap.toString());
    }
    if (filters.maxMarketCap !== undefined) {
      params.append('maxMarketCap', filters.maxMarketCap.toString());
    }
    if (filters.minPrice !== undefined) {
      params.append('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined) {
      params.append('maxPrice', filters.maxPrice.toString());
    }
    
    // Technical filters
    if (filters.rsiMin !== undefined) {
      params.append('rsiMin', filters.rsiMin.toString());
    }
    if (filters.rsiMax !== undefined) {
      params.append('rsiMax', filters.rsiMax.toString());
    }
    if (filters.priceVsSma50) {
      params.append('priceVsSma50', filters.priceVsSma50);
    }
    if (filters.priceVsSma200) {
      params.append('priceVsSma200', filters.priceVsSma200);
    }
    if (filters.volumeSpikeMin !== undefined) {
      params.append('volumeSpikeMin', filters.volumeSpikeMin.toString());
    }
    
    // Pagination
    if (filters.page !== undefined) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/stocks/list${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to fetch stocks list');
    }
    
    const data: StockListResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching stocks list');
  }
}

/**
 * Fetch list of available sectors
 * @returns Promise with sectors list
 * @throws Error if the API request fails
 */
export async function fetchSectors(): Promise<SectorsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stocks/sectors`);
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to fetch sectors');
    }
    
    const data: SectorsResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching sectors');
  }
}

/**
 * Fetch technical metrics status
 * @returns Promise with metrics status data
 * @throws Error if the API request fails
 */
export async function fetchMetricsStatus(): Promise<MetricsStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/stocks/metrics/status`);
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to fetch metrics status');
    }
    
    const data: MetricsStatus = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching metrics status');
  }
}
