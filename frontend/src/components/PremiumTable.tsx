import { useState, useEffect, useRef, useCallback } from 'react';
import { PremiumOpportunity } from '../types/premium';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TokenDetailModal } from './TokenDetailModal';

interface PremiumTableProps {
  opportunities: PremiumOpportunity[];
  onRowClick: (id: string) => void;
  type?: 'kimchi' | 'domestic';
  direction?: 'upbit-bithumb' | 'bithumb-upbit';
  kimchiDomesticExchange?: 'upbit' | 'bithumb';
  kimchiOverseasExchange?: 'binance' | 'okx' | 'bybit';
}

type SortOrder = 'desc' | 'asc';

interface NetworkStatus {
  depositStatus: 'OPEN' | 'CLOSED';
  withdrawStatus: 'OPEN' | 'CLOSED';
}

interface TokenNetworkStatuses {
  [symbol: string]: {
    upbit?: NetworkStatus;
    bithumb?: NetworkStatus;
  };
}

export default function PremiumTable({ opportunities, type = 'kimchi', direction = 'upbit-bithumb', kimchiDomesticExchange = 'upbit', kimchiOverseasExchange = 'binance' }: PremiumTableProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [networkStatuses, setNetworkStatuses] = useState<TokenNetworkStatuses>({});

  // Price flash animation tracking
  const prevPricesRef = useRef<Record<string, { top: number; bottom: number }>>({});
  const [flashMap, setFlashMap] = useState<Record<string, { top: 'up' | 'down' | null; bottom: 'up' | 'down' | null }>>({});
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Helper to get flash CSS class
  const getFlashClass = useCallback((symbol: string, position: 'top' | 'bottom') => {
    const flash = flashMap[symbol];
    if (!flash) return '';
    const dir = flash[position];
    if (dir === 'up') return 'price-flash-up';
    if (dir === 'down') return 'price-flash-down';
    return '';
  }, [flashMap]);


  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  };

  const formatVolume = (volumeKrw: number) => {
    const inEok = volumeKrw / 100_000_000;

    if (inEok >= 10000) { // 1조 이상
      return (inEok / 10000).toFixed(2) + '조';
    } else if (inEok >= 100) {
      return inEok.toFixed(0) + '억'; // 100억 이상은 소수점 제거
    } else if (inEok >= 10) {
      return inEok.toFixed(1) + '억';
    } else {
      return inEok.toFixed(2) + '억';
    }
  };

  const formatPercent = (pct: number) => {
    return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  };

  const getGapColor = (pct: number) => {
    if (pct >= 0) return 'text-green-400';
    return 'text-red-400';
  };

  const getChangeColor = (pct: number) => {
    if (pct > 0) return 'text-green-400';
    if (pct < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Group opportunities by symbol and keep only the best premium per symbol
  // Prioritize positive premiums, then highest absolute value
  const groupedBySymbol = new Map<string, PremiumOpportunity>();

  // console.log(`[PremiumTable] Received ${opportunities.length} opportunities`);

  for (const opp of opportunities) {
    const existing = groupedBySymbol.get(opp.displaySymbol);
    if (!existing) {
      // No existing entry, add this one
      groupedBySymbol.set(opp.displaySymbol, opp);
    } else {
      // Prioritize positive premiums over negative ones
      const existingIsPositive = existing.gapPct > 0;
      const oppIsPositive = opp.gapPct > 0;

      if (oppIsPositive && !existingIsPositive) {
        // New one is positive, existing is negative → replace
        groupedBySymbol.set(opp.displaySymbol, opp);
      } else if (oppIsPositive === existingIsPositive) {
        // Both positive or both negative → pick higher absolute value
        if (Math.abs(opp.gapPct) > Math.abs(existing.gapPct)) {
          groupedBySymbol.set(opp.displaySymbol, opp);
        }
      }
      // If existing is positive and new is negative → keep existing (don't replace)
    }
  }

  // console.log(`[PremiumTable] Grouped into ${groupedBySymbol.size} unique symbols`);

  // Calculate displayed premium based on UI direction selection
  const getDisplayedPremium = (opp: PremiumOpportunity) => {
    // opp.direction from backend:
    // - 'BITHUMB_TO_UPBIT' means Upbit is more expensive (positive gap)
    // - 'UPBIT_TO_BITHUMB' means Bithumb is more expensive (positive gap)

    // UI direction selection:
    // - 'upbit-bithumb' means "Upbit - Bithumb" → show positive when Upbit > Bithumb
    // - 'bithumb-upbit' means "Bithumb - Upbit" → show positive when Bithumb > Upbit

    if (direction === 'upbit-bithumb') {
      // Show positive when Upbit > Bithumb
      return opp.direction === 'BITHUMB_TO_UPBIT' ? opp.gapPct : -opp.gapPct;
    } else {
      // Show positive when Bithumb > Upbit
      return opp.direction === 'UPBIT_TO_BITHUMB' ? opp.gapPct : -opp.gapPct;
    }
  };

  // Sort by displayed gap % based on current sort order
  // desc = positive (green) first, asc = negative (red) first
  const sortedOpportunities = Array.from(groupedBySymbol.values()).sort((a, b) => {
    const displayedA = getDisplayedPremium(a);
    const displayedB = getDisplayedPremium(b);
    return sortOrder === 'desc' ? displayedB - displayedA : displayedA - displayedB;
  });

  // Fetch network statuses for all tokens
  useEffect(() => {
    const fetchNetworkStatuses = async () => {
      const symbols = sortedOpportunities.map(opp => opp.displaySymbol); // Fetch all tokens

      const statuses: TokenNetworkStatuses = {};

      // Fetch in batches of 20 to avoid overwhelming the server
      const batchSize = 20;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (symbol) => {
            try {
              const response = await fetch(`http://localhost:4000/wallet-networks?symbol=${symbol}`);
              if (response.ok) {
                const data = await response.json();

                // Check ALL networks for each exchange - if ANY network is closed, mark as closed
                const upbitAllOpen = data.upbit && data.upbit.length > 0 &&
                  data.upbit.every((net: any) => net.depositStatus === 'OPEN' && net.withdrawStatus === 'OPEN');

                const bithumbAllOpen = data.bithumb && data.bithumb.length > 0 &&
                  data.bithumb.every((net: any) => net.depositStatus === 'OPEN' && net.withdrawStatus === 'OPEN');

                const upbitStatus = data.upbit && data.upbit.length > 0 ? {
                  depositStatus: upbitAllOpen ? 'OPEN' : 'CLOSED',
                  withdrawStatus: upbitAllOpen ? 'OPEN' : 'CLOSED',
                } : undefined;

                const bithumbStatus = data.bithumb && data.bithumb.length > 0 ? {
                  depositStatus: bithumbAllOpen ? 'OPEN' : 'CLOSED',
                  withdrawStatus: bithumbAllOpen ? 'OPEN' : 'CLOSED',
                } : undefined;

                statuses[symbol] = {
                  upbit: upbitStatus as NetworkStatus | undefined,
                  bithumb: bithumbStatus as NetworkStatus | undefined,
                };
              }
            } catch (error) {
              console.error(`Failed to fetch network status for ${symbol}:`, error);
            }
          })
        );
      }

      setNetworkStatuses(statuses);
    };

    if (sortedOpportunities.length > 0) {
      fetchNetworkStatuses();
    }
  }, [sortedOpportunities.length, type, kimchiDomesticExchange]); // Re-fetch when opportunities, type, or selected exchange changes

  return (
    <div className="h-full overflow-auto scrollbar-thin bg-[#151823]">
      <table className="w-full text-sm table-fixed" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <colgroup>
          <col />
          <col style={{ width: '170px' }} />
          <col style={{ width: '140px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '150px' }} />
        </colgroup>
        <thead className="sticky top-0 bg-[#1a1d28] border-b border-slate-700 z-10">
          <tr>
            {/* 아톰 (Symbol) */}
            <th className="px-4 py-3 text-left text-xs font-normal text-slate-400">아톰</th>

            {/* 현재가 (Current Price) - Show two prices for kimchi */}
            <th className="px-4 py-3 text-right text-xs font-normal text-slate-400">현재가</th>

            {/* 김프/프리미엄 (Premium %) - Sortable */}
            <th
              className="px-4 py-3 text-right text-xs font-normal text-slate-400 cursor-pointer hover:text-white transition-colors select-none"
              onClick={toggleSortOrder}
              title="Click to toggle sort order"
            >
              <div className="flex items-center justify-end gap-1">
                <span>{type === 'kimchi' ? '김프' : '프리미엄'}</span>
                {sortOrder === 'desc' ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </div>
            </th>

            {/* 전일대비 (Daily Change) */}
            <th className="px-4 py-3 text-right text-xs font-normal text-slate-400">전일대비</th>

            {/* 거래대금 (24h Volume) */}
            <th className="px-4 py-3 text-right text-xs font-normal text-slate-400">거래대금</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/30">
          {sortedOpportunities.map((opp) => {
            // For domestic premiums, correctly map exchange prices based on backend direction
            // Backend: krwExchange is the "more expensive" side, globalExchange is the "cheaper" side
            // opp.direction BITHUMB_TO_UPBIT: krw=UPBIT, global=BITHUMB
            // opp.direction UPBIT_TO_BITHUMB: krw=BITHUMB, global=UPBIT
            let upbitPrice = 0;
            let bithumbPrice = 0;
            let upbitVolume24hUsd = 0;
            let bithumbVolume24hUsd = 0;
            if (type === 'domestic') {
              if (opp.direction === 'BITHUMB_TO_UPBIT') {
                // krw fields = Upbit, global fields = Bithumb
                upbitPrice = opp.krwLast || (opp.krwBid + opp.krwAsk) / 2;
                bithumbPrice = opp.globalLast || (opp.globalBid + opp.globalAsk) / 2;
                upbitVolume24hUsd = opp.krwVolume24hUsd || 0;
                bithumbVolume24hUsd = opp.globalVolume24hUsd || 0;
              } else {
                // krw fields = Bithumb, global fields = Upbit
                bithumbPrice = opp.krwLast || (opp.krwBid + opp.krwAsk) / 2;
                upbitPrice = opp.globalLast || (opp.globalBid + opp.globalAsk) / 2;
                bithumbVolume24hUsd = opp.krwVolume24hUsd || 0;
                upbitVolume24hUsd = opp.globalVolume24hUsd || 0;
              }
            }

            // Calculate 24h volume in KRW
            // For domestic: use properly mapped upbit/bithumb volumes
            // For kimchi: top = domestic exchange, bottom = overseas exchange
            let topVolume24hKrw = 0;
            let bottomVolume24hKrw = 0;
            if (type === 'domestic') {
              const firstVolume = direction === 'upbit-bithumb' ? upbitVolume24hUsd : bithumbVolume24hUsd;
              const secondVolume = direction === 'upbit-bithumb' ? bithumbVolume24hUsd : upbitVolume24hUsd;
              topVolume24hKrw = firstVolume ? firstVolume * opp.usdtKrw : 0;
              bottomVolume24hKrw = secondVolume ? secondVolume * opp.usdtKrw : 0;
            } else {
              topVolume24hKrw = opp.krwVolume24hUsd ? opp.krwVolume24hUsd * opp.usdtKrw : 0;
              bottomVolume24hKrw = opp.globalVolume24hUsd ? opp.globalVolume24hUsd * opp.usdtKrw : 0;
            }

            // Calculate Change Rates
            let change1 = 0;
            let change2 = 0;

            if (type === 'domestic') {
              // opp.krwChangeRate is Upbit, opp.globalChangeRate is Bithumb
              const upbitChange = opp.krwChangeRate || 0;
              const bithumbChange = opp.globalChangeRate || 0;

              if (direction === 'upbit-bithumb') {
                change1 = upbitChange;
                change2 = bithumbChange;
              } else {
                change1 = bithumbChange;
                change2 = upbitChange;
              }
            } else {
              change1 = opp.krwChangeRate || 0;
              change2 = opp.globalChangeRate || 0;
            }

            const isExpanded = expandedTokenId === opp.id;

            return (
              <>
                <tr
                  key={opp.id}
                  onClick={() => setExpandedTokenId(isExpanded ? null : opp.id)}
                  className="bg-[#1a1d28] hover:bg-[#252935] cursor-pointer transition-colors"
                >
                  {/* Symbol with icon */}
                  <td className="px-4 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Token logo with wallet badge underneath */}
                      <div className="flex flex-col items-center gap-0.5">
                        <img
                          src={`https://static.upbit.com/logos/${opp.displaySymbol}.png`}
                          alt={opp.displaySymbol}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            // Fallback to a default crypto icon if image fails to load
                            e.currentTarget.src = `https://cryptoicon-api.pages.dev/api/icon/${opp.displaySymbol.toLowerCase()}`;
                          }}
                        />
                        {/* Wallet icon badge underneath - green if BOTH exchanges have deposit/withdraw open, red otherwise */}
                        {(() => {
                          const statuses = networkStatuses[opp.displaySymbol];

                          // Don't show wallet badge if status is not loaded
                          if (!statuses) return null;

                          let isFullyOpen = false;

                          if (type === 'kimchi') {
                            // Kimchi: Check selected domestic exchange + overseas (we don't have overseas network status yet, so just check domestic)
                            const domesticStatus = statuses[kimchiDomesticExchange];
                            // TODO: Add overseas exchange status check when available
                            // For now, just check domestic exchange
                            isFullyOpen = domesticStatus ?
                              (domesticStatus.depositStatus === 'OPEN' && domesticStatus.withdrawStatus === 'OPEN') :
                              false;
                          } else {
                            // Domestic: Check BOTH upbit and bithumb
                            const upbitStatus = statuses.upbit;
                            const bithumbStatus = statuses.bithumb;

                            const upbitOpen = upbitStatus ?
                              (upbitStatus.depositStatus === 'OPEN' && upbitStatus.withdrawStatus === 'OPEN') :
                              false;
                            const bithumbOpen = bithumbStatus ?
                              (bithumbStatus.depositStatus === 'OPEN' && bithumbStatus.withdrawStatus === 'OPEN') :
                              false;

                            // Both must be open
                            isFullyOpen = upbitOpen && bithumbOpen;
                          }

                          const bgColor = isFullyOpen ? 'bg-green-600' : 'bg-red-600';

                          return (
                            <div className={`w-5 h-5 rounded ${bgColor} flex items-center justify-center`}>
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Korean name and Symbol */}
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm">{opp.koreanName || opp.displaySymbol}</div>
                        <div className="text-xs text-slate-500">{opp.displaySymbol}</div>
                      </div>
                    </div>
                  </td>

                  {/* Current Price - Show both prices with flash animation */}
                  <td className="px-4 py-1.5 text-right whitespace-nowrap">
                    {type === 'domestic' ? (
                      <div className="space-y-0.5">
                        {(() => {
                          const firstPrice = direction === 'upbit-bithumb' ? upbitPrice : bithumbPrice;
                          const secondPrice = direction === 'upbit-bithumb' ? bithumbPrice : upbitPrice;

                          // Track prices and trigger flash
                          const sym = opp.displaySymbol;
                          const prev = prevPricesRef.current[sym];
                          if (prev) {
                            const newFlash: { top: 'up' | 'down' | null; bottom: 'up' | 'down' | null } = { top: null, bottom: null };
                            let changed = false;
                            if (firstPrice > prev.top) { newFlash.top = 'up'; changed = true; }
                            else if (firstPrice < prev.top) { newFlash.top = 'down'; changed = true; }
                            if (secondPrice > prev.bottom) { newFlash.bottom = 'up'; changed = true; }
                            else if (secondPrice < prev.bottom) { newFlash.bottom = 'down'; changed = true; }
                            if (changed) {
                              // Use setTimeout to batch flash updates after render
                              setTimeout(() => {
                                setFlashMap(prev => ({ ...prev, [sym]: newFlash }));
                                // Clear flash after animation
                                if (flashTimersRef.current[sym]) clearTimeout(flashTimersRef.current[sym]);
                                flashTimersRef.current[sym] = setTimeout(() => {
                                  setFlashMap(prev => ({ ...prev, [sym]: { top: null, bottom: null } }));
                                }, 800);
                              }, 0);
                            }
                          }
                          prevPricesRef.current[sym] = { top: firstPrice, bottom: secondPrice };

                          return (
                            <>
                              <div className={`text-white text-sm rounded px-1 -mx-1 ${getFlashClass(sym, 'top')}`} key={`${sym}-top-${flashMap[sym]?.top}`}>{formatPrice(firstPrice)}</div>
                              <div className={`text-slate-400 text-sm rounded px-1 -mx-1 ${getFlashClass(sym, 'bottom')}`} key={`${sym}-bot-${flashMap[sym]?.bottom}`}>{formatPrice(secondPrice)}</div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      // Kimchi: Show domestic (KRW) and overseas (converted to KRW)
                      (() => {
                        const topPrice = opp.krwLast || (opp.krwBid + opp.krwAsk) / 2;
                        const bottomPrice = opp.globalLastKRW || (opp.globalBidKRW + opp.globalAskKRW) / 2;
                        const sym = opp.displaySymbol;
                        const prev = prevPricesRef.current[sym];
                        if (prev) {
                          const newFlash: { top: 'up' | 'down' | null; bottom: 'up' | 'down' | null } = { top: null, bottom: null };
                          let changed = false;
                          if (topPrice > prev.top) { newFlash.top = 'up'; changed = true; }
                          else if (topPrice < prev.top) { newFlash.top = 'down'; changed = true; }
                          if (bottomPrice > prev.bottom) { newFlash.bottom = 'up'; changed = true; }
                          else if (bottomPrice < prev.bottom) { newFlash.bottom = 'down'; changed = true; }
                          if (changed) {
                            setTimeout(() => {
                              setFlashMap(prev => ({ ...prev, [sym]: newFlash }));
                              if (flashTimersRef.current[sym]) clearTimeout(flashTimersRef.current[sym]);
                              flashTimersRef.current[sym] = setTimeout(() => {
                                setFlashMap(prev => ({ ...prev, [sym]: { top: null, bottom: null } }));
                              }, 800);
                            }, 0);
                          }
                        }
                        prevPricesRef.current[sym] = { top: topPrice, bottom: bottomPrice };

                        return (
                          <div className="space-y-0.5">
                            <div className={`text-white text-sm rounded px-1 -mx-1 ${getFlashClass(sym, 'top')}`} key={`${sym}-top-${flashMap[sym]?.top}`}>{formatPrice(topPrice)}</div>
                            <div className={`text-slate-400 text-sm rounded px-1 -mx-1 ${getFlashClass(sym, 'bottom')}`} key={`${sym}-bot-${flashMap[sym]?.bottom}`}>{formatPrice(bottomPrice)}</div>
                          </div>
                        );
                      })()
                    )}
                  </td>

                  {/* Premium % with absolute value */}
                  <td className="px-4 py-1.5 text-right whitespace-nowrap">
                    {type === 'domestic' ? (
                      (() => {
                        // Calculate displayed premium based on direction
                        const displayedPremium = getDisplayedPremium(opp);
                        return (
                          <div className="space-y-0.5">
                            <div className={`font-medium text-sm ${getGapColor(displayedPremium)}`}>
                              {formatPercent(displayedPremium)}
                            </div>
                            <div className="text-slate-500 text-xs">
                              ${Math.abs(displayedPremium * ((opp.krwBid + opp.krwAsk) / 2) / 100).toFixed(2)}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // Kimchi premium
                      <div className="space-y-0.5">
                        <div className={`font-medium text-sm ${getGapColor(opp.gapPct)}`}>
                          {formatPercent(opp.gapPct)}
                        </div>
                        <div className="text-slate-500 text-xs">
                          ${Math.abs(opp.gapPct * ((opp.globalBid + opp.globalAsk) / 2) / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Daily Change - Show actual data */}
                  <td className="px-4 py-1.5 text-right whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className={`text-sm ${getChangeColor(change1)}`}>
                        {formatPercent(change1)}
                      </div>
                      <div className={`text-xs ${getChangeColor(change2)}`}>
                        {formatPercent(change2)}
                      </div>
                    </div>
                  </td>

                  {/* 24h Volume - Show both exchanges, matching price row order */}
                  <td className="px-4 py-1.5 text-right whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="text-slate-300 text-sm">
                        {topVolume24hKrw > 0 ? formatVolume(topVolume24hKrw) : '-'}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {bottomVolume24hKrw > 0 ? formatVolume(bottomVolume24hKrw) : '-'}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Expanded Chart Row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="bg-[#0e1218] border-t border-slate-800 animate-slideDown">
                        <TokenDetailModal
                          isOpen={true}
                          onClose={() => setExpandedTokenId(null)}
                          symbol={opp.displaySymbol}
                          koreanName={opp.koreanName}
                          type={type}
                          domesticExchange={kimchiDomesticExchange}
                          overseasExchange={kimchiOverseasExchange}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      {sortedOpportunities.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>프리미엄 기회가 없습니다</p>
          <p className="text-xs mt-2">거래소 간 가격 차이가 발생하면 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
