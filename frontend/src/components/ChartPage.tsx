import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import Chart from './Chart';
import SymbolInput from './SymbolInput';
import TimeframeSelector from './TimeframeSelector';
import { IndicatorControls, IndicatorConfig } from './IndicatorControls';
import ThemeToggle from './ThemeToggle';
import AuthButton from './AuthButton';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import ChartConfigManager from './ChartConfigManager';
import { ConnectionStatusLabel } from './ConnectionStatusIndicator';
import DrawingToolPalette from './DrawingTools/DrawingToolPalette';
import AnnotationEditor, { AnnotationData } from './DrawingTools/AnnotationEditor';
import LayoutSwitcher from './LayoutSwitcher';
import MultiChartContainer from './MultiChartContainer';
import SymbolComparisonPanel from './SymbolComparisonPanel';
import ComparisonLegend from './ComparisonLegend';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRealtimePrice } from '../hooks/useWebSocket';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Timeframe, OHLCVData } from '../types/stock';
import { fetchDailyData, fetchIntradayData } from '../services/stockApi';
import {
  ComparisonMode,
  ComparisonSymbol,
  ComparisonSeries,
  DEFAULT_COMPARISON_COLORS,
  MAX_COMPARISON_SYMBOLS,
} from '../types/comparison';
import { createComparisonSeries, alignDataByTime } from '../utils/comparisonCalculations';
import {
  ChartLayout,
  ChartPaneConfig,
  createMultiChartLayout,
  getPaneCount,
} from '../types/layout';
import {
  getDefaultConfig,
  getDefaultPresets,
  loadConfig,
  saveConfig,
  loadPresets,
  savePresets,
  clearAllStorage,
  IndicatorPreset,
} from '../utils/presets';
import { useWatchlist } from '../hooks/useWatchlist';
import { ChartConfig, ChartConfigData } from '../types/chartConfig';
import { createChartConfig } from '../services/chartConfigApi';
import { DrawingType, DrawingTool, Annotation } from '../types/drawings';
import { DrawingManager, generateDrawingId } from '../utils/drawingManager';

