import React, { useState } from 'react';
import {
  ArrowUpDown,
  Settings,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  Fuel,
  Wallet,
  Check,
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSwapEngine } from '../../hooks/useSwapEngine';
import { TokenSelectModal } from './TokenSelectModal';
import { SlippageModal } from './SlippageModal';
import { SwapDetails } from './SwapDetails';
import { SwapStatusModal } from './SwapStatusModal';
import { formatTokenAmount, formatRealQuotedAmount } from './tokenData';
import { TokenIcon } from '../TokenIcon';

interface SwapCardProps {
  onViewHistory: () => void;
}

export const SwapCard: React.FC<SwapCardProps> = ({ onViewHistory }) => {
  const {
    isConnected,
    isPolygon,
    handleSwitchToPolygon,
    balances,
    polBalance,
    inputToken,
    setInputToken,
    outputToken,
    setOutputToken,
    handleSwitchDirection,
    inputAmount,
    setInputAmount,
    quote,
    isQuoteLoading,
    quoteError,
    fetchQuote,
    secondsRemaining,
    slippage,
    setSlippage,
    deadlineMinutes,
    setDeadlineMinutes,
    isCheckingAllowance,
    handleApprove,
    handleSwap,
    handleReset,
    status,
    txHash,
    approvalTxHash,
    executionError,
    isStatusModalOpen,
    setIsStatusModalOpen,
  } = useSwapEngine();

  // Modals state
  const [isInputTokenModalOpen, setIsInputTokenModalOpen] = useState(false);
  const [isOutputTokenModalOpen, setIsOutputTokenModalOpen] = useState(false);
  const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);

  const inputBalance = parseFloat(balances[inputToken.symbol] || '0');
  const enteredAmount = parseFloat(inputAmount || '0');
  const isInsufficientBalance = isConnected && enteredAmount > inputBalance;

  const userPol = parseFloat(polBalance || '0');
  const estGasPol = quote ? parseFloat(quote.estimatedGasFeePol || '0.01') : 0.01;
  const isNativeIn = inputToken.symbol === 'MATIC' || inputToken.symbol === 'POL';
  const requiredPol = isNativeIn ? (enteredAmount + estGasPol) : estGasPol;
  const isInsufficientGas = isConnected && isPolygon && enteredAmount > 0 && !isInsufficientBalance && userPol < requiredPol;

  // Handle Quick Percent (50%, MAX)
  const handlePercent = (pct: number) => {
    if (inputBalance <= 0) return;
    const val = (inputBalance * pct).toFixed(2);
    setInputAmount(val);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xl transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
              <ShieldCheck className="w-3.5 h-3.5" /> Polygon Mainnet
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Chain ID: 137
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto refresh countdown */}
            {quote && (
              <button
                type="button"
                onClick={() => fetchQuote()}
                disabled={isQuoteLoading}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
                title="Refresh quote"
              >
                <RefreshCw className={`w-3 h-3 ${isQuoteLoading ? 'animate-spin' : ''}`} />
                <span>{secondsRemaining}s</span>
              </button>
            )}

            {/* Slippage button */}
            <button
              type="button"
              onClick={() => setIsSlippageModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{slippage}%</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* "You Pay" Input Box */}
        {/* ======================================================== */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span>You Pay</span>
            <div className="flex items-center gap-2">
              <span>Balance: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{formatTokenAmount(balances[inputToken.symbol])}</strong></span>
              {isConnected && inputBalance > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePercent(0.5)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePercent(1.0)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded"
                  >
                    MAX
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
            />

            {/* Token Selector Button */}
            <button
              type="button"
              onClick={() => setIsInputTokenModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shrink-0"
            >
              <TokenIcon token={inputToken.symbol} size={24} className="rounded-full shadow-xs" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {inputToken.symbol}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>
              {enteredAmount > 0 ? (
                inputToken.symbol === 'USDT' || inputToken.symbol === 'USDC'
                  ? `~$${enteredAmount.toFixed(2)}`
                  : quote
                  ? `~$${(enteredAmount * parseFloat(quote.exchangeRate)).toFixed(2)}`
                  : ''
              ) : '~$0.00'}
            </span>
            {isConnected && (
              <span className="text-[10px] text-slate-400">
                Available: {formatTokenAmount(balances[inputToken.symbol])} {inputToken.symbol}
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Swap Direction Switcher */}
        {/* ======================================================== */}
        <div className="relative flex justify-center -my-3 z-10">
          <button
            type="button"
            onClick={handleSwitchDirection}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Switch swap direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* "You Receive" Output Box */}
        {/* ======================================================== */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span>You Receive</span>
            <span>Balance: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{formatTokenAmount(balances[outputToken.symbol])}</strong></span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-full text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white select-all">
              {isQuoteLoading ? (
                <span className="text-slate-400 animate-pulse">Calculating...</span>
              ) : quote ? (
                <span>{formatRealQuotedAmount(quote.expectedOutput)}</span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600">--</span>
              )}
            </div>

            {/* Token Selector Button */}
            <button
              type="button"
              onClick={() => setIsOutputTokenModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shrink-0"
            >
              <TokenIcon token={outputToken.symbol} size={24} className="rounded-full shadow-xs" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {outputToken.symbol}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>
              {quote ? `Guaranteed min: ${formatRealQuotedAmount(quote.minimumReceived)} ${outputToken.symbol}` : 'Executable on-chain quote'}
            </span>
            {quote && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Live Liquidity
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Quote Error / Warning Messages */}
        {/* ======================================================== */}
        {quoteError && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="break-words">{quoteError}</span>
            </div>
            {!quoteError.includes('Minimum') && (
              <button
                type="button"
                onClick={() => fetchQuote()}
                disabled={isQuoteLoading}
                className="shrink-0 px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isQuoteLoading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Quote Details & Routing Breakdown */}
        {/* ======================================================== */}
        {quote && !quoteError && <SwapDetails quote={quote} />}

        {/* ======================================================== */}
        {/* Action Button */}
        {/* ======================================================== */}
        <div className="mt-4">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Connect Wallet to Swap
                </button>
              )}
            </ConnectButton.Custom>
          ) : !isPolygon ? (
            <button
              type="button"
              onClick={handleSwitchToPolygon}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Switch to Polygon Mainnet (137)
            </button>
          ) : !inputAmount || enteredAmount <= 0 ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-sm rounded-2xl cursor-not-allowed"
            >
              Enter an Amount
            </button>
          ) : isInsufficientBalance ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-sm rounded-2xl border border-rose-200 dark:border-rose-800 cursor-not-allowed"
            >
              Insufficient Balance
            </button>
          ) : isInsufficientGas ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-sm rounded-2xl border border-amber-200 dark:border-amber-800 cursor-not-allowed"
            >
              Insufficient Gas Balance
            </button>
          ) : quoteError ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-sm rounded-2xl cursor-not-allowed"
            >
              Cannot Swap (No Route)
            </button>
          ) : status === 'APPROVAL_REQUIRED' ? (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isCheckingAllowance}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Approve {inputToken.symbol} on Polygon
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwap}
              disabled={isQuoteLoading || !quote}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              Swap {inputToken.symbol} to {outputToken.symbol}
            </button>
          )}
        </div>

        {/* POL Gas notice */}
        {isConnected && isPolygon && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-slate-400" /> Gas: {formatTokenAmount(polBalance)} POL
            </span>
            <button
              type="button"
              onClick={onViewHistory}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View Swap History
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* Modals */}
      {/* ======================================================== */}
      <TokenSelectModal
        isOpen={isInputTokenModalOpen}
        onClose={() => setIsInputTokenModalOpen(false)}
        onSelect={(token) => setInputToken(token)}
        selectedSymbol={inputToken.symbol}
        otherSelectedSymbol={outputToken.symbol}
        balances={balances}
      />

      <TokenSelectModal
        isOpen={isOutputTokenModalOpen}
        onClose={() => setIsOutputTokenModalOpen(false)}
        onSelect={(token) => setOutputToken(token)}
        selectedSymbol={outputToken.symbol}
        otherSelectedSymbol={inputToken.symbol}
        balances={balances}
      />

      <SlippageModal
        isOpen={isSlippageModalOpen}
        onClose={() => setIsSlippageModalOpen(false)}
        slippage={slippage}
        onSelectSlippage={(val) => setSlippage(val)}
        deadlineMinutes={deadlineMinutes}
        onSelectDeadline={(mins) => setDeadlineMinutes(mins)}
      />

      <SwapStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        status={status}
        txHash={txHash}
        approvalTxHash={approvalTxHash}
        errorMessage={executionError || undefined}
        inputTokenSymbol={inputToken.symbol}
        outputTokenSymbol={outputToken.symbol}
        inputAmount={inputAmount}
        expectedOutput={quote?.expectedOutput || '0'}
        onReset={handleReset}
      />
    </div>
  );
};
