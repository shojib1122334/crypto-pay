import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Zap, Info } from 'lucide-react';
import { SwapQuote } from '../../types/swap';
import { getPolygonscanAddressUrl, formatTokenAmount, formatRealQuotedAmount } from './tokenData';

interface SwapDetailsProps {
  quote: SwapQuote;
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ quote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rateReversed, setRateReversed] = useState(false);

  const priceImpactColor =
    quote.priceImpactSeverity === 'blocked'
      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
      : quote.priceImpactSeverity === 'high'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
      : quote.priceImpactSeverity === 'medium'
      ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800'
      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';

  return (
    <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden transition-all">
      {/* Primary summary row */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <span
            onClick={(e) => {
              e.stopPropagation();
              setRateReversed(!rateReversed);
            }}
            className="cursor-pointer hover:underline text-slate-900 dark:text-white font-semibold flex items-center gap-1"
            title="Click to switch exchange rate view"
          >
            {rateReversed ? quote.inverseExchangeRate : quote.exchangeRate}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-500" />
            {quote.route.protocol}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${priceImpactColor}`}>
            Impact {quote.priceImpact}%
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded breakdown */}
      {isOpen && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2.5 text-xs animate-in fade-in duration-150">
          {/* Smart Route */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1.5">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-500" /> Smart Route on Polygon
              </span>
              <a
                href={getPolygonscanAddressUrl(quote.route.routerAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[10px]"
              >
                Router Contract <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{quote.route.description}</span>
            </div>
          </div>

          {/* Key Execution Metrics */}
          <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                Minimum Received
                <span title={`Guaranteed minimum output after ${quote.slippage}% slippage tolerance. If output is below this, transaction reverts.`}>
                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                </span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatRealQuotedAmount(quote.minimumReceived)} {quote.outputToken.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Price Impact</span>
              <span className={`font-semibold ${quote.priceImpact > 1.0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                {quote.priceImpact}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Liquidity Provider Fee ({quote.liquidityFeePercent}%)</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {formatRealQuotedAmount(quote.providerFeeAmount.split(' ')[0])} {quote.inputToken.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Estimated Network Fee (POL)</span>
              <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                <span>{formatTokenAmount(quote.estimatedGasFeePol)} POL</span>
                <span className="text-[11px] text-slate-400">({quote.estimatedGasFeeUsd})</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Slippage Tolerance</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {quote.slippage}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
