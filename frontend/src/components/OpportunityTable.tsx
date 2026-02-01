import { Opportunity, FilterState } from '../types/opportunity';
import { getAllExclusionReasons } from '../domain/filters';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';

interface OpportunityTableProps {
  opportunities: Opportunity[];
  onRowClick: (id: string) => void;
  filters: FilterState;
}

export default function OpportunityTable({ opportunities, onRowClick, filters }: OpportunityTableProps) {
  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toFixed(0);
  };

  const formatPercent = (pct: number) => {
    return pct.toFixed(2) + '%';
  };

  const getGapColor = (pct: number) => {
    if (pct >= 2) return 'text-green-400';
    if (pct >= 1) return 'text-green-300';
    if (pct >= 0.5) return 'text-yellow-300';
    return 'text-slate-400';
  };

  const getNetProfitColor = (pct: number) => {
    if (pct >= 2) return 'text-emerald-400 font-bold';
    if (pct >= 1) return 'text-emerald-300 font-semibold';
    if (pct >= 0.5) return 'text-green-300';
    return 'text-slate-400';
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Strategy</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Buy @ Exchange</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Sell @ Exchange</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Gap %</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Net Profit %</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Funding</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Networks</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Route</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Est Time</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Volume 24h</th>
            {filters.debugMode && (
              <th className="px-4 py-3 text-left text-xs font-semibold text-amber-300 uppercase tracking-wider">Excluded Reasons</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {opportunities.map((opp) => (
            <tr
              key={opp.id}
              onClick={() => onRowClick(opp.id)}
              className="hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              {/* Strategy */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${opp.type === 'SPOT_SPOT_HEDGE'
                    ? 'bg-blue-900/30 text-blue-300'
                    : opp.type === 'SPOT_FUTURES'
                      ? 'bg-purple-900/30 text-purple-300'
                      : opp.type === 'KIMP_OVERSEAS_TO_BITHUMB'
                        ? 'bg-emerald-900/30 text-emerald-300'
                        : 'bg-amber-900/30 text-amber-300'
                  }`}>
                  {opp.type === 'SPOT_SPOT_HEDGE' ? '🔄 Spot+Hedge' :
                    opp.type === 'SPOT_FUTURES' ? '📊 Spot-Futures' :
                      opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' ? '🌏→🇰🇷 KIMP' :
                        '🇰🇷→🌏 REV-KIMP'}
                </span>
              </td>

              {/* Symbol */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-semibold text-white">{opp.base}</div>
                <div className="text-xs text-slate-400">{opp.quote}</div>
              </td>

              {/* Buy @ Exchange */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-xs text-slate-400">
                  {opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' || opp.type === 'KIMP_BITHUMB_TO_OVERSEAS'
                    ? opp.fromExchangeId
                    : opp.buyExchange}
                </div>
                <div className="font-mono text-white">
                  {opp.quote === 'KRW'
                    ? `₩${formatPrice(opp.buyPrice)}`
                    : `$${formatPrice(opp.buyPrice)}`}
                </div>
              </td>

              {/* Sell @ Exchange */}
              <td className="px-4 py-3 whitespace-nowrap">
                {opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' || opp.type === 'KIMP_BITHUMB_TO_OVERSEAS' ? (
                  <>
                    <div className="text-xs text-slate-400">{opp.toExchangeId}</div>
                    <div className="font-mono text-white">
                      {opp.quote === 'KRW' && opp.type === 'KIMP_OVERSEAS_TO_BITHUMB'
                        ? `₩${formatPrice(opp.sellPrice!)}`
                        : opp.quote === 'KRW' && opp.type === 'KIMP_BITHUMB_TO_OVERSEAS'
                          ? `$${formatPrice(opp.sellPrice!)}`
                          : `$${formatPrice(opp.sellPrice!)}`}
                    </div>
                  </>
                ) : opp.type === 'SPOT_SPOT_HEDGE' ? (
                  <>
                    <div className="text-xs text-slate-400">{opp.sellExchange}</div>
                    <div className="font-mono text-white">${formatPrice(opp.sellPrice!)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-400">{opp.futuresExchange} Perp</div>
                    <div className="font-mono text-white">${formatPrice(opp.futuresPrice!)}</div>
                  </>
                )}
              </td>

              {/* Gap % */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className={`text-lg font-bold ${getGapColor(opp.grossGapPct)}`}>
                  {formatPercent(opp.grossGapPct)}
                </div>
              </td>

              {/* Net Profit % */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className={`text-base ${getNetProfitColor(opp.netProfitPct)}`}>
                  {formatPercent(opp.netProfitPct)}
                </div>
              </td>

              {/* Funding */}
              <td className="px-4 py-3 text-center whitespace-nowrap">
                {opp.fundingRate !== undefined ? (
                  <div>
                    <div className={`text-sm font-medium ${opp.fundingRate < 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {opp.fundingRate < 0 ? <TrendingDown className="inline w-3 h-3" /> : <TrendingUp className="inline w-3 h-3" />}
                      {' '}{formatPercent(opp.fundingRate)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(opp.nextFundingAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>

              {/* Networks */}
              <td className="px-4 py-3 text-center whitespace-nowrap">
                {opp.walletStatusOk ? (
                  <div>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-green-900/30 text-green-300 text-xs font-medium">
                      ✅ {opp.commonNetworks} net{opp.commonNetworks > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-red-900/30 text-red-300 text-xs font-medium">
                      ⚠️ 0 nets
                    </span>
                  </div>
                )}
              </td>

              {/* Route */}
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${opp.routeType === 'DIRECT'
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : 'bg-amber-900/30 text-amber-300'
                  }`}>
                  {opp.routeType}
                </span>
              </td>

              {/* Est Time */}
              <td className="px-4 py-3 text-center whitespace-nowrap">
                {opp.estTimeMins > 0 ? (
                  <div className="text-sm text-slate-300">
                    <Clock className="inline w-3 h-3 mr-1" />
                    {opp.estTimeMins}m
                  </div>
                ) : (
                  <span className="text-slate-500">Instant</span>
                )}
              </td>

              {/* Volume 24h */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className="text-sm text-slate-300">
                  <DollarSign className="inline w-3 h-3" />
                  {(opp.volume24hUsd / 1000).toFixed(0)}k
                </div>
              </td>

              {/* Debug: Excluded Reasons */}
              {filters.debugMode && (() => {
                const reasons = getAllExclusionReasons(opp, filters);
                return (
                  <td className="px-4 py-3 text-left">
                    {reasons.length > 0 ? (
                      <div className="space-y-1">
                        {reasons.map((reason, idx) => (
                          <div
                            key={idx}
                            className="inline-block px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs font-mono mr-1 mb-1"
                          >
                            {reason}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-green-400 text-xs font-semibold">✓ PASSES</span>
                    )}
                  </td>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>

      {opportunities.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No opportunities match your filters
        </div>
      )}
    </div>
  );
}
