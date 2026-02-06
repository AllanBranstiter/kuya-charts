import { SMA, EMA } from 'technicalindicators';
import { OHLCVData } from '../types/stock';

export interface IndicatorDataPoint {
  time: string;
  value: number;
}

export interface VolumeDataPoint {
  time: string;
  value: number;
  color?: string;
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param data OHLCV data array
 * @param period Number of periods for SMA calculation
 * @returns Array of data points compatible with Lightweight Charts
 */
export function calculateSMA(data: OHLCVData[], period: number): IndicatorDataPoint[] {
  if (!data || data.length === 0 || period <= 0) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  
  const smaValues = SMA.calculate({
    period,
    values: closePrices
  });

  // Map SMA values back to time series, accounting for the offset
  const result: IndicatorDataPoint[] = [];
  const offset = period - 1;

  for (let i = 0; i < smaValues.length; i++) {
    if (smaValues[i] !== undefined && !isNaN(smaValues[i])) {
      result.push({
        time: data[i + offset].timestamp,
        value: smaValues[i]
      });
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data OHLCV data array
 * @param period Number of periods for EMA calculation
 * @returns Array of data points compatible with Lightweight Charts
 */
export function calculateEMA(data: OHLCVData[], period: number): IndicatorDataPoint[] {
  if (!data || data.length === 0 || period <= 0) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  
  const emaValues = EMA.calculate({
    period,
    values: closePrices
  });

  // Map EMA values back to time series, accounting for the offset
  const result: IndicatorDataPoint[] = [];
  const offset = period - 1;

  for (let i = 0; i < emaValues.length; i++) {
    if (emaValues[i] !== undefined && !isNaN(emaValues[i])) {
      result.push({
        time: data[i + offset].timestamp,
        value: emaValues[i]
      });
    }
  }

  return result;
}

/**
 * Format volume data for display in Lightweight Charts
 * @param data OHLCV data array
 * @returns Array of volume data points with colors (green for up, red for down)
 */
export function formatVolumeData(data: OHLCVData[]): VolumeDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((d, index) => {
    // Determine color: green if close > open, red otherwise
    const isUp = index === 0 ? true : d.close >= d.open;
    
    return {
      time: d.timestamp,
      value: d.volume,
      color: isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' // green-500 : red-500 with transparency
    };
  });
}
