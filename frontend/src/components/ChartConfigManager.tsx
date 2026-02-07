import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChartConfig } from '../types/chartConfig';
import { getChartConfigs, deleteChartConfig } from '../services/chartConfigApi';

interface ChartConfigManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConfig: (config: ChartConfig) => void;
}

export default function ChartConfigManager({ isOpen, onClose, onLoadConfig }: ChartConfigManagerProps) {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ChartConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Load configs when modal opens and user is authenticated
  useEffect(() => {
    if (isOpen && user) {
      loadConfigs();
    }
  }, [isOpen, user]);

  const loadConfigs = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const data = await getChartConfigs();
      setConfigs(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configurations';
      setError(errorMessage);
      console.error('Error loading chart configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError('');

    try {
      await deleteChartConfig(id);
      setConfigs(configs.filter(c => c.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete configuration';
      setError(errorMessage);
      console.error('Error deleting chart config:', err);
    }
  };

  const handleLoad = (config: ChartConfig) => {
    onLoadConfig(config);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIndicatorSummary = (config: ChartConfig) => {
    const indicators = config.config_data.indicators;
    const enabledIndicators: string[] = [];

    if (indicators.sma?.enabled) enabledIndicators.push('SMA');
    if (indicators.ema?.enabled) enabledIndicators.push('EMA');
    if (indicators.bollingerBands?.enabled) enabledIndicators.push('BB');
    if (indicators.vwap?.enabled) enabledIndicators.push('VWAP');
    if (indicators.pivotPoints?.enabled) enabledIndicators.push('Pivot');
    if (indicators.volume?.enabled) enabledIndicators.push('Vol');
    if (indicators.rsi?.enabled) enabledIndicators.push('RSI');
    if (indicators.macd?.enabled) enabledIndicators.push('MACD');
    if (indicators.stochastic?.enabled) enabledIndicators.push('Stoch');

    return enabledIndicators.length > 0 ? enabledIndicators.join(', ') : 'No indicators';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Saved Chart Configurations
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md" style={{
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
            }}>
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
              <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading configurations...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && configs.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 mb-4"
                style={{ color: 'var(--text-tertiary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                No saved configurations
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Save your current chart setup to access it later
              </p>
            </div>
          )}

          {/* Configurations List */}
          {!loading && configs.length > 0 && (
            <div className="space-y-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {config.config_name}
                      </h3>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Saved {formatDate(config.created_at)}
                        {config.updated_at !== config.created_at && (
                          <> • Updated {formatDate(config.updated_at)}</>
                        )}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Indicators: {getIndicatorSummary(config)}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleLoad(config)}
                        className="px-3 py-2 text-sm rounded-md text-white transition-colors min-h-[44px]"
                        style={{ backgroundColor: 'var(--accent)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                        title="Load this configuration"
                      >
                        Load
                      </button>
                      
                      {deleteConfirmId === config.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="px-2 py-2 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                            title="Confirm delete"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-2 text-xs rounded-md transition-colors"
                            style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(config.id)}
                          className="p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fee';
                            e.currentTarget.style.color = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          title="Delete configuration"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 sm:p-6" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-md transition-colors min-h-[44px]"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
