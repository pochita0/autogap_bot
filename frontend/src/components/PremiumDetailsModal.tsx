import { X, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { PremiumOpportunity } from '../types/premium';
import ExecutionStepper, { ExecutionStep, StepStatus } from './ExecutionStepper';
import { API_BASE_URL } from '../services/api';

interface PremiumDetailsModalProps {
  opportunity: PremiumOpportunity;
  onClose: () => void;
}

const EXECUTION_STEPS: ExecutionStep[] = [
  { id: 'precheck', label: 'Precheck (주소/네트워크/상태 확인)' },
  { id: 'buy_fxs', label: 'Buy FXS on Bithumb (KRW)' },
  { id: 'withdraw_fxs', label: 'Withdraw FXS → Binance (XRP network etc.)' },
  { id: 'deposit_confirmed', label: 'Binance Deposit Confirmed' },
  { id: 'convert_fxs_frax', label: 'Convert FXS → FRAX (Binance Convert)' },
  { id: 'sell_frax', label: 'Sell FRAX (USDT)' },
];

export default function PremiumDetailsModal({ opportunity, onClose }: PremiumDetailsModalProps) {
  const [statusByStepId, setStatusByStepId] = useState<Record<string, StepStatus>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  };

  const buyPrice = opportunity.kind === 'KIMCHI' ? opportunity.globalAskKRW : opportunity.krwAsk;
  const sellPrice = opportunity.kind === 'KIMCHI' ? opportunity.krwBid : opportunity.globalBidKRW;

  const handleReset = () => {
    setStatusByStepId({});
    setCurrentStep(0);
    setIsExecuting(false);
  };

  const runPrecheck = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/precheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'KIMCHI_FXS_CONVERT',
          displaySymbol: opportunity.displaySymbol,
          krwExchange: opportunity.krwExchange,
          globalExchange: opportunity.globalExchange,
          krwSymbol: opportunity.krwSymbol,
          globalSymbol: opportunity.globalSymbol,
        }),
      });

      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Precheck call failed, falling back to mock OK:', error);
      return true; // Fallback to mock OK
    }
  };

  const handleStartExecution = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    handleReset();

    // Step 1: Precheck
    setCurrentStep(1);
    setStatusByStepId({ precheck: 'ACTIVE' });

    // Call real precheck API
    await new Promise((resolve) => setTimeout(resolve, 500));
    const precheckOk = await runPrecheck();

    if (!precheckOk) {
      setStatusByStepId({ precheck: 'FAILED' });
      setIsExecuting(false);
      return;
    }

    setStatusByStepId((prev) => ({ ...prev, precheck: 'DONE' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 2: Buy FXS
    setCurrentStep(2);
    setStatusByStepId((prev) => ({ ...prev, buy_fxs: 'ACTIVE' }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatusByStepId((prev) => ({ ...prev, buy_fxs: 'DONE' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 3: Withdraw FXS
    setCurrentStep(3);
    setStatusByStepId((prev) => ({ ...prev, withdraw_fxs: 'ACTIVE' }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatusByStepId((prev) => ({ ...prev, withdraw_fxs: 'DONE' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 4: Deposit Confirmed
    setCurrentStep(4);
    setStatusByStepId((prev) => ({ ...prev, deposit_confirmed: 'ACTIVE' }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatusByStepId((prev) => ({ ...prev, deposit_confirmed: 'DONE' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 5: Convert FXS → FRAX
    setCurrentStep(5);
    setStatusByStepId((prev) => ({ ...prev, convert_fxs_frax: 'ACTIVE' }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatusByStepId((prev) => ({ ...prev, convert_fxs_frax: 'DONE' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 6: Sell FRAX
    setCurrentStep(6);
    setStatusByStepId((prev) => ({ ...prev, sell_frax: 'ACTIVE' }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatusByStepId((prev) => ({ ...prev, sell_frax: 'DONE' }));

    setIsExecuting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {opportunity.kind === 'KIMCHI' ? '🇰🇷 김프' : '🌍 역프'} Premium Details
            </h2>
            <div className="text-sm text-slate-400 mt-1">
              {opportunity.displaySymbol} • {opportunity.direction === 'GLOBAL_TO_KRW' ? 'Global → KRW' : 'KRW → Global'}
            </div>
            {opportunity.isAliasPair && (
              <div className="text-xs text-amber-400 mt-1">
                ⚠ Alias Pair: {opportunity.krwSymbol} (KRW) ↔ {opportunity.globalSymbol} (Global)
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">Buy Price (KRW)</div>
                <div className="text-xl font-bold text-white">₩{formatPrice(buyPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Sell Price (KRW)</div>
                <div className="text-xl font-bold text-white">₩{formatPrice(sellPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Gap %</div>
                <div className={`text-xl font-bold ${
                  Math.abs(opportunity.gapPct) >= 2
                    ? opportunity.gapPct >= 0 ? 'text-green-400' : 'text-red-400'
                    : Math.abs(opportunity.gapPct) >= 1
                      ? opportunity.gapPct >= 0 ? 'text-green-300' : 'text-red-300'
                      : opportunity.gapPct >= 0 ? 'text-yellow-300' : 'text-orange-300'
                }`}>
                  {(opportunity.gapPct >= 0 ? '+' : '')}{opportunity.gapPct.toFixed(2)}%
                </div>
              </div>
              <div className="relative group">
                <div className="text-xs text-slate-400 mb-1">
                  FX Rate {opportunity.fxStale && <span className="text-amber-400">(stale)</span>}
                </div>
                <div className="text-lg font-semibold text-white">
                  {opportunity.fxRateMid.toFixed(2)} KRW/USDT
                </div>
                <div className="text-xs text-slate-500">
                  {opportunity.fxSource}
                </div>
                {/* Tooltip with bid/ask details */}
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-700 rounded-lg shadow-xl p-3 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="font-semibold text-white mb-2">FX Rate Details</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Bid (sell USDT):</span>
                      <span className="text-white">{opportunity.fxRateBid.toFixed(2)} KRW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mid (display):</span>
                      <span className="text-white">{opportunity.fxRateMid.toFixed(2)} KRW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ask (buy USDT):</span>
                      <span className="text-white">{opportunity.fxRateAsk.toFixed(2)} KRW</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
                      <span>Spread:</span>
                      <span className="text-blue-300">{((opportunity.fxRateAsk - opportunity.fxRateBid) / opportunity.fxRateBid * 100).toFixed(3)}%</span>
                    </div>
                  </div>
                  <div className="text-slate-400 mt-2 text-[10px]">
                    Source: {opportunity.fxSource} • Updated: {new Date(opportunity.fxTimestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Execution (MVP) */}
          {opportunity.isAliasPair && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">실행 (MVP)</h3>
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <div className="flex gap-6">
                  {/* Left: CTA Button */}
                  <div className="flex-1">
                    <button
                      onClick={handleStartExecution}
                      disabled={isExecuting}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-base transition-all ${
                        isExecuting
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                      }`}
                    >
                      <Play className="w-5 h-5" />
                      바이낸스에서 FXS 입금 → FRAX로 컨버트 → 판매
                    </button>
                    <div className="text-xs text-slate-400 mt-2 text-center">
                      현재는 실행 프리뷰(모의 진행)만 지원
                    </div>

                    {/* Reset Button */}
                    {currentStep > 0 && (
                      <button
                        onClick={handleReset}
                        disabled={isExecuting}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Right: Stepper */}
                  <div className="flex-1 border-l border-blue-800/30 pl-6">
                    <ExecutionStepper
                      steps={EXECUTION_STEPS}
                      statusByStepId={statusByStepId}
                      currentStep={currentStep}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Exchange Quotes */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Exchange Quotes</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* KRW Exchange */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm font-semibold text-emerald-300 mb-2">
                  {opportunity.krwExchange}
                </div>
                <div className="text-xs text-slate-400 mb-1">{opportunity.krwMarket}</div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Bid:</span>
                    <span className="text-sm text-white font-mono">₩{formatPrice(opportunity.krwBid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Ask:</span>
                    <span className="text-sm text-white font-mono">₩{formatPrice(opportunity.krwAsk)}</span>
                  </div>
                </div>
              </div>

              {/* Global Exchange */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-300 mb-2">
                  {opportunity.globalExchange}
                </div>
                <div className="text-xs text-slate-400 mb-1">{opportunity.globalMarket}</div>
                {opportunity.calculation && (
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Bid (USDT):</span>
                      <span className="text-sm text-white font-mono">${formatPrice(opportunity.calculation.usdtBid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Ask (USDT):</span>
                      <span className="text-sm text-white font-mono">${formatPrice(opportunity.calculation.usdtAsk)}</span>
                    </div>
                    <div className="h-px bg-slate-600 my-2"></div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Bid (KRW):</span>
                      <span className="text-sm text-emerald-300 font-mono">₩{formatPrice(opportunity.globalBidKRW)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Ask (KRW):</span>
                      <span className="text-sm text-emerald-300 font-mono">₩{formatPrice(opportunity.globalAskKRW)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
            <h3 className="text-amber-400 font-semibold mb-2">⚠️ Important Notes</h3>
            <ul className="text-xs text-amber-200/80 space-y-1">
              <li>• This is DISPLAY ONLY - no execution capabilities in this version</li>
              <li>• Prices use conservative bid/ask values (no market orders)</li>
              <li>• Gap % does not include trading fees, withdrawal fees, or slippage</li>
              <li>• Actual profit will be lower due to costs and market impact</li>
              <li>• FX rate may fluctuate during transfer, affecting final profit</li>
            </ul>
          </div>

          {/* Metadata */}
          <div className="text-xs text-slate-500 border-t border-slate-700 pt-4">
            <div className="flex justify-between">
              <span>Updated:</span>
              <span>{new Date(opportunity.updatedAt).toLocaleString('ko-KR')}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>ID:</span>
              <span className="font-mono">{opportunity.id}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
