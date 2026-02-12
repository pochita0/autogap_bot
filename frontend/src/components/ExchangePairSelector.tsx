import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ExchangePair {
  value: string;
  leftExchange: string;
  leftLabel: string;
  rightExchange: string;
  rightLabel: string;
}

interface ExchangePairSelectorProps {
  pairs: ExchangePair[];
  selectedValue: string;
  onChange: (value: string) => void;
  label?: string;
}

// Exchange icon mapping - uses actual favicon PNGs
const EXCHANGE_ICONS: Record<string, string> = {
  upbit: '/exchange-icons/upbit.png',
  bithumb: '/exchange-icons/bithumb.png',
  binance: '/exchange-icons/binance.png',
  okx: '/exchange-icons/okx.png',
  bybit: '/exchange-icons/bybit.png',
};

export function ExchangeLogo({ exchange, className = 'w-5 h-5' }: { exchange: string; className?: string }) {
  const key = exchange.toLowerCase();
  const iconUrl = EXCHANGE_ICONS[key];

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={exchange}
        className={`${className} rounded-sm object-contain flex-shrink-0`}
      />
    );
  }

  // Fallback for unknown exchanges
  return (
    <div className={`${className} rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold text-[9px] leading-none">{exchange.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function PairDisplay({ pair }: { pair: ExchangePair }) {
  const isSingle = !pair.rightExchange;
  return (
    <div className="flex items-center gap-2">
      <ExchangeLogo exchange={pair.leftExchange} />
      <span className="text-white text-sm font-medium whitespace-nowrap">{pair.leftLabel}</span>
      {!isSingle && (
        <>
          <span className="text-slate-500 text-xs mx-0.5">-</span>
          <ExchangeLogo exchange={pair.rightExchange} />
          <span className="text-white text-sm font-medium whitespace-nowrap">{pair.rightLabel}</span>
        </>
      )}
    </div>
  );
}

export default function ExchangePairSelector({ pairs, selectedValue, onChange, label }: ExchangePairSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPair = pairs.find(p => p.value === selectedValue) || pairs[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors w-full"
      >
        <PairDisplay pair={selectedPair} />
        <ChevronDown className={`w-4 h-4 text-slate-500 ml-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c2030] border border-slate-700/60 rounded-lg shadow-2xl z-50 overflow-hidden">
          {pairs.map((pair) => (
            <button
              key={pair.value}
              onClick={() => {
                onChange(pair.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between w-full px-3 py-2 transition-colors ${pair.value === selectedValue
                  ? 'bg-slate-700/40'
                  : 'hover:bg-slate-700/20'
                }`}
            >
              <PairDisplay pair={pair} />
              {pair.value === selectedValue && (
                <Check className="w-3.5 h-3.5 text-white ml-3 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
