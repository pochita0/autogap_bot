import { PremiumOpportunity } from '../types/premium';

interface PremiumTableProps {
  opportunities: PremiumOpportunity[];
  onRowClick: (id: string) => void;
}

export default function PremiumTable({ opportunities, onRowClick }: PremiumTableProps) {
  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
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

  // Sort by gap % descending
  const sortedOpportunities = [...opportunities].sort((a, b) => b.gapPct - a.gapPct);

  return (
    <div className="flex-1 overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Direction</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Buy Price (KRW)</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Sell Price (KRW)</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Gap %</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">FX Rate</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedOpportunities.map((opp) => {
            // For 김프: buy = globalAskKRW, sell = krwBid
            // For 역프: buy = krwAsk, sell = globalBidKRW
            const buyPrice = opp.kind === 'KIMCHI' ? opp.globalAskKRW : opp.krwAsk;
            const sellPrice = opp.kind === 'KIMCHI' ? opp.krwBid : opp.globalBidKRW;

            return (
              <tr
                key={opp.id}
                onClick={() => onRowClick(opp.id)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                {/* Type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    opp.kind === 'KIMCHI'
                      ? 'bg-emerald-900/30 text-emerald-300'
                      : 'bg-amber-900/30 text-amber-300'
                  }`}>
                    {opp.kind === 'KIMCHI' ? '🇰🇷 김프' : '🌍 역프'}
                  </span>
                </td>

                {/* Symbol */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-semibold text-white">{opp.displaySymbol}</div>
                  {opp.isAliasPair ? (
                    <div className="text-xs text-amber-400/80">
                      {opp.krwExchange}: {opp.krwSymbol} / {opp.globalExchange}: {opp.globalSymbol}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">{opp.krwMarket.split('/')[1]}</div>
                  )}
                </td>

                {/* Direction */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs">
                    {opp.direction === 'GLOBAL_TO_KRW' ? (
                      <>
                        <div className="text-slate-400">{opp.globalExchange}</div>
                        <div className="text-slate-500">→</div>
                        <div className="text-slate-400">{opp.krwExchange}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-slate-400">{opp.krwExchange}</div>
                        <div className="text-slate-500">→</div>
                        <div className="text-slate-400">{opp.globalExchange}</div>
                      </>
                    )}
                  </div>
                </td>

                {/* Buy Price */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="font-mono text-white">
                    ₩{formatPrice(buyPrice)}
                  </div>
                </td>

                {/* Sell Price */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="font-mono text-white">
                    ₩{formatPrice(sellPrice)}
                  </div>
                </td>

                {/* Gap % */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className={`font-bold font-mono ${getGapColor(opp.gapPct)}`}>
                    {formatPercent(opp.gapPct)}
                  </div>
                </td>

                {/* FX Rate */}
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="text-xs text-slate-400">
                    {opp.usdtKrw.toFixed(2)}
                  </div>
                </td>

                {/* Updated */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs text-slate-400">
                    {new Date(opp.updatedAt).toLocaleTimeString('ko-KR')}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedOpportunities.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No premium opportunities available</p>
          <p className="text-xs mt-2">Premium opportunities appear when price differences exist between exchanges</p>
        </div>
      )}
    </div>
  );
}
