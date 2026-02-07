import { Router, Response } from 'express';
import {
  getUserChartConfigs,
  getChartConfigById,
  createChartConfig,
  updateChartConfig,
  deleteChartConfig,
} from '../services/chartConfigService.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';

const router = Router();

/**
 * Validate config name
 * @param configName - Config name to validate
 * @returns true if valid, false otherwise
 */
function isValidConfigName(configName: string): boolean {
  return typeof configName === 'string' && configName.length >= 1 && configName.length <= 100;
}

/**
 * Validate config data
 * @param configData - Config data to validate
 * @returns true if valid, false otherwise
 */
function isValidConfigData(configData: any): boolean {
  return typeof configData === 'object' && configData !== null && !Array.isArray(configData);
}

/**
 * Validate positive integer ID
 * @param id - ID to validate
 * @returns true if valid, false otherwise
 */
function isValidId(id: string): boolean {
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId > 0 && numId.toString() === id;
}

/**
 * GET /api/chart-configs
 * Get all chart configs for current user
 * Requires authentication
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Get user's chart configs
    const configs = await getUserChartConfigs(req.user.userId);

    res.json({
      success: true,
      configs,
    });
  } catch (error: unknown) {
    console.error('Get chart configs error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve chart configs',
    });
  }
});

/**
 * GET /api/chart-configs/:id
 * Get specific chart config by ID
 * URL parameter: id
 * Requires authentication
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    // Validate ID parameter
    if (!id || !isValidId(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'Config ID must be a positive integer',
      });
      return;
    }

    const configId = parseInt(id, 10);

    // Get chart config by ID
    const config = await getChartConfigById(req.user.userId, configId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Chart config not found',
      });
      return;
    }

    res.json({
      success: true,
      config,
    });
  } catch (error: unknown) {
    console.error('Get chart config by ID error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve chart config',
    });
  }
});

/**
 * POST /api/chart-configs
 * Create new chart config
 * Body: { config_name: string, config_data: object }
 * Requires authentication
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { config_name, config_data } = req.body;

    // Validate required fields
    if (!config_name) {
      res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'config_name is required',
      });
      return;
    }

    if (!config_data) {
      res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'config_data is required',
      });
      return;
    }

    // Validate config_name format
    if (!isValidConfigName(config_name)) {
      res.status(400).json({
        success: false,
        error: 'Invalid config name',
        message: 'config_name must be 1-100 characters',
      });
      return;
    }

    // Validate config_data format
    if (!isValidConfigData(config_data)) {
      res.status(400).json({
        success: false,
        error: 'Invalid config data',
        message: 'config_data must be a valid JSON object',
      });
      return;
    }

    // Create chart config
    const config = await createChartConfig(req.user.userId, config_name, config_data);

    res.status(201).json({
      success: true,
      config,
    });
  } catch (error: unknown) {
    console.error('Create chart config error:', error);

    if (error instanceof Error) {
      // Handle duplicate config name error
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'Chart config with this name already exists',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create chart config',
    });
  }
});

/**
 * PUT /api/chart-configs/:id
 * Update existing chart config
 * URL parameter: id
 * Body: { config_name?: string, config_data?: object }
 * Requires authentication
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;
    const { config_name, config_data } = req.body;

    // Validate ID parameter
    if (!id || !isValidId(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'Config ID must be a positive integer',
      });
      return;
    }

    // At least one field must be provided for update
    if (config_name === undefined && config_data === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing update fields',
        message: 'At least one field (config_name or config_data) must be provided',
      });
      return;
    }

    // Validate config_name if provided
    if (config_name !== undefined && !isValidConfigName(config_name)) {
      res.status(400).json({
        success: false,
        error: 'Invalid config name',
        message: 'config_name must be 1-100 characters',
      });
      return;
    }

    // Validate config_data if provided
    if (config_data !== undefined && !isValidConfigData(config_data)) {
      res.status(400).json({
        success: false,
        error: 'Invalid config data',
        message: 'config_data must be a valid JSON object',
      });
      return;
    }

    const configId = parseInt(id, 10);

    // Update chart config
    const config = await updateChartConfig(req.user.userId, configId, config_name, config_data);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Chart config not found',
      });
      return;
    }

    res.json({
      success: true,
      config,
    });
  } catch (error: unknown) {
    console.error('Update chart config error:', error);

    if (error instanceof Error) {
      // Handle duplicate config name error
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'Chart config with this name already exists',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update chart config',
    });
  }
});

/**
 * DELETE /api/chart-configs/:id
 * Delete chart config
 * URL parameter: id
 * Requires authentication
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User info is attached by authenticateToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    // Validate ID parameter
    if (!id || !isValidId(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'Config ID must be a positive integer',
      });
      return;
    }

    const configId = parseInt(id, 10);

    // Delete chart config
    const deleted = await deleteChartConfig(req.user.userId, configId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Chart config not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Chart config deleted',
    });
  } catch (error: unknown) {
    console.error('Delete chart config error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete chart config',
    });
  }
});

export default router;
