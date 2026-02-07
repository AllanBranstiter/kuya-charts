import { OHLCVData } from '../types/stock';
import { ComparisonDataPoint, ComparisonMode, ComparisonSeries } from '../types/comparison';

/**
 * Calculate percentage change from a base value
 * @param data - OHLCV data array
 * @param baseValue - Starting value for percentage calculation
 * @returns Array of data points with percentage change values
 */
export function calculatePercentageChange(
  data: OHLCVData[],
  baseValue: number
): ComparisonDataPoint[] {
  if (!data || data.length === 0 || baseValue === 0) {
    return [];
  }

  return data.map((item) => ({
    time: Math.floor(new Date(item.timestamp).getTime() / 1000),
    value: ((item.close - baseValue) / baseValue) * 100,
    originalPrice: item.close,
  }));
}

/**
 * Normalize data to start at 100
 * @param data - OHLCV data array
 * @param baseValue - Starting value for normalization
 * @returns Array of data points normalized to 100
 */
export function normalizeData(
  data: OHLCVData[],
  baseValue: number
): ComparisonDataPoint[] {
  if (!data || data.length === 0 || baseValue === 0) {
    return [];
  }

  return data.map((item) => ({
    time: Math.floor(new Date(item.timestamp).getTime() / 1000),
    value: (item.close / baseValue) * 100,
    originalPrice: item.close,
  }));
}

/**
 * Convert data to absolute values (no transformation)
 * @param data - OHLCV data array
 * @returns Array of data points with absolute close prices
 */
export function convertToAbsolute(data: OHLCVData[]): ComparisonDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => ({
    time: Math.floor(new Date(item.timestamp).getTime() / 1000),
    value: item.close,
    originalPrice: item.close,
  }));
}

/**
 * Find the common time range across multiple datasets
 * @param dataSets - Array of OHLCV data arrays
 * @returns Object with start and end timestamps, or null if no overlap
 */
export function findCommonTimeRange(
  dataSets: OHLCVData[][]
): { start: number; end: number } | null {
  if (!dataSets || dataSets.length === 0) {
    return null;
  }

  // Filter out empty datasets
  const validDataSets = dataSets.filter((ds) => ds && ds.length > 0);
  if (validDataSets.length === 0) {
    return null;
  }

  // Find the latest start date (most recent earliest point)
  let maxStart = -Infinity;
  // Find the earliest end date (earliest latest point)
  let minEnd = Infinity;

  validDataSets.forEach((dataSet) => {
    const sortedData = [...dataSet].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const start = new Date(sortedData[0].timestamp).getTime() / 1000;
    const end = new Date(sortedData[sortedData.length - 1].timestamp).getTime() / 1000;

    maxStart = Math.max(maxStart, start);
    minEnd = Math.min(minEnd, end);
  });

  // Check if there's actually an overlap
  if (maxStart > minEnd) {
    return null;
  }

  return {
    start: maxStart,
    end: minEnd,
  };
}

/**
 * Align multiple datasets to the same time points
 * Uses the intersection of all available timestamps
 * @param dataSets - Array of OHLCV data arrays
 * @returns Array of aligned OHLCV data arrays
 */
export function alignDataByTime(dataSets: OHLCVData[][]): OHLCVData[][] {
  if (!dataSets || dataSets.length === 0) {
    return [];
  }

  // Filter out empty datasets
  const validDataSets = dataSets.filter((ds) => ds && ds.length > 0);
  if (validDataSets.length === 0) {
    return [];
  }

  // If only one dataset, return it as-is
  if (validDataSets.length === 1) {
    return validDataSets;
  }

  // Create a set of timestamps that exist in all datasets
  const timestampSets = validDataSets.map((dataSet) =>
    new Set(dataSet.map((item) => item.timestamp))
  );

  // Find intersection of all timestamp sets
  const commonTimestamps = Array.from(timestampSets[0]).filter((timestamp) =>
    timestampSets.every((set) => set.has(timestamp))
  );

  // Sort timestamps chronologically
  commonTimestamps.sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Filter each dataset to only include common timestamps
  const alignedDataSets = validDataSets.map((dataSet) => {
    const timestampMap = new Map(
      dataSet.map((item) => [item.timestamp, item])
    );
    return commonTimestamps
      .map((timestamp) => timestampMap.get(timestamp))
      .filter((item): item is OHLCVData => item !== undefined);
  });

  return alignedDataSets;
}

/**
 * Transform comparison data based on the selected mode
 * @param data - OHLCV data array
 * @param mode - Comparison mode
 * @param baseValue - Base value for calculations (first close price in range)
 * @returns Transformed comparison data points
 */
export function transformComparisonData(
  data: OHLCVData[],
  mode: ComparisonMode,
  baseValue: number
): ComparisonDataPoint[] {
  switch (mode) {
    case ComparisonMode.ABSOLUTE:
      return convertToAbsolute(data);
    case ComparisonMode.PERCENTAGE_CHANGE:
      return calculatePercentageChange(data, baseValue);
    case ComparisonMode.NORMALIZED:
      return normalizeData(data, baseValue);
    default:
      return convertToAbsolute(data);
  }
}

