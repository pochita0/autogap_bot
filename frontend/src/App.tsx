import { useState, useMemo, useEffect } from 'react';
import FilterPanel from './components/FilterPanel';
import OpportunityTable from './components/OpportunityTable';
import DetailsModal from './components/DetailsModal';
import { getOpportunityDetail } from './data/dummyOpportunities';
import { FilterState, Opportunity } from './types/opportunity';
import { applyFilters } from './domain/filters';
import { fetchOpportunities, fetchPremiumOpportunities } from './services/api';
import { RefreshCw, LayoutGrid } from 'lucide-react';
import PremiumTable from './components/PremiumTable';
import PremiumDetailsModal from './components/PremiumDetailsModal';
import { PremiumOpportunity } from './types/premium';

const DEFAULT_FILTERS: FilterState = {
  // Data Quality Filters (conservative defaults)
  minVolumeUsd24h: 200000,           // $200k minimum volume
  excludeIfVolumeMissing: true,      // Exclude missing volume
  minPriceUsd: 0.01,                 // $0.01 minimum price
  maxGapPct: 50,                     // 50% max gap
  maxSpreadPct: 1.0,                 // 1% max spread
  maxQuoteAgeSeconds: 5,             // 5 second max age

  // Execution Feasibility Filters
  requireCommonOpenNetwork: true,    // Require common network
  requireDepositAddress: true,       // Require deposit address

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
};

type ViewMode = 'opportunities' | 'premiums';

function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [premiumOpportunities, setPremiumOpportunities] = useState<PremiumOpportunity[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('opportunities');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    count: number;
    total?: number;
    filteredOut?: number;
  }>({ count: 0 });

  // Fetch opportunities from backend API (live mode only)
  const loadOpportunities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { opportunities: data, metadata: meta } = await fetchOpportunities(filters);
      setOpportunities(data);
      setMetadata(meta);
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

  // Load opportunities on mount and when filters change
  useEffect(() => {
    if (viewMode === 'opportunities') {
      loadOpportunities();
    } else {
      loadPremiumOpportunities();
    }
  }, [filters]);

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
        loadOpportunities();
      } else {
        loadPremiumOpportunities();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [viewMode]);

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
      loadOpportunities();
    } else {
      loadPremiumOpportunities();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'opportunities') {
      loadOpportunities();
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
                {viewMode === 'opportunities' ? (
                  <>
                    <div className="text-slate-400">
                      {filters.debugMode ? (
                        <span className="text-amber-400 font-semibold">🔧 DEBUG MODE (showing all with exclusion reasons)</span>
                      ) : (
                        'Showing'
                      )}
                    </div>
                    <div className="text-white font-semibold">
                      {metadata.total !== undefined ? (
                        <>
                          {metadata.count} of {metadata.total} opportunities
                          {metadata.filteredOut !== undefined && metadata.filteredOut > 0 && !filters.debugMode && (
                            <span className="text-orange-400 ml-2 text-xs">
                              (filtered out {metadata.filteredOut})
                            </span>
                          )}
                        </>
                      ) : (
                        `${sortedOpportunities.length} opportunities`
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-slate-400">Showing</div>
                    <div className="text-white font-semibold">
                      {premiumOpportunities.length} premium opportunities
                    </div>
                  </>
                )}
              </div>

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
            <span className="text-emerald-400 font-semibold">
              🔴 {viewMode === 'opportunities' ? 'Live Arbitrage Data' : 'Live Premium Data (김프/역프)'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-300">FX: Bithumb USDT/KRW</span>
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
