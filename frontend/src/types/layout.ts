import { IndicatorConfig } from '../components/IndicatorControls';
import { DrawingTool } from './drawings';
import { Timeframe } from './stock';

/**
 * Chart layout types for multi-chart view
 */
export enum ChartLayout {
  SINGLE = 'SINGLE',    // 1x1 - Single chart
  VERTICAL = 'VERTICAL', // 1x2 - Two charts vertically stacked
  QUAD = 'QUAD',        // 2x2 - Four charts in a grid
}

/**
 * Configuration for an individual chart pane
 */
export interface ChartPaneConfig {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  indicators: IndicatorConfig;
  drawings: DrawingTool[];
}

/**
 * Multi-chart layout configuration
 */
export interface MultiChartLayout {
  layout: ChartLayout;
  panes: ChartPaneConfig[];
  syncTimeRanges?: boolean; // Optional: sync time ranges across all panes
}

/**
 * Calculate grid dimensions based on layout type
 * @param layout - The chart layout type
 * @returns Object with rows and columns
 */
export function getGridDimensions(layout: ChartLayout): { rows: number; cols: number } {
  switch (layout) {
    case ChartLayout.SINGLE:
      return { rows: 1, cols: 1 };
    case ChartLayout.VERTICAL:
      return { rows: 2, cols: 1 };
    case ChartLayout.QUAD:
      return { rows: 2, cols: 2 };
    default:
      return { rows: 1, cols: 1 };
  }
}

/**
 * Get number of panes for a layout
 * @param layout - The chart layout type
 * @returns Number of chart panes
 */
export function getPaneCount(layout: ChartLayout): number {
  const { rows, cols } = getGridDimensions(layout);
  return rows * cols;
}

/**
 * Generate default pane config with given ID
 * @param id - Unique pane identifier
 * @param defaultSymbol - Optional default symbol
 * @param defaultIndicators - Optional default indicators
 * @returns ChartPaneConfig
 */
export function createDefaultPaneConfig(
  id: string,
  defaultSymbol: string = '',
  defaultIndicators?: IndicatorConfig
): ChartPaneConfig {
  return {
    id,
    symbol: defaultSymbol,
    timeframe: 'daily',
    indicators: defaultIndicators || {
      sma: { enabled: false, period: 20, color: '#2962FF', lineWidth: 2, lineStyle: 0 },
      ema: { enabled: false, period: 20, color: '#FF6D00', lineWidth: 2, lineStyle: 0 },
      volume: { enabled: false },
      bollingerBands: {
        enabled: false,
        period: 20,
        stdDev: 2,
        upperColor: '#9333EA',
        middleColor: '#A855F7',
        lowerColor: '#C084FC',
        lineWidth: 2,
        lineStyle: 0,
      },
      vwap: { enabled: false, color: '#14B8A6', lineWidth: 2, lineStyle: 0 },
      pivotPoints: {
        enabled: false,
        pivotColor: '#EAB308',
        resistanceColor: '#22C55E',
        supportColor: '#EF4444',
        lineWidth: 1,
        lineStyle: 2,
      },
      rsi: {
        enabled: false,
        period: 14,
        color: '#6366F1',
        lineWidth: 2,
        lineStyle: 0,
      },
      macd: {
        enabled: false,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        macdColor: '#3B82F6',
        signalColor: '#F97316',
        lineWidth: 2,
        lineStyle: 0,
      },
      stochastic: {
        enabled: false,
        kPeriod: 14,
        dPeriod: 3,
        smoothK: 3,
        kColor: '#EC4899',
        dColor: '#F43F5E',
        lineWidth: 2,
        lineStyle: 0,
      },
    },
    drawings: [],
  };
}

/**
 * Create a multi-chart layout with specified number of panes
 * @param layout - Layout type
 * @param defaultSymbol - Optional default symbol for all panes
 * @param defaultIndicators - Optional default indicators for all panes
 * @returns MultiChartLayout
 */
export function createMultiChartLayout(
  layout: ChartLayout,
  defaultSymbol: string = '',
  defaultIndicators?: IndicatorConfig
): MultiChartLayout {
  const paneCount = getPaneCount(layout);
  const panes: ChartPaneConfig[] = [];

  for (let i = 0; i < paneCount; i++) {
    panes.push(createDefaultPaneConfig(`pane-${i}`, defaultSymbol, defaultIndicators));
  }

  return {
    layout,
    panes,
    syncTimeRanges: false,
  };
}
