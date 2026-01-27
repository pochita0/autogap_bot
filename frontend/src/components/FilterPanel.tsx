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

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto scrollbar-thin">
      <h2 className="text-xl font-bold text-white mb-6">Filters</h2>

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
          minGapPct: 0.5,
          maxGapPct: 100,
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
