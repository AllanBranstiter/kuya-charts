import { SMA, EMA, BollingerBands, RSI, MACD, Stochastic } from 'technicalindicators';
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

export interface BollingerBandsDataPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

/**
 * Calculate Bollinger Bands
 * @param data OHLCV data array
 * @param period Number of periods for moving average (default 20)
 * @param stdDev Number of standard deviations (default 2)
 * @returns Array of Bollinger Bands data points
 */
export function calculateBollingerBands(
  data: OHLCVData[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsDataPoint[] {
  if (!data || data.length === 0 || period <= 0) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  
  const bbValues = BollingerBands.calculate({
    period,
    values: closePrices,
    stdDev
  });

  // Map Bollinger Bands values back to time series, accounting for the offset
  const result: BollingerBandsDataPoint[] = [];
  const offset = period - 1;

  for (let i = 0; i < bbValues.length; i++) {
    if (bbValues[i] && !isNaN(bbValues[i].upper) && !isNaN(bbValues[i].middle) && !isNaN(bbValues[i].lower)) {
      result.push({
        time: data[i + offset].timestamp,
        upper: bbValues[i].upper,
        middle: bbValues[i].middle,
        lower: bbValues[i].lower
      });
    }
  }

  return result;
}

/**
 * Calculate Volume Weighted Average Price (VWAP)
 * @param data OHLCV data array
 * @returns Array of VWAP data points
 */
export function calculateVWAP(data: OHLCVData[]): IndicatorDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  const result: IndicatorDataPoint[] = [];
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let lastDate = '';

  for (let i = 0; i < data.length; i++) {
    const currentDate = new Date(data[i].timestamp).toDateString();
    
    // Reset VWAP at the start of each trading day
    if (lastDate && currentDate !== lastDate) {
      cumulativePriceVolume = 0;
      cumulativeVolume = 0;
    }
    
    lastDate = currentDate;
    
    // Typical price is the average of high, low, and close
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    
    cumulativePriceVolume += typicalPrice * data[i].volume;
    cumulativeVolume += data[i].volume;
    
    // Calculate VWAP
    const vwap = cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : typicalPrice;
    
    if (!isNaN(vwap)) {
      result.push({
        time: data[i].timestamp,
        value: vwap
      });
    }
  }

  return result;
}

export interface PivotPointsDataPoint {
  time: string;
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

/**
 * Calculate Pivot Points using the Standard method
 * @param data OHLCV data array
 * @returns Array of Pivot Points data points
 */
export function calculatePivotPoints(data: OHLCVData[]): PivotPointsDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  const result: PivotPointsDataPoint[] = [];
  let lastDate = '';
  let prevHigh = 0;
  let prevLow = 0;
  let prevClose = 0;

  for (let i = 0; i < data.length; i++) {
    const currentDate = new Date(data[i].timestamp).toDateString();
    
    // Calculate pivot points for the new day based on previous day's data
    if (i === 0 || currentDate !== lastDate) {
      if (i > 0) {
        // Use previous day's high, low, close to calculate pivots for current day
        const pivot = (prevHigh + prevLow + prevClose) / 3;
        const r1 = 2 * pivot - prevLow;
        const s1 = 2 * pivot - prevHigh;
        const r2 = pivot + (prevHigh - prevLow);
        const s2 = pivot - (prevHigh - prevLow);
        const r3 = prevHigh + 2 * (pivot - prevLow);
        const s3 = prevLow - 2 * (prevHigh - pivot);

        result.push({
          time: data[i].timestamp,
          pivot,
          r1,
          r2,
          r3,
          s1,
          s2,
          s3
        });
      } else {
        // First data point - use current day's values as baseline
        const pivot = (data[i].high + data[i].low + data[i].close) / 3;
        const r1 = 2 * pivot - data[i].low;
        const s1 = 2 * pivot - data[i].high;
        const r2 = pivot + (data[i].high - data[i].low);
        const s2 = pivot - (data[i].high - data[i].low);
        const r3 = data[i].high + 2 * (pivot - data[i].low);
        const s3 = data[i].low - 2 * (data[i].high - pivot);

        result.push({
          time: data[i].timestamp,
          pivot,
          r1,
          r2,
          r3,
          s1,
          s2,
          s3
        });
      }
      lastDate = currentDate;
    } else {
      // Same day - use the same pivot points from the start of the day
      if (result.length > 0) {
        const lastPivot = result[result.length - 1];
        result.push({
          time: data[i].timestamp,
          pivot: lastPivot.pivot,
          r1: lastPivot.r1,
          r2: lastPivot.r2,
          r3: lastPivot.r3,
          s1: lastPivot.s1,
          s2: lastPivot.s2,
          s3: lastPivot.s3
        });
      }
    }
    
    // Update previous day's values for next iteration
    prevHigh = data[i].high;
    prevLow = data[i].low;
    prevClose = data[i].close;
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param data OHLCV data array
 * @param period Number of periods for RSI calculation (default 14)
 * @returns Array of RSI data points on 0-100 scale
 */
export function calculateRSI(data: OHLCVData[], period: number = 14): IndicatorDataPoint[] {
  if (!data || data.length === 0 || period <= 0) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  
  const rsiValues = RSI.calculate({
    period,
    values: closePrices
  });

  // Map RSI values back to time series, accounting for the offset
  const result: IndicatorDataPoint[] = [];
  const offset = period;

  for (let i = 0; i < rsiValues.length; i++) {
    if (rsiValues[i] !== undefined && !isNaN(rsiValues[i])) {
      result.push({
        time: data[i + offset].timestamp,
        value: rsiValues[i]
      });
    }
  }

  return result;
}

export interface MACDDataPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data OHLCV data array
 * @param fastPeriod Fast EMA period (default 12)
 * @param slowPeriod Slow EMA period (default 26)
 * @param signalPeriod Signal line period (default 9)
 * @returns Array of MACD data points
 */
export function calculateMACD(
  data: OHLCVData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDDataPoint[] {
  if (!data || data.length === 0 || fastPeriod <= 0 || slowPeriod <= 0 || signalPeriod <= 0) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  
  const macdValues = MACD.calculate({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  // Map MACD values back to time series, accounting for the offset
  const result: MACDDataPoint[] = [];
  const offset = slowPeriod + signalPeriod - 1;

  for (let i = 0; i < macdValues.length; i++) {
    const macdValue = macdValues[i];
    if (macdValue &&
        macdValue.MACD !== undefined &&
        macdValue.signal !== undefined &&
        macdValue.histogram !== undefined &&
        !isNaN(macdValue.MACD) &&
        !isNaN(macdValue.signal) &&
        !isNaN(macdValue.histogram)) {
      result.push({
        time: data[i + offset].timestamp,
        macd: macdValue.MACD,
        signal: macdValue.signal,
        histogram: macdValue.histogram
      });
    }
  }

  return result;
}

export interface StochasticDataPoint {
  time: string;
  k: number;
  d: number;
}

/**
 * Calculate Stochastic Oscillator
 * @param data OHLCV data array
 * @param kPeriod %K period (default 14)
 * @param dPeriod %D period (default 3)
 * @param smoothK Smoothing for %K - applies SMA to %K values (default 3)
 * @returns Array of Stochastic data points on 0-100 scale
 */
export function calculateStochastic(
  data: OHLCVData[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smoothK: number = 3
): StochasticDataPoint[] {
  if (!data || data.length === 0 || kPeriod <= 0 || dPeriod <= 0 || smoothK <= 0) {
    return [];
  }

  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  
  const stochValues = Stochastic.calculate({
    high,
    low,
    close,
    period: kPeriod,
    signalPeriod: dPeriod
  });

  // Apply smoothing to %K values if smoothK > 1
  let smoothedStochValues = stochValues;
  let additionalOffset = 0;
  
  if (smoothK > 1) {
    // Extract %K values for smoothing
    const kValues = stochValues.map(s => s.k);
    
    // Apply SMA smoothing to %K
    const smoothedKValues = SMA.calculate({
      period: smoothK,
      values: kValues
    });
    
    additionalOffset = smoothK - 1;
    
    // Reconstruct stochastic values with smoothed %K
    smoothedStochValues = smoothedKValues.map((smoothedK, i) => ({
      k: smoothedK,
      d: stochValues[i + additionalOffset].d
    }));
  }

  // Map Stochastic values back to time series, accounting for the offset
  const result: StochasticDataPoint[] = [];
  const baseOffset = kPeriod - 1;
  const totalOffset = baseOffset + additionalOffset;

  for (let i = 0; i < smoothedStochValues.length; i++) {
    if (smoothedStochValues[i] &&
        !isNaN(smoothedStochValues[i].k) &&
        !isNaN(smoothedStochValues[i].d)) {
      result.push({
        time: data[i + totalOffset].timestamp,
        k: smoothedStochValues[i].k,
        d: smoothedStochValues[i].d
      });
    }
  }

  return result;
}
