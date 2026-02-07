import { IChartApi, ISeriesApi } from 'lightweight-charts';
import {
  DrawingTool,
  DrawingType,
  TrendLine,
  HorizontalLine,
  VerticalLine,
  Annotation,
  AnnotationStyle,
  SerializedDrawing,
  ChartCoordinate,
} from '../types/drawings';

/**
 * Drawing manager class for handling chart drawings
 * Uses canvas overlay approach for better interactivity
 */
export class DrawingManager {
  private drawings: Map<string, DrawingTool> = new Map();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private chartApi: IChartApi | null = null;
  private series: ISeriesApi<'Candlestick'> | null = null;
  private selectedId: string | null = null;
  private container: HTMLElement | null = null;

  constructor() {}

  /**
   * Initialize the drawing manager with chart and canvas
   */
  initialize(
    chartApi: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    container: HTMLElement
  ): void {
    this.chartApi = chartApi;
    this.series = series;
    this.container = container;

    // Create canvas overlay
    this.createCanvas();

    // Subscribe to chart events for re-rendering
    if (this.chartApi) {
      this.chartApi.timeScale().subscribeVisibleLogicalRangeChange(() => {
        this.render();
      });
    }
  }

  /**
   * Create canvas overlay on top of chart
   */
  private createCanvas(): void {
    if (!this.container) return;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.canvas.style.zIndex = '1';

    // Get context
    this.ctx = this.canvas.getContext('2d');

    // Size canvas to match container
    this.resizeCanvas();

    // Add to container
    this.container.style.position = 'relative';
    this.container.appendChild(this.canvas);

    // Handle resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas to match container
   */
  private resizeCanvas(): void {
    if (!this.canvas || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Re-render after resize
    this.render();
  }

  /**
   * Convert time and price to screen coordinates
   */
  private coordinateToScreen(time: number, price: number): { x: number; y: number } | null {
    if (!this.chartApi || !this.series) return null;

    try {
      const timeScale = this.chartApi.timeScale();

      const x = timeScale.timeToCoordinate(time as any);
      
      // For price to Y coordinate, we need to use a workaround
      // Get visible range and approximate Y position
      const chartHeight = this.canvas?.height || 400;
      
      // Try to get price range from visible bars
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (!visibleRange || x === null) return null;

      // Get approximate price range from data
      // This is a simplified approach - in production, we'd calculate actual price bounds
      const y = this.approximatePriceToY(price, chartHeight);

      return { x, y };
    } catch (error) {
      console.error('Error converting coordinate to screen:', error);
      return null;
    }
  }

  /**
   * Approximate price to Y coordinate
   * This is a simplified version - stores min/max price for better accuracy
   */
  private priceRange: { min: number; max: number } = { min: 0, max: 100 };
  
  private approximatePriceToY(price: number, chartHeight: number): number {
    const range = this.priceRange.max - this.priceRange.min;
    if (range === 0) return chartHeight / 2;
    
    const normalized = (this.priceRange.max - price) / range;
    return normalized * chartHeight * 0.8 + chartHeight * 0.1; // 10% margin top/bottom
  }

  /**
   * Update price range for coordinate conversion
   */
  updatePriceRange(min: number, max: number): void {
    this.priceRange = { min, max };
  }

  /**
   * Convert screen coordinates to time and price
   */
  coordinateFromScreen(x: number, y: number): ChartCoordinate | null {
    if (!this.chartApi || !this.series || !this.canvas) return null;

    try {
      const timeScale = this.chartApi.timeScale();

      const time = timeScale.coordinateToTime(x);

      if (time === null) return null;

      // Approximate price from Y coordinate
      const chartHeight = this.canvas.height;
      const normalized = (y - chartHeight * 0.1) / (chartHeight * 0.8);
      const range = this.priceRange.max - this.priceRange.min;
      const price = this.priceRange.max - (normalized * range);

      return { time: time as number, price, x, y };
    } catch (error) {
      console.error('Error converting screen to coordinate:', error);
      return null;
    }
  }

  /**
   * Add a drawing
   */
  addDrawing(drawing: DrawingTool): void {
    this.drawings.set(drawing.id, drawing);
    this.render();
  }

  /**
   * Update a drawing
   */
  updateDrawing(id: string, updates: Partial<DrawingTool>): void {
    const drawing = this.drawings.get(id);
    if (drawing) {
      this.drawings.set(id, { ...drawing, ...updates } as DrawingTool);
      this.render();
    }
  }

  /**
   * Delete a drawing
   */
  deleteDrawing(id: string): void {
    this.drawings.delete(id);
    if (this.selectedId === id) {
      this.selectedId = null;
    }
    this.render();
  }

  /**
   * Clear all drawings
   */
  clearDrawings(): void {
    this.drawings.clear();
    this.selectedId = null;
    this.render();
  }

  /**
   * Get a specific drawing
   */
  getDrawing(id: string): DrawingTool | undefined {
    return this.drawings.get(id);
  }

  /**
   * Get all drawings
   */
  getAllDrawings(): DrawingTool[] {
    return Array.from(this.drawings.values());
  }

  /**
   * Select a drawing
   */
  selectDrawing(id: string | null): void {
    this.selectedId = id;
    this.render();
  }

  /**
   * Get selected drawing ID
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Find drawing at screen coordinates (for selection)
   */
  findDrawingAt(x: number, y: number, threshold: number = 10): string | null {
    const coord = this.coordinateFromScreen(x, y);
    if (!coord) return null;

    // Check drawings in reverse order (top to bottom)
    const drawings = Array.from(this.drawings.values()).reverse();

    for (const drawing of drawings) {
      if (this.isPointNearDrawing(drawing, coord, threshold)) {
        return drawing.id;
      }
    }

    return null;
  }

  /**
   * Check if a point is near a drawing
   */
  private isPointNearDrawing(
    drawing: DrawingTool,
    coord: ChartCoordinate,
    threshold: number
  ): boolean {
    switch (drawing.type) {
      case DrawingType.TRENDLINE: {
        const trendline = drawing as TrendLine;
        return this.isPointNearLine(
          coord,
          { time: trendline.startTime, price: trendline.startPrice },
          { time: trendline.endTime, price: trendline.endPrice },
          threshold
        );
      }
      case DrawingType.HORIZONTAL_LINE: {
        const hLine = drawing as HorizontalLine;
        return Math.abs(coord.price - hLine.price) < threshold / 10;
      }
      case DrawingType.VERTICAL_LINE: {
        const vLine = drawing as VerticalLine;
        return Math.abs(coord.time - vLine.time) < threshold * 100;
      }
      case DrawingType.ANNOTATION: {
        const annotation = drawing as Annotation;
        const annotationScreen = this.coordinateToScreen(annotation.time, annotation.price);
        const coordScreen = this.coordinateToScreen(coord.time, coord.price);
        
        if (!annotationScreen || !coordScreen) return false;
        
        // Check if click is within annotation bounds
        const annotationWidth = this.measureAnnotationWidth(annotation);
        const annotationHeight = this.calculateAnnotationHeight(annotation);
        
        return (
          Math.abs(coordScreen.x - annotationScreen.x) < annotationWidth / 2 + threshold &&
          Math.abs(coordScreen.y - annotationScreen.y) < annotationHeight / 2 + threshold
        );
      }
      default:
        return false;
    }
  }

  /**
   * Check if point is near a line segment
   */
  private isPointNearLine(
    point: { time: number; price: number },
    start: { time: number; price: number },
    end: { time: number; price: number },
    threshold: number
  ): boolean {
    const startScreen = this.coordinateToScreen(start.time, start.price);
    const endScreen = this.coordinateToScreen(end.time, end.price);
    const pointScreen = this.coordinateToScreen(point.time, point.price);

    if (!startScreen || !endScreen || !pointScreen) return false;

    // Calculate distance from point to line segment
    const distance = this.distanceToLineSegment(
      pointScreen,
      startScreen,
      endScreen
    );

    return distance < threshold;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length2 = dx * dx + dy * dy;

    if (length2 === 0) {
      return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
    }

    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2;
    t = Math.max(0, Math.min(1, t));

    const projX = start.x + t * dx;
    const projY = start.y + t * dy;

    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  }

  /**
   * Render all drawings on canvas
   */
  render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw all drawings
    this.drawings.forEach((drawing) => {
      this.drawTool(drawing);
    });
  }

  /**
   * Draw a single tool on canvas
   */
  private drawTool(drawing: DrawingTool): void {
    if (!this.ctx) return;

    const isSelected = drawing.id === this.selectedId;

    // Set drawing style
    this.ctx.strokeStyle = drawing.color;
    this.ctx.lineWidth = drawing.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Add selection highlight
    if (isSelected) {
      this.ctx.shadowColor = drawing.color;
      this.ctx.shadowBlur = 10;
    } else {
      this.ctx.shadowBlur = 0;
    }

    switch (drawing.type) {
      case DrawingType.TRENDLINE:
        this.drawTrendline(drawing as TrendLine);
        break;
      case DrawingType.HORIZONTAL_LINE:
        this.drawHorizontalLine(drawing as HorizontalLine);
        break;
      case DrawingType.VERTICAL_LINE:
        this.drawVerticalLine(drawing as VerticalLine);
        break;
      case DrawingType.ANNOTATION:
        this.drawAnnotation(drawing as Annotation, isSelected);
        break;
    }

    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw a trendline
   */
  private drawTrendline(trendline: TrendLine): void {
    if (!this.ctx) return;

    const start = this.coordinateToScreen(trendline.startTime, trendline.startPrice);
    const end = this.coordinateToScreen(trendline.endTime, trendline.endPrice);

    if (!start || !end) return;

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Draw handles if selected
    if (trendline.id === this.selectedId) {
      this.drawHandle(start.x, start.y);
      this.drawHandle(end.x, end.y);
    }
  }

  /**
   * Draw a horizontal line
   */
  private drawHorizontalLine(hLine: HorizontalLine): void {
    if (!this.ctx || !this.canvas) return;

    const y = this.coordinateToScreen(0, hLine.price)?.y;
    if (y === undefined || y === null) return;

    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.stroke();

    // Draw label if present
    if (hLine.label) {
      this.drawLabel(10, y, hLine.label, hLine.color);
    }

    // Draw handles if selected
    if (hLine.id === this.selectedId) {
      this.drawHandle(this.canvas.width / 2, y);
    }
  }

  /**
   * Draw a vertical line
   */
  private drawVerticalLine(vLine: VerticalLine): void {
    if (!this.ctx || !this.canvas) return;

    const x = this.coordinateToScreen(vLine.time, 0)?.x;
    if (x === undefined || x === null) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();

    // Draw label if present
    if (vLine.label) {
      this.drawLabel(x, 20, vLine.label, vLine.color);
    }

    // Draw handles if selected
    if (vLine.id === this.selectedId) {
      this.drawHandle(x, this.canvas.height / 2);
    }
  }

  /**
   * Draw a selection handle
   */
  private drawHandle(x: number, y: number): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 0;

    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw a label
   */
  private drawLabel(x: number, y: number, text: string, color: string): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 0;

    // Draw text background
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      x - padding,
      y - 12 - padding,
      metrics.width + padding * 2,
      16 + padding * 2
    );

    // Draw text
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);

