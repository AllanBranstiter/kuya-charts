// Chart Config service for database operations related to user chart configurations

import { query } from '../utils/db.js';

// Chart config structure from database
export interface ChartConfig {
  id: number;
  user_id: number;
  config_name: string;
  config_data: object;
  created_at: Date;
  updated_at: Date;
}

// Chart config for API responses (without user_id)
export interface ChartConfigResponse {
  id: number;
  config_name: string;
  config_data: object;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all chart configs for a user
 * @param userId - User's ID
 * @returns Array of chart configs
 */
export async function getUserChartConfigs(userId: number): Promise<ChartConfigResponse[]> {
  try {
    const result = await query<ChartConfigResponse>(
      `SELECT id, config_name, config_data, created_at, updated_at
       FROM user_chart_configs
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user chart configs:', error);
    throw new Error('Failed to retrieve chart configs');
  }
}

/**
 * Get specific chart config by ID
 * @param userId - User's ID
 * @param configId - Config ID
 * @returns Chart config if found and owned by user, null otherwise
 */
export async function getChartConfigById(
  userId: number,
  configId: number
): Promise<ChartConfigResponse | null> {
  try {
    const result = await query<ChartConfigResponse>(
      `SELECT id, config_name, config_data, created_at, updated_at
       FROM user_chart_configs
       WHERE id = $1 AND user_id = $2`,
      [configId, userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting chart config by ID:', error);
    throw new Error('Failed to retrieve chart config');
  }
}

/**
 * Create a new chart config
 * @param userId - User's ID
 * @param configName - Name of the config
 * @param configData - Config data object
 * @returns Created chart config
 * @throws Error if config name already exists for user
 */
export async function createChartConfig(
  userId: number,
  configName: string,
  configData: object
): Promise<ChartConfigResponse> {
  try {
    const result = await query<ChartConfigResponse>(
      `INSERT INTO user_chart_configs (user_id, config_name, config_data)
       VALUES ($1, $2, $3)
       RETURNING id, config_name, config_data, created_at, updated_at`,
      [userId, configName, JSON.stringify(configData)]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create chart config');
    }

    return result.rows[0];
  } catch (error: any) {
    // Handle unique constraint violation (duplicate config name for user)
    if (error.code === '23505') {
      throw new Error('Chart config with this name already exists');
    }

    // Re-throw other errors
    console.error('Error creating chart config:', error);
    throw error;
  }
}

/**
 * Update an existing chart config
 * @param userId - User's ID
 * @param configId - Config ID to update
 * @param configName - Optional new name
 * @param configData - Optional new config data
 * @returns Updated chart config if found and owned by user, null otherwise
 * @throws Error if config name already exists for user
 */
export async function updateChartConfig(
  userId: number,
  configId: number,
  configName?: string,
  configData?: object
): Promise<ChartConfigResponse | null> {
  try {
    // Build dynamic update query based on what fields are provided
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (configName !== undefined) {
      updates.push(`config_name = $${paramIndex++}`);
      values.push(configName);
    }

    if (configData !== undefined) {
      updates.push(`config_data = $${paramIndex++}`);
      values.push(JSON.stringify(configData));
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameters
    values.push(configId, userId);

    const result = await query<ChartConfigResponse>(
      `UPDATE user_chart_configs
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, config_name, config_data, created_at, updated_at`,
      values
    );

    return result.rows[0] || null;
  } catch (error: any) {
    // Handle unique constraint violation (duplicate config name for user)
    if (error.code === '23505') {
      throw new Error('Chart config with this name already exists');
    }

    // Re-throw other errors
    console.error('Error updating chart config:', error);
    throw error;
  }
}

/**
 * Delete a chart config
 * @param userId - User's ID
 * @param configId - Config ID to delete
 * @returns true if config was deleted, false if not found
 */
export async function deleteChartConfig(
  userId: number,
  configId: number
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM user_chart_configs
       WHERE id = $1 AND user_id = $2`,
      [configId, userId]
    );

    // Return true if at least one row was deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting chart config:', error);
    throw new Error('Failed to delete chart config');
  }
}
