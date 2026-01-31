import { FilterState } from '../types/opportunity';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export default function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const exchanges = ['Binance', 'Upbit', 'Bithumb', 'Bybit', 'OKX'];

  const handleExchangeToggle = (exchange: string) => {
    const newExcludes = filters.excludeExchanges.includes(exchange)
      ? filters.excludeExchanges.filter(e => e !== exchange)
      : [...filters.excludeExchanges, exchange];

    onFiltersChange({ ...filters, excludeExchanges: newExcludes });
  };

  const volumePresets = [
    { label: '200k', value: 200000 },
    { label: '500k', value: 500000 },
    { label: '1M', value: 1000000 },
    { label: '5M', value: 5000000 },
  ];

  const applyPreset = (preset: 'STRICT' | 'NORMAL' | 'LOOSE') => {
    const presets = {
      STRICT: {
        ...filters,
        minVolumeUsd24h: 200000,
        excludeIfVolumeMissing: true,
        minPriceUsd: 0.01,
        maxGapPct: 50,
        maxSpreadPct: 1.0,
        maxQuoteAgeSeconds: 5,
        requireCommonOpenNetwork: true,
        requireDepositAddress: true,
      },
      NORMAL: {
        ...filters,
        minVolumeUsd24h: 200000,
        excludeIfVolumeMissing: false,
        minPriceUsd: 0.01,
        maxGapPct: 50,
        maxSpreadPct: 2.0,
        maxQuoteAgeSeconds: 10,
        requireCommonOpenNetwork: true,
        requireDepositAddress: false,
      },
      LOOSE: {
        ...filters,
        minVolumeUsd24h: 0,
        excludeIfVolumeMissing: false,
        minPriceUsd: 0.001,
        maxGapPct: 100,
        maxSpreadPct: 5.0,
        maxQuoteAgeSeconds: 20,
        requireCommonOpenNetwork: false,
        requireDepositAddress: false,
      },
    };

    onFiltersChange(presets[preset]);
  };

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto scrollbar-thin">
      <h2 className="text-xl font-bold text-white mb-6">Filters</h2>

      {/* Filter Presets */}
      <div className="mb-6 p-3 bg-blue-900/20 border border-blue-800/30 rounded">
        <h3 className="text-xs font-semibold text-blue-300 mb-2">Quick Presets</h3>
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset('STRICT')}
            className="flex-1 px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-200 text-xs rounded transition-colors"
          >
            STRICT
          </button>
          <button
            onClick={() => applyPreset('NORMAL')}
            className="flex-1 px-2 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/50 text-blue-200 text-xs rounded transition-colors"
          >
            NORMAL
          </button>
          <button
            onClick={() => applyPreset('LOOSE')}
            className="flex-1 px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-800/50 text-green-200 text-xs rounded transition-colors"
          >
            LOOSE
          </button>
        </div>
      </div>

      {/* Data Quality Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">📊 Data Quality</h3>

        {/* Min Volume */}
        <div className="mb-3">
          <label className="text-xs text-slate-400">Min 24h Volume (USD)</label>
          <input
            type="number"
            step="100000"
            value={filters.minVolumeUsd24h}
            onChange={(e) => onFiltersChange({ ...filters, minVolumeUsd24h: parseFloat(e.target.value) || 0 })}
            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1 mt-1">
            {volumePresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => onFiltersChange({ ...filters, minVolumeUsd24h: preset.value })}
                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exclude if Volume Missing */}
        <label className="flex items-center mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.excludeIfVolumeMissing}
            onChange={(e) => onFiltersChange({ ...filters, excludeIfVolumeMissing: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">Exclude if volume missing</span>
        </label>

        {/* Min Price */}
        <div className="mb-3">
          <label className="text-xs text-slate-400">Min Price (USD)</label>
          <input
            type="number"
            step="0.01"
            value={filters.minPriceUsd}
            onChange={(e) => onFiltersChange({ ...filters, minPriceUsd: parseFloat(e.target.value) || 0 })}
            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Spread */}
        <div className="mb-3">
          <label className="text-xs text-slate-400">Max Spread (%)</label>
          <input
            type="number"
            step="0.1"
            value={filters.maxSpreadPct}
            onChange={(e) => onFiltersChange({ ...filters, maxSpreadPct: parseFloat(e.target.value) || 1.0 })}
            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Quote Age */}
        <div className="mb-3">
          <label className="text-xs text-slate-400">Max Quote Age (seconds)</label>
          <input
            type="number"
            step="1"
            value={filters.maxQuoteAgeSeconds}
            onChange={(e) => onFiltersChange({ ...filters, maxQuoteAgeSeconds: parseFloat(e.target.value) || 5 })}
            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Execution Feasibility Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">⚙️ Execution Feasibility</h3>

        <label className="flex items-center mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.requireCommonOpenNetwork}
            onChange={(e) => onFiltersChange({ ...filters, requireCommonOpenNetwork: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">Require common open network</span>
        </label>

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.requireDepositAddress}
            onChange={(e) => onFiltersChange({ ...filters, requireDepositAddress: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">Require deposit address</span>
        </label>
      </div>

      {/* Strategy Type */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Strategy Type</h3>
        <label className="flex items-center mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showSpotSpotHedge}
            onChange={(e) => onFiltersChange({ ...filters, showSpotSpotHedge: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">🔄 Spot-Spot + Hedge</span>
        </label>
        <label className="flex items-center mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showSpotFutures}
            onChange={(e) => onFiltersChange({ ...filters, showSpotFutures: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">📊 Spot-Futures</span>
        </label>
        <label className="flex items-center mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showKimpOverseasToBithumb}
            onChange={(e) => onFiltersChange({ ...filters, showKimpOverseasToBithumb: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">🌏→🇰🇷 Kimchi Premium</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showKimpBithumbToOverseas}
            onChange={(e) => onFiltersChange({ ...filters, showKimpBithumbToOverseas: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">🇰🇷→🌏 Reverse Kimchi</span>
        </label>
      </div>

      {/* Gap Range */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Gap Range (%)</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Min Gap</label>
            <input
              type="number"
              step="0.1"
              value={filters.minGapPct}
              onChange={(e) => onFiltersChange({ ...filters, minGapPct: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Max Gap</label>
            <input
              type="number"
              step="0.1"
              value={filters.maxGapPct}
              onChange={(e) => onFiltersChange({ ...filters, maxGapPct: parseFloat(e.target.value) || 100 })}
              className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Net Profit Minimum */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Min Net Profit (%)</h3>
        <input
          type="number"
          step="0.1"
          value={filters.minNetProfitPct}
          onChange={(e) => onFiltersChange({ ...filters, minNetProfitPct: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Exchange Exclusion */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Exclude Exchanges</h3>
        <div className="space-y-2">
          {exchanges.map(exchange => (
            <label key={exchange} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeExchanges.includes(exchange)}
                onChange={() => handleExchangeToggle(exchange)}
                className="w-4 h-4 text-red-600 bg-slate-700 border-slate-600 rounded focus:ring-red-500"
              />
              <span className="ml-2 text-sm text-slate-300">{exchange}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Network & Route Options */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Network & Route</h3>
        <label className="flex items-center mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.onlyOpenNetworks}
            onChange={(e) => onFiltersChange({ ...filters, onlyOpenNetworks: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">Only OPEN Networks</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.allowBridgeRoutes}
            onChange={(e) => onFiltersChange({ ...filters, allowBridgeRoutes: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-300">Allow BRIDGE Routes</span>
        </label>
      </div>

      {/* Developer Options */}
      <div className="mb-6 pb-6 border-t border-slate-700 pt-6">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">🔧 Developer</h3>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.debugMode}
            onChange={(e) => onFiltersChange({ ...filters, debugMode: e.target.checked })}
            className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
          />
          <span className="ml-2 text-sm text-amber-300">Debug Mode</span>
        </label>
        {filters.debugMode && (
          <div className="mt-2 p-2 bg-amber-900/20 border border-amber-900/30 rounded text-xs text-amber-200">
            Shows all opportunities with exclusion reasons
          </div>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={() => onFiltersChange({
          // Data Quality Filters
          minVolumeUsd24h: 200000,
          excludeIfVolumeMissing: true,
          minPriceUsd: 0.01,
          maxGapPct: 50,
          maxSpreadPct: 1.0,
          maxQuoteAgeSeconds: 5,
          // Execution Feasibility Filters
          requireCommonOpenNetwork: true,
          requireDepositAddress: true,
          // Existing Filters
          minGapPct: 0.5,
          excludeExchanges: [],
          showSpotSpotHedge: true,
          showSpotFutures: true,
          showKimpOverseasToBithumb: true,
          showKimpBithumbToOverseas: true,
          onlyOpenNetworks: true,
          allowBridgeRoutes: false,
          minNetProfitPct: 0.3,
          debugMode: false,
        })}
        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}
