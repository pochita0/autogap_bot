import { useState, useMemo, useEffect } from 'react';
import FilterPanel from './components/FilterPanel';
import OpportunityTable from './components/OpportunityTable';
import DetailsModal from './components/DetailsModal';
import { getOpportunityDetail } from './data/dummyOpportunities';
import { FilterState, Opportunity } from './types/opportunity';
import { applyFilters } from './domain/filters';
import { fetchOpportunities, getCurrentDataSource, setDataSource as setDataSourceStorage, getDataSourceInfo, DataSource, fetchPremiumOpportunities } from './services/api';
import { RefreshCw, Database, LayoutGrid } from 'lucide-react';
import PremiumTable from './components/PremiumTable';
import PremiumDetailsModal from './components/PremiumDetailsModal';
import { PremiumOpportunity } from './types/premium';

const DEFAULT_FILTERS: FilterState = {
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
};

type ViewMode = 'opportunities' | 'premiums';

function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [dataSource, setDataSourceState] = useState<DataSource>(getCurrentDataSource());
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [premiumOpportunities, setPremiumOpportunities] = useState<PremiumOpportunity[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('opportunities');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch opportunities from backend API
  const loadOpportunities = async (dataset: DataSource) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOpportunities(dataset);
      setOpportunities(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      setError('Failed to load opportunities. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch premium opportunities from backend API
  const loadPremiumOpportunities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchPremiumOpportunities();
      setPremiumOpportunities(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load premium opportunities:', err);
      setError('Failed to load premium opportunities. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle data source switch
  const handleDataSourceChange = async (newSource: DataSource) => {
    setDataSourceStorage(newSource);
    setDataSourceState(newSource);
    await loadOpportunities(newSource);
  };

  // Load opportunities on mount
  useEffect(() => {
    if (viewMode === 'opportunities') {
      loadOpportunities(dataSource);
    } else {
      loadPremiumOpportunities();
    }
  }, []);

  // Load filters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gap-dashboard-filters');
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage on change
  useEffect(() => {
    localStorage.setItem('gap-dashboard-filters', JSON.stringify(filters));
  }, [filters]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'opportunities') {
        loadOpportunities(dataSource);
      } else {
        loadPremiumOpportunities();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [dataSource, viewMode]);

  // Filter opportunities based on filters
  // In debug mode, show ALL opportunities; otherwise, filter normally
  const filteredOpportunities = useMemo(() => {
    if (filters.debugMode) {
      // Debug mode: show all opportunities
      return opportunities;
    } else {
      // Normal mode: apply filters using centralized domain logic
      return applyFilters(opportunities, filters);
    }
  }, [opportunities, filters]);

  // Sort by net profit (descending)
  const sortedOpportunities = useMemo(() => {
    return [...filteredOpportunities].sort((a, b) => b.netProfitPct - a.netProfitPct);
  }, [filteredOpportunities]);

  const selectedOppDetail = useMemo(() => {
    if (!selectedOppId) return null;
    return getOpportunityDetail(selectedOppId);
  }, [selectedOppId]);

  const handleRefresh = () => {
    if (viewMode === 'opportunities') {
      loadOpportunities(dataSource);
    } else {
      loadPremiumOpportunities();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'opportunities') {
      loadOpportunities(dataSource);
    } else {
      loadPremiumOpportunities();
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Filter Panel */}
      <FilterPanel filters={filters} onFiltersChange={setFilters} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Gap Dashboard</h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time arbitrage opportunities across exchanges
              </p>

              {/* View Mode Selector */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleViewModeChange('opportunities')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'opportunities'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3 inline mr-1" />
                  Arbitrage Opportunities
                </button>
                <button
                  onClick={() => handleViewModeChange('premiums')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'premiums'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  🇰🇷 Premium Opportunities (김프/역프)
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="text-slate-400">
                  {filters.debugMode && viewMode === 'opportunities' ? (
                    <span className="text-amber-400 font-semibold">🔧 DEBUG MODE</span>
                  ) : (
                    'Showing'
                  )}
                </div>
                <div className="text-white font-semibold">
                  {viewMode === 'opportunities' ? (
                    filters.debugMode ? (
                      `All ${opportunities.length} opportunities`
                    ) : (
                      `${sortedOpportunities.length} of ${opportunities.length} opportunities`
                    )
                  ) : (
                    `${premiumOpportunities.length} premium opportunities`
                  )}
                </div>
              </div>

              {/* Data Source Switcher (only for opportunities view) */}
              {viewMode === 'opportunities' && (
                <div className="relative group">
                  <button
                    onClick={() => handleDataSourceChange(dataSource === 'dummy' ? 'golden' : 'dummy')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      dataSource === 'golden'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    title={`Switch to ${dataSource === 'dummy' ? 'Golden Fixtures' : 'Dummy Data'}`}
                  >
                    <Database className="w-4 h-4" />
                    {dataSource === 'golden' ? 'Golden' : 'Dummy'}
                  </button>
                  <div className="absolute right-0 mt-2 w-64 bg-slate-700 rounded-lg shadow-xl p-3 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-semibold text-white mb-1">
                      {getDataSourceInfo(dataSource).label}
                    </div>
                    <div>{getDataSourceInfo(dataSource).description}</div>
                    <div className="mt-1 text-slate-400">
                      {opportunities.length} opportunities
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-3">
            <span>Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 3s</span>
            <span className="text-slate-500">|</span>
            {viewMode === 'opportunities' ? (
              <span className={dataSource === 'golden' ? 'text-amber-400 font-semibold' : ''}>
                Dataset: {getDataSourceInfo(dataSource).label}
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                Live Premium Data (김프/역프)
              </span>
            )}
            {isLoading && <span className="text-blue-400">⟳ Loading...</span>}
            {error && <span className="text-red-400">⚠ {error}</span>}
          </div>
        </div>

        {/* Opportunity Table or Premium Table */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'opportunities' ? (
            <OpportunityTable
              opportunities={sortedOpportunities}
              onRowClick={setSelectedOppId}
              filters={filters}
            />
          ) : (
            <PremiumTable
              opportunities={premiumOpportunities}
              onRowClick={setSelectedOppId}
            />
          )}
        </div>
      </div>

      {/* Details Modal */}
      {viewMode === 'opportunities' && selectedOppDetail && (
        <DetailsModal
          opportunity={selectedOppDetail}
          onClose={() => setSelectedOppId(null)}
        />
      )}

      {/* Premium Details Modal */}
      {viewMode === 'premiums' && selectedOppId && (() => {
        const selectedPremium = premiumOpportunities.find(opp => opp.id === selectedOppId);
        return selectedPremium ? (
          <PremiumDetailsModal
            opportunity={selectedPremium}
            onClose={() => setSelectedOppId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

export default App;