export default function ChartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const [symbol, setSymbol] = useState<string>('');
  const [stockName] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showWatchlistToast, setShowWatchlistToast] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // Keyboard shortcuts help modal
  const [exportingChart, setExportingChart] = useState(false); // Chart export loading state
  const [showIndicators, setShowIndicators] = useState(true); // Toggle indicator panel visibility
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true); // Toggle live price updates
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null); // Price change flash animation
  
  // Chart config management
  const [showConfigManager, setShowConfigManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configToast, setConfigToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Drawing tools state
  const [activeTool, setActiveTool] = useState<DrawingType | null>(null);
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState('#2962FF');
  const [drawingLineWidth, setDrawingLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ time: number; price: number } | null>(null);
  
  // Annotation editor state
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [annotationCoord, setAnnotationCoord] = useState<{ time: number; price: number } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  
  // Watchlist functionality
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const inWatchlist = symbol ? isInWatchlist(symbol) : false;
  
  // Indicator configuration state
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(getDefaultConfig());
  const [presets, setPresets] = useState<IndicatorPreset[]>(getDefaultPresets());
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  
  // Symbol comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(ComparisonMode.PERCENTAGE_CHANGE);
  const [comparisonSymbols, setComparisonSymbols] = useState<ComparisonSymbol[]>([]);
  const [comparisonBaseSymbol, setComparisonBaseSymbol] = useState<string>('');
  const [comparisonSeries, setComparisonSeries] = useState<ComparisonSeries[]>([]);
  const [, setLoadingComparison] = useState(false);
  
  // Multi-chart layout state
  const [currentLayout, setCurrentLayout] = useState<ChartLayout>(ChartLayout.SINGLE);
  const [chartPanes, setChartPanes] = useState<ChartPaneConfig[]>(() => {
    const initialLayout = createMultiChartLayout(ChartLayout.SINGLE, symbol, indicatorConfig);
    return initialLayout.panes;
  });

  // Real-time price updates
  const {
    price: livePrice,
    change: liveChange,
    changePercent: liveChangePercent,
    isConnected: wsConnected,
  } = useRealtimePrice(symbol, liveUpdatesEnabled);

  // Refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const prevPriceRef = useRef<number | undefined>(undefined);
  const drawingManagerRef = useRef<DrawingManager | null>(null);

  // Memoize presets list for IndicatorControls to prevent unnecessary re-renders
  const presetsList = useMemo(() => 
    presets.map(p => ({ id: p.id, name: p.name, isDefault: p.isDefault })),
    [presets]
  );

  // Load configuration and presets from localStorage on mount
  useEffect(() => {
    const loadedConfig = loadConfig();
    if (loadedConfig) {
      setIndicatorConfig(loadedConfig);
    }

    const loadedPresets = loadPresets();
    setPresets(loadedPresets);
  }, []);

  // Load symbol from URL query parameter
  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam && symbolParam !== symbol) {
      setSymbol(symbolParam);
      fetchChartData(symbolParam, timeframe);
    }
  }, [searchParams]);

  // Debounced auto-save to localStorage
  const debouncedSaveConfig = useCallback((config: IndicatorConfig) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveConfig(config);
    }, 500); // Save 500ms after last change
  }, []);

  // Memoize fetchChartData to prevent recreation
  const fetchChartData = useCallback(async (stockSymbol: string, selectedTimeframe: Timeframe) => {
    setLoading(true);
    setError('');
    setChartData([]);

    try {
      let response;

      // Determine which API endpoint to use based on timeframe
      if (selectedTimeframe === 'daily' || selectedTimeframe === 'weekly') {
        response = await fetchDailyData(stockSymbol);
      } else {
        // Map timeframe to API interval
        const intervalMap: Record<string, string> = {
          '15min': '15min',
          '30min': '30min',
          '1hour': '60min',
        };
        const interval = intervalMap[selectedTimeframe] || '60min';
        response = await fetchIntradayData(stockSymbol, interval);
      }

      if (response.data && response.data.length > 0) {
        // For weekly, we could implement aggregation here in the future
        // For now, we'll just use daily data
        setChartData(response.data);
      } else {
        setError('No data available for this symbol and timeframe');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
      setError(errorMessage);
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSymbolSubmit = useCallback(async (newSymbol: string) => {
    setSymbol(newSymbol);
    await fetchChartData(newSymbol, timeframe);
  }, [fetchChartData, timeframe]);

  const handleTimeframeChange = useCallback(async (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    if (symbol) {
      await fetchChartData(symbol, newTimeframe);
    }
  }, [symbol, fetchChartData]);

  const handleIndicatorConfigChange = useCallback((newConfig: IndicatorConfig) => {
    setIndicatorConfig(newConfig);
    setCurrentPresetId(null); // Clear preset selection when manually modifying
    debouncedSaveConfig(newConfig);
  }, [debouncedSaveConfig]);

  const handleSavePreset = useCallback((name: string) => {
    const newPreset: IndicatorPreset = {
      id: `custom-${Date.now()}`,
      name,
      config: { ...indicatorConfig },
      isDefault: false,
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    setCurrentPresetId(newPreset.id);
  }, [indicatorConfig, presets]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setIndicatorConfig(preset.config);
      setCurrentPresetId(presetId);
      saveConfig(preset.config);
    }
  }, [presets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    if (currentPresetId === presetId) {
      setCurrentPresetId(null);
    }
  }, [presets, currentPresetId]);

  const handleResetToDefaults = useCallback(() => {
    if (window.confirm('Reset all indicators to default values? This will clear your custom configuration.')) {
      const defaultConfig = getDefaultConfig();
      setIndicatorConfig(defaultConfig);
      setCurrentPresetId(null);
      clearAllStorage();
      saveConfig(defaultConfig);
      
      // Reset presets to defaults
      const defaultPresets = getDefaultPresets();
      setPresets(defaultPresets);
      savePresets(defaultPresets);
    }
  }, []);

  const handleToggleWatchlist = useCallback(() => {
    if (!symbol) return;

    if (inWatchlist) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol, stockName || symbol);
    }

    // Show toast notification
    setShowWatchlistToast(true);
    setTimeout(() => setShowWatchlistToast(false), 2000);
  }, [symbol, stockName, inWatchlist, addToWatchlist, removeFromWatchlist]);

  // Handle chart export as PNG
  const handleExportChart = useCallback(async () => {
    if (!chartContainerRef.current || !symbol || chartData.length === 0) {
      alert('No chart to export');
      return;
    }

    setExportingChart(true);
    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date();
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          link.download = `${symbol}_chart_${dateStr}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
        setExportingChart(false);
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Failed to export chart');
      setExportingChart(false);
    }
  }, [symbol, chartData]);

  // Serialize current chart state to config data
  const serializeChartConfig = useCallback((): ChartConfigData => {
    const serializedDrawings = drawingManagerRef.current?.serializeDrawings() || [];
    return {
      indicators: indicatorConfig,
      timeframe: timeframe,
      drawings: serializedDrawings,
    };
  }, [indicatorConfig, timeframe]);

  // Deserialize config data and apply to chart
  const deserializeChartConfig = useCallback((configData: ChartConfigData) => {
    if (configData.indicators) {
      setIndicatorConfig(configData.indicators);
      saveConfig(configData.indicators);
      setCurrentPresetId(null);
    }
    if (configData.timeframe && symbol) {
      handleTimeframeChange(configData.timeframe as Timeframe);
    }
    if (configData.drawings && drawingManagerRef.current) {
      drawingManagerRef.current.deserializeDrawings(configData.drawings);
      setDrawings(drawingManagerRef.current.getAllDrawings());
    }
  }, [symbol, handleTimeframeChange]);
  
  // Drawing tool handlers
  const handleChartClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingManagerRef.current || !chartContainerRef.current) return;
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If in select mode (no active tool), try to select a drawing
    if (activeTool === null) {
      const drawingId = drawingManagerRef.current.findDrawingAt(x, y);
      setSelectedDrawingId(drawingId);
      drawingManagerRef.current.selectDrawing(drawingId);
      return;
    }
    
    const coord = drawingManagerRef.current.coordinateFromScreen(x, y);
    if (!coord) return;
    
    // Handle different drawing types
    if (activeTool === DrawingType.HORIZONTAL_LINE) {
      const newDrawing: DrawingTool = {
        id: generateDrawingId(),
        type: DrawingType.HORIZONTAL_LINE,
        color: drawingColor,
        lineWidth: drawingLineWidth,
        price: coord.price,
      };
      drawingManagerRef.current.addDrawing(newDrawing);
      setDrawings(drawingManagerRef.current.getAllDrawings());
    } else if (activeTool === DrawingType.VERTICAL_LINE) {
      const newDrawing: DrawingTool = {
        id: generateDrawingId(),
        type: DrawingType.VERTICAL_LINE,
        color: drawingColor,
        lineWidth: drawingLineWidth,
        time: coord.time,
      };
      drawingManagerRef.current.addDrawing(newDrawing);
      setDrawings(drawingManagerRef.current.getAllDrawings());
    } else if (activeTool === DrawingType.TRENDLINE) {
      if (!isDrawing) {
        // Start drawing trendline
        setIsDrawing(true);
        setDrawingStart({ time: coord.time, price: coord.price });
      } else {
        // Finish drawing trendline
        if (drawingStart) {
          const newDrawing: DrawingTool = {
            id: generateDrawingId(),
            type: DrawingType.TRENDLINE,
            color: drawingColor,
            lineWidth: drawingLineWidth,
            startTime: drawingStart.time,
            startPrice: drawingStart.price,
            endTime: coord.time,
            endPrice: coord.price,
          };
          drawingManagerRef.current.addDrawing(newDrawing);
          setDrawings(drawingManagerRef.current.getAllDrawings());
        }
        setIsDrawing(false);
        setDrawingStart(null);
      }
    } else if (activeTool === DrawingType.ANNOTATION) {
      // Show annotation editor at click position
      setAnnotationPosition({ x: e.clientX, y: e.clientY });
      setAnnotationCoord({ time: coord.time, price: coord.price });
      setEditingAnnotation(null);
      setShowAnnotationEditor(true);
    }
  }, [activeTool, drawingColor, drawingLineWidth, isDrawing, drawingStart]);
  
  // Handle double-click to edit annotation
  const handleChartDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingManagerRef.current || !chartContainerRef.current) return;
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find if we double-clicked on a drawing
    const drawingId = drawingManagerRef.current.findDrawingAt(x, y);
    if (drawingId) {
      const drawing = drawingManagerRef.current.getDrawing(drawingId);
      
      // Only allow editing annotations
      if (drawing && drawing.type === DrawingType.ANNOTATION) {
        setAnnotationPosition({ x: e.clientX, y: e.clientY });
        setAnnotationCoord({ time: (drawing as Annotation).time, price: (drawing as Annotation).price });
        setEditingAnnotation(drawing as Annotation);
        setShowAnnotationEditor(true);
      }
    }
  }, []);
  
  // Handle annotation save
  const handleSaveAnnotation = useCallback((data: AnnotationData) => {
    if (!drawingManagerRef.current || !annotationCoord) return;
    
    if (editingAnnotation) {
      // Update existing annotation
      const updatedAnnotation: Annotation = {
        ...editingAnnotation,
        text: data.text,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        fontSize: data.fontSize,
        style: data.style,
      };
      drawingManagerRef.current.updateDrawing(editingAnnotation.id, updatedAnnotation);
    } else {
      // Create new annotation
      const newAnnotation: Annotation = {
        id: generateDrawingId(),
        type: DrawingType.ANNOTATION,
        color: drawingColor,
        lineWidth: drawingLineWidth,
        time: annotationCoord.time,
        price: annotationCoord.price,
        text: data.text,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        fontSize: data.fontSize,
        style: data.style,
        icon: data.style,
      };
      drawingManagerRef.current.addDrawing(newAnnotation);
    }
    
    setDrawings(drawingManagerRef.current.getAllDrawings());
    setShowAnnotationEditor(false);
    setEditingAnnotation(null);
    setAnnotationCoord(null);
  }, [annotationCoord, editingAnnotation, drawingColor, drawingLineWidth]);
  
  // Handle annotation cancel
  const handleCancelAnnotation = useCallback(() => {
    setShowAnnotationEditor(false);
    setEditingAnnotation(null);
    setAnnotationCoord(null);
  }, []);
  
  const handleDeleteSelectedDrawing = useCallback(() => {
    if (selectedDrawingId && drawingManagerRef.current) {
      drawingManagerRef.current.deleteDrawing(selectedDrawingId);
      setDrawings(drawingManagerRef.current.getAllDrawings());
      setSelectedDrawingId(null);
    }
  }, [selectedDrawingId]);
  
  const handleClearAllDrawings = useCallback(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.clearDrawings();
      setDrawings([]);
      setSelectedDrawingId(null);
    }
  }, []);
  
  // Handle keyboard shortcuts for drawings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key to delete selected drawing
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        e.preventDefault();
        handleDeleteSelectedDrawing();
      }
      // Escape key to cancel drawing or deselect
      if (e.key === 'Escape') {
        if (isDrawing) {
          setIsDrawing(false);
          setDrawingStart(null);
        } else if (selectedDrawingId) {
          setSelectedDrawingId(null);
          drawingManagerRef.current?.selectDrawing(null);
        } else if (activeTool !== null) {
          setActiveTool(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, isDrawing, activeTool, handleDeleteSelectedDrawing]);

  // Handle saving configuration
  const handleSaveConfig = async () => {
    if (!newConfigName.trim()) {
      return;
    }

    if (!user) {
      setConfigToast({ message: 'Please login to save configurations', type: 'error' });
      setTimeout(() => setConfigToast(null), 3000);
      return;
    }

    setSavingConfig(true);
    try {
      const configData = serializeChartConfig();
      await createChartConfig(newConfigName.trim(), configData);
      
      setConfigToast({ message: 'Configuration saved successfully', type: 'success' });
      setNewConfigName('');
      setShowSaveDialog(false);
      setTimeout(() => setConfigToast(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setConfigToast({ message: errorMessage, type: 'error' });
      setTimeout(() => setConfigToast(null), 3000);
      console.error('Error saving chart config:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle loading configuration
  const handleLoadConfig = useCallback((config: ChartConfig) => {
    deserializeChartConfig(config.config_data);
    setConfigToast({ message: `Loaded "${config.config_name}"`, type: 'success' });
    setTimeout(() => setConfigToast(null), 3000);
  }, [deserializeChartConfig]);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: ChartLayout) => {
    const newPaneCount = getPaneCount(newLayout);
    const currentPaneCount = chartPanes.length;

    if (newPaneCount > currentPaneCount) {
      // Add new panes
      const newPanes = [...chartPanes];
      for (let i = currentPaneCount; i < newPaneCount; i++) {
        newPanes.push({
          id: `pane-${i}`,
          symbol: symbol || '',
          timeframe: timeframe,
          indicators: { ...indicatorConfig },
          drawings: [],
        });
      }
      setChartPanes(newPanes);
    } else if (newPaneCount < currentPaneCount) {
      // Remove excess panes
      setChartPanes(chartPanes.slice(0, newPaneCount));
    }

    setCurrentLayout(newLayout);
  }, [chartPanes, symbol, timeframe, indicatorConfig]);

  // Handle pane update
  const handlePaneUpdate = useCallback((paneId: string, updates: Partial<ChartPaneConfig>) => {
    setChartPanes(prevPanes =>
      prevPanes.map(pane =>
        pane.id === paneId ? { ...pane, ...updates } : pane
      )
    );
  }, []);

  // Comparison handlers
  const handleAddComparisonSymbol = useCallback(async (newSymbol: string) => {
    if (comparisonSymbols.length >= MAX_COMPARISON_SYMBOLS) {
      return;
    }

    const colorIndex = comparisonSymbols.length;
    const newComparisonSymbol: ComparisonSymbol = {
      symbol: newSymbol,
      color: DEFAULT_COMPARISON_COLORS[colorIndex % DEFAULT_COMPARISON_COLORS.length],
      visible: true,
      lineWidth: 2,
    };

    setComparisonSymbols(prev => [...prev, newComparisonSymbol]);
    
    // Set base symbol if not set
    if (!comparisonBaseSymbol && symbol) {
      setComparisonBaseSymbol(symbol);
    }

    // Fetch data for the new symbol
    setLoadingComparison(true);
    try {
      const response = await fetchDailyData(newSymbol);
      if (response.data && response.data.length > 0) {
        newComparisonSymbol.data = response.data;
        setComparisonSymbols(prev =>
          prev.map(s => s.symbol === newSymbol ? { ...s, data: response.data } : s)
        );
      }
    } catch (error) {
      console.error(`Error fetching data for ${newSymbol}:`, error);
    } finally {
      setLoadingComparison(false);
    }
  }, [comparisonSymbols, comparisonBaseSymbol, symbol]);

  const handleRemoveComparisonSymbol = useCallback((symbolToRemove: string) => {
    setComparisonSymbols(prev => prev.filter(s => s.symbol !== symbolToRemove));
  }, []);

  const handleToggleComparisonVisibility = useCallback((symbolToToggle: string) => {
    setComparisonSymbols(prev =>
      prev.map(s =>
        s.symbol === symbolToToggle ? { ...s, visible: !s.visible } : s
      )
    );
  }, []);

  const handleComparisonColorChange = useCallback((symbolToUpdate: string, newColor: string) => {
    setComparisonSymbols(prev =>
      prev.map(s =>
        s.symbol === symbolToUpdate ? { ...s, color: newColor } : s
      )
    );
  }, []);

  const handleComparisonModeChange = useCallback((newMode: ComparisonMode) => {
    setComparisonMode(newMode);
  }, []);

  const handleComparisonBaseSymbolChange = useCallback((newBaseSymbol: string) => {
    setComparisonBaseSymbol(newBaseSymbol);
  }, []);

  // Update comparison series when symbols, data, or mode changes
  useEffect(() => {
    if (!symbol || !chartData || chartData.length === 0 || comparisonSymbols.length === 0) {
      setComparisonSeries([]);
      return;
    }

    // Collect all datasets including base chart data
    const allDatasets: OHLCVData[][] = [chartData];
    const symbolsWithData = comparisonSymbols.filter(s => s.data && s.data.length > 0);

    symbolsWithData.forEach(s => {
      if (s.data) {
        allDatasets.push(s.data);
      }
    });

    // Align all datasets to common time points
    const alignedDatasets = alignDataByTime(allDatasets);
    if (alignedDatasets.length === 0) {
      setComparisonSeries([]);
      return;
    }

    // Create comparison series for base symbol
    const baseSeries = createComparisonSeries(
      symbol,
      alignedDatasets[0],
      comparisonMode,
      '#808080', // Gray for base symbol
      true
    );

    // Create comparison series for each comparison symbol
    const compSeries: ComparisonSeries[] = [baseSeries];
    symbolsWithData.forEach((compSymbol, index) => {
      if (compSymbol.visible && alignedDatasets[index + 1]) {
        const series = createComparisonSeries(
          compSymbol.symbol,
          alignedDatasets[index + 1],
          comparisonMode,
          compSymbol.color,
          false
        );
        compSeries.push(series);
      }
    });

    setComparisonSeries(compSeries);
  }, [symbol, chartData, comparisonSymbols, comparisonMode]);

  // Keyboard shortcuts handlers
  useKeyboardShortcuts({
    onToggleIndicators: () => setShowIndicators(prev => !prev),
    onExportChart: handleExportChart,
    onToggleTheme: toggleTheme,
    onShowHelp: () => setShowHelp(true),
  });

  // Handle price flash animation
  useEffect(() => {
    if (livePrice !== undefined && prevPriceRef.current !== undefined) {
      if (livePrice > prevPriceRef.current) {
        setPriceFlash('up');
      } else if (livePrice < prevPriceRef.current) {
        setPriceFlash('down');
      }
      
      // Clear flash after animation
      const timer = setTimeout(() => setPriceFlash(null), 1000);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = livePrice;
  }, [livePrice]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <header className="shadow" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Kuya Charts</h1>
               <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                 Professional Stock Charting • Press <kbd className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>?</kbd> for shortcuts
               </p>
             </div>
             {/* Layout Switcher */}
             <div className="hidden lg:block">
               <LayoutSwitcher
                 currentLayout={currentLayout}
                 onLayoutChange={handleLayoutChange}
               />
             </div>
             {symbol && chartData.length > 0 && (
               <div className="flex items-center gap-3">
                 <div className="flex flex-col items-start">
                   <div className="flex items-center gap-2">
                     <span className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{symbol}</span>
                     {liveUpdatesEnabled && wsConnected && livePrice && (
                       <span
                         className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold transition-colors ${
                           priceFlash === 'up' ? 'bg-green-500 text-white' :
                           priceFlash === 'down' ? 'bg-red-500 text-white' :
                           'bg-blue-100 text-blue-800'
                         }`}
                       >
                         LIVE
                       </span>
                     )}
                   </div>
                   {liveUpdatesEnabled && livePrice !== undefined && (
                     <div className="flex items-center gap-2 mt-1">
                       <span
                         className={`text-sm font-medium transition-colors ${
                           priceFlash === 'up' ? 'text-green-600' :
                           priceFlash === 'down' ? 'text-red-600' :
                           'text-gray-700'
                         }`}
                       >
                         ${livePrice.toFixed(2)}
                       </span>
                       {liveChange !== undefined && liveChangePercent !== undefined && (
                         <span
                           className={`text-xs font-medium ${
                             liveChange >= 0 ? 'text-green-600' : 'text-red-600'
                           }`}
                         >
                           {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(2)} (
                           {liveChange >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%)
                         </span>
                       )}
                     </div>
                   )}
                 </div>
                  <button
                    onClick={handleToggleWatchlist}
                    className="p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  >
                    {inWatchlist ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto flex-wrap">
              <ConnectionStatusLabel className="order-first sm:order-none" />
              <ThemeToggle />
              <button
                onClick={() => navigate('/watchlist')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm sm:text-base min-h-[44px]"
              >
                Watchlist
              </button>
              <button
                onClick={() => navigate('/screener')}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-white rounded-md transition-colors text-sm sm:text-base min-h-[44px]"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              >
                Screener
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Input Controls */}
            <div className="rounded-lg shadow p-4 sm:p-6" style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}>
              <div className="space-y-3 sm:space-y-4">
                <SymbolInput onSubmit={handleSymbolSubmit} disabled={loading} />
                <TimeframeSelector
                  selected={timeframe}
                  onChange={handleTimeframeChange}
                  disabled={loading || !symbol}
                />
              </div>
            </div>

            {/* Indicator Controls */}
            {chartData.length > 0 && !loading && !error && showIndicators && (
              <IndicatorControls
                config={indicatorConfig}
                onChange={handleIndicatorConfigChange}
                onSavePreset={handleSavePreset}
                onLoadPreset={handleLoadPreset}
                onDeletePreset={handleDeletePreset}
                onResetToDefaults={handleResetToDefaults}
                presets={presetsList}
                currentPresetId={currentPresetId}
              />
            )}

            {/* Drawing Tools */}
            {chartData.length > 0 && !loading && !error && (
              <DrawingToolPalette
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                selectedColor={drawingColor}
                onColorChange={setDrawingColor}
                lineWidth={drawingLineWidth}
                onLineWidthChange={setDrawingLineWidth}
                onDeleteSelected={handleDeleteSelectedDrawing}
                onClearAll={handleClearAllDrawings}
                hasSelectedDrawing={selectedDrawingId !== null}
                drawingCount={drawings.length}
              />
            )}

            {/* Symbol Comparison Panel */}
            {chartData.length > 0 && !loading && !error && showComparison && (
              <SymbolComparisonPanel
                symbols={comparisonSymbols}
                mode={comparisonMode}
                baseSymbol={comparisonBaseSymbol || symbol}
                onAddSymbol={handleAddComparisonSymbol}
                onRemoveSymbol={handleRemoveComparisonSymbol}
                onToggleVisibility={handleToggleComparisonVisibility}
                onColorChange={handleComparisonColorChange}
                onModeChange={handleComparisonModeChange}
                onBaseSymbolChange={handleComparisonBaseSymbolChange}
                isCollapsed={false}
              />
            )}

            {/* Loading State */}
            {loading && (
              <div className="rounded-lg shadow p-8 sm:p-12" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                  <p className="mt-4 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Loading chart data...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="rounded-lg p-4" style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)'
              }}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5"
                      style={{ color: 'var(--color-error)' }}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Error</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Chart or Single Chart Display */}
            {currentLayout !== ChartLayout.SINGLE ? (
              // Multi-Chart Layout
              <div className="rounded-lg shadow p-3 sm:p-4 lg:p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Multi-Chart View
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {/* Mobile Layout Switcher */}
                    <div className="lg:hidden w-full sm:w-auto">
                      <LayoutSwitcher
                        currentLayout={currentLayout}
                        onLayoutChange={handleLayoutChange}
                      />
                    </div>
                    <button
                      onClick={() => setLiveUpdatesEnabled(prev => !prev)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px] ${
                        liveUpdatesEnabled ? 'bg-green-600 text-white hover:bg-green-700' : ''
                      }`}
                      style={!liveUpdatesEnabled ? {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!liveUpdatesEnabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!liveUpdatesEnabled) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      title="Toggle live price updates"
                    >
                      {liveUpdatesEnabled ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          <span className="hidden sm:inline">Live Updates On</span>
                          <span className="sm:hidden">Live On</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="hidden sm:inline">Live Updates Off</span>
                          <span className="sm:hidden">Live Off</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <MultiChartContainer
                  layout={currentLayout}
                  panes={chartPanes}
                  liveUpdatesEnabled={liveUpdatesEnabled}
                  onPaneUpdate={handlePaneUpdate}
                />
              </div>
            ) : (
              // Single Chart Layout (Original)
              chartData.length > 0 && !loading && !error && (
                <div className="rounded-lg shadow p-3 sm:p-4 lg:p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {symbol} Chart
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      {/* Mobile Layout Switcher */}
                      <div className="lg:hidden w-full sm:w-auto">
                        <LayoutSwitcher
                          currentLayout={currentLayout}
                          onLayoutChange={handleLayoutChange}
                        />
                      </div>
                    <button
                      onClick={() => setLiveUpdatesEnabled(prev => !prev)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px] ${
                        liveUpdatesEnabled ? 'bg-green-600 text-white hover:bg-green-700' : ''
                      }`}
                      style={!liveUpdatesEnabled ? {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!liveUpdatesEnabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!liveUpdatesEnabled) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      title="Toggle live price updates"
                    >
                      {liveUpdatesEnabled ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          <span className="hidden sm:inline">Live Updates On</span>
                          <span className="sm:hidden">Live On</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="hidden sm:inline">Live Updates Off</span>
                          <span className="sm:hidden">Live Off</span>
                        </>
                      )}
                    </button>
                    {user && (
                      <>
                        <button
                          onClick={() => setShowSaveDialog(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px]"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-primary)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                          title="Save current configuration"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          <span className="hidden sm:inline">Save</span>
                        </button>
                        <button
                          onClick={() => setShowConfigManager(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px]"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-primary)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                          title="Load saved configuration"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="hidden sm:inline">Load</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowIndicators(prev => !prev)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      title="Toggle indicator panel (Space)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="hidden sm:inline">{showIndicators ? 'Hide' : 'Show'} Indicators</span>
                    </button>
                    <button
                      onClick={() => setShowComparison(prev => !prev)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm min-h-[44px] ${
                        showComparison ? 'text-white' : ''
                      }`}
                      style={showComparison ? {
                        backgroundColor: 'var(--accent)'
                      } : {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)'
                      }}
                      onMouseEnter={(e) => {
                        if (!showComparison) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!showComparison) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      title="Toggle symbol comparison"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="hidden sm:inline">Compare</span>
                    </button>
                    <button
                      onClick={handleExportChart}
                      disabled={exportingChart}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-white transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--accent)' }}
                      onMouseEnter={(e) => !exportingChart && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      title="Export chart as PNG (E)"
                    >
                      {exportingChart ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span className="hidden sm:inline">Export PNG</span>
                          <span className="sm:hidden">Export</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  ref={chartContainerRef}
                  onClick={handleChartClick}
                  onDoubleClick={handleChartDoubleClick}
                  style={{ cursor: activeTool !== null ? 'crosshair' : 'default' }}
                >
                  {/* Comparison Legend */}
                  {comparisonSeries.length > 0 && (
                    <div className="mb-4">
                      <ComparisonLegend
                        series={comparisonSeries}
                        mode={comparisonMode}
                        onToggleVisibility={handleToggleComparisonVisibility}
                      />
                    </div>
                  )}
                  
                  <Chart
                    data={chartData}
                    symbol={symbol}
                    indicators={indicatorConfig}
                    comparisonSeries={comparisonSeries}
                  />
                  </div>
                </div>
              )
            )}

            {/* Empty State */}
            {!loading && !error && chartData.length === 0 && !symbol && (
              <div className="rounded-lg shadow p-8 sm:p-12" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center">
                  <svg
                    className="mx-auto h-10 w-10 sm:h-12 sm:w-12"
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm sm:text-base font-medium" style={{ color: 'var(--text-primary)' }}>No chart data</h3>
                  <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Enter a stock symbol above to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Watchlist Toast Notification */}
      {showWatchlistToast && (
        <div className="fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in" style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)'
        }}>
          <svg className="w-5 h-5" style={{ color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {inWatchlist ? 'Added to watchlist' : 'Removed from watchlist'}
          </span>
        </div>
      )}

      {/* Config Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg p-6 max-w-md w-full" style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Save Chart Configuration
            </h3>
            <input
              type="text"
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
              placeholder="Enter configuration name"
              maxLength={100}
              className="w-full px-3 py-2 border rounded-md mb-4"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              onKeyPress={(e) => e.key === 'Enter' && !savingConfig && handleSaveConfig()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewConfigName('');
                }}
                disabled={savingConfig}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => !savingConfig && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!newConfigName.trim() || savingConfig}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingConfig ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Config Manager Modal */}
      <ChartConfigManager
        isOpen={showConfigManager}
        onClose={() => setShowConfigManager(false)}
        onLoadConfig={handleLoadConfig}
      />

      {/* Config Toast Notification */}
      {configToast && (
        <div className="fixed bottom-4 left-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in" style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)'
        }}>
          {configToast.type === 'success' ? (
            <svg className="w-5 h-5" style={{ color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" style={{ color: 'var(--color-error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{configToast.message}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Annotation Editor Modal */}
      <AnnotationEditor
        isOpen={showAnnotationEditor}
        initialData={editingAnnotation ? {
          text: editingAnnotation.text,
          backgroundColor: editingAnnotation.backgroundColor,
          textColor: editingAnnotation.textColor,
          fontSize: editingAnnotation.fontSize,
          style: editingAnnotation.style,
        } : undefined}
        position={annotationPosition}
        onSave={handleSaveAnnotation}
        onCancel={handleCancelAnnotation}
      />
    </div>
  );
}
