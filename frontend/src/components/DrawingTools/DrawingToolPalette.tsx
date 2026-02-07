import { useState } from 'react';
import { DrawingType } from '../../types/drawings';

interface DrawingToolPaletteProps {
  activeTool: DrawingType | null;
  onSelectTool: (tool: DrawingType | null) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  hasSelectedDrawing: boolean;
  drawingCount: number;
}

export default function DrawingToolPalette({
  activeTool,
  onSelectTool,
  selectedColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onDeleteSelected,
  onClearAll,
  hasSelectedDrawing,
  drawingCount,
}: DrawingToolPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const predefinedColors = [
    '#2962FF', // Blue
    '#FF6D00', // Orange
    '#22C55E', // Green
    '#EF4444', // Red
    '#9333EA', // Purple
    '#14B8A6', // Teal
    '#F59E0B', // Amber
    '#EC4899', // Pink
  ];

  const handleClearAll = () => {
    if (drawingCount === 0) return;
    
    if (window.confirm(`Delete all ${drawingCount} drawing${drawingCount > 1 ? 's' : ''}?`)) {
      onClearAll();
    }
  };

  return (
    <div
      className="rounded-lg shadow-lg"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderBottom: isExpanded ? '1px solid var(--border-primary)' : 'none' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Drawing Tools
        </h3>
        <button
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Tools Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Tool Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Select Tool
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Cursor/Select Tool */}
              <button
                onClick={() => onSelectTool(null)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                  activeTool === null ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor: activeTool === null ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTool === null ? '#ffffff' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== null) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== null) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                title="Cursor (Select Mode)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <span>Select</span>
              </button>

              {/* Trendline Tool */}
              <button
                onClick={() => onSelectTool(DrawingType.TRENDLINE)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                  activeTool === DrawingType.TRENDLINE ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    activeTool === DrawingType.TRENDLINE ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTool === DrawingType.TRENDLINE ? '#ffffff' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== DrawingType.TRENDLINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== DrawingType.TRENDLINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                title="Trendline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Trend</span>
              </button>

              {/* Horizontal Line Tool */}
              <button
                onClick={() => onSelectTool(DrawingType.HORIZONTAL_LINE)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                  activeTool === DrawingType.HORIZONTAL_LINE ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    activeTool === DrawingType.HORIZONTAL_LINE ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTool === DrawingType.HORIZONTAL_LINE ? '#ffffff' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== DrawingType.HORIZONTAL_LINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== DrawingType.HORIZONTAL_LINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                title="Horizontal Line"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span>H-Line</span>
              </button>

              {/* Vertical Line Tool */}
              <button
                onClick={() => onSelectTool(DrawingType.VERTICAL_LINE)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                  activeTool === DrawingType.VERTICAL_LINE ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    activeTool === DrawingType.VERTICAL_LINE ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTool === DrawingType.VERTICAL_LINE ? '#ffffff' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== DrawingType.VERTICAL_LINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== DrawingType.VERTICAL_LINE)
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                title="Vertical Line"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ transform: 'rotate(90deg)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span>V-Line</span>
              </button>

              {/* Annotation Tool */}
              <button
                onClick={() => onSelectTool(DrawingType.ANNOTATION)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                  activeTool === DrawingType.ANNOTATION ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    activeTool === DrawingType.ANNOTATION ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTool === DrawingType.ANNOTATION ? '#ffffff' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== DrawingType.ANNOTATION)
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== DrawingType.ANNOTATION)
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                title="Annotation/Note"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <span>Note</span>
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Line Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? color : 'transparent',
                  }}
                  title={color}
                />
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-md border-2 flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                  title="Custom color"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                {showColorPicker && (
                  <div className="absolute top-10 left-0 z-10">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => {
                        onColorChange(e.target.value);
                        setShowColorPicker(false);
                      }}
                      className="w-32 h-32 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Width Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Line Width: {lineWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={lineWidth}
              onChange={(e) => onLineWidthChange(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>1px</span>
              <span>5px</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              onClick={onDeleteSelected}
              disabled={!hasSelectedDrawing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: hasSelectedDrawing ? '#EF4444' : 'var(--bg-secondary)',
                color: hasSelectedDrawing ? '#ffffff' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (hasSelectedDrawing) e.currentTarget.style.backgroundColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                if (hasSelectedDrawing) e.currentTarget.style.backgroundColor = '#EF4444';
              }}
              title="Delete selected drawing (Delete key)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Delete</span>
            </button>
            <button
              onClick={handleClearAll}
              disabled={drawingCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
              onMouseEnter={(e) => {
                if (drawingCount > 0) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
              title="Clear all drawings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Clear All</span>
            </button>
          </div>

          {/* Drawing Count */}
          {drawingCount > 0 && (
            <div
              className="text-xs text-center py-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {drawingCount} drawing{drawingCount > 1 ? 's' : ''} on chart
            </div>
          )}
        </div>
      )}
    </div>
  );
}
