import { OHLCVData } from './stock';

/**
 * Comparison modes for displaying multiple symbols
 */
export enum ComparisonMode {
  /** Show actual prices for each symbol */
  ABSOLUTE = 'ABSOLUTE',
  /** Show percentage change from start date */
  PERCENTAGE_CHANGE = 'PERCENTAGE_CHANGE',
  /** Normalize all symbols to start at 100 */
  NORMALIZED = 'NORMALIZED',
}

/**
 * Configuration for a single comparison symbol
 */
export interface ComparisonSymbol {
  /** Stock symbol */
  symbol: string;
  /** Display color for this symbol's line */
  color: string;
  /** Whether the symbol is currently visible */
  visible: boolean;
  /** Line width for rendering */
  lineWidth: number;
  /** Raw data for this symbol */
  data?: OHLCVData[];
}

/**
 * Complete configuration for symbol comparison
 */
export interface ComparisonConfig {
  /** Current comparison mode */
  mode: ComparisonMode;
  /** List of symbols to compare */
  symbols: ComparisonSymbol[];
  /** Base symbol for relative calculations (typically the main chart symbol) */
  baseSymbol: string;
  /** Maximum number of symbols allowed */
  maxSymbols?: number;
}

/**
 * Transformed data point for comparison display
 */
export interface ComparisonDataPoint {
  /** Unix timestamp in seconds */
  time: number;
  /** Transformed value based on comparison mode */
  value: number;
  /** Original close price */
  originalPrice?: number;
}

/**
 * Data series for a single symbol after transformation
 */
export interface ComparisonSeries {
  /** Symbol identifier */
  symbol: string;
  /** Display color */
  color: string;
  /** Transformed data points */
  data: ComparisonDataPoint[];
  /** Current/latest value */
  currentValue?: number;
  /** Percentage change from start */
  changePercent?: number;
  /** Whether this is the base symbol */
  isBase: boolean;
}

/**
 * Default colors for comparison symbols
 */
export const DEFAULT_COMPARISON_COLORS = [
  '#2962FF', // Blue
  '#FF6D00', // Orange
  '#00C853', // Green
  '#D500F9', // Purple
  '#FF1744', // Red
];

/**
 * Maximum number of comparison symbols
 */
export const MAX_COMPARISON_SYMBOLS = 5;
