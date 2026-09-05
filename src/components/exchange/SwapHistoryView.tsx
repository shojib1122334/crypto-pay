import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle, Layers, ArrowLeft } from 'lucide-react';
import { SwapHistoryRecord } from '../../types/swap';
import { getPolygonscanTxUrl, formatTokenAmount } from './tokenData';
import { getLocalSwapHistory, syncSwapHistory } from '../../services/swapHistoryStorage';

interface SwapHistoryViewProps {
  walletAddress?: string;
  onBackToSwap: () => void;
}

export const SwapHistoryView: React.FC<SwapHistoryViewProps> = ({
  walletAddress,
  onBackToSwap,
}) => {
  const [history, setHistory] = useState<SwapHistoryRecord[]>(() =>
    getLocalSwapHistory(walletAddress)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isManual = false) => {
    if (!walletAddress) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    setSyncNotice(null);

    try {
      const { history: synced, fromServer } = await syncSwapHistory(walletAddress);
      setHistory(synced);

      if (isManual && !fromServer) {
        setSyncNotice('Using local transaction records');
        setTimeout(() => setSyncNotice(null), 3000);
      }
    } catch (err) {
      console.warn('[SwapHistoryView] Sync notice:', err);
      // Fallback to local storage records without blocking UI
      const local = getLocalSwapHistory(walletAddress);
      setHistory(local);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Initial load and whenever walletAddress changes
  useEffect(() => {
    if (walletAddress) {
      // Immediately set local cache first
      setHistory(getLocalSwapHistory(walletAddress));
      // Then sync with server in background
      fetchHistory(false);
    } else {
      setHistory([]);
    }
  }, [walletAddress, fetchHistory]);

  if (!walletAddress) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Wallet Not Connected
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Please connect your wallet to view your Polygon swap transaction history.
        </p>
        <button
          type="button"
          onClick={onBackToSwap}
          className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Swap
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
      {/* Responsive Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
              Swap History
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full whitespace-nowrap">
              Polygon 137
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
            {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => fetchHistory(true)}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh history"
            aria-label="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onBackToSwap}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Swap
          </button>
        </div>
      </div>

      {/* Subtle sync notice if manual refresh was offline */}
      {syncNotice && (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 mb-4 flex items-center justify-between animate-in fade-in">
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Transaction List or Clean Empty State */}
      {isLoading && history.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading transactions...
        </div>
      ) : history.length === 0 ? (
        <div className="py-10 sm:py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            No Swap Transactions Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Transactions executed through CryptoPay Swap will appear here with live Polygonscan links.
          </p>
          <button
            type="button"
            onClick={onBackToSwap}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            Start a Swap
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => {
            const isSuccess = record.status === 'COMPLETED';
            const isPending = record.status === 'PENDING';

            return (
              <div
                key={record.id || record.txHash}
                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>{formatTokenAmount(record.inputAmount)} {record.inputToken}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatTokenAmount(record.expectedOutputAmount)} {record.outputToken}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border whitespace-nowrap ${
                        isSuccess
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                          : isPending
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                      {isPending && <Clock className="w-3 h-3 animate-spin" />}
                      {!isSuccess && !isPending && <XCircle className="w-3 h-3" />}
                      {record.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span>
                      {new Date(record.createdAt).toLocaleDateString()} at{' '}
                      {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {record.routerName && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {record.routerName}
                        </span>
                      </>
                    )}
                  </div>

                  {record.txHash && (
                    <a
                      href={getPolygonscanTxUrl(record.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px] ml-auto"
                    >
                      {record.txHash.substring(0, 6)}...{record.txHash.substring(record.txHash.length - 4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

