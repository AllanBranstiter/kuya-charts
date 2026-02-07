import { useState, useCallback, memo } from 'react';
import ChartPane from './ChartPane';
import {
  ChartLayout,
  ChartPaneConfig,
  getGridDimensions,
} from '../types/layout';
import { Timeframe } from '../types/stock';

interface MultiChartContainerProps {
  layout: ChartLayout;
  panes: ChartPaneConfig[];
  liveUpdatesEnabled: boolean;
  onPaneUpdate: (paneId: string, updates: Partial<ChartPaneConfig>) => void;
}

/**
 * Multi-Chart Container Component
 * Manages multiple chart panes in a grid layout
 */
const MultiChartContainer = memo(function MultiChartContainer({
  layout,
  panes,
  liveUpdatesEnabled,
  onPaneUpdate,
}: MultiChartContainerProps) {
  const [activePaneId, setActivePaneId] = useState<string>(panes[0]?.id || '');

  // Get grid dimensions for current layout
  const { rows, cols } = getGridDimensions(layout);

  // Handle pane activation
  const handlePaneActivate = useCallback((paneId: string) => {
    setActivePaneId(paneId);
  }, []);

  // Handle symbol change for a specific pane
  const handleSymbolChange = useCallback(
    (paneId: string, symbol: string) => {
      onPaneUpdate(paneId, { symbol });
    },
    [onPaneUpdate]
  );

  // Handle timeframe change for a specific pane
  const handleTimeframeChange = useCallback(
    (paneId: string, timeframe: Timeframe) => {
      onPaneUpdate(paneId, { timeframe });
    },
    [onPaneUpdate]
  );

  // Generate CSS Grid template based on layout
  const gridStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '1rem',
    minHeight: layout === ChartLayout.SINGLE ? '600px' : '500px',
  };

  return (
    <div
      className="w-full"
      style={gridStyle}
    >
      {panes.map((pane) => (
        <ChartPane
          key={pane.id}
          paneId={pane.id}
          symbol={pane.symbol}
          timeframe={pane.timeframe}
          indicators={pane.indicators}
          isActive={activePaneId === pane.id}
          liveUpdatesEnabled={liveUpdatesEnabled}
          onSymbolChange={(symbol) => handleSymbolChange(pane.id, symbol)}
          onTimeframeChange={(timeframe) =>
            handleTimeframeChange(pane.id, timeframe)
          }
          onActivate={() => handlePaneActivate(pane.id)}
        />
      ))}
    </div>
  );
});

export default MultiChartContainer;
