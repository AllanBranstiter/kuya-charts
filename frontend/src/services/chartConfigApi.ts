import { getStoredToken, clearStoredToken } from './authApi';
import {
  ChartConfig,
  ChartConfigData,
  ChartConfigSuccessResponse,
  ChartConfigErrorResponse,
  CreateChartConfigRequest,
  UpdateChartConfigRequest,
} from '../types/chartConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Get all chart configurations for the authenticated user
 * @returns Promise with array of chart configurations
 * @throws Error if not authenticated or request fails
 */
export async function getChartConfigs(): Promise<ChartConfig[]> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/chart-configs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: ChartConfigErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to get chart configurations');
    }

    const data: ChartConfigSuccessResponse = await response.json();
    
    // The backend returns { success: true, data: [...] }
    if (data.success && Array.isArray(data.data)) {
      return data.data as ChartConfig[];
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching chart configurations');
  }
}

/**
 * Get a specific chart configuration by ID
 * @param id - Chart configuration ID
 * @returns Promise with chart configuration
 * @throws Error if not authenticated or request fails
 */
export async function getChartConfigById(id: number): Promise<ChartConfig> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/chart-configs/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: ChartConfigErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to get chart configuration');
    }

    const data: ChartConfigSuccessResponse = await response.json();
    
    if (data.success && data.data && !Array.isArray(data.data)) {
      return data.data as ChartConfig;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching chart configuration');
  }
}

/**
 * Create a new chart configuration
 * @param configName - Name for the configuration
 * @param configData - Chart configuration data
 * @returns Promise with the created chart configuration
 * @throws Error if not authenticated or request fails
 */
export async function createChartConfig(
  configName: string,
  configData: ChartConfigData
): Promise<ChartConfig> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const requestBody: CreateChartConfigRequest = {
      config_name: configName,
      config_data: configData,
    };

    const response = await fetch(`${API_BASE_URL}/chart-configs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: ChartConfigErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to create chart configuration');
    }

    const data: ChartConfigSuccessResponse = await response.json();
    
    if (data.success && data.data && !Array.isArray(data.data)) {
      return data.data as ChartConfig;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while creating chart configuration');
  }
}

/**
 * Update an existing chart configuration
 * @param id - Chart configuration ID
 * @param configName - Optional new name for the configuration
 * @param configData - Optional new configuration data
 * @returns Promise with the updated chart configuration
 * @throws Error if not authenticated or request fails
 */
export async function updateChartConfig(
  id: number,
  configName?: string,
  configData?: ChartConfigData
): Promise<ChartConfig> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const requestBody: UpdateChartConfigRequest = {};
    if (configName !== undefined) {
      requestBody.config_name = configName;
    }
    if (configData !== undefined) {
      requestBody.config_data = configData;
    }

    const response = await fetch(`${API_BASE_URL}/chart-configs/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: ChartConfigErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to update chart configuration');
    }

    const data: ChartConfigSuccessResponse = await response.json();
    
    if (data.success && data.data && !Array.isArray(data.data)) {
      return data.data as ChartConfig;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while updating chart configuration');
  }
}

/**
 * Delete a chart configuration
 * @param id - Chart configuration ID
 * @returns Promise that resolves when deleted
 * @throws Error if not authenticated or request fails
 */
export async function deleteChartConfig(id: number): Promise<void> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/chart-configs/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      // 404 means not found - not really an error for deletion
      if (response.status === 404) {
        return; // Already removed or never existed
      }
      
      const errorData: ChartConfigErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to delete chart configuration');
    }

    // Success - no return value needed
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while deleting chart configuration');
  }
}
