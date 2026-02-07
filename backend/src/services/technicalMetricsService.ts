import { RSI, SMA } from 'technicalindicators';

/**
 * Calculate 14-period RSI (Relative Strength Index)
 * @param closePrices - Array of closing prices (most recent first)
 * @returns RSI value (0-100) or null if insufficient data
 */
export function calculateRSI(closePrices: number[]): number | null {
  if (closePrices.length < 15) {
    return null; // Need at least 15 data points for 14-period RSI
  }

  // RSI library expects prices in chronological order (oldest first)
  const reversedPrices = [...closePrices].reverse();

  const rsiValues = RSI.calculate({
    values: reversedPrices,
    period: 14,
  });

  // Return the most recent RSI value
  return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
}

/**
 * Calculate Simple Moving Average
 * @param closePrices - Array of closing prices (most recent first)
 * @param period - SMA period (e.g., 20, 50, 200)
 * @returns SMA value or null if insufficient data
 */
export function calculateSMA(closePrices: number[], period: number): number | null {
  if (closePrices.length < period) {
    return null;
  }

  // SMA library expects prices in chronological order (oldest first)
  const reversedPrices = [...closePrices].reverse();

  const smaValues = SMA.calculate({
    values: reversedPrices,
    period,
  });

  // Return the most recent SMA value
  return smaValues.length > 0 ? smaValues[smaValues.length - 1] : null;
}

/**
 * Calculate percentage difference between current price and SMA
 * @param currentPrice - Current closing price
 * @param smaValue - SMA value
 * @returns Percentage difference (positive = above SMA, negative = below SMA)
 */
export function calculatePriceVsSMA(currentPrice: number, smaValue: number): number {
  return ((currentPrice - smaValue) / smaValue) * 100;
}

/**
 * Calculate volume spike ratio
 * @param currentVolume - Current day's volume
 * @param avgVolume - Average volume over period
 * @returns Volume spike ratio (e.g., 2.0 = 2x average)
 */
export function calculateVolumeSpike(currentVolume: number, avgVolume: number): number {
  if (avgVolume === 0) {
    return 1.0;
  }
  return currentVolume / avgVolume;
}

/**
 * Calculate average volume over a period
 * @param volumes - Array of volume values (most recent first)
 * @param period - Period for averaging (e.g., 20 days)
 * @returns Average volume or null if insufficient data
 */
export function calculateAverageVolume(volumes: number[], period: number): number | null {
  if (volumes.length < period) {
    return null;
  }

  const relevantVolumes = volumes.slice(0, period);
  const sum = relevantVolumes.reduce((acc, vol) => acc + vol, 0);
  return Math.round(sum / period);
}

/**
 * Calculate all technical metrics for a stock
 * @param closePrices - Array of closing prices (most recent first)
 * @param volumes - Array of volumes (most recent first)
 * @returns Object with all calculated metrics
 */
export function calculateAllMetrics(
  closePrices: number[],
  volumes: number[]
): {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  priceVsSma20: number | null;
  priceVsSma50: number | null;
  priceVsSma200: number | null;
  volumeSpike: number | null;
  avgVolume20d: number | null;
} {
  const currentPrice = closePrices[0];
  const currentVolume = volumes[0];

  // Calculate RSI
  const rsi = calculateRSI(closePrices);

  // Calculate SMAs
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);

  // Calculate price vs SMA percentages
  const priceVsSma20 = sma20 ? calculatePriceVsSMA(currentPrice, sma20) : null;
  const priceVsSma50 = sma50 ? calculatePriceVsSMA(currentPrice, sma50) : null;
  const priceVsSma200 = sma200 ? calculatePriceVsSMA(currentPrice, sma200) : null;

  // Calculate volume metrics
  const avgVolume20d = calculateAverageVolume(volumes, 20);
  const volumeSpike = avgVolume20d ? calculateVolumeSpike(currentVolume, avgVolume20d) : null;

  return {
    rsi,
    sma20,
    sma50,
    sma200,
    priceVsSma20,
    priceVsSma50,
    priceVsSma200,
    volumeSpike,
    avgVolume20d,
  };
}
