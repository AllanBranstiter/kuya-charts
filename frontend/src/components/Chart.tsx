import { useEffect, useRef, useMemo, useCallback, memo, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, LogicalRange } from 'lightweight-charts';
import { OHLCVData, DataRangeMetadata } from '../types/stock';
import { IndicatorConfig } from './IndicatorControls';
import { fetchDailyData } from '../services/stockApi';
import { useTheme } from '../contexts/ThemeContext';
import { ComparisonSeries } from '../types/comparison';
import {
  calculateSMA,
  calculateEMA,
  formatVolumeData,
  calculateBollingerBands,
  calculateVWAP,
  calculatePivotPoints,
  calculateRSI,
  calculateMACD,
  calculateStochastic
} from '../utils/indicators';

interface ChartProps {
  data: OHLCVData[];
  symbol: string;
  indicators?: IndicatorConfig;
  onDataUpdate?: (data: OHLCVData[]) => void;
  comparisonSeries?: ComparisonSeries[];
}

/**
 * Decimates data for large datasets to improve performance
 * @param data Original data array
 * @param maxPoints Maximum points to display (default 1000)
 * @returns Decimated data array
 */
function decimateData<T>(data: T[], maxPoints: number = 1000): T[] {
  if (data.length <= maxPoints) {
    return data;
  }
  
  const step = Math.ceil(data.length / maxPoints);
  const decimated: T[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[i]);
  }
  
  // Always include the last data point
  if (decimated[decimated.length - 1] !== data[data.length - 1]) {
    decimated.push(data[data.length - 1]);
  }
  
  return decimated;
}

