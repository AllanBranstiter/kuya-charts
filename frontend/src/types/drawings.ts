/**
 * Drawing tool types for chart annotations
 */

/**
 * Types of drawing tools available
 */
export enum DrawingType {
  TRENDLINE = 'TRENDLINE',
  HORIZONTAL_LINE = 'HORIZONTAL_LINE',
  VERTICAL_LINE = 'VERTICAL_LINE',
  ANNOTATION = 'ANNOTATION',
}

/**
 * Annotation style types
 */
export enum AnnotationStyle {
  NOTE = 'NOTE',
  ALERT = 'ALERT',
  INFO = 'INFO',
}

/**
 * Base interface for all drawing tools
 */
export interface BaseDrawing {
  id: string;
  type: DrawingType;
  color: string;
  lineWidth: number;
  selected?: boolean;
}

/**
 * Trendline drawing between two points
 */
export interface TrendLine extends BaseDrawing {
  type: DrawingType.TRENDLINE;
  startTime: number; // Unix timestamp in seconds
  startPrice: number;
  endTime: number; // Unix timestamp in seconds
  endPrice: number;
}

/**
 * Horizontal line at a specific price level
 */
export interface HorizontalLine extends BaseDrawing {
  type: DrawingType.HORIZONTAL_LINE;
  price: number;
  label?: string;
}

/**
 * Vertical line at a specific time
 */
export interface VerticalLine extends BaseDrawing {
  type: DrawingType.VERTICAL_LINE;
  time: number; // Unix timestamp in seconds
  label?: string;
}

/**
 * Annotation/note at a specific time and price
 */
export interface Annotation extends BaseDrawing {
  type: DrawingType.ANNOTATION;
  time: number; // Unix timestamp in seconds
  price: number;
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number; // 12, 14, or 16
  style: AnnotationStyle;
  icon?: string; // Optional icon/marker type
}

/**
 * Union type for all drawing tools
 */
export type DrawingTool = TrendLine | HorizontalLine | VerticalLine | Annotation;

/**
 * UI state for drawing tool management
 */
export interface DrawingToolState {
  activeTool: DrawingType | null; // null means selection/cursor mode
  drawings: DrawingTool[];
  selectedDrawingId: string | null;
  isDrawing: boolean;
  drawingInProgress?: Partial<DrawingTool>;
}

/**
 * Serializable drawing data for persistence
 */
export interface SerializedDrawing {
  id: string;
  type: DrawingType;
  color: string;
  lineWidth: number;
  // Type-specific data
  startTime?: number;
  startPrice?: number;
  endTime?: number;
  endPrice?: number;
  price?: number;
  time?: number;
  label?: string;
  // Annotation-specific data
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  style?: AnnotationStyle;
  icon?: string;
}

/**
 * Mouse coordinate information
 */
export interface ChartCoordinate {
  time: number; // Unix timestamp in seconds
  price: number;
  x: number; // Screen x coordinate
  y: number; // Screen y coordinate
}

/**
 * Drawing manager interface for external API
 */
export interface IDrawingManager {
  addDrawing: (drawing: DrawingTool) => void;
  updateDrawing: (id: string, updates: Partial<DrawingTool>) => void;
  deleteDrawing: (id: string) => void;
  clearDrawings: () => void;
  getDrawing: (id: string) => DrawingTool | undefined;
  getAllDrawings: () => DrawingTool[];
  selectDrawing: (id: string | null) => void;
  serializeDrawings: () => SerializedDrawing[];
  deserializeDrawings: (data: SerializedDrawing[]) => DrawingTool[];
}
