import React, { useMemo } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { SwapCard } from './SwapCard';
import { Fuel } from 'lucide-react';
import { POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID, BSC_CHAIN_ID } from './tokenData';
import { useAssetSelector } from '@/context/AssetSelectorContext';

interface ExchangeViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const ExchangeView: React.FC<ExchangeViewProps> = ({ onNavigateTab }) => {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { isAssetSelectorOpen } = useAssetSelector();

  const isSupportedEvmChain =
    chainId === POLYGON_CHAIN_ID || chainId === ETHEREUM_CHAIN_ID || chainId === BSC_CHAIN_ID;

  const activeChainName = useMemo(() => {
    if (chainId === POLYGON_CHAIN_ID) return 'Polygon';
    if (chainId === ETHEREUM_CHAIN_ID) return 'Ethereum';
    if (chainId === BSC_CHAIN_ID) return 'BNB Chain';
    return null;
  }, [chainId]);

  return (
    <div className={isAssetSelectorOpen ? '' : 'space-y-6 animate-in fade-in duration-200'}>
      {!isAssetSelectorOpen && (
        <>
          {/* Exchange Sub-Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  CryptoPay Swap
                </h1>
                {activeChainName ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeChainName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Multi-Chain
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Swap tokens across Polygon, Ethereum, and BNB Chain with real-time liquidity and automated routing.
              </p>
            </div>
          </div>

          {/* Network Notice if user is connected to an unsupported network */}
          {address && chainId && !isSupportedEvmChain && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Your connected wallet is on Chain {chainId}. Please switch to one of the supported networks:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => switchChain && switchChain({ chainId: POLYGON_CHAIN_ID })}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Polygon (137)
                </button>
                <button
                  type="button"
                  onClick={() => switchChain && switchChain({ chainId: ETHEREUM_CHAIN_ID })}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Ethereum (1)
                </button>
                <button
                  type="button"
                  onClick={() => switchChain && switchChain({ chainId: BSC_CHAIN_ID })}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  BNB Chain (56)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main View Area: Focused Swap Interface */}
      <div className={isAssetSelectorOpen ? '' : 'pt-2'}>
        <SwapCard
          onViewHistory={() => {
            if (onNavigateTab) {
              onNavigateTab('activity');
            }
          }}
        />
      </div>
    </div>
  );
};