const Chart = memo(function Chart({ data, symbol, indicators, onDataUpdate, comparisonSeries }: ChartProps) {
  const { theme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  // Lazy loading state
  const [allData, setAllData] = useState<OHLCVData[]>(data);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [metadata, setMetadata] = useState<DataRangeMetadata | null>(null);
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const LOAD_DEBOUNCE_MS = 1000; // 1 second debounce
  const EDGE_THRESHOLD = 0.2; // Load when 20% from edge
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const pivotSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const r1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const r2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const r3SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const s1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const s2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const s3SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Comparison series refs - map symbol to series
  const comparisonSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  
  // Oscillator series refs
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOversoldRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiMidlineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOverboughtRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const macdZeroRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  const stochKRef = useRef<ISeriesApi<'Line'> | null>(null);
  const stochDRef = useRef<ISeriesApi<'Line'> | null>(null);
  const stochOversoldRef = useRef<ISeriesApi<'Line'> | null>(null);
  const stochMidlineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const stochOverboughtRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Update allData when prop data changes
  useEffect(() => {
    setAllData(data);
  }, [data]);

  // Function to load more historical data
  const loadMoreHistoricalData = useCallback(async () => {
    if (loadingRef.current || !metadata?.hasMoreHistory) {
      return;
    }

    // Debounce: prevent loading too frequently
    const now = Date.now();
    if (now - lastLoadTimeRef.current < LOAD_DEBOUNCE_MS) {
      return;
    }

    loadingRef.current = true;
    lastLoadTimeRef.current = now;
    setIsLoadingMore(true);

    try {
      console.log('Loading more historical data for', symbol);
      
      // Request full historical data
      const response = await fetchDailyData(symbol, { full: true });
      
      if (response.data && response.data.length > 0) {
        // Merge new data with existing data
        const existingTimestamps = new Set(allData.map(d => d.timestamp));
        const newData = response.data.filter(d => !existingTimestamps.has(d.timestamp));
        
        if (newData.length > 0) {
          const merged = [...allData, ...newData].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setAllData(merged);
          setMetadata(response.metadata || null);
          
          // Notify parent component of data update
          if (onDataUpdate) {
            onDataUpdate(merged);
          }
          
          console.log(`Loaded ${newData.length} additional data points`);
        } else {
          console.log('No new data points found');
        }
      }
    } catch (error) {
      console.error('Error loading more historical data:', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [symbol, allData, metadata, onDataUpdate]);

  // Detect when user zooms near edge of data (will be set up after chart is created)
  const handleVisibleRangeChange = useCallback((range: LogicalRange | null) => {
    if (!range || !allData || allData.length === 0) {
      return;
    }

    const from = range.from;
    const to = range.to;
    if (typeof from !== 'number' || typeof to !== 'number') {
      return;
    }

    // Convert allData to chart times for comparison
    const sortedData = [...allData].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const dataStartTime = new Date(sortedData[0].timestamp).getTime() / 1000;
    
    const visibleRange = to - from;
    const threshold = visibleRange * EDGE_THRESHOLD;

    // Check if user is zooming near the left edge (older data)
    const distanceFromStart = Math.abs(from - dataStartTime);
    
    if (distanceFromStart < threshold && metadata?.hasMoreHistory) {
      console.log('Near edge of historical data, triggering load...');
      loadMoreHistoricalData();
    }
  }, [allData, metadata, loadMoreHistoricalData]);

  // Memoize handleResize to prevent recreation on every render
  const handleResize = useCallback(() => {
    if (chartContainerRef.current && chartRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    }
  }, []);

  // Memoize chart data conversion and decimation
  const chartData = useMemo(() => {
    if (!allData || allData.length === 0) return [];
    
    // Decimate data if it's too large for better performance
    const processedData = allData.length > 1000 ? decimateData(allData, 1000) : allData;
    
    const converted: CandlestickData[] = processedData.map((item) => ({
      time: (new Date(item.timestamp).getTime() / 1000) as any,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    
    // Sort by time ascending
    return converted.sort((a, b) => (a.time as number) - (b.time as number));
  }, [allData]);

  // Memoize indicator calculations to prevent unnecessary recalculations
  const indicatorResults = useMemo(() => {
    if (!allData || allData.length === 0) {
      return {
        sma: [],
        ema: [],
        volume: [],
        bollingerBands: [],
        vwap: [],
        pivotPoints: [],
        rsi: [],
        macd: [],
        stochastic: [],
      };
    }

    return {
      sma: indicators?.sma.enabled ? calculateSMA(allData, indicators.sma.period) : [],
      ema: indicators?.ema.enabled ? calculateEMA(allData, indicators.ema.period) : [],
      volume: indicators?.volume.enabled ? formatVolumeData(allData) : [],
      bollingerBands: indicators?.bollingerBands.enabled
        ? calculateBollingerBands(allData, indicators.bollingerBands.period, indicators.bollingerBands.stdDev)
        : [],
      vwap: indicators?.vwap.enabled ? calculateVWAP(allData) : [],
      pivotPoints: indicators?.pivotPoints.enabled ? calculatePivotPoints(allData) : [],
      rsi: indicators?.rsi.enabled ? calculateRSI(allData, indicators.rsi.period) : [],
      macd: indicators?.macd.enabled
        ? calculateMACD(allData, indicators.macd.fastPeriod, indicators.macd.slowPeriod, indicators.macd.signalPeriod)
        : [],
      stochastic: indicators?.stochastic.enabled
        ? calculateStochastic(allData, indicators.stochastic.kPeriod, indicators.stochastic.dPeriod, indicators.stochastic.smoothK)
        : [],
    };
  }, [
    allData,
    indicators?.sma.enabled, indicators?.sma.period,
    indicators?.ema.enabled, indicators?.ema.period,
    indicators?.volume.enabled,
    indicators?.bollingerBands.enabled, indicators?.bollingerBands.period, indicators?.bollingerBands.stdDev,
    indicators?.vwap.enabled,
    indicators?.pivotPoints.enabled,
    indicators?.rsi.enabled, indicators?.rsi.period,
    indicators?.macd.enabled, indicators?.macd.fastPeriod, indicators?.macd.slowPeriod, indicators?.macd.signalPeriod,
    indicators?.stochastic.enabled, indicators?.stochastic.kPeriod, indicators?.stochastic.dPeriod, indicators?.stochastic.smoothK,
  ]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Calculate dynamic height based on enabled oscillators and screen size
    const isMobile = window.innerWidth < 768;
    const baseHeight = isMobile ? 300 : 400;
    const oscillatorHeight = isMobile ? 120 : 150;
    let enabledOscillators = 0;
    
    if (indicators?.volume.enabled) enabledOscillators++;
    if (indicators?.rsi.enabled) enabledOscillators++;
    if (indicators?.macd.enabled) enabledOscillators++;
    if (indicators?.stochastic.enabled) enabledOscillators++;
    
    const totalHeight = baseHeight + (enabledOscillators * oscillatorHeight);

    // Get theme colors from CSS variables
    const isDark = theme === 'dark';
    const chartBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#e5e5e5' : '#111827';
    const gridColor = isDark ? '#404040' : '#e5e7eb';
    const borderColor = isDark ? '#525252' : '#cccccc';

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: totalHeight,
      layout: {
        background: { color: chartBg },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series with theme-appropriate colors
    const upColor = isDark ? '#22c55e' : '#26a69a';
    const downColor = '#ef5350';
    
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    seriesRef.current = candlestickSeries;

    window.addEventListener('resize', handleResize);

    // Subscribe to visible time range changes for lazy loading
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [theme, indicators?.volume.enabled, indicators?.rsi.enabled, indicators?.macd.enabled, indicators?.stochastic.enabled, handleResize, handleVisibleRangeChange]);

  // Update chart theme when theme changes
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const isDark = theme === 'dark';
    const chartBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#e5e5e5' : '#111827';
    const gridColor = isDark ? '#404040' : '#e5e7eb';
    const borderColor = isDark ? '#525252' : '#cccccc';
    const upColor = isDark ? '#22c55e' : '#26a69a';
    const downColor = '#ef5350';

    // Update chart layout
    chartRef.current.applyOptions({
      layout: {
        background: { color: chartBg },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
      },
    });

    // Update candlestick colors
    seriesRef.current.applyOptions({
      upColor: upColor,
      downColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
  }, [theme]);

  // Update chart data when data prop changes
  useEffect(() => {
    if (!seriesRef.current || chartData.length === 0) return;

    seriesRef.current.setData(chartData);

    // Fit content to visible area
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData]);

  // Update indicators when data or indicator config changes
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Handle SMA indicator
    if (indicators?.sma.enabled && indicatorResults.sma.length > 0) {
      // Create SMA series if it doesn't exist
      if (!smaSeriesRef.current) {
        smaSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.sma.color || '#2962FF',
          lineWidth: (indicators.sma.lineWidth || 2) as any,
          lineStyle: (indicators.sma.lineStyle || 0) as any,
          title: `SMA(${indicators.sma.period})`,
        });
      } else {
        // Update existing series options if config changed
        smaSeriesRef.current.applyOptions({
          color: indicators.sma.color || '#2962FF',
          lineWidth: (indicators.sma.lineWidth || 2) as any,
          lineStyle: (indicators.sma.lineStyle || 0) as any,
        });
      }

      // Use memoized SMA data
      const formattedSmaData: LineData[] = indicatorResults.sma.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.value,
      }));
      formattedSmaData.sort((a, b) => (a.time as number) - (b.time as number));
      smaSeriesRef.current.setData(formattedSmaData);
    } else {
      // Remove SMA series if disabled
      if (smaSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(smaSeriesRef.current);
        smaSeriesRef.current = null;
      }
    }

    // Handle EMA indicator
    if (indicators?.ema.enabled && indicatorResults.ema.length > 0) {
      // Create EMA series if it doesn't exist
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.ema.color || '#FF6D00',
          lineWidth: (indicators.ema.lineWidth || 2) as any,
          lineStyle: (indicators.ema.lineStyle || 0) as any,
          title: `EMA(${indicators.ema.period})`,
        });
      } else {
        // Update existing series options if config changed
        emaSeriesRef.current.applyOptions({
          color: indicators.ema.color || '#FF6D00',
          lineWidth: (indicators.ema.lineWidth || 2) as any,
          lineStyle: (indicators.ema.lineStyle || 0) as any,
        });
      }

      // Use memoized EMA data
      const formattedEmaData: LineData[] = indicatorResults.ema.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.value,
      }));
      formattedEmaData.sort((a, b) => (a.time as number) - (b.time as number));
      emaSeriesRef.current.setData(formattedEmaData);
    } else {
      // Remove EMA series if disabled
      if (emaSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
      }
    }

    // Handle Volume indicator
    if (indicators?.volume.enabled && indicatorResults.volume.length > 0) {
      // Create Volume series if it doesn't exist
      if (!volumeSeriesRef.current) {
        volumeSeriesRef.current = chartRef.current.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '', // Create separate price scale
        });
        // Set volume to bottom pane
        volumeSeriesRef.current.priceScale().applyOptions({
          scaleMargins: {
            top: 0.7, // Start volume pane at 70% down
            bottom: 0,
          },
        });
      }

      // Use memoized volume data
      const formattedVolumeData: HistogramData[] = indicatorResults.volume.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.value,
        color: item.color,
      }));
      formattedVolumeData.sort((a, b) => (a.time as number) - (b.time as number));
      volumeSeriesRef.current.setData(formattedVolumeData);
    } else {
      // Remove Volume series if disabled
      if (volumeSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }
    }

    // Handle Bollinger Bands indicator
    if (indicators?.bollingerBands.enabled && indicatorResults.bollingerBands.length > 0) {
      const bbData = indicatorResults.bollingerBands;
      
      // Create upper band series if it doesn't exist
      if (!bbUpperSeriesRef.current) {
        bbUpperSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.bollingerBands.upperColor || '#9333EA',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
          title: `BB Upper(${indicators.bollingerBands.period},${indicators.bollingerBands.stdDev})`,
        });
      } else {
        bbUpperSeriesRef.current.applyOptions({
          color: indicators.bollingerBands.upperColor || '#9333EA',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
        });
      }
      
      // Create middle band series if it doesn't exist
      if (!bbMiddleSeriesRef.current) {
        bbMiddleSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.bollingerBands.middleColor || '#A855F7',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
          title: `BB Middle(${indicators.bollingerBands.period})`,
        });
      } else {
        bbMiddleSeriesRef.current.applyOptions({
          color: indicators.bollingerBands.middleColor || '#A855F7',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
        });
      }
      
      // Create lower band series if it doesn't exist
      if (!bbLowerSeriesRef.current) {
        bbLowerSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.bollingerBands.lowerColor || '#C084FC',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
          title: `BB Lower(${indicators.bollingerBands.period},${indicators.bollingerBands.stdDev})`,
        });
      } else {
        bbLowerSeriesRef.current.applyOptions({
          color: indicators.bollingerBands.lowerColor || '#C084FC',
          lineWidth: (indicators.bollingerBands.lineWidth || 2) as any,
          lineStyle: (indicators.bollingerBands.lineStyle || 0) as any,
        });
      }

      // Format and set data for each band
      const upperData: LineData[] = bbData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.upper,
      }));
      upperData.sort((a, b) => (a.time as number) - (b.time as number));
      bbUpperSeriesRef.current.setData(upperData);

      const middleData: LineData[] = bbData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.middle,
      }));
      middleData.sort((a, b) => (a.time as number) - (b.time as number));
      bbMiddleSeriesRef.current.setData(middleData);

      const lowerData: LineData[] = bbData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.lower,
      }));
      lowerData.sort((a, b) => (a.time as number) - (b.time as number));
      bbLowerSeriesRef.current.setData(lowerData);
    } else {
      // Remove Bollinger Bands series if disabled
      if (bbUpperSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(bbUpperSeriesRef.current);
        bbUpperSeriesRef.current = null;
      }
      if (bbMiddleSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(bbMiddleSeriesRef.current);
        bbMiddleSeriesRef.current = null;
      }
      if (bbLowerSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(bbLowerSeriesRef.current);
        bbLowerSeriesRef.current = null;
      }
    }

    // Handle VWAP indicator
    if (indicators?.vwap.enabled && indicatorResults.vwap.length > 0) {
      // Create VWAP series if it doesn't exist
      if (!vwapSeriesRef.current) {
        vwapSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.vwap.color || '#14B8A6',
          lineWidth: (indicators.vwap.lineWidth || 2) as any,
          lineStyle: (indicators.vwap.lineStyle || 0) as any,
          title: 'VWAP',
        });
      } else {
        vwapSeriesRef.current.applyOptions({
          color: indicators.vwap.color || '#14B8A6',
          lineWidth: (indicators.vwap.lineWidth || 2) as any,
          lineStyle: (indicators.vwap.lineStyle || 0) as any,
        });
      }

      // Use memoized VWAP data
      const formattedVwapData: LineData[] = indicatorResults.vwap.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.value,
      }));
      formattedVwapData.sort((a, b) => (a.time as number) - (b.time as number));
      vwapSeriesRef.current.setData(formattedVwapData);
    } else {
      // Remove VWAP series if disabled
      if (vwapSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(vwapSeriesRef.current);
        vwapSeriesRef.current = null;
      }
    }

    // Handle Pivot Points indicator
    if (indicators?.pivotPoints.enabled && indicatorResults.pivotPoints.length > 0) {
      const pivotData = indicatorResults.pivotPoints;
      
      const pivotColor = indicators.pivotPoints.pivotColor || '#EAB308';
      const resistanceColor = indicators.pivotPoints.resistanceColor || '#22C55E';
      const supportColor = indicators.pivotPoints.supportColor || '#EF4444';
      const lineWidth = (indicators.pivotPoints.lineWidth || 1) as any;
      const lineStyle = (indicators.pivotPoints.lineStyle || 2) as any;
      
      // Create pivot series if it doesn't exist
      if (!pivotSeriesRef.current) {
        pivotSeriesRef.current = chartRef.current.addLineSeries({
          color: pivotColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'Pivot',
        });
      } else {
        pivotSeriesRef.current.applyOptions({
          color: pivotColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
        });
      }
      
      // Create resistance series
      if (!r1SeriesRef.current) {
        r1SeriesRef.current = chartRef.current.addLineSeries({
          color: resistanceColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'R1',
        });
      } else {
        r1SeriesRef.current.applyOptions({ color: resistanceColor, lineWidth, lineStyle });
      }
      if (!r2SeriesRef.current) {
        r2SeriesRef.current = chartRef.current.addLineSeries({
          color: resistanceColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'R2',
        });
      } else {
        r2SeriesRef.current.applyOptions({ color: resistanceColor, lineWidth, lineStyle });
      }
      if (!r3SeriesRef.current) {
        r3SeriesRef.current = chartRef.current.addLineSeries({
          color: resistanceColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'R3',
        });
      } else {
        r3SeriesRef.current.applyOptions({ color: resistanceColor, lineWidth, lineStyle });
      }
      
      // Create support series
      if (!s1SeriesRef.current) {
        s1SeriesRef.current = chartRef.current.addLineSeries({
          color: supportColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'S1',
        });
      } else {
        s1SeriesRef.current.applyOptions({ color: supportColor, lineWidth, lineStyle });
      }
      if (!s2SeriesRef.current) {
        s2SeriesRef.current = chartRef.current.addLineSeries({
          color: supportColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'S2',
        });
      } else {
        s2SeriesRef.current.applyOptions({ color: supportColor, lineWidth, lineStyle });
      }
      if (!s3SeriesRef.current) {
        s3SeriesRef.current = chartRef.current.addLineSeries({
          color: supportColor,
          lineWidth: lineWidth,
          lineStyle: lineStyle,
          title: 'S3',
        });
      } else {
        s3SeriesRef.current.applyOptions({ color: supportColor, lineWidth, lineStyle });
      }

      // Format and set data for each pivot level
      const pivotPoints: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.pivot,
      }));
      pivotPoints.sort((a, b) => (a.time as number) - (b.time as number));
      pivotSeriesRef.current.setData(pivotPoints);

      const r1Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.r1,
      }));
      r1Points.sort((a, b) => (a.time as number) - (b.time as number));
      r1SeriesRef.current.setData(r1Points);

      const r2Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.r2,
      }));
      r2Points.sort((a, b) => (a.time as number) - (b.time as number));
      r2SeriesRef.current.setData(r2Points);

      const r3Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.r3,
      }));
      r3Points.sort((a, b) => (a.time as number) - (b.time as number));
      r3SeriesRef.current.setData(r3Points);

      const s1Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.s1,
      }));
      s1Points.sort((a, b) => (a.time as number) - (b.time as number));
      s1SeriesRef.current.setData(s1Points);

      const s2Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.s2,
      }));
      s2Points.sort((a, b) => (a.time as number) - (b.time as number));
      s2SeriesRef.current.setData(s2Points);

      const s3Points: LineData[] = pivotData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.s3,
      }));
      s3Points.sort((a, b) => (a.time as number) - (b.time as number));
      s3SeriesRef.current.setData(s3Points);
    } else {
      // Remove Pivot Points series if disabled
      if (pivotSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(pivotSeriesRef.current);
        pivotSeriesRef.current = null;
      }
      if (r1SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(r1SeriesRef.current);
        r1SeriesRef.current = null;
      }
      if (r2SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(r2SeriesRef.current);
        r2SeriesRef.current = null;
      }
      if (r3SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(r3SeriesRef.current);
        r3SeriesRef.current = null;
      }
      if (s1SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(s1SeriesRef.current);
        s1SeriesRef.current = null;
      }
      if (s2SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(s2SeriesRef.current);
        s2SeriesRef.current = null;
      }
      if (s3SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(s3SeriesRef.current);
        s3SeriesRef.current = null;
      }
    }

    // Calculate pane margins dynamically based on enabled oscillators
    const oscillators: string[] = [];
    if (indicators?.volume.enabled) oscillators.push('volume');
    if (indicators?.rsi.enabled) oscillators.push('rsi');
    if (indicators?.macd.enabled) oscillators.push('macd');
    if (indicators?.stochastic.enabled) oscillators.push('stochastic');

    const numPanes = oscillators.length;
    const mainChartHeight = numPanes > 0 ? 0.6 : 1.0; // Main chart takes 60% if oscillators are enabled
    const paneHeight = numPanes > 0 ? (1.0 - mainChartHeight) / numPanes : 0;

    // Update volume pane margins if enabled
    if (indicators?.volume.enabled && volumeSeriesRef.current) {
      const volumeIndex = oscillators.indexOf('volume');
      const topMargin = mainChartHeight + (volumeIndex * paneHeight);
      const bottomMargin = 1.0 - (topMargin + paneHeight);
      
      volumeSeriesRef.current.priceScale().applyOptions({
        scaleMargins: {
          top: topMargin,
          bottom: bottomMargin,
        },
      });
    }

    // Handle RSI indicator
    if (indicators?.rsi.enabled && indicatorResults.rsi.length > 0) {
      const rsiData = indicatorResults.rsi;
      const rsiIndex = oscillators.indexOf('rsi');
      const topMargin = mainChartHeight + (rsiIndex * paneHeight);
      const bottomMargin = 1.0 - (topMargin + paneHeight);

      // Create RSI series if it doesn't exist
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.rsi.color || '#6366F1',
          lineWidth: (indicators.rsi.lineWidth || 2) as any,
          lineStyle: (indicators.rsi.lineStyle || 0) as any,
          title: `RSI(${indicators.rsi.period})`,
          priceScaleId: 'rsi',
        });
        rsiSeriesRef.current.priceScale().applyOptions({
          scaleMargins: {
            top: topMargin,
            bottom: bottomMargin,
          },
        });
      } else {
        rsiSeriesRef.current.applyOptions({
          color: indicators.rsi.color || '#6366F1',
          lineWidth: (indicators.rsi.lineWidth || 2) as any,
          lineStyle: (indicators.rsi.lineStyle || 0) as any,
        });
      }

      // Create reference lines for RSI
      if (!rsiOversoldRef.current) {
        rsiOversoldRef.current = chartRef.current.addLineSeries({
          color: '#EF4444',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          priceScaleId: 'rsi',
        });
      }
      if (!rsiMidlineRef.current) {
        rsiMidlineRef.current = chartRef.current.addLineSeries({
          color: '#9CA3AF',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'rsi',
        });
      }
      if (!rsiOverboughtRef.current) {
        rsiOverboughtRef.current = chartRef.current.addLineSeries({
          color: '#22C55E',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'rsi',
        });
      }

      // Format and set RSI data
      const formattedRsiData: LineData[] = rsiData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.value,
      }));
      formattedRsiData.sort((a, b) => (a.time as number) - (b.time as number));
      rsiSeriesRef.current.setData(formattedRsiData);

      // Set reference lines (30, 50, 70)
      const refLineData = allData.map((item) => ({
        time: (new Date(item.timestamp).getTime() / 1000) as any,
      }));
      
      rsiOversoldRef.current.setData(refLineData.map(d => ({ ...d, value: 30 })));
      rsiMidlineRef.current.setData(refLineData.map(d => ({ ...d, value: 50 })));
      rsiOverboughtRef.current.setData(refLineData.map(d => ({ ...d, value: 70 })));
    } else {
      // Remove RSI series if disabled
      if (rsiSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
      }
      if (rsiOversoldRef.current && chartRef.current) {
        chartRef.current.removeSeries(rsiOversoldRef.current);
        rsiOversoldRef.current = null;
      }
      if (rsiMidlineRef.current && chartRef.current) {
        chartRef.current.removeSeries(rsiMidlineRef.current);
        rsiMidlineRef.current = null;
      }
      if (rsiOverboughtRef.current && chartRef.current) {
        chartRef.current.removeSeries(rsiOverboughtRef.current);
        rsiOverboughtRef.current = null;
      }
    }

    // Handle MACD indicator
    if (indicators?.macd.enabled && indicatorResults.macd.length > 0) {
      const macdData = indicatorResults.macd;
      const macdIndex = oscillators.indexOf('macd');
      const topMargin = mainChartHeight + (macdIndex * paneHeight);
      const bottomMargin = 1.0 - (topMargin + paneHeight);

      // Create MACD line series
      if (!macdLineRef.current) {
        macdLineRef.current = chartRef.current.addLineSeries({
          color: indicators.macd.macdColor || '#3B82F6',
          lineWidth: (indicators.macd.lineWidth || 2) as any,
          lineStyle: (indicators.macd.lineStyle || 0) as any,
          title: 'MACD',
          priceScaleId: 'macd',
        });
        macdLineRef.current.priceScale().applyOptions({
          scaleMargins: {
            top: topMargin,
            bottom: bottomMargin,
          },
        });
      } else {
        macdLineRef.current.applyOptions({
          color: indicators.macd.macdColor || '#3B82F6',
          lineWidth: (indicators.macd.lineWidth || 2) as any,
          lineStyle: (indicators.macd.lineStyle || 0) as any,
        });
      }

      // Create MACD signal line
      if (!macdSignalRef.current) {
        macdSignalRef.current = chartRef.current.addLineSeries({
          color: indicators.macd.signalColor || '#F97316',
          lineWidth: (indicators.macd.lineWidth || 2) as any,
          lineStyle: (indicators.macd.lineStyle || 0) as any,
          title: 'Signal',
          priceScaleId: 'macd',
        });
      } else {
        macdSignalRef.current.applyOptions({
          color: indicators.macd.signalColor || '#F97316',
          lineWidth: (indicators.macd.lineWidth || 2) as any,
          lineStyle: (indicators.macd.lineStyle || 0) as any,
        });
      }

      // Create MACD histogram
      if (!macdHistogramRef.current) {
        macdHistogramRef.current = chartRef.current.addHistogramSeries({
          color: '#6B7280',
          priceScaleId: 'macd',
        });
      }

      // Create zero line
      if (!macdZeroRef.current) {
        macdZeroRef.current = chartRef.current.addLineSeries({
          color: '#9CA3AF',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'macd',
        });
      }

      // Format and set MACD data
      const formattedMacdLine: LineData[] = macdData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.macd,
      }));
      formattedMacdLine.sort((a, b) => (a.time as number) - (b.time as number));
      macdLineRef.current.setData(formattedMacdLine);

      const formattedSignalLine: LineData[] = macdData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.signal,
      }));
      formattedSignalLine.sort((a, b) => (a.time as number) - (b.time as number));
      macdSignalRef.current.setData(formattedSignalLine);

      const formattedHistogram: HistogramData[] = macdData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.histogram,
        color: item.histogram >= 0 ? '#22C55E80' : '#EF444480',
      }));
      formattedHistogram.sort((a, b) => (a.time as number) - (b.time as number));
      macdHistogramRef.current.setData(formattedHistogram);

      // Set zero line
      const zeroLineData = allData.map((item) => ({
        time: (new Date(item.timestamp).getTime() / 1000) as any,
        value: 0,
      }));
      macdZeroRef.current.setData(zeroLineData);
    } else {
      // Remove MACD series if disabled
      if (macdLineRef.current && chartRef.current) {
        chartRef.current.removeSeries(macdLineRef.current);
        macdLineRef.current = null;
      }
      if (macdSignalRef.current && chartRef.current) {
        chartRef.current.removeSeries(macdSignalRef.current);
        macdSignalRef.current = null;
      }
      if (macdHistogramRef.current && chartRef.current) {
        chartRef.current.removeSeries(macdHistogramRef.current);
        macdHistogramRef.current = null;
      }
      if (macdZeroRef.current && chartRef.current) {
        chartRef.current.removeSeries(macdZeroRef.current);
        macdZeroRef.current = null;
      }
    }

    // Handle Stochastic indicator
    if (indicators?.stochastic.enabled && indicatorResults.stochastic.length > 0) {
      const stochData = indicatorResults.stochastic;
      const stochIndex = oscillators.indexOf('stochastic');
      const topMargin = mainChartHeight + (stochIndex * paneHeight);
      const bottomMargin = 1.0 - (topMargin + paneHeight);

      // Create %K line series
      if (!stochKRef.current) {
        stochKRef.current = chartRef.current.addLineSeries({
          color: indicators.stochastic.kColor || '#EC4899',
          lineWidth: (indicators.stochastic.lineWidth || 2) as any,
          lineStyle: (indicators.stochastic.lineStyle || 0) as any,
          title: '%K',
          priceScaleId: 'stochastic',
        });
        stochKRef.current.priceScale().applyOptions({
          scaleMargins: {
            top: topMargin,
            bottom: bottomMargin,
          },
        });
      } else {
        stochKRef.current.applyOptions({
          color: indicators.stochastic.kColor || '#EC4899',
          lineWidth: (indicators.stochastic.lineWidth || 2) as any,
          lineStyle: (indicators.stochastic.lineStyle || 0) as any,
        });
      }

      // Create %D line series
      if (!stochDRef.current) {
        stochDRef.current = chartRef.current.addLineSeries({
          color: indicators.stochastic.dColor || '#F43F5E',
          lineWidth: (indicators.stochastic.lineWidth || 2) as any,
          lineStyle: (indicators.stochastic.lineStyle || 0) as any,
          title: '%D',
          priceScaleId: 'stochastic',
        });
      } else {
        stochDRef.current.applyOptions({
          color: indicators.stochastic.dColor || '#F43F5E',
          lineWidth: (indicators.stochastic.lineWidth || 2) as any,
          lineStyle: (indicators.stochastic.lineStyle || 0) as any,
        });
      }

      // Create reference lines
      if (!stochOversoldRef.current) {
        stochOversoldRef.current = chartRef.current.addLineSeries({
          color: '#EF4444',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'stochastic',
        });
      }
      if (!stochMidlineRef.current) {
        stochMidlineRef.current = chartRef.current.addLineSeries({
          color: '#9CA3AF',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'stochastic',
        });
      }
      if (!stochOverboughtRef.current) {
        stochOverboughtRef.current = chartRef.current.addLineSeries({
          color: '#22C55E',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'stochastic',
        });
      }

      // Format and set Stochastic data
      const formattedKData: LineData[] = stochData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.k,
      }));
      formattedKData.sort((a, b) => (a.time as number) - (b.time as number));
      stochKRef.current.setData(formattedKData);

      const formattedDData: LineData[] = stochData.map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as any,
        value: item.d,
      }));
      formattedDData.sort((a, b) => (a.time as number) - (b.time as number));
      stochDRef.current.setData(formattedDData);

      // Set reference lines (20, 50, 80)
      const refLineData = allData.map((item) => ({
        time: (new Date(item.timestamp).getTime() / 1000) as any,
      }));
      
      stochOversoldRef.current.setData(refLineData.map(d => ({ ...d, value: 20 })));
      stochMidlineRef.current.setData(refLineData.map(d => ({ ...d, value: 50 })));
      stochOverboughtRef.current.setData(refLineData.map(d => ({ ...d, value: 80 })));
    } else {
      // Remove Stochastic series if disabled
      if (stochKRef.current && chartRef.current) {
        chartRef.current.removeSeries(stochKRef.current);
        stochKRef.current = null;
      }
      if (stochDRef.current && chartRef.current) {
        chartRef.current.removeSeries(stochDRef.current);
        stochDRef.current = null;
      }
      if (stochOversoldRef.current && chartRef.current) {
        chartRef.current.removeSeries(stochOversoldRef.current);
        stochOversoldRef.current = null;
      }
      if (stochMidlineRef.current && chartRef.current) {
        chartRef.current.removeSeries(stochMidlineRef.current);
        stochMidlineRef.current = null;
      }
      if (stochOverboughtRef.current && chartRef.current) {
        chartRef.current.removeSeries(stochOverboughtRef.current);
        stochOverboughtRef.current = null;
      }
    }

    // Re-fit content after adding/removing indicators
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [allData, indicators, indicatorResults]);

  // Handle comparison series
  useEffect(() => {
    if (!chartRef.current || !comparisonSeries || comparisonSeries.length === 0) {
      // Remove all comparison series if none provided
      comparisonSeriesRefs.current.forEach((series, _symbol) => {
        if (chartRef.current) {
          chartRef.current.removeSeries(series);
        }
      });
      comparisonSeriesRefs.current.clear();
      return;
    }

    // Get current series symbols
    const currentSymbols = new Set(comparisonSeriesRefs.current.keys());
    const newSymbols = new Set(comparisonSeries.map(s => s.symbol));

    // Remove series that are no longer in the comparison list
    currentSymbols.forEach(symbol => {
      if (!newSymbols.has(symbol)) {
        const series = comparisonSeriesRefs.current.get(symbol);
        if (series && chartRef.current) {
          chartRef.current.removeSeries(series);
          comparisonSeriesRefs.current.delete(symbol);
        }
      }
    });

    // Add or update comparison series
    comparisonSeries.forEach((compSeries) => {
      if (compSeries.data.length === 0) return;

      let lineSeries = comparisonSeriesRefs.current.get(compSeries.symbol);

      // Create series if it doesn't exist
      if (!lineSeries && chartRef.current) {
        lineSeries = chartRef.current.addLineSeries({
          color: compSeries.color,
          lineWidth: 2,
          title: compSeries.symbol,
        });
        comparisonSeriesRefs.current.set(compSeries.symbol, lineSeries);
      }

      // Update series data and options
      if (lineSeries) {
        lineSeries.applyOptions({
          color: compSeries.color,
          lineWidth: 2,
        });

        // Format data for lightweight-charts
        const formattedData: LineData[] = compSeries.data.map((item) => ({
          time: item.time as any,
          value: item.value,
        }));

        // Sort by time ascending
        formattedData.sort((a, b) => (a.time as number) - (b.time as number));
        lineSeries.setData(formattedData);
      }
    });

    // Re-fit content after adding/removing comparison series
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [comparisonSeries]);

  return (
    <div className="w-full relative">
      <div className="mb-2 flex items-center justify-between">
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {symbol}
        </h2>
        {isLoadingMore && (
          <div className="flex items-center text-sm" style={{ color: 'var(--accent)' }}>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading more data...
          </div>
        )}
      </div>
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg shadow-sm"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
      />
    </div>
  );
});

export default Chart;
