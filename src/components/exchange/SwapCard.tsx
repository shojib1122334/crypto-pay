import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpDown,
  Settings,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  Wallet,
  Check,
  History,
} from 'lucide-react';
import { useConnectWallet } from '../../hooks/useConnectWallet';
import { useSwapEngine } from '../../hooks/useSwapEngine';
import { useAssetSelector } from '../../context/AssetSelectorContext';
import { TokenSelectModal } from './TokenSelectModal';
import { SlippageModal } from './SlippageModal';
import { SwapDetails } from './SwapDetails';
import { SwapStatusModal } from './SwapStatusModal';
import {
  formatTokenAmount,
  formatRealQuotedAmount,
  NETWORK_SYMBOL_MAP,
  getChainIdFromNetwork,
} from './tokenData';
import { TokenIcon } from '../TokenIcon';

interface SwapCardProps {
  onViewHistory: () => void;
}

export const SwapCard: React.FC<SwapCardProps> = ({ onViewHistory }) => {
  const { openWalletConnect } = useConnectWallet();
  const {
    isConnected,
    chainId,
    selectedNetwork,
    setSelectedNetwork,
    outputNetwork,
    setOutputNetwork,
    supportedNetworks,
    handleSwitchToChain,
    balances,
    polBalance,
    ethBalance,
    bnbBalance,
    getTokenBalance,
    isBalanceLoading,
    fetchBalances,
    tokenPrices,
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

  const { setIsAssetSelectorOpen } = useAssetSelector();

  useEffect(() => {
    setIsAssetSelectorOpen(isInputTokenModalOpen || isOutputTokenModalOpen);
    return () => {
      setIsAssetSelectorOpen(false);
    };
  }, [isInputTokenModalOpen, isOutputTokenModalOpen, setIsAssetSelectorOpen]);

  // Active network meta
  const currentNetworkMeta =
    supportedNetworks.find((n) => n.id === selectedNetwork) || supportedNetworks[0];

  // Raw and numeric balance for currently selected input token
  const rawInputBalance = getTokenBalance(inputToken);
  const inputBalance = parseFloat(rawInputBalance || '0');
  const enteredAmount = parseFloat(inputAmount || '0');
  const isInsufficientBalance = isConnected && enteredAmount > inputBalance;

  // Gas balance check for native Polygon/Ethereum/BSC EVM transactions
  const isNativeIn = inputToken.isNative;
  const isInsufficientGas = useMemo(() => {
    if (!isConnected || enteredAmount <= 0 || isInsufficientBalance) return false;
    if (selectedNetwork === 'polygon') {
      const userPol = parseFloat(polBalance || '0');
      const estGasPol = quote ? parseFloat(quote.estimatedGasFeePol || '0.01') : 0.01;
      const requiredPol = isNativeIn ? enteredAmount + estGasPol : estGasPol;
      return userPol < requiredPol;
    }
    if (selectedNetwork === 'ethereum') {
      const userEth = parseFloat(ethBalance || '0');
      const estGasEth = 0.002;
      const requiredEth = isNativeIn ? enteredAmount + estGasEth : estGasEth;
      return userEth < requiredEth;
    }
    if (selectedNetwork === 'bsc') {
      const userBnb = parseFloat(bnbBalance || '0');
      const estGasBnb = 0.001;
      const requiredBnb = isNativeIn ? enteredAmount + estGasBnb : estGasBnb;
      return userBnb < requiredBnb;
    }
    return false;
  }, [
    isConnected,
    enteredAmount,
    isInsufficientBalance,
    selectedNetwork,
    polBalance,
    ethBalance,
    bnbBalance,
    quote,
    isNativeIn,
  ]);

  // EVM network mismatch check
  const isChainMismatch = useMemo(() => {
    if (!isConnected) return false;
    if (selectedNetwork === 'polygon' && chainId !== 137) return true;
    if (selectedNetwork === 'ethereum' && chainId !== 1) return true;
    if (selectedNetwork === 'bsc' && chainId !== 56) return true;
    return false;
  }, [isConnected, selectedNetwork, chainId]);

  // Real live USD value calculation for the currently selected input token
  const inputUsdValue = useMemo(() => {
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      return '$0.00';
    }

    // Stablecoins pegged 1:1 with USD
    if (inputToken.symbol === 'USDT' || inputToken.symbol === 'USDC') {
      return `~$${enteredAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // If an active quote directly swapping into USDT or USDC is available
    if (
      quote &&
      quote.inputToken.symbol === inputToken.symbol &&
      (quote.outputToken.symbol === 'USDT' || quote.outputToken.symbol === 'USDC') &&
      parseFloat(quote.expectedOutput) > 0
    ) {
      const outNum = parseFloat(quote.expectedOutput);
      return `~$${outNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Market price lookup
    const unitPrice = tokenPrices[inputToken.symbol];
    if (unitPrice && unitPrice > 0) {
      const usdTotal = enteredAmount * unitPrice;
      if (usdTotal < 0.01 && usdTotal > 0) {
        return `~$${usdTotal.toFixed(6)}`;
      }
      return `~$${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return '$0.00';
  }, [enteredAmount, inputToken.symbol, quote, tokenPrices]);

  // Handle percentage buttons (50%, MAX)
  const handlePercent = (pct: number) => {
    if (inputBalance <= 0) return;
    if (pct === 1.0) {
      if (inputToken.isNative && selectedNetwork === 'polygon') {
        const afterGas = Math.max(0, inputBalance - 0.02);
        setInputAmount(afterGas > 0 ? (afterGas >= 100 ? afterGas.toFixed(2) : afterGas.toFixed(4)) : '0');
      } else if (inputToken.isNative && (selectedNetwork === 'ethereum' || selectedNetwork === 'bsc')) {
        const gasBuffer = selectedNetwork === 'ethereum' ? 0.005 : 0.002;
        const afterGas = Math.max(0, inputBalance - gasBuffer);
        setInputAmount(afterGas > 0 ? afterGas.toFixed(4) : '0');
      } else {
        const val = inputBalance >= 100 ? inputBalance.toFixed(2) : inputBalance.toFixed(6).replace(/\.?0+$/, '');
        setInputAmount(val);
      }
    } else {
      const half = inputBalance * pct;
      const val = half >= 100 ? half.toFixed(2) : half.toFixed(6).replace(/\.?0+$/, '');
      setInputAmount(val);
    }
  };

  return (
    <div className="w-full sm:max-w-lg mx-auto">
      <div className="web3-glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl shadow-purple-500/5 relative overflow-hidden">
        {/* Top gradient highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

        {/* Card Header */}
        <div className="flex items-center justify-end pb-3.5 mb-3 border-b border-slate-100 dark:border-slate-800/80">
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
              title="Slippage settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{slippage}%</span>
            </button>

            {/* History button */}
            <button
              type="button"
              onClick={onViewHistory}
              className="flex items-center gap-1 p-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
              title="View swap history"
              aria-label="View swap history"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Network Mismatch Warning Banner */}
        {isChainMismatch && (
          <div className="mb-3.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span>
                  Connected wallet is on Chain {chainId}. Please switch to {currentNetworkMeta.name}.
                </span>
              </div>
            </div>
            {currentNetworkMeta.chainId && (
              <button
                type="button"
                onClick={() => handleSwitchToChain(currentNetworkMeta.chainId!)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors shrink-0"
              >
                Switch to {currentNetworkMeta.shortName}
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* "You Pay" Input Box */}
        {/* ======================================================== */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span>You Pay</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span>
                  Balance:{' '}
                  <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                    {formatTokenAmount(rawInputBalance)}
                  </strong>
                </span>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => fetchBalances()}
                    disabled={isBalanceLoading}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                    title="Refresh on-chain balance"
                  >
                    <RefreshCw className={`w-3 h-3 ${isBalanceLoading ? 'animate-spin text-indigo-500' : ''}`} />
                  </button>
                )}
              </div>
              {isConnected && inputBalance > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePercent(0.5)}
                    className="px-2 py-0.5 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-800 rounded-md transition cursor-pointer shadow-2xs"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePercent(1.0)}
                    className="px-2 py-0.5 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-800 rounded-md transition cursor-pointer shadow-2xs"
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
              placeholder="0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="w-full bg-transparent text-2xl sm:text-3xl font-black text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
            />

            {/* Token Selector Button */}
            <button
              type="button"
              onClick={() => setIsInputTokenModalOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 rounded-xl shadow-xs hover:bg-orange-50/20 dark:hover:bg-slate-700/80 transition-all shrink-0 cursor-pointer"
            >
              <div className="relative shrink-0">
                <TokenIcon token={inputToken.symbol} size={26} className="rounded-full shadow-xs" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 ring-1 ring-white dark:ring-slate-900 flex items-center justify-center overflow-hidden">
                  <TokenIcon token={NETWORK_SYMBOL_MAP[inputToken.networkId] || inputToken.symbol} size={11} />
                </div>
              </div>
              <div className="text-left">
                <span className="font-extrabold text-sm text-slate-950 dark:text-white block leading-tight">
                  {inputToken.symbol}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal leading-none mt-0.5">
                  {inputToken.networkName}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-orange-500 dark:text-orange-400 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span className="font-semibold">{inputUsdValue}</span>
            {isConnected && (
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Available: {formatTokenAmount(rawInputBalance)} {inputToken.symbol}
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
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Switch swap direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* "You Receive" Output Box */}
        {/* ======================================================== */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <span>You Receive</span>
            <span>
              Balance:{' '}
              <strong className="text-slate-950 dark:text-white font-extrabold">
                {formatTokenAmount(getTokenBalance(outputToken))}
              </strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-full text-2xl sm:text-3xl font-black text-slate-950 dark:text-white select-all">
              {isQuoteLoading ? (
                <span className="text-slate-400 animate-pulse text-xl">Calculating route...</span>
              ) : quote ? (
                <span>{formatRealQuotedAmount(quote.expectedOutput)}</span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600">--</span>
              )}
            </div>

            {/* Output Token Selector Button */}
            <button
              type="button"
              onClick={() => setIsOutputTokenModalOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 rounded-xl shadow-xs hover:bg-orange-50/20 dark:hover:bg-slate-700/80 transition-all shrink-0 cursor-pointer"
            >
              <div className="relative shrink-0">
                <TokenIcon token={outputToken.symbol} size={26} className="rounded-full shadow-xs" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 ring-1 ring-white dark:ring-slate-900 flex items-center justify-center overflow-hidden">
                  <TokenIcon token={NETWORK_SYMBOL_MAP[outputToken.networkId] || outputToken.symbol} size={11} />
                </div>
              </div>
              <div className="text-left">
                <span className="font-extrabold text-sm text-slate-950 dark:text-white block leading-tight">
                  {outputToken.symbol}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal leading-none mt-0.5">
                  {outputToken.networkName}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-orange-500 dark:text-orange-400 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>
              {quote
                ? `Guaranteed min: ${formatRealQuotedAmount(quote.minimumReceived)} ${outputToken.symbol}`
                : 'Executable multi-chain quote'}
            </span>
            {quote && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Live Liquidity
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
            <button
              type="button"
              onClick={() => openWalletConnect()}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-[0.99]"
            >
              <Wallet className="w-5 h-5 text-white stroke-[2.2]" />
              <span className="text-white">Connect Wallet to Swap</span>
            </button>
          ) : isChainMismatch && currentNetworkMeta.chainId ? (
            <button
              type="button"
              onClick={() => handleSwitchToChain(currentNetworkMeta.chainId!)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" /> Switch to {currentNetworkMeta.name}
            </button>
          ) : !inputAmount || enteredAmount <= 0 ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-slate-100 text-slate-400 font-semibold text-sm rounded-2xl cursor-not-allowed border border-slate-200"
            >
              Enter an Amount
            </button>
          ) : isInsufficientBalance ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-rose-50 text-rose-600 font-semibold text-sm rounded-2xl border border-rose-200 cursor-not-allowed"
            >
              Insufficient {inputToken.symbol} Balance
            </button>
          ) : isInsufficientGas ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-amber-50 text-amber-800 font-semibold text-sm rounded-2xl border border-amber-200 cursor-not-allowed"
            >
              Insufficient Gas Balance ({selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'bsc' ? 'BNB' : 'POL'})
            </button>
          ) : quoteError ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-4 bg-slate-100 text-slate-400 font-semibold text-sm rounded-2xl cursor-not-allowed border border-slate-200"
            >
              Cannot Swap (No Route)
            </button>
          ) : status === 'APPROVAL_REQUIRED' && !isNativeIn ? (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isCheckingAllowance}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-[0.99]"
            >
              <Check className="w-4 h-4 text-white stroke-[2.5]" />
              <span className="text-white">Approve {inputToken.symbol} on {inputToken.networkName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwap}
              disabled={isQuoteLoading || !quote}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-[0.99]"
            >
              <span className="text-white">
                Swap {inputToken.symbol} to {outputToken.symbol}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Input Token Select Modal */}
      <TokenSelectModal
        isOpen={isInputTokenModalOpen}
        onClose={() => setIsInputTokenModalOpen(false)}
        selectedToken={inputToken}
        selectedSymbol={inputToken.symbol}
        otherSelectedToken={outputToken}
        otherSelectedSymbol={outputToken.symbol}
        onSelect={(token) => {
          // If the selected input token matches the existing output token on the same network, swap positions
          if (
            token.symbol === outputToken.symbol &&
            token.networkId === (outputToken.networkId || outputNetwork)
          ) {
            setOutputToken(inputToken);
            setOutputNetwork(inputToken.networkId || selectedNetwork);
          }
          setInputToken(token);
          if (token.networkId !== selectedNetwork) {
            setSelectedNetwork(token.networkId);
          }
          const targetChainId = token.chainId || getChainIdFromNetwork(token.networkId);
          if (targetChainId && isConnected && chainId !== targetChainId) {
            handleSwitchToChain(targetChainId);
          }
        }}
        balances={balances}
        activeNetwork={selectedNetwork}
      />

      {/* Output Token Select Modal */}
      <TokenSelectModal
        isOpen={isOutputTokenModalOpen}
        onClose={() => setIsOutputTokenModalOpen(false)}
        selectedToken={outputToken}
        selectedSymbol={outputToken.symbol}
        otherSelectedToken={inputToken}
        otherSelectedSymbol={inputToken.symbol}
        onSelect={(token) => {
          // If the selected output token matches the existing input token on the same network, swap positions
          if (
            token.symbol === inputToken.symbol &&
            token.networkId === (inputToken.networkId || selectedNetwork)
          ) {
            setInputToken(outputToken);
            setSelectedNetwork(outputToken.networkId || selectedNetwork);
          }
          setOutputToken(token);
          if (token.networkId !== outputNetwork) {
            setOutputNetwork(token.networkId);
          }
        }}
        balances={balances}
        activeNetwork={outputNetwork}
      />

      {/* Slippage Settings Modal */}
      <SlippageModal
        isOpen={isSlippageModalOpen}
        onClose={() => setIsSlippageModalOpen(false)}
        slippage={slippage}
        onSaveSlippage={(val) => setSlippage(val)}
        deadlineMinutes={deadlineMinutes}
        onSaveDeadline={(val) => setDeadlineMinutes(val)}
      />

      {/* Swap Status & Execution Modal */}
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
        expectedOutput={quote ? quote.expectedOutput : '0'}
        fromNetwork={quote ? quote.fromNetwork : selectedNetwork}
        toNetwork={quote ? quote.toNetwork : outputNetwork}
        depositAddress={quote?.depositAddress}
        onReset={handleReset}
      />
    </div>
  );
};
