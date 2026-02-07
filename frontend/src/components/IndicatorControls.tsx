import React, { useState } from 'react';

export interface IndicatorConfig {
  sma: {
    enabled: boolean;
    period: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: number; // 0 = solid, 1 = dotted, 2 = dashed
  };
  ema: {
    enabled: boolean;
    period: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  volume: {
    enabled: boolean;
  };
  bollingerBands: {
    enabled: boolean;
    period: number;
    stdDev: number;
    upperColor?: string;
    middleColor?: string;
    lowerColor?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  vwap: {
    enabled: boolean;
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  pivotPoints: {
    enabled: boolean;
    pivotColor?: string;
    resistanceColor?: string;
    supportColor?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  rsi: {
    enabled: boolean;
    period: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  macd: {
    enabled: boolean;
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    macdColor?: string;
    signalColor?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  stochastic: {
    enabled: boolean;
    kPeriod: number;
    dPeriod: number;
    smoothK: number;
    kColor?: string;
    dColor?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
}

interface IndicatorControlsProps {
  config: IndicatorConfig;
  onChange: (config: IndicatorConfig) => void;
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (presetId: string) => void;
  onDeletePreset?: (presetId: string) => void;
  onResetToDefaults?: () => void;
  presets?: Array<{ id: string; name: string; isDefault: boolean }>;
  currentPresetId?: string | null;
}

export const IndicatorControls: React.FC<IndicatorControlsProps> = ({
  config,
  onChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onResetToDefaults,
  presets = [],
  currentPresetId = null,
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    overlays: true,
    oscillators: true,
  });
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>(currentPresetId || '');
  const [isOpen, setIsOpen] = useState(false); // Mobile collapse state

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSavePreset = () => {
    if (newPresetName.trim() && onSavePreset) {
      onSavePreset(newPresetName.trim());
      setNewPresetName('');
      setShowPresetDialog(false);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (onLoadPreset) {
      onLoadPreset(presetId);
    }
  };

  const handleDeletePreset = (presetId: string) => {
    if (onDeletePreset && window.confirm('Are you sure you want to delete this preset?')) {
      onDeletePreset(presetId);
      if (selectedPreset === presetId) {
        setSelectedPreset('');
      }
    }
  };

  // Generic update function for indicator configuration
  const updateIndicator = <K extends keyof IndicatorConfig>(
    indicator: K,
    updates: Partial<IndicatorConfig[K]>
  ) => {
    onChange({
      ...config,
      [indicator]: {
        ...config[indicator],
        ...updates,
      },
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header with Toggle Button (Mobile) */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Technical Indicators
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle indicators"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Controls Container - Hidden on mobile unless toggled */}
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block p-4 space-y-4`}>
        {/* Preset Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setShowPresetDialog(true)}
              className="flex-1 sm:flex-initial px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors min-h-[44px]"
              title="Save current configuration as preset"
            >
              Save Preset
            </button>
            {onResetToDefaults && (
              <button
                onClick={onResetToDefaults}
                className="flex-1 sm:flex-initial px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors min-h-[44px]"
                title="Reset all indicators to default values"
              >
                Reset
              </button>
            )}
          </div>
        </div>

      {/* Preset Selector */}
      {presets.length > 0 && (
        <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Load Preset
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPreset}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Select Preset --</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} {preset.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {selectedPreset && !presets.find(p => p.id === selectedPreset)?.isDefault && (
              <button
                onClick={() => handleDeletePreset(selectedPreset)}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Delete selected preset"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Preset
            </h3>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Enter preset name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPresetDialog(false);
                  setNewPresetName('');
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays Section */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('overlays')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">
            Overlays
          </h4>
          <span className="text-gray-500">
            {expandedSections.overlays ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.overlays && (
          <div className="space-y-4 pl-2">
            {/* SMA */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sma-enabled"
                  checked={config.sma.enabled}
                  onChange={(e) => updateIndicator('sma', { enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="sma-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  SMA (Simple Moving Average)
                </label>
              </div>
              {config.sma.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor="sma-period" className="text-sm text-gray-600 dark:text-gray-400">
                        Period:
                      </label>
                      <input
                        type="number"
                        id="sma-period"
                        min="1"
                        max="200"
                        value={config.sma.period}
                        onChange={(e) => {
                          const period = parseInt(e.target.value, 10);
                          if (period > 0) updateIndicator('sma', { period });
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="sma-color" className="text-sm text-gray-600 dark:text-gray-400">
                        Color:
                      </label>
                      <input
                        type="color"
                        id="sma-color"
                        value={config.sma.color || '#2962FF'}
                        onChange={(e) => updateIndicator('sma', { color: e.target.value })}
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* EMA */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ema-enabled"
                  checked={config.ema.enabled}
                  onChange={(e) => updateIndicator('ema', { enabled: e.target.checked })}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
                <label htmlFor="ema-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  EMA (Exponential Moving Average)
                </label>
              </div>
              {config.ema.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor="ema-period" className="text-sm text-gray-600 dark:text-gray-400">
                        Period:
                      </label>
                      <input
                        type="number"
                        id="ema-period"
                        min="1"
                        max="200"
                        value={config.ema.period}
                        onChange={(e) => {
                          const period = parseInt(e.target.value, 10);
                          if (period > 0) updateIndicator('ema', { period });
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="ema-color" className="text-sm text-gray-600 dark:text-gray-400">
                        Color:
                      </label>
                      <input
                        type="color"
                        id="ema-color"
                        value={config.ema.color || '#FF6D00'}
                        onChange={(e) => updateIndicator('ema', { color: e.target.value })}
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bollinger Bands */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bollinger-enabled"
                  checked={config.bollingerBands.enabled}
                  onChange={(e) => updateIndicator('bollingerBands', { enabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <label htmlFor="bollinger-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  Bollinger Bands
                </label>
              </div>
              {config.bollingerBands.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label htmlFor="bollinger-period" className="text-sm text-gray-600 dark:text-gray-400">
                        Period:
                      </label>
                      <input
                        type="number"
                        id="bollinger-period"
                        min="1"
                        max="200"
                        value={config.bollingerBands.period}
                        onChange={(e) => {
                          const period = parseInt(e.target.value, 10);
                          if (period > 0) updateIndicator('bollingerBands', { period });
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="bollinger-stddev" className="text-sm text-gray-600 dark:text-gray-400">
                        Std Dev:
                      </label>
                      <input
                        type="number"
                        id="bollinger-stddev"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={config.bollingerBands.stdDev}
                        onChange={(e) => {
                          const stdDev = parseFloat(e.target.value);
                          if (stdDev > 0) updateIndicator('bollingerBands', { stdDev });
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Colors:</span>
                    <label className="flex items-center gap-1">
                      <span>Upper</span>
                      <input
                        type="color"
                        value={config.bollingerBands.upperColor || '#9333EA'}
                        onChange={(e) => updateIndicator('bollingerBands', { upperColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Middle</span>
                      <input
                        type="color"
                        value={config.bollingerBands.middleColor || '#A855F7'}
                        onChange={(e) => updateIndicator('bollingerBands', { middleColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Lower</span>
                      <input
                        type="color"
                        value={config.bollingerBands.lowerColor || '#C084FC'}
                        onChange={(e) => updateIndicator('bollingerBands', { lowerColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* VWAP */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vwap-enabled"
                  checked={config.vwap.enabled}
                  onChange={(e) => updateIndicator('vwap', { enabled: e.target.checked })}
                  className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                />
                <label htmlFor="vwap-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  VWAP (Volume Weighted Average Price)
                </label>
              </div>
              {config.vwap.enabled && (
                <div className="ml-6 flex items-center gap-2">
                  <label htmlFor="vwap-color" className="text-sm text-gray-600 dark:text-gray-400">
                    Color:
                  </label>
                  <input
                    type="color"
                    id="vwap-color"
                    value={config.vwap.color || '#14B8A6'}
                    onChange={(e) => updateIndicator('vwap', { color: e.target.value })}
                    className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Pivot Points */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pivot-enabled"
                  checked={config.pivotPoints.enabled}
                  onChange={(e) => updateIndicator('pivotPoints', { enabled: e.target.checked })}
                  className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                />
                <label htmlFor="pivot-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  Pivot Points
                </label>
              </div>
              {config.pivotPoints.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-gray-600 dark:text-gray-400">Colors:</span>
                    <label className="flex items-center gap-1">
                      <span>Pivot</span>
                      <input
                        type="color"
                        value={config.pivotPoints.pivotColor || '#EAB308'}
                        onChange={(e) => updateIndicator('pivotPoints', { pivotColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Resistance</span>
                      <input
                        type="color"
                        value={config.pivotPoints.resistanceColor || '#22C55E'}
                        onChange={(e) => updateIndicator('pivotPoints', { resistanceColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Support</span>
                      <input
                        type="color"
                        value={config.pivotPoints.supportColor || '#EF4444'}
                        onChange={(e) => updateIndicator('pivotPoints', { supportColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Standard method (resets daily)
                  </div>
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="volume-enabled"
                  checked={config.volume.enabled}
                  onChange={(e) => updateIndicator('volume', { enabled: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="volume-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  Volume
                </label>
              </div>
              {config.volume.enabled && (
                <div className="ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Displayed in separate pane below chart
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Oscillators Section */}
      <div className="space-y-3 pt-3 border-t border-gray-300 dark:border-gray-600">
        <button
          onClick={() => toggleSection('oscillators')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">
            Oscillators (Separate Panes)
          </h4>
          <span className="text-gray-500">
            {expandedSections.oscillators ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.oscillators && (
          <div className="space-y-4 pl-2">
            {/* RSI */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rsi-enabled"
                  checked={config.rsi.enabled}
                  onChange={(e) => updateIndicator('rsi', { enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
                <label htmlFor="rsi-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  RSI (Relative Strength Index)
                </label>
              </div>
              {config.rsi.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor="rsi-period" className="text-sm text-gray-600 dark:text-gray-400">
                        Period:
                      </label>
                      <input
                        type="number"
                        id="rsi-period"
                        min="2"
                        max="50"
                        value={config.rsi.period}
                        onChange={(e) => {
                          const period = parseInt(e.target.value, 10);
                          if (period > 0) updateIndicator('rsi', { period });
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="rsi-color" className="text-sm text-gray-600 dark:text-gray-400">
                        Color:
                      </label>
                      <input
                        type="color"
                        id="rsi-color"
                        value={config.rsi.color || '#6366F1'}
                        onChange={(e) => updateIndicator('rsi', { color: e.target.value })}
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    30 (oversold) / 70 (overbought)
                  </div>
                </div>
              )}
            </div>

            {/* MACD */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="macd-enabled"
                  checked={config.macd.enabled}
                  onChange={(e) => updateIndicator('macd', { enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="macd-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  MACD (Moving Average Convergence Divergence)
                </label>
              </div>
              {config.macd.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label htmlFor="macd-fast" className="text-xs text-gray-600 dark:text-gray-400">
                        Fast:
                      </label>
                      <input
                        type="number"
                        id="macd-fast"
                        min="2"
                        max="50"
                        value={config.macd.fastPeriod}
                        onChange={(e) => {
                          const fastPeriod = parseInt(e.target.value, 10);
                          if (fastPeriod > 0) updateIndicator('macd', { fastPeriod });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label htmlFor="macd-slow" className="text-xs text-gray-600 dark:text-gray-400">
                        Slow:
                      </label>
                      <input
                        type="number"
                        id="macd-slow"
                        min="2"
                        max="100"
                        value={config.macd.slowPeriod}
                        onChange={(e) => {
                          const slowPeriod = parseInt(e.target.value, 10);
                          if (slowPeriod > 0) updateIndicator('macd', { slowPeriod });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label htmlFor="macd-signal" className="text-xs text-gray-600 dark:text-gray-400">
                        Signal:
                      </label>
                      <input
                        type="number"
                        id="macd-signal"
                        min="2"
                        max="50"
                        value={config.macd.signalPeriod}
                        onChange={(e) => {
                          const signalPeriod = parseInt(e.target.value, 10);
                          if (signalPeriod > 0) updateIndicator('macd', { signalPeriod });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <span>MACD</span>
                      <input
                        type="color"
                        value={config.macd.macdColor || '#3B82F6'}
                        onChange={(e) => updateIndicator('macd', { macdColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Signal</span>
                      <input
                        type="color"
                        value={config.macd.signalColor || '#F97316'}
                        onChange={(e) => updateIndicator('macd', { signalColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Stochastic */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stochastic-enabled"
                  checked={config.stochastic.enabled}
                  onChange={(e) => updateIndicator('stochastic', { enabled: e.target.checked })}
                  className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                />
                <label htmlFor="stochastic-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
                  Stochastic Oscillator
                </label>
              </div>
              {config.stochastic.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label htmlFor="stoch-k" className="text-xs text-gray-600 dark:text-gray-400">
                        %K:
                      </label>
                      <input
                        type="number"
                        id="stoch-k"
                        min="2"
                        max="50"
                        value={config.stochastic.kPeriod}
                        onChange={(e) => {
                          const kPeriod = parseInt(e.target.value, 10);
                          if (kPeriod > 0) updateIndicator('stochastic', { kPeriod });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label htmlFor="stoch-d" className="text-xs text-gray-600 dark:text-gray-400">
                        %D:
                      </label>
                      <input
                        type="number"
                        id="stoch-d"
                        min="2"
                        max="50"
                        value={config.stochastic.dPeriod}
                        onChange={(e) => {
                          const dPeriod = parseInt(e.target.value, 10);
                          if (dPeriod > 0) updateIndicator('stochastic', { dPeriod });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label htmlFor="stoch-smooth" className="text-xs text-gray-600 dark:text-gray-400">
                        Smooth:
                      </label>
                      <input
                        type="number"
                        id="stoch-smooth"
                        min="1"
                        max="10"
                        value={config.stochastic.smoothK}
                        onChange={(e) => {
                          const smoothK = parseInt(e.target.value, 10);
                          if (smoothK > 0) updateIndicator('stochastic', { smoothK });
                        }}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <span>%K</span>
                      <input
                        type="color"
                        value={config.stochastic.kColor || '#EC4899'}
                        onChange={(e) => updateIndicator('stochastic', { kColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>%D</span>
                      <input
                        type="color"
                        value={config.stochastic.dColor || '#F43F5E'}
                        onChange={(e) => updateIndicator('stochastic', { dColor: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="text-xs text-gray-500">
                    20 (oversold) / 80 (overbought)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
