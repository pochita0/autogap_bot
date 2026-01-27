import { X, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { OpportunityDetail } from '../types/opportunity';

interface DetailsModalProps {
  opportunity: OpportunityDetail | null;
  onClose: () => void;
}

export default function DetailsModal({ opportunity, onClose }: DetailsModalProps) {
  if (!opportunity) return null;

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toFixed(0);
  };

  const formatPercent = (pct: number) => pct.toFixed(2) + '%';

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'CEX_WITHDRAW':
        return '📤';
      case 'BRIDGE_TRANSFER':
        return '🌉';
      case 'ONCHAIN_SWAP':
        return '🔄';
      case 'CEX_DEPOSIT_WAIT':
        return '📥';
      case 'UNWRAP_TO_NATIVE':
        return '📦';
      default:
        return '•';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {opportunity.base}/{opportunity.quote}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {opportunity.type === 'SPOT_SPOT_HEDGE' ? '🔄 Spot-Spot + Hedge' : '📊 Spot-Futures'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Buy Leg */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">📈 BUY LEG</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">Exchange</div>
                <div className="text-base font-semibold text-white">{opportunity.buyExchange}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Market</div>
                <div className="text-base font-mono text-white">{opportunity.legs.spotBuy.market}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Price (ask)</div>
                <div className="text-lg font-bold text-white">${formatPrice(opportunity.buyPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Volume 24h</div>
                <div className="text-base text-white">${(opportunity.legs.spotBuy.volume24h / 1000).toFixed(0)}k</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Est. Slippage</div>
                <div className="text-base text-white">{opportunity.legs.spotBuy.estSlippageBps} bps</div>
              </div>
            </div>
          </div>

          {/* Sell Leg */}
          {opportunity.sellPrice && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">📉 SELL LEG</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Exchange</div>
                  <div className="text-base font-semibold text-white">{opportunity.sellExchange}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Market</div>
                  <div className="text-base font-mono text-white">{opportunity.legs.spotSell?.market}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Price (bid)</div>
                  <div className="text-lg font-bold text-white">${formatPrice(opportunity.sellPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Volume 24h</div>
                  <div className="text-base text-white">${(opportunity.legs.spotSell?.volume24h! / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Est. Slippage</div>
                  <div className="text-base text-white">{opportunity.legs.spotSell?.estSlippageBps} bps</div>
                </div>
              </div>
            </div>
          )}

          {/* Futures Hedge Leg */}
          {opportunity.futuresPrice && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">🔒 HEDGE LEG (Futures Short)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Exchange</div>
                  <div className="text-base font-semibold text-white">{opportunity.futuresExchange}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Market</div>
                  <div className="text-base font-mono text-white">{opportunity.legs.futuresShort?.market}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Mark Price</div>
                  <div className="text-lg font-bold text-white">${formatPrice(opportunity.legs.futuresShort?.markPrice!)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Index Price</div>
                  <div className="text-base text-white">${formatPrice(opportunity.legs.futuresShort?.indexPrice!)}</div>
                </div>
                {opportunity.fundingRate !== undefined && (
                  <>
                    <div>
                      <div className="text-xs text-slate-400">Funding Rate</div>
                      <div className={`text-base font-semibold ${
                        opportunity.fundingRate < 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercent(opportunity.fundingRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Next Funding</div>
                      <div className="text-base text-white">
                        {new Date(opportunity.nextFundingAt!).toLocaleTimeString()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Transfer Route */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">🛣️ TRANSFER ROUTE</h3>

            <div className="mb-4">
              <div className="flex items-center gap-4 text-sm">
                <span className={`px-3 py-1 rounded font-medium ${
                  opportunity.routeType === 'DIRECT'
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : 'bg-amber-900/30 text-amber-300'
                }`}>
                  {opportunity.routeType}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {opportunity.transferRoute.estTotalTimeMins} mins
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${opportunity.transferRoute.estTotalCostUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Route Steps */}
            <div className="space-y-3">
              {opportunity.transferRoute.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-lg">
                      {getStepIcon(step.type)}
                    </div>
                    {idx < opportunity.transferRoute.steps.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-600 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 bg-slate-800 rounded p-3">
                    <div className="font-medium text-white text-sm">
                      {step.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {step.fromNetworkId && `From: ${step.fromNetworkId}`}
                      {step.toNetworkId && ` → To: ${step.toNetworkId}`}
                      {step.providerId && ` (${step.providerId})`}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-slate-400">
                        <Clock className="inline w-3 h-3" /> {step.estTimeMins}m
                      </span>
                      <span className="text-slate-400">
                        <DollarSign className="inline w-3 h-3" /> ${step.estCostUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Common Networks (for DIRECT) */}
            {opportunity.transferRoute.commonNetworks && (
              <div className="mt-4 p-3 bg-slate-800 rounded">
                <div className="text-xs font-semibold text-slate-400 mb-2">Available Networks:</div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.transferRoute.commonNetworks.map(net => (
                    <span key={net} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">
                      {net}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Flags */}
            {opportunity.transferRoute.riskFlags.length > 0 && (
              <div className="mt-4 p-3 bg-amber-900/20 border border-amber-900/30 rounded">
                <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Flags
                </div>
                <div className="space-y-1">
                  {opportunity.transferRoute.riskFlags.map(flag => (
                    <div key={flag} className="text-xs text-amber-200/80">
                      • {flag.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profitability Breakdown */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">💰 PROFITABILITY BREAKDOWN</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Gross Gap:</span>
                <span className="text-green-400 font-semibold">{formatPercent(opportunity.profitBreakdown.grossPct)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Trading Fees:</span>
                <span className="text-red-400">-{formatPercent(opportunity.profitBreakdown.tradingFeesPct)}</span>
              </div>
              {opportunity.profitBreakdown.withdrawFeePct && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Withdraw Fee:</span>
                  <span className="text-red-400">-{formatPercent(opportunity.profitBreakdown.withdrawFeePct)}</span>
                </div>
              )}
              {opportunity.profitBreakdown.bridgeCostPct && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Bridge Cost:</span>
                  <span className="text-red-400">-{formatPercent(opportunity.profitBreakdown.bridgeCostPct)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Slippage:</span>
                <span className="text-red-400">-{formatPercent(opportunity.profitBreakdown.slippagePct)}</span>
              </div>
              {opportunity.profitBreakdown.timeRiskPct && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time Risk:</span>
                  <span className="text-red-400">-{formatPercent(opportunity.profitBreakdown.timeRiskPct)}</span>
                </div>
              )}
              <div className="border-t border-slate-600 my-2"></div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">NET PROFIT:</span>
                <span className={`${
                  opportunity.profitBreakdown.netPct >= 1 ? 'text-emerald-400' : 'text-green-400'
                }`}>
                  {formatPercent(opportunity.profitBreakdown.netPct)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions (Phase 2) */}
          <div className="flex gap-3">
            <button
              disabled
              className="flex-1 py-3 bg-slate-700 text-slate-500 rounded-lg font-medium cursor-not-allowed"
            >
              PRECHECK (Phase 2)
            </button>
            <button
              disabled
              className="flex-1 py-3 bg-slate-700 text-slate-500 rounded-lg font-medium cursor-not-allowed"
            >
              ENTER POSITION (Phase 2)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