/**
 * Create comparison series from symbol data
 * @param symbol - Symbol identifier
 * @param data - OHLCV data for the symbol
 * @param mode - Comparison mode
 * @param color - Display color
 * @param isBase - Whether this is the base symbol
 * @returns Comparison series with transformed data
 */
export function createComparisonSeries(
  symbol: string,
  data: OHLCVData[],
  mode: ComparisonMode,
  color: string,
  isBase: boolean = false
): ComparisonSeries {
  if (!data || data.length === 0) {
    return {
      symbol,
      color,
      data: [],
      isBase,
    };
  }

  // Sort data by timestamp
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Use the first close price as the base value
  const baseValue = sortedData[0].close;

  // Transform data based on mode
  const transformedData = transformComparisonData(sortedData, mode, baseValue);

  // Calculate current value and change percent
  const currentValue = transformedData.length > 0
    ? transformedData[transformedData.length - 1].value
    : undefined;

  const changePercent =
    mode === ComparisonMode.ABSOLUTE && sortedData.length > 0
      ? ((sortedData[sortedData.length - 1].close - baseValue) / baseValue) * 100
      : currentValue !== undefined && mode === ComparisonMode.PERCENTAGE_CHANGE
      ? currentValue
      : currentValue !== undefined && mode === ComparisonMode.NORMALIZED
      ? currentValue - 100
      : undefined;

  return {
    symbol,
    color,
    data: transformedData,
    currentValue,
    changePercent,
    isBase,
  };
}

/**
 * Get the base value (starting price) for a dataset
 * @param data - OHLCV data array
 * @returns First close price, or 0 if data is empty
 */
export function getBaseValue(data: OHLCVData[]): number {
  if (!data || data.length === 0) {
    return 0;
  }

  // Sort by timestamp to ensure we get the earliest price
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return sortedData[0].close;
}

/**
 * Filter data to a specific time range
 * @param data - OHLCV data array
 * @param startTime - Start timestamp in seconds
 * @param endTime - End timestamp in seconds
 * @returns Filtered OHLCV data array
 */
export function filterDataByTimeRange(
  data: OHLCVData[],
  startTime: number,
  endTime: number
): OHLCVData[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.filter((item) => {
    const timestamp = new Date(item.timestamp).getTime() / 1000;
    return timestamp >= startTime && timestamp <= endTime;
  });
}

/**
 * Interpolate missing data points (simple linear interpolation)
 * Useful for handling gaps in data when comparing symbols
 * @param data - OHLCV data array with potential gaps
 * @param referenceTimestamps - Array of timestamps that should exist
 * @returns OHLCV data array with interpolated values
 */
export function interpolateMissingData(
  data: OHLCVData[],
  referenceTimestamps: string[]
): OHLCVData[] {
  if (!data || data.length === 0) {
    return [];
  }

  const dataMap = new Map(data.map((item) => [item.timestamp, item]));
  const result: OHLCVData[] = [];

  for (let i = 0; i < referenceTimestamps.length; i++) {
    const timestamp = referenceTimestamps[i];

    if (dataMap.has(timestamp)) {
      // Data point exists, use it
      result.push(dataMap.get(timestamp)!);
    } else {
      // Data point missing, interpolate
      // Find the nearest previous and next data points
      let prevData: OHLCVData | null = null;
      let nextData: OHLCVData | null = null;

      for (let j = i - 1; j >= 0; j--) {
        if (dataMap.has(referenceTimestamps[j])) {
          prevData = dataMap.get(referenceTimestamps[j])!;
          break;
        }
      }

      for (let j = i + 1; j < referenceTimestamps.length; j++) {
        if (dataMap.has(referenceTimestamps[j])) {
          nextData = dataMap.get(referenceTimestamps[j])!;
          break;
        }
      }

      // If we have both prev and next, interpolate
      if (prevData && nextData) {
        const prevTime = new Date(prevData.timestamp).getTime();
        const nextTime = new Date(nextData.timestamp).getTime();
        const currTime = new Date(timestamp).getTime();
        const ratio = (currTime - prevTime) / (nextTime - prevTime);

        result.push({
          timestamp,
          open: prevData.open + (nextData.open - prevData.open) * ratio,
          high: prevData.high + (nextData.high - prevData.high) * ratio,
          low: prevData.low + (nextData.low - prevData.low) * ratio,
          close: prevData.close + (nextData.close - prevData.close) * ratio,
          volume: Math.round(
            prevData.volume + (nextData.volume - prevData.volume) * ratio
          ),
        });
      } else if (prevData) {
        // Only have previous data, use it
        result.push({ ...prevData, timestamp });
      } else if (nextData) {
        // Only have next data, use it
        result.push({ ...nextData, timestamp });
      }
      // If we have neither, skip this timestamp
    }
  }

  return result;
}
