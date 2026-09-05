import React from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import { SwapStatus } from '../../types/swap';
import { getPolygonscanTxUrl, formatTokenAmount } from './tokenData';

interface SwapStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SwapStatus;
  txHash?: string;
  approvalTxHash?: string;
  errorMessage?: string;
  inputTokenSymbol: string;
  outputTokenSymbol: string;
  inputAmount: string;
  expectedOutput: string;
  onReset?: () => void;
}

export const SwapStatusModal: React.FC<SwapStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  txHash,
  approvalTxHash,
  errorMessage,
  inputTokenSymbol,
  outputTokenSymbol,
  inputAmount,
  expectedOutput,
  onReset,
}) => {
  if (!isOpen) return null;

  const isPending =
    status === 'APPROVAL_PENDING' ||
    status === 'SWAP_PENDING' ||
    status === 'CONFIRMING';

  const isSuccess = status === 'COMPLETED';

  const isFailed =
    status === 'REJECTED' ||
    status === 'TRANSACTION_REVERTED' ||
    status === 'TRANSACTION_FAILED' ||
    status === 'INSUFFICIENT_GAS' ||
    status === 'INSUFFICIENT_BALANCE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Swap Transaction Status
          </h3>
          {!isPending && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            {isPending && (
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            )}
            {isSuccess && (
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              </div>
            )}
            {isFailed && (
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
            )}
          </div>

          {/* Heading and Description */}
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {status === 'APPROVAL_PENDING' && `Approving ${inputTokenSymbol}...`}
              {status === 'APPROVED' && `${inputTokenSymbol} Approved! Ready to Swap`}
              {status === 'SWAP_PENDING' && 'Waiting for Wallet Signature...'}
              {status === 'CONFIRMING' && 'Confirming on Polygon Mainnet...'}
              {status === 'COMPLETED' && 'Swap Completed Successfully!'}
              {status === 'REJECTED' && 'Transaction Cancelled in Wallet'}
              {(status === 'TRANSACTION_REVERTED' || status === 'TRANSACTION_FAILED') && 'Transaction Failed'}
              {status === 'INSUFFICIENT_GAS' && 'Insufficient POL for Network Gas'}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {status === 'APPROVAL_PENDING' &&
                `Please wait while your approval transaction is confirmed on Polygon Mainnet.`}
              {status === 'SWAP_PENDING' &&
                'Please review and sign the transaction prompt in your connected wallet.'}
              {status === 'CONFIRMING' &&
                'Your swap is submitted and being mined into a Polygon block.'}
              {status === 'COMPLETED' &&
                `You successfully swapped ${formatTokenAmount(inputAmount)} ${inputTokenSymbol} for ~${formatTokenAmount(expectedOutput)} ${outputTokenSymbol}.`}
              {errorMessage && (
                <span className="block mt-1 text-rose-500 font-medium">
                  {errorMessage}
                </span>
              )}
            </p>
          </div>

          {/* Amounts overview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
            <div className="text-left">
              <span className="text-slate-400 block text-[10px]">You Pay</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatTokenAmount(inputAmount)} {inputTokenSymbol}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">You Receive</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ~{formatTokenAmount(expectedOutput)} {outputTokenSymbol}
              </span>
            </div>
          </div>

          {/* On-Chain Transaction Details */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Network</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">Polygon Mainnet (137)</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Swap Status</span>
              <span className={`font-semibold ${isSuccess ? 'text-emerald-600 dark:text-emerald-400' : isFailed ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {isSuccess ? 'Confirmed & Completed' : isPending ? 'Processing On-Chain' : status}
              </span>
            </div>
            {txHash && (
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Transaction Hash</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                </span>
              </div>
            )}
          </div>

          {/* Polygonscan explorer link */}
          {txHash && (
            <div className="pt-1">
              <a
                href={getPolygonscanTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View on Polygon Explorer (Polygonscan) <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {approvalTxHash && !txHash && (
            <div className="pt-1">
              <a
                href={getPolygonscanTxUrl(approvalTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
              >
                View Approval on Polygonscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          {isSuccess ? (
            <button
              onClick={() => {
                if (onReset) onReset();
                onClose();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Make Another Swap
            </button>
          ) : isFailed ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Dismiss
            </button>
          ) : (
            <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Do not close this window while transaction is processing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
