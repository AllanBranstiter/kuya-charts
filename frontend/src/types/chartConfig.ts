import { IndicatorConfig } from '../components/IndicatorControls';
import { SerializedDrawing } from './drawings';

/**
 * Chart configuration data structure
 * Contains all chart settings including indicators, timeframe, etc.
 */
export interface ChartConfigData {
  indicators: IndicatorConfig;
  timeframe?: string;
  chartType?: string;
  theme?: string;
  drawings?: SerializedDrawing[];
}

/**
 * Chart configuration entity from backend
 */
export interface ChartConfig {
  id: number;
  config_name: string;
  config_data: ChartConfigData;
  created_at: string;
  updated_at: string;
}

/**
 * Request body for creating a new chart config
 */
export interface CreateChartConfigRequest {
  config_name: string;
  config_data: ChartConfigData;
}

/**
 * Request body for updating an existing chart config
 */
export interface UpdateChartConfigRequest {
  config_name?: string;
  config_data?: ChartConfigData;
}

/**
 * Successful API response from chart config endpoints
 */
export interface ChartConfigSuccessResponse {
  success: true;
  data: ChartConfig | ChartConfig[];
}

/**
 * Error response from chart config endpoints
 */
export interface ChartConfigErrorResponse {
  success: false;
  message: string;
}

/**
 * Union type for API responses
 */
export type ChartConfigResponse = ChartConfigSuccessResponse | ChartConfigErrorResponse;
