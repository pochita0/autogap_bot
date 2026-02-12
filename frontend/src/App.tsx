import { useState, useMemo, useEffect } from 'react';
import FilterPanel from './components/FilterPanel';
import OpportunityTable from './components/OpportunityTable';
import DetailsModal from './components/DetailsModal';
import { getOpportunityDetail } from './data/dummyOpportunities';
import { FilterState, Opportunity } from './types/opportunity';
import { applyFilters } from './domain/filters';
import { fetchOpportunities, fetchPremiumOpportunities } from './services/api';
import { RefreshCw } from 'lucide-react';
import PremiumTable from './components/PremiumTable';
import PremiumDetailsModal from './components/PremiumDetailsModal';
import { PremiumOpportunity } from './types/premium';
import { Sidebar } from './components/Sidebar';
import { MarketInfoBar } from './components/MarketInfoBar';
import ExchangePairSelector from './components/ExchangePairSelector';

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

type ViewMode = 'opportunities' | 'kimchi' | 'domestic';
type DomesticDirection = 'upbit-bithumb' | 'bithumb-upbit';
type KimchiExchange = 'upbit' | 'bithumb';
type OverseasExchange = 'binance' | 'okx' | 'bybit';

function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [kimchiPremiums, setKimchiPremiums] = useState<PremiumOpportunity[]>([]);
  const [domesticPremiums, setDomesticPremiums] = useState<PremiumOpportunity[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kimchi');
  const [domesticDirection, setDomesticDirection] = useState<DomesticDirection>('upbit-bithumb');
  const [kimchiDomesticExchange, setKimchiDomesticExchange] = useState<KimchiExchange>('upbit');
  const [kimchiOverseasExchange, setKimchiOverseasExchange] = useState<OverseasExchange>('binance');
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    count: number;
    total?: number;
    filteredOut?: number;
  }>({ count: 0 });

  // Fetch opportunities from backend API (silent refresh)
  const loadOpportunities = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const { opportunities: data, metadata: meta } = await fetchOpportunities(filters);
      setOpportunities(data);
      setMetadata(meta);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      if (!silent) setError('Failed to load opportunities.');
    } finally {
      setIsLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Fetch kimchi premium opportunities (silent refresh)
  const loadKimchiPremiums = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      const krwExchange = kimchiDomesticExchange.toUpperCase();
      const globalExchange = kimchiOverseasExchange.toUpperCase();

      const data = await fetchPremiumOpportunities('kimchi', undefined, krwExchange, globalExchange);
      setKimchiPremiums(data);
    } catch (err) {
      console.error('Failed to load kimchi premiums:', err);
      if (!silent) setError('Failed to load kimchi premiums.');
    } finally {
      setIsLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Fetch domestic premium opportunities (silent refresh)
  const loadDomesticPremiums = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await fetchPremiumOpportunities('domestic');
      setDomesticPremiums(data);
    } catch (err) {
      console.error('Failed to load domestic premiums:', err);
      if (!silent) setError('Failed to load domestic premiums.');
    } finally {
      setIsLoading(false);
      setIsFirstLoad(false);
    }
  };

  // No need to filter kimchi premiums - backend already filters by selected exchanges
  // Just pass through the data as-is
  const filteredKimchiPremiums = kimchiPremiums;

  // Load opportunities on mount and when filters change
  useEffect(() => {
    if (viewMode === 'opportunities') {
      loadOpportunities();
    } else if (viewMode === 'kimchi') {
      loadKimchiPremiums();
    } else if (viewMode === 'domestic') {
      loadDomesticPremiums();
    }
  }, [filters, viewMode, kimchiDomesticExchange, kimchiOverseasExchange]);

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

  // Silent background refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'opportunities') {
        loadOpportunities(true);
      } else if (viewMode === 'kimchi') {
        loadKimchiPremiums(true);
      } else if (viewMode === 'domestic') {
        loadDomesticPremiums(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [viewMode, kimchiDomesticExchange, kimchiOverseasExchange]);

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
    } else if (viewMode === 'kimchi') {
      loadKimchiPremiums();
    } else if (viewMode === 'domestic') {
      loadDomesticPremiums();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'opportunities') {
      loadOpportunities();
    } else if (mode === 'kimchi') {
      loadKimchiPremiums();
    } else if (mode === 'domestic') {
      loadDomesticPremiums();
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      {/* Sidebar */}
      <Sidebar viewMode={viewMode} onViewModeChange={handleViewModeChange} />

      {/* Filter Panel - Only show for opportunities view */}
      {viewMode === 'opportunities' && (
        <FilterPanel filters={filters} onFiltersChange={setFilters} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Market Info Bar - Always visible at the very top */}
        <MarketInfoBar />

        {/* Header */}
        <div className="bg-[#0f1419] border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {viewMode === 'kimchi' && '김치 프리미엄'}
                {viewMode === 'domestic' && '국내 프리미엄'}
                {viewMode === 'opportunities' && 'Gap Dashboard'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {viewMode === 'kimchi' && '국내와 해외의 거래소의 가격차이를 확인하세요.'}
                {viewMode === 'domestic' && '국내 거래소 간의 가격차이를 확인하세요.'}
                {viewMode === 'opportunities' && 'Real-time arbitrage opportunities across exchanges'}
              </p>

              {/* 김치 프리미엄 거래소 선택 */}
              {viewMode === 'kimchi' && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-[220px]">
                    <ExchangePairSelector
                      label="국내 거래소"
                      selectedValue={kimchiDomesticExchange}
                      onChange={(v) => setKimchiDomesticExchange(v as KimchiExchange)}
                      pairs={[
                        { value: 'upbit', leftExchange: 'upbit', leftLabel: '업비트 KRW', rightExchange: '', rightLabel: '' },
                        { value: 'bithumb', leftExchange: 'bithumb', leftLabel: '빗썸 KRW', rightExchange: '', rightLabel: '' },
                      ]}
                    />
                  </div>
                  <div className="w-[220px]">
                    <ExchangePairSelector
                      label="해외 거래소"
                      selectedValue={kimchiOverseasExchange}
                      onChange={(v) => setKimchiOverseasExchange(v as OverseasExchange)}
                      pairs={[
                        { value: 'binance', leftExchange: 'binance', leftLabel: '바이낸스 USDT', rightExchange: '', rightLabel: '' },
                        { value: 'okx', leftExchange: 'okx', leftLabel: 'OKX USDT', rightExchange: '', rightLabel: '' },
                        { value: 'bybit', leftExchange: 'bybit', leftLabel: '바이빗 USDT', rightExchange: '', rightLabel: '' },
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* 국내 프리미엄 방향 선택 */}
              {viewMode === 'domestic' && (
                <div className="mt-3 w-[340px]">
                  <ExchangePairSelector
                    label="비교 거래소"
                    selectedValue={domesticDirection}
                    onChange={(v) => setDomesticDirection(v as DomesticDirection)}
                    pairs={[
                      { value: 'upbit-bithumb', leftExchange: 'upbit', leftLabel: '업비트 KRW', rightExchange: 'bithumb', rightLabel: '빗썸 KRW' },
                      { value: 'bithumb-upbit', leftExchange: 'bithumb', leftLabel: '빗썸 KRW', rightExchange: 'upbit', rightLabel: '업비트 KRW' },
                    ]}
                  />
                </div>
              )}
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
                      {viewMode === 'kimchi' ? filteredKimchiPremiums.length : domesticPremiums.length} premium opportunities
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
          {isFirstLoad && isLoading && (
            <div className="mt-3 text-xs text-blue-400">⟳ 데이터 불러오는 중...</div>
          )}
          {error && (
            <div className="mt-3 text-xs text-red-400">⚠ {error}</div>
          )}
        </div>

        {/* Opportunity Table or Premium Table */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'opportunities' ? (
            <OpportunityTable
              opportunities={sortedOpportunities}
              onRowClick={setSelectedOppId}
              filters={filters}
            />
          ) : viewMode === 'kimchi' ? (
            <PremiumTable
              opportunities={filteredKimchiPremiums}
              onRowClick={setSelectedOppId}
              type="kimchi"
              kimchiDomesticExchange={kimchiDomesticExchange}
              kimchiOverseasExchange={kimchiOverseasExchange}
            />
          ) : (
            <PremiumTable
              opportunities={domesticPremiums}
              onRowClick={setSelectedOppId}
              type="domestic"
              direction={domesticDirection}
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
      {(viewMode === 'kimchi' || viewMode === 'domestic') && selectedOppId && (() => {
        const premiums = viewMode === 'kimchi' ? filteredKimchiPremiums : domesticPremiums;
        const selectedPremium = premiums.find(opp => opp.id === selectedOppId);
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
