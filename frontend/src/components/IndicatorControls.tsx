import React from 'react';

export interface IndicatorConfig {
  sma: {
    enabled: boolean;
    period: number;
  };
  ema: {
    enabled: boolean;
    period: number;
  };
  volume: {
    enabled: boolean;
  };
}

interface IndicatorControlsProps {
  config: IndicatorConfig;
  onChange: (config: IndicatorConfig) => void;
}

export const IndicatorControls: React.FC<IndicatorControlsProps> = ({ config, onChange }) => {
  const handleSMAEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      sma: {
        ...config.sma,
        enabled: e.target.checked
      }
    });
  };

  const handleSMAPeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const period = parseInt(e.target.value, 10);
    if (period > 0) {
      onChange({
        ...config,
        sma: {
          ...config.sma,
          period
        }
      });
    }
  };

  const handleEMAEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      ema: {
        ...config.ema,
        enabled: e.target.checked
      }
    });
  };

  const handleEMAPeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const period = parseInt(e.target.value, 10);
    if (period > 0) {
      onChange({
        ...config,
        ema: {
          ...config.ema,
          period
        }
      });
    }
  };

  const handleVolumeEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      volume: {
        ...config.volume,
        enabled: e.target.checked
      }
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Technical Indicators
      </h3>

      {/* SMA Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sma-enabled"
            checked={config.sma.enabled}
            onChange={handleSMAEnabledChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="sma-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
            SMA (Simple Moving Average)
          </label>
        </div>
        {config.sma.enabled && (
          <div className="ml-6 flex items-center gap-2">
            <label htmlFor="sma-period" className="text-sm text-gray-600 dark:text-gray-400">
              Period:
            </label>
            <input
              type="number"
              id="sma-period"
              min="1"
              max="200"
              value={config.sma.period}
              onChange={handleSMAPeriodChange}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-xs text-blue-600 dark:text-blue-400">■ Blue Line</span>
          </div>
        )}
      </div>

      {/* EMA Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ema-enabled"
            checked={config.ema.enabled}
            onChange={handleEMAEnabledChange}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
          />
          <label htmlFor="ema-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
            EMA (Exponential Moving Average)
          </label>
        </div>
        {config.ema.enabled && (
          <div className="ml-6 flex items-center gap-2">
            <label htmlFor="ema-period" className="text-sm text-gray-600 dark:text-gray-400">
              Period:
            </label>
            <input
              type="number"
              id="ema-period"
              min="1"
              max="200"
              value={config.ema.period}
              onChange={handleEMAPeriodChange}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-xs text-orange-600 dark:text-orange-400">■ Orange Line</span>
          </div>
        )}
      </div>

      {/* Volume Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="volume-enabled"
            checked={config.volume.enabled}
            onChange={handleVolumeEnabledChange}
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
          />
          <label htmlFor="volume-enabled" className="text-sm font-medium text-gray-900 dark:text-white">
            Volume
          </label>
        </div>
        {config.volume.enabled && (
          <div className="ml-6 text-xs text-gray-600 dark:text-gray-400">
            Displayed in separate pane below chart
          </div>
        )}
      </div>
    </div>
  );
};
