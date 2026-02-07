import { useState, useCallback, memo } from 'react';
import {
  ComparisonMode,
  ComparisonSymbol,
  DEFAULT_COMPARISON_COLORS,
  MAX_COMPARISON_SYMBOLS,
} from '../types/comparison';

interface SymbolComparisonPanelProps {
  /** List of comparison symbols */
  symbols: ComparisonSymbol[];
  /** Current comparison mode */
  mode: ComparisonMode;
  /** Base symbol for relative calculations */
  baseSymbol: string;
  /** Callback when a symbol is added */
  onAddSymbol: (symbol: string) => void;
  /** Callback when a symbol is removed */
  onRemoveSymbol: (symbol: string) => void;
  /** Callback when symbol visibility is toggled */
  onToggleVisibility: (symbol: string) => void;
  /** Callback when symbol color is changed */
  onColorChange: (symbol: string, color: string) => void;
  /** Callback when comparison mode is changed */
  onModeChange: (mode: ComparisonMode) => void;
  /** Callback when base symbol is changed */
  onBaseSymbolChange: (symbol: string) => void;
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onToggleCollapse?: () => void;
}

/**
 * SymbolComparisonPanel Component
 * Panel for managing symbol comparison settings
 */
const SymbolComparisonPanel = memo(function SymbolComparisonPanel({
  symbols,
  mode,
  baseSymbol,
  onAddSymbol,
  onRemoveSymbol,
  onToggleVisibility,
  onColorChange,
  onModeChange,
  onBaseSymbolChange,
  isCollapsed = false,
  onToggleCollapse,
}: SymbolComparisonPanelProps) {
  const [inputSymbol, setInputSymbol] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  /**
   * Handle adding a new symbol
   */
  const handleAddSymbol = useCallback(() => {
    const trimmedSymbol = inputSymbol.trim().toUpperCase();
    
    if (!trimmedSymbol) {
      return;
    }

    // Check if symbol already exists
    if (symbols.some((s) => s.symbol === trimmedSymbol)) {
      alert(`${trimmedSymbol} is already in the comparison list`);
      return;
    }

    // Check max symbols limit
    if (symbols.length >= MAX_COMPARISON_SYMBOLS) {
      alert(`Maximum ${MAX_COMPARISON_SYMBOLS} symbols allowed`);
      return;
    }

    onAddSymbol(trimmedSymbol);
    setInputSymbol('');
  }, [inputSymbol, symbols, onAddSymbol]);

  /**
   * Handle key press in input field
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleAddSymbol();
      }
    },
    [handleAddSymbol]
  );

  return (
    <div
      className="rounded-lg shadow"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <svg
            className="w-5 h-5"
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
          Symbol Comparison
        </h3>
        <button
          className="p-1 rounded hover:bg-opacity-80 transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${
              isCollapsed ? '' : 'rotate-180'
            }`}
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 pt-0 space-y-4">
          {/* Add Symbol Input */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add Symbol to Compare ({symbols.length}/{MAX_COMPARISON_SYMBOLS})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter symbol (e.g., MSFT)"
                maxLength={10}
                className="flex-1 px-3 py-2 rounded-md text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
                disabled={symbols.length >= MAX_COMPARISON_SYMBOLS}
              />
              <button
                onClick={handleAddSymbol}
                disabled={
                  !inputSymbol.trim() ||
                  symbols.length >= MAX_COMPARISON_SYMBOLS
                }
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) =>
                  !e.currentTarget.disabled &&
                  (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--accent)')
                }
              >
                Add
              </button>
            </div>
          </div>

          {/* Comparison Mode Selector */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Comparison Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onModeChange(ComparisonMode.ABSOLUTE)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === ComparisonMode.ABSOLUTE
                    ? 'text-white'
                    : ''
                }`}
                style={
                  mode === ComparisonMode.ABSOLUTE
                    ? { backgroundColor: 'var(--accent)' }
                    : {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                      }
                }
              >
                Absolute
              </button>
              <button
                onClick={() => onModeChange(ComparisonMode.PERCENTAGE_CHANGE)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === ComparisonMode.PERCENTAGE_CHANGE
                    ? 'text-white'
                    : ''
                }`}
                style={
                  mode === ComparisonMode.PERCENTAGE_CHANGE
                    ? { backgroundColor: 'var(--accent)' }
                    : {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                      }
                }
              >
                % Change
              </button>
              <button
                onClick={() => onModeChange(ComparisonMode.NORMALIZED)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === ComparisonMode.NORMALIZED
                    ? 'text-white'
                    : ''
                }`}
                style={
                  mode === ComparisonMode.NORMALIZED
                    ? { backgroundColor: 'var(--accent)' }
                    : {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                      }
                }
              >
                Normalized
              </button>
            </div>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {mode === ComparisonMode.ABSOLUTE &&
                'Show actual stock prices'}
              {mode === ComparisonMode.PERCENTAGE_CHANGE &&
                'Show percentage change from start date'}
              {mode === ComparisonMode.NORMALIZED &&
                'Normalize all symbols to start at 100'}
            </p>
          </div>

          {/* Symbol List */}
          {symbols.length > 0 && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Comparison Symbols
              </label>
              <div className="space-y-2">
                {symbols.map((symbol) => (
                  <div
                    key={symbol.symbol}
                    className="flex items-center gap-2 p-2 rounded-md"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    {/* Color Picker */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setColorPickerOpen(
                            colorPickerOpen === symbol.symbol
                              ? null
                              : symbol.symbol
                          )
                        }
                        className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: symbol.color }}
                        title="Change color"
                      />
                      {colorPickerOpen === symbol.symbol && (
                        <div className="absolute top-10 left-0 z-10 p-2 rounded-md shadow-lg"
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          <div className="grid grid-cols-5 gap-1">
                            {DEFAULT_COMPARISON_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  onColorChange(symbol.symbol, color);
                                  setColorPickerOpen(null);
                                }}
                                className="w-6 h-6 rounded border border-gray-300 hover:border-gray-600 transition-colors"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Symbol Name */}
                    <span
                      className="flex-1 font-medium text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {symbol.symbol}
                    </span>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => onToggleVisibility(symbol.symbol)}
                      className="p-1.5 rounded hover:bg-opacity-80 transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title={symbol.visible ? 'Hide' : 'Show'}
                    >
                      {symbol.visible ? (
                        <svg
                          className="w-4 h-4"
                          style={{ color: 'var(--text-primary)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          style={{ color: 'var(--text-tertiary)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => onRemoveSymbol(symbol.symbol)}
                      className="p-1.5 rounded hover:bg-red-100 transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      title="Remove symbol"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Base Symbol Selector (for percentage mode) */}
          {mode === ComparisonMode.PERCENTAGE_CHANGE && symbols.length > 0 && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Base Symbol (for relative calculations)
              </label>
              <select
                value={baseSymbol}
                onChange={(e) => onBaseSymbolChange(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                {symbols.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Empty State */}
          {symbols.length === 0 && (
            <div
              className="text-center py-6 rounded-md"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px dashed var(--border-primary)',
              }}
            >
              <svg
                className="mx-auto h-10 w-10 mb-2"
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
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Add symbols above to start comparing
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SymbolComparisonPanel;
