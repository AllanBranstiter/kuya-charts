import { useState, useEffect } from 'react';
import { ScreenerFilters, MarketCapRange, MARKET_CAP_RANGES } from '../types/screener';

interface ScreenerFiltersProps {
  filters: ScreenerFilters;
  sectors: string[];
  onFiltersChange: (filters: ScreenerFilters) => void;
  onClearFilters: () => void;
  loadingSectors?: boolean;
}

export default function ScreenerFiltersComponent({
  filters,
  sectors,
  onFiltersChange,
  onClearFilters,
  loadingSectors,
}: ScreenerFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ScreenerFilters>(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Apply filters with debounce
  const applyFilters = (newFilters: ScreenerFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleMarketCapChange = (range: MarketCapRange) => {
    applyFilters({
      ...localFilters,
      marketCapRange: range,
    });
  };

  const handleMinPriceChange = (value: string) => {
    applyFilters({
      ...localFilters,
      minPrice: value ? parseFloat(value) : undefined,
    });
  };

  const handleMaxPriceChange = (value: string) => {
    applyFilters({
      ...localFilters,
      maxPrice: value ? parseFloat(value) : undefined,
    });
  };

  const handleMinVolumeChange = (value: string) => {
    applyFilters({
      ...localFilters,
      minVolume: value ? parseInt(value, 10) : undefined,
    });
  };

  // Technical filter handlers
  const handleRsiMinChange = (value: string) => {
    applyFilters({
      ...localFilters,
      rsiMin: value ? parseFloat(value) : undefined,
    });
  };

  const handleRsiMaxChange = (value: string) => {
    applyFilters({
      ...localFilters,
      rsiMax: value ? parseFloat(value) : undefined,
    });
  };

  const handleRsiPreset = (min?: number, max?: number) => {
    applyFilters({
      ...localFilters,
      rsiMin: min,
      rsiMax: max,
    });
  };

  const handlePriceVsSma50Change = (value: string) => {
    applyFilters({
      ...localFilters,
      priceVsSma50: value ? (value as 'above' | 'below') : null,
    });
  };

  const handlePriceVsSma200Change = (value: string) => {
    applyFilters({
      ...localFilters,
      priceVsSma200: value ? (value as 'above' | 'below') : null,
    });
  };

  const handleVolumeSpikeChange = (value: string) => {
    applyFilters({
      ...localFilters,
      volumeSpikeMin: value ? parseFloat(value) : undefined,
    });
  };

  const handleSectorToggle = (sector: string) => {
    const newSectors = localFilters.sectors.includes(sector)
      ? localFilters.sectors.filter(s => s !== sector)
      : [...localFilters.sectors, sector];
    
    applyFilters({
      ...localFilters,
      sectors: newSectors,
    });
  };

  const handleSelectAllSectors = () => {
    applyFilters({
      ...localFilters,
      sectors: [...sectors],
    });
  };

  const handleClearAllSectors = () => {
    applyFilters({
      ...localFilters,
      sectors: [],
    });
  };

  // Count active filters
  const activeFilterCount =
    (localFilters.marketCapRange !== 'all' ? 1 : 0) +
    (localFilters.minPrice !== undefined ? 1 : 0) +
    (localFilters.maxPrice !== undefined ? 1 : 0) +
    (localFilters.minVolume !== undefined ? 1 : 0) +
    (localFilters.sectors.length > 0 ? 1 : 0) +
    (localFilters.rsiMin !== undefined || localFilters.rsiMax !== undefined ? 1 : 0) +
    (localFilters.priceVsSma50 ? 1 : 0) +
    (localFilters.priceVsSma200 ? 1 : 0) +
    (localFilters.volumeSpikeMin !== undefined ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {activeFilterCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
        <button
          onClick={onClearFilters}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          disabled={activeFilterCount === 0}
        >
          Clear All
        </button>
      </div>

      <div className="space-y-6">
        {/* Market Cap Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Market Cap
          </label>
          <select
            value={localFilters.marketCapRange}
            onChange={(e) => handleMarketCapChange(e.target.value as MarketCapRange)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {(Object.keys(MARKET_CAP_RANGES) as MarketCapRange[]).map((range) => (
              <option key={range} value={range}>
                {MARKET_CAP_RANGES[range].label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.minPrice ?? ''}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <span className="self-center text-gray-500">to</span>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Max"
                value={localFilters.maxPrice ?? ''}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Note: Price data not yet available
          </p>
        </div>

        {/* Volume Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Volume
          </label>
          <input
            type="number"
            placeholder="e.g., 1000000"
            value={localFilters.minVolume ?? ''}
            onChange={(e) => handleMinVolumeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="1000"
          />
          <p className="mt-1 text-xs text-gray-500">
            Note: Volume data not yet available
          </p>
        </div>

        {/* Sector Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Sectors
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllSectors}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={loadingSectors}
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleClearAllSectors}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={loadingSectors}
              >
                Clear
              </button>
            </div>
          </div>
          
          {loadingSectors ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading sectors...
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
              <div className="p-2 space-y-2">
                {sectors.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No sectors available</p>
                ) : (
                  sectors.map((sector) => (
                    <label
                      key={sector}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={localFilters.sectors.includes(sector)}
                        onChange={() => handleSectorToggle(sector)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{sector}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          {localFilters.sectors.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {localFilters.sectors.length} sector{localFilters.sectors.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Technical Filters Section */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-4">Technical Filters</h3>
          
          {/* RSI Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSI (Relative Strength Index)
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleRsiPreset(undefined, 30)}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.rsiMax === 30 && localFilters.rsiMin === undefined
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oversold (&lt;30)
              </button>
              <button
                onClick={() => handleRsiPreset(30, 70)}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.rsiMin === 30 && localFilters.rsiMax === 70
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Neutral (30-70)
              </button>
              <button
                onClick={() => handleRsiPreset(70, undefined)}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.rsiMin === 70 && localFilters.rsiMax === undefined
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Overbought (&gt;70)
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Min (0)"
                  value={localFilters.rsiMin ?? ''}
                  onChange={(e) => handleRsiMinChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
              <span className="self-center text-gray-500">to</span>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Max (100)"
                  value={localFilters.rsiMax ?? ''}
                  onChange={(e) => handleRsiMaxChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Price vs 50-day SMA */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price vs 50-day SMA
            </label>
            <select
              value={localFilters.priceVsSma50 || ''}
              onChange={(e) => handlePriceVsSma50Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="above">Above SMA (Bullish)</option>
              <option value="below">Below SMA (Bearish)</option>
            </select>
          </div>

          {/* Price vs 200-day SMA */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price vs 200-day SMA
            </label>
            <select
              value={localFilters.priceVsSma200 || ''}
              onChange={(e) => handlePriceVsSma200Change(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="above">Above SMA (Long-term Bullish)</option>
              <option value="below">Below SMA (Long-term Bearish)</option>
            </select>
          </div>

          {/* Volume Spike Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Volume Spike (vs 20-day avg)
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleVolumeSpikeChange('1.5')}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.volumeSpikeMin === 1.5
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1.5x
              </button>
              <button
                onClick={() => handleVolumeSpikeChange('2')}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.volumeSpikeMin === 2
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                2x
              </button>
              <button
                onClick={() => handleVolumeSpikeChange('3')}
                className={`px-3 py-1 text-xs rounded ${
                  localFilters.volumeSpikeMin === 3
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                3x
              </button>
            </div>
            <input
              type="number"
              placeholder="Custom minimum (e.g., 1.5)"
              value={localFilters.volumeSpikeMin ?? ''}
              onChange={(e) => handleVolumeSpikeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
