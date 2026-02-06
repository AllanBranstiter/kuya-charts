import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData } from 'lightweight-charts';
import { OHLCVData } from '../types/stock';
import { IndicatorConfig } from './IndicatorControls';
import { calculateSMA, calculateEMA, formatVolumeData } from '../utils/indicators';

interface ChartProps {
  data: OHLCVData[];
  symbol: string;
  indicators?: IndicatorConfig;
}

export default function Chart({ data, symbol, indicators }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    seriesRef.current = candlestickSeries;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart data when data prop changes
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    // Convert OHLCV data to lightweight-charts format
    const chartData: CandlestickData[] = data.map((item) => ({
      time: (new Date(item.timestamp).getTime() / 1000) as any, // Convert to Unix timestamp in seconds
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // Sort by time ascending
    chartData.sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(chartData);

    // Fit content to visible area
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Update indicators when data or indicator config changes
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Handle SMA indicator
    if (indicators?.sma.enabled) {
      // Create SMA series if it doesn't exist
      if (!smaSeriesRef.current) {
        smaSeriesRef.current = chartRef.current.addLineSeries({
          color: '#2962FF',
          lineWidth: 2,
          title: `SMA(${indicators.sma.period})`,
        });
      }

      // Calculate and set SMA data
      const smaData = calculateSMA(data, indicators.sma.period);
      const formattedSmaData: LineData[] = smaData.map((item) => ({
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
    if (indicators?.ema.enabled) {
      // Create EMA series if it doesn't exist
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = chartRef.current.addLineSeries({
          color: '#FF6D00',
          lineWidth: 2,
          title: `EMA(${indicators.ema.period})`,
        });
      }

      // Calculate and set EMA data
      const emaData = calculateEMA(data, indicators.ema.period);
      const formattedEmaData: LineData[] = emaData.map((item) => ({
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
    if (indicators?.volume.enabled) {
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

      // Format and set volume data
      const volumeData = formatVolumeData(data);
      const formattedVolumeData: HistogramData[] = volumeData.map((item) => ({
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

    // Re-fit content after adding/removing indicators
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, indicators]);

  return (
    <div className="w-full">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-800">{symbol}</h2>
      </div>
      <div
        ref={chartContainerRef}
        className="w-full bg-white border border-gray-200 rounded-lg shadow-sm"
      />
    </div>
  );
}
