// Screener types for stock filtering and display

// Stock metadata from database with technical indicators
export interface StockMetadata {
  id?: number;
  symbol: string;
  name: string;
  sector?: string;
  market_cap?: number;
  exchange?: string;
  currency?: string;
  last_updated?: Date;
  // Technical metrics
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

// Market cap ranges for filtering
export type MarketCapRange = 'all' | 'mega' | 'large' | 'mid' | 'small' | 'micro';

// Market cap range definitions
export interface MarketCapDefinition {
  label: string;
  min?: number;
  max?: number;
}

export const MARKET_CAP_RANGES: Record<MarketCapRange, MarketCapDefinition> = {
  all: { label: 'All' },
  mega: { label: 'Mega Cap (>$200B)', min: 200_000_000_000 },
  large: { label: 'Large Cap ($10B-$200B)', min: 10_000_000_000, max: 200_000_000_000 },
  mid: { label: 'Mid Cap ($2B-$10B)', min: 2_000_000_000, max: 10_000_000_000 },
  small: { label: 'Small Cap ($300M-$2B)', min: 300_000_000, max: 2_000_000_000 },
  micro: { label: 'Micro Cap (<$300M)', max: 300_000_000 },
};

// Screener filter state
export interface ScreenerFilters {
  // Market cap filter
  marketCapRange: MarketCapRange;
  customMinMarketCap?: number;
  customMaxMarketCap?: number;
  
  // Price range filter
  minPrice?: number;
  maxPrice?: number;
  
  // Volume filter
  minVolume?: number;
  
  // Sector filter
  sectors: string[];
  
  // Technical filters
  rsiMin?: number;
  rsiMax?: number;
  priceVsSma50?: 'above' | 'below' | null;
  priceVsSma200?: 'above' | 'below' | null;
  volumeSpikeMin?: number;
}

// Sort configuration
export type SortField = 'symbol' | 'name' | 'sector' | 'market_cap' | 'exchange';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Stock list query parameters
export interface StockListQuery {
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

// Metrics status response
export interface MetricsStatus {
  last_updated: string | null;
  stocks_with_metrics: number;
  total_stocks: number;
}

// API response for stock list
export interface StockListResponse {
  stocks: StockMetadata[];
  pagination: PaginationMetadata;
  // Legacy fields for backward compatibility
  total: number;
  limit: number;
  offset: number;
}

// API response for sectors list
export interface SectorsResponse {
  sectors: string[];
}
