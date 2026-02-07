import { IndicatorConfig } from '../components/IndicatorControls';

export interface IndicatorPreset {
  id: string;
  name: string;
  config: IndicatorConfig;
  isDefault: boolean;
}

// Default indicator configuration
export const getDefaultConfig = (): IndicatorConfig => ({
  sma: {
    enabled: false,
    period: 20,
    color: '#2962FF',
    lineWidth: 2,
    lineStyle: 0, // 0 = solid, 1 = dotted, 2 = dashed
  },
  ema: {
    enabled: false,
    period: 12,
    color: '#FF6D00',
    lineWidth: 2,
    lineStyle: 0,
  },
  volume: {
    enabled: false,
  },
  bollingerBands: {
    enabled: false,
    period: 20,
    stdDev: 2,
    upperColor: '#9333EA',
    middleColor: '#A855F7',
    lowerColor: '#C084FC',
    lineWidth: 2,
    lineStyle: 0,
  },
  vwap: {
    enabled: false,
    color: '#14B8A6',
    lineWidth: 2,
    lineStyle: 0,
  },
  pivotPoints: {
    enabled: false,
    pivotColor: '#EAB308',
    resistanceColor: '#22C55E',
    supportColor: '#EF4444',
    lineWidth: 1,
    lineStyle: 2,
  },
  rsi: {
    enabled: false,
    period: 14,
    color: '#6366F1',
    lineWidth: 2,
    lineStyle: 0,
  },
  macd: {
    enabled: false,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: '#3B82F6',
    signalColor: '#F97316',
    lineWidth: 2,
    lineStyle: 0,
  },
  stochastic: {
    enabled: false,
    kPeriod: 14,
    dPeriod: 3,
    smoothK: 3,
    kColor: '#EC4899',
    dColor: '#F43F5E',
    lineWidth: 2,
    lineStyle: 0,
  },
});

// Default presets
export const getDefaultPresets = (): IndicatorPreset[] => [
  {
    id: 'day-trading',
    name: 'Day Trading',
    isDefault: true,
    config: {
      ...getDefaultConfig(),
      ema: {
        enabled: true,
        period: 9,
        color: '#FF6D00',
        lineWidth: 2,
        lineStyle: 0,
      },
      vwap: {
        enabled: true,
        color: '#14B8A6',
        lineWidth: 2,
        lineStyle: 0,
      },
      volume: {
        enabled: true,
      },
      rsi: {
        enabled: true,
        period: 14,
        color: '#6366F1',
        lineWidth: 2,
        lineStyle: 0,
      },
      macd: {
        enabled: true,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        macdColor: '#3B82F6',
        signalColor: '#F97316',
        lineWidth: 2,
        lineStyle: 0,
      },
    },
  },
  {
    id: 'swing-trading',
    name: 'Swing Trading',
    isDefault: true,
    config: {
      ...getDefaultConfig(),
      sma: {
        enabled: true,
        period: 50,
        color: '#2962FF',
        lineWidth: 2,
        lineStyle: 0,
      },
      bollingerBands: {
        enabled: true,
        period: 20,
        stdDev: 2,
        upperColor: '#9333EA',
        middleColor: '#A855F7',
        lowerColor: '#C084FC',
        lineWidth: 2,
        lineStyle: 0,
      },
      volume: {
        enabled: true,
      },
      rsi: {
        enabled: true,
        period: 14,
        color: '#6366F1',
        lineWidth: 2,
        lineStyle: 0,
      },
    },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    isDefault: true,
    config: {
      ...getDefaultConfig(),
      volume: {
        enabled: true,
      },
      rsi: {
        enabled: true,
        period: 14,
        color: '#6366F1',
        lineWidth: 2,
        lineStyle: 0,
      },
      macd: {
        enabled: true,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        macdColor: '#3B82F6',
        signalColor: '#F97316',
        lineWidth: 2,
        lineStyle: 0,
      },
      stochastic: {
        enabled: true,
        kPeriod: 14,
        dPeriod: 3,
        smoothK: 3,
        kColor: '#EC4899',
        dColor: '#F43F5E',
        lineWidth: 2,
        lineStyle: 0,
      },
    },
  },
];

const STORAGE_KEY_CONFIG = 'kuya-charts-indicator-config';
const STORAGE_KEY_PRESETS = 'kuya-charts-presets';
const CONFIG_VERSION = '1.0';

export interface StoredConfig {
  version: string;
  config: IndicatorConfig;
  lastUpdated: string;
}

export interface StoredPresets {
  version: string;
  presets: IndicatorPreset[];
}

/**
 * Save indicator configuration to localStorage
 */
export const saveConfig = (config: IndicatorConfig): void => {
  try {
    const storedConfig: StoredConfig = {
      version: CONFIG_VERSION,
      config,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(storedConfig));
  } catch (error) {
    console.error('Failed to save indicator config:', error);
    // If localStorage is full, try to clear old data
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
          version: CONFIG_VERSION,
          config,
          lastUpdated: new Date().toISOString(),
        }));
      } catch (retryError) {
        console.error('Failed to save config after clearing:', retryError);
      }
    }
  }
};

/**
 * Load indicator configuration from localStorage
 */
export const loadConfig = (): IndicatorConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!stored) return null;

    const storedConfig: StoredConfig = JSON.parse(stored);
    
    // Check version compatibility
    if (storedConfig.version !== CONFIG_VERSION) {
      console.warn('Config version mismatch, using default config');
      return null;
    }

    return storedConfig.config;
  } catch (error) {
    console.error('Failed to load indicator config:', error);
    return null;
  }
};

/**
 * Save presets to localStorage
 */
export const savePresets = (presets: IndicatorPreset[]): void => {
  try {
    const storedPresets: StoredPresets = {
      version: CONFIG_VERSION,
      presets,
    };
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(storedPresets));
  } catch (error) {
    console.error('Failed to save presets:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem(STORAGE_KEY_PRESETS);
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify({
          version: CONFIG_VERSION,
          presets,
        }));
      } catch (retryError) {
        console.error('Failed to save presets after clearing:', retryError);
      }
    }
  }
};

/**
 * Load presets from localStorage
 */
export const loadPresets = (): IndicatorPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!stored) {
      // Return default presets if nothing stored
      return getDefaultPresets();
    }

    const storedPresets: StoredPresets = JSON.parse(stored);
    
    // Check version compatibility
    if (storedPresets.version !== CONFIG_VERSION) {
      console.warn('Presets version mismatch, using default presets');
      return getDefaultPresets();
    }

    // Merge with default presets (in case new defaults were added)
    const defaultPresets = getDefaultPresets();
    const userPresets = storedPresets.presets.filter(p => !p.isDefault);
    
    return [...defaultPresets, ...userPresets];
  } catch (error) {
    console.error('Failed to load presets:', error);
    return getDefaultPresets();
  }
};

/**
 * Clear all stored configuration
 */
export const clearAllStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    localStorage.removeItem(STORAGE_KEY_PRESETS);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};
