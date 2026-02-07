import { memo } from 'react';
import { ComparisonSeries, ComparisonMode } from '../types/comparison';

interface ComparisonLegendProps {
  /** Array of comparison series to display */
  series: ComparisonSeries[];
  /** Current comparison mode */
  mode: ComparisonMode;
  /** Callback when a symbol visibility is toggled */
  onToggleVisibility?: (symbol: string) => void;
  /** Class name for styling */
  className?: string;
}

/**
 * ComparisonLegend Component
 * Displays a legend showing all compared symbols with their current values and changes
 */
const ComparisonLegend = memo(function ComparisonLegend({
  series,
  mode,
  onToggleVisibility,
  className = '',
}: ComparisonLegendProps) {
  if (!series || series.length === 0) {
    return null;
  }

  /**
   * Format value based on comparison mode
   */
  const formatValue = (value: number | undefined, mode: ComparisonMode): string => {
    if (value === undefined) return 'N/A';

    switch (mode) {
      case ComparisonMode.ABSOLUTE:
        return `$${value.toFixed(2)}`;
      case ComparisonMode.PERCENTAGE_CHANGE:
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      case ComparisonMode.NORMALIZED:
        return value.toFixed(2);
      default:
        return value.toFixed(2);
    }
  };

  /**
   * Format percentage change
   */
  const formatChange = (change: number | undefined): string => {
    if (change === undefined) return '';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  /**
   * Get color class for change value
   */
  const getChangeColor = (change: number | undefined): string => {
    if (change === undefined) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div
      className={`flex flex-wrap gap-3 items-center ${className}`}
      style={{
        padding: '12px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
      }}
    >
      {series.map((s) => (
        <div
          key={s.symbol}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer hover:bg-opacity-80"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            minWidth: '140px',
          }}
          onClick={() => onToggleVisibility?.(s.symbol)}
          title={`Click to toggle ${s.symbol} visibility`}
        >
          {/* Color indicator */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: s.color }}
          />

          {/* Symbol and values */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.symbol}
              </span>
              {s.isBase && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                  }}
                >
                  Base
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {formatValue(s.currentValue, mode)}
              </span>

              {s.changePercent !== undefined && (
                <span className={`text-xs font-medium ${getChangeColor(s.changePercent)}`}>
                  {formatChange(s.changePercent)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Mode indicator */}
      <div
        className="ml-auto px-3 py-2 rounded-md text-xs font-medium"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        Mode:{' '}
        {mode === ComparisonMode.ABSOLUTE && 'Absolute'}
        {mode === ComparisonMode.PERCENTAGE_CHANGE && '% Change'}
        {mode === ComparisonMode.NORMALIZED && 'Normalized'}
      </div>
    </div>
  );
});

export default ComparisonLegend;
