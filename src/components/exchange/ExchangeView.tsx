import React, { useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { SwapCard } from './SwapCard';
import { SwapHistoryView } from './SwapHistoryView';
import { ShieldCheck, History, ArrowLeftRight, Fuel } from 'lucide-react';
import { POLYGON_CHAIN_ID } from './tokenData';

export const ExchangeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'swap' | 'history'>('swap');
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const isPolygon = chainId === POLYGON_CHAIN_ID;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Exchange Sub-Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              CryptoPay Swap
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-3.5 h-3.5" /> Polygon Mainnet
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Exchange Polygon MATIC, USDT, USDC, and VERSE with live liquidity and automated smart routing.
          </p>
        </div>

        {/* View Switcher: Swap vs History */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('swap')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'swap'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      {/* Network Notice if user is connected to non-Polygon network */}
      {address && !isPolygon && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Your connected wallet is not on Polygon. CryptoPay Swap operates strictly on Polygon Mainnet (Chain ID 137).
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchChain && switchChain({ chainId: POLYGON_CHAIN_ID })}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors shrink-0"
          >
            Switch to Polygon (137)
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="pt-2">
        {activeTab === 'swap' ? (
          <SwapCard onViewHistory={() => setActiveTab('history')} />
        ) : (
          <SwapHistoryView
            walletAddress={address}
            onBackToSwap={() => setActiveTab('swap')}
          />
        )}
      </div>
    </div>
  );
};