    this.ctx.restore();
  }

  /**
   * Measure annotation width based on text content
   */
  private measureAnnotationWidth(annotation: Annotation): number {
    if (!this.ctx) return 100;

    this.ctx.save();
    this.ctx.font = `${annotation.fontSize}px sans-serif`;
    
    // Split text into lines and find max width
    const lines = this.wrapText(annotation.text, 200); // Max width 200px
    let maxWidth = 0;
    
    lines.forEach((line) => {
      const metrics = this.ctx!.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    });
    
    this.ctx.restore();
    
    const padding = 12;
    const iconWidth = annotation.icon ? 24 : 0;
    return maxWidth + padding * 2 + iconWidth;
  }

  /**
   * Calculate annotation height based on text content
   */
  private calculateAnnotationHeight(annotation: Annotation): number {
    const lines = this.wrapText(annotation.text, 200);
    const lineHeight = annotation.fontSize * 1.4;
    const padding = 12;
    return lines.length * lineHeight + padding * 2;
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    if (!this.ctx) return [text];

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = this.ctx!.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  /**
   * Draw an annotation
   */
  private drawAnnotation(annotation: Annotation, isSelected: boolean): void {
    if (!this.ctx) return;

    const position = this.coordinateToScreen(annotation.time, annotation.price);
    if (!position) return;

    this.ctx.save();

    // Measure annotation dimensions
    const width = this.measureAnnotationWidth(annotation);
    const height = this.calculateAnnotationHeight(annotation);

    // Draw background with rounded corners
    const x = position.x;
    const y = position.y - height / 2;
    const borderRadius = 6;

    this.ctx.fillStyle = annotation.backgroundColor;
    this.ctx.strokeStyle = isSelected ? '#2962FF' : annotation.backgroundColor;
    this.ctx.lineWidth = isSelected ? 3 : 1;

    // Draw rounded rectangle
    this.ctx.beginPath();
    this.ctx.moveTo(x - width / 2 + borderRadius, y);
    this.ctx.lineTo(x + width / 2 - borderRadius, y);
    this.ctx.quadraticCurveTo(x + width / 2, y, x + width / 2, y + borderRadius);
    this.ctx.lineTo(x + width / 2, y + height - borderRadius);
    this.ctx.quadraticCurveTo(x + width / 2, y + height, x + width / 2 - borderRadius, y + height);
    this.ctx.lineTo(x - width / 2 + borderRadius, y + height);
    this.ctx.quadraticCurveTo(x - width / 2, y + height, x - width / 2, y + height - borderRadius);
    this.ctx.lineTo(x - width / 2, y + borderRadius);
    this.ctx.quadraticCurveTo(x - width / 2, y, x - width / 2 + borderRadius, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Draw icon if present
    let textStartX = x - width / 2 + 12;
    if (annotation.icon) {
      this.drawAnnotationIcon(annotation.style, textStartX + 4, y + 12, annotation.textColor);
      textStartX += 24;
    }

    // Draw text
    this.ctx.fillStyle = annotation.textColor;
    this.ctx.font = `${annotation.fontSize}px sans-serif`;
    this.ctx.textBaseline = 'top';

    const lines = this.wrapText(annotation.text, 200);
    const lineHeight = annotation.fontSize * 1.4;

    lines.forEach((line, index) => {
      this.ctx!.fillText(line, textStartX, y + 12 + index * lineHeight);
    });

    this.ctx.restore();

    // Draw handle if selected
    if (isSelected) {
      this.drawHandle(position.x, position.y);
    }
  }

  /**
   * Draw annotation icon based on style
   */
  private drawAnnotationIcon(style: AnnotationStyle, x: number, y: number, color: string): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    switch (style) {
      case AnnotationStyle.NOTE:
        // Draw note icon (document)
        this.ctx.beginPath();
        this.ctx.rect(x, y, 12, 16);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + 3, y + 5);
        this.ctx.lineTo(x + 9, y + 5);
        this.ctx.moveTo(x + 3, y + 9);
        this.ctx.lineTo(x + 9, y + 9);
        this.ctx.stroke();
        break;
      case AnnotationStyle.ALERT:
        // Draw alert icon (triangle with !)
        this.ctx.beginPath();
        this.ctx.moveTo(x + 6, y);
        this.ctx.lineTo(x + 12, y + 16);
        this.ctx.lineTo(x, y + 16);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fillText('!', x + 4, y + 6);
        break;
      case AnnotationStyle.INFO:
        // Draw info icon (circle with i)
        this.ctx.beginPath();
        this.ctx.arc(x + 6, y + 8, 6, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.fillText('i', x + 4, y + 4);
        break;
    }

    this.ctx.restore();
  }

  /**
   * Serialize drawings for persistence
   */
  serializeDrawings(): SerializedDrawing[] {
    return Array.from(this.drawings.values()).map((drawing) => {
      const serialized: SerializedDrawing = {
        id: drawing.id,
        type: drawing.type,
        color: drawing.color,
        lineWidth: drawing.lineWidth,
      };

      switch (drawing.type) {
        case DrawingType.TRENDLINE: {
          const trendline = drawing as TrendLine;
          serialized.startTime = trendline.startTime;
          serialized.startPrice = trendline.startPrice;
          serialized.endTime = trendline.endTime;
          serialized.endPrice = trendline.endPrice;
          break;
        }
        case DrawingType.HORIZONTAL_LINE: {
          const hLine = drawing as HorizontalLine;
          serialized.price = hLine.price;
          serialized.label = hLine.label;
          break;
        }
        case DrawingType.VERTICAL_LINE: {
          const vLine = drawing as VerticalLine;
          serialized.time = vLine.time;
          serialized.label = vLine.label;
          break;
        }
        case DrawingType.ANNOTATION: {
          const annotation = drawing as Annotation;
          serialized.time = annotation.time;
          serialized.price = annotation.price;
          serialized.text = annotation.text;
          serialized.backgroundColor = annotation.backgroundColor;
          serialized.textColor = annotation.textColor;
          serialized.fontSize = annotation.fontSize;
          serialized.style = annotation.style;
          serialized.icon = annotation.icon;
          break;
        }
      }

      return serialized;
    });
  }

  /**
   * Deserialize drawings from saved data
   */
  deserializeDrawings(data: SerializedDrawing[]): void {
    this.drawings.clear();

    data.forEach((serialized) => {
      let drawing: DrawingTool;

      switch (serialized.type) {
        case DrawingType.TRENDLINE:
          drawing = {
            id: serialized.id,
            type: DrawingType.TRENDLINE,
            color: serialized.color,
            lineWidth: serialized.lineWidth,
            startTime: serialized.startTime!,
            startPrice: serialized.startPrice!,
            endTime: serialized.endTime!,
            endPrice: serialized.endPrice!,
          } as TrendLine;
          break;
        case DrawingType.HORIZONTAL_LINE:
          drawing = {
            id: serialized.id,
            type: DrawingType.HORIZONTAL_LINE,
            color: serialized.color,
            lineWidth: serialized.lineWidth,
            price: serialized.price!,
            label: serialized.label,
          } as HorizontalLine;
          break;
        case DrawingType.VERTICAL_LINE:
          drawing = {
            id: serialized.id,
            type: DrawingType.VERTICAL_LINE,
            color: serialized.color,
            lineWidth: serialized.lineWidth,
            time: serialized.time!,
            label: serialized.label,
          } as VerticalLine;
          break;
        case DrawingType.ANNOTATION:
          drawing = {
            id: serialized.id,
            type: DrawingType.ANNOTATION,
            color: serialized.color,
            lineWidth: serialized.lineWidth,
            time: serialized.time!,
            price: serialized.price!,
            text: serialized.text!,
            backgroundColor: serialized.backgroundColor!,
            textColor: serialized.textColor!,
            fontSize: serialized.fontSize!,
            style: serialized.style!,
            icon: serialized.icon,
          } as Annotation;
          break;
        default:
          return;
      }

      this.drawings.set(drawing.id, drawing);
    });

    this.render();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.chartApi = null;
    this.series = null;
    this.drawings.clear();
  }
}

/**
 * Create a unique ID for drawings
 */
export function generateDrawingId(): string {
  return `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
