import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ExternalLink, ArrowRight, Copy, Check } from 'lucide-react';
import { SwapStatus } from '../../types/swap';
import {
  getExplorerTxUrl,
  formatTokenAmount,
  BlockchainNetworkId,
  SUPPORTED_NETWORKS,
} from './tokenData';

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
  fromNetwork?: BlockchainNetworkId;
  toNetwork?: BlockchainNetworkId;
  depositAddress?: string;
  onReset?: () => void;
}

function formatFriendlyError(err?: string): string | undefined {
  if (!err) return undefined;
  if (err.includes('Connection request reset') || err.includes('connection request reset')) {
    return 'Wallet connection was cancelled or reset. Please open your wallet and try again.';
  }
  if (err.includes('Invalid msg.value')) {
    return 'The swap contract rejected the transaction value. The route has been updated with native parameters.';
  }
  if (err.includes('User rejected') || err.includes('user cancelled') || err.includes('User denied')) {
    return 'Transaction was cancelled in wallet.';
  }
  if (err.includes('insufficient funds') || err.includes('exceeds balance')) {
    return 'Insufficient balance to cover the swap amount and network gas fees.';
  }
  if (err.includes('TRANSFER_FROM_FAILED')) {
    return 'Token transfer allowance expired or failed. Please re-approve the token.';
  }
  const reasonMatch = err.match(/reverted with reason:\s*([^.\n]+)/i) || err.match(/execution reverted:\s*([^.\n]+)/i);
  if (reasonMatch && reasonMatch[1]) {
    return `Execution reverted: ${reasonMatch[1].trim()}`;
  }
  const clean = err.split('Raw Call Arguments:')[0].split('Version: viem')[0].trim();
  return clean.length > 140 ? clean.slice(0, 140) + '...' : clean;
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
  fromNetwork = 'polygon',
  toNetwork = 'polygon',
  depositAddress,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fromMeta = SUPPORTED_NETWORKS.find((n) => n.id === fromNetwork) || SUPPORTED_NETWORKS[0];
  const toMeta = SUPPORTED_NETWORKS.find((n) => n.id === toNetwork) || SUPPORTED_NETWORKS[0];

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

  const handleCopy = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Multi-Chain Swap Status
          </h3>
          {!isPending && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 text-center space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            {isPending && (
              <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
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
              {status === 'CONFIRMING' && `Confirming on ${fromMeta.name}...`}
              {status === 'COMPLETED' && 'Swap Completed Successfully!'}
              {status === 'REJECTED' && 'Transaction Cancelled in Wallet'}
              {(status === 'TRANSACTION_REVERTED' || status === 'TRANSACTION_FAILED') && 'Transaction Failed'}
              {status === 'INSUFFICIENT_GAS' && 'Insufficient Gas for Network Fee'}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {status === 'APPROVAL_PENDING' &&
                `Please confirm token approval in your wallet for ${fromMeta.name}.`}
              {status === 'SWAP_PENDING' &&
                `Review and confirm transaction in your connected wallet on ${fromMeta.name}.`}
              {status === 'CONFIRMING' &&
                `Your swap is submitted and being confirmed on the ${fromMeta.name} blockchain.`}
              {status === 'COMPLETED' &&
                `You successfully initiated or swapped ${formatTokenAmount(inputAmount)} ${inputTokenSymbol} (${fromMeta.shortName}) for ~${formatTokenAmount(expectedOutput)} ${outputTokenSymbol} (${toMeta.shortName}).`}
              {errorMessage && (
                <span className="block mt-1 text-rose-500 font-medium break-words">
                  {formatFriendlyError(errorMessage)}
                </span>
              )}
            </p>
          </div>

          {/* Deposit Address Box if Cross-Chain Native Route */}
          {depositAddress && (
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-left space-y-1.5">
              <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block">
                Cross-Chain Deposit Address:
              </span>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
                <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate select-all">
                  {depositAddress}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded transition-colors shrink-0"
                  title="Copy deposit address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Amounts overview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
            <div className="text-left">
              <span className="text-slate-400 block text-[10px]">You Pay</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatTokenAmount(inputAmount)} {inputTokenSymbol}
              </span>
              <span className="text-[10px] text-slate-500 block">{fromMeta.shortName}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">You Receive</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ~{formatTokenAmount(expectedOutput)} {outputTokenSymbol}
              </span>
              <span className="text-[10px] text-slate-500 block">{toMeta.shortName}</span>
            </div>
          </div>

          {/* On-Chain Transaction Details */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Network Route</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {fromMeta.name} {fromNetwork !== toNetwork ? `→ ${toMeta.name}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Swap Status</span>
              <span
                className={`font-semibold ${
                  isSuccess
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isFailed
                    ? 'text-rose-500'
                    : 'text-purple-600 dark:text-purple-400'
                }`}
              >
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

          {/* Blockchain explorer link */}
          {txHash && (
            <div className="pt-1">
              <a
                href={getExplorerTxUrl(txHash, fromNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                View on {fromMeta.name} Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {approvalTxHash && !txHash && (
            <div className="pt-1">
              <a
                href={getExplorerTxUrl(approvalTxHash, fromNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
              >
                View Approval on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          {isSuccess ? (
            <button
              type="button"
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
              type="button"
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
