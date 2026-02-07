import { memo } from 'react';
import { ChartLayout } from '../types/layout';

interface LayoutSwitcherProps {
  currentLayout: ChartLayout;
  onLayoutChange: (layout: ChartLayout) => void;
}

/**
 * Layout Switcher Component
 * Allows users to switch between different chart layouts
 */
const LayoutSwitcher = memo(function LayoutSwitcher({
  currentLayout,
  onLayoutChange,
}: LayoutSwitcherProps) {
  const layouts = [
    {
      type: ChartLayout.SINGLE,
      label: 'Single',
      icon: '📊',
      description: '1x1 - Single chart view',
    },
    {
      type: ChartLayout.VERTICAL,
      label: 'Vertical',
      icon: '📊📊',
      description: '1x2 - Two charts vertically stacked',
    },
    {
      type: ChartLayout.QUAD,
      label: 'Quad',
      icon: '📊📊📊📊',
      description: '2x2 - Four charts in a grid',
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-sm font-medium hidden sm:inline"
        style={{ color: 'var(--text-secondary)' }}
      >
        Layout:
      </span>
      <div className="flex gap-1 sm:gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.type}
            onClick={() => onLayoutChange(layout.type)}
            className={`
              px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-200 
              text-xs sm:text-sm font-medium min-h-[40px] sm:min-h-[44px]
              flex items-center gap-1.5 sm:gap-2
              ${
                currentLayout === layout.type
                  ? 'shadow-md ring-2'
                  : 'hover:shadow-sm'
              }
            `}
            style={{
              backgroundColor:
                currentLayout === layout.type
                  ? 'var(--accent)'
                  : 'var(--bg-secondary)',
              color:
                currentLayout === layout.type
                  ? '#ffffff'
                  : 'var(--text-primary)',
              borderColor:
                currentLayout === layout.type
                  ? 'var(--accent)'
                  : 'var(--border-primary)',
              border: '1px solid',
            }}
            onMouseEnter={(e) => {
              if (currentLayout !== layout.type) {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentLayout !== layout.type) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }
            }}
            title={layout.description}
            aria-label={`Switch to ${layout.label} layout`}
            aria-pressed={currentLayout === layout.type}
          >
            <span className="text-base sm:text-lg" aria-hidden="true">
              {layout.icon}
            </span>
            <span className="hidden sm:inline">{layout.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default LayoutSwitcher;
