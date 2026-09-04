import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle, Layers } from 'lucide-react';
import { SwapHistoryRecord } from '../../types/swap';
import { getPolygonscanTxUrl, formatTokenAmount } from './tokenData';

interface SwapHistoryViewProps {
  walletAddress?: string;
  onBackToSwap: () => void;
}

export const SwapHistoryView: React.FC<SwapHistoryViewProps> = ({
  walletAddress,
  onBackToSwap,
}) => {
  const [history, setHistory] = useState<SwapHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!walletAddress) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/swap/history/${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      } else {
        setError(data.error || 'Failed to load swap history');
      }
    } catch {
      setError('Could not connect to swap history API');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!walletAddress) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Wallet Not Connected
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Please connect your wallet to view your real-time Polygon swap transaction history.
        </p>
        <button
          onClick={onBackToSwap}
          className="mt-5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Back to Swap
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Swap History
            <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
              Polygon (Chain ID 137)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onBackToSwap}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
          >
            Back to Swap
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 mb-4">
          {error}
        </div>
      )}

      {isLoading && history.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading transactions from Polygon...
        </div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            No Swap Transactions Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Transactions executed through CryptoPay Swap will appear here with live Polygonscan links.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => {
            const isSuccess = record.status === 'COMPLETED';
            const isPending = record.status === 'PENDING';

            return (
              <div
                key={record.id || record.txHash}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {formatTokenAmount(record.inputAmount)} {record.inputToken}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      {formatTokenAmount(record.expectedOutputAmount)} {record.outputToken}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
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

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-3">
                    <span>
                      {new Date(record.createdAt).toLocaleDateString()} at{' '}
                      {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {record.routerName}
                    </span>
                  </div>

                  <a
                    href={getPolygonscanTxUrl(record.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    {record.txHash.substring(0, 6)}...{record.txHash.substring(record.txHash.length - 4)}{' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
