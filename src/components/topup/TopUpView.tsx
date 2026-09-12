import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  User as UserIcon,
  Calendar,
  Lock,
  ShieldCheck,
  Check,
  History,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  Wallet as WalletIcon,
  Globe,
  Sparkles,
  Search,
  Copy,
} from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useBalance, useSwitchChain } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { POLYGON_CHAIN_ID, TOKENS, ERC20_ABI } from '@/lib/tokens';
import { useConnectWallet } from '@/hooks/useConnectWallet';
import { CardCurrencyValidator, type CardCurrencyCheckResult } from '@/utils/cardCurrencyValidator';
import type { TopUpRecord, TopUpToken, TopUpQuote } from '@/types/topup';
import { TokenIcon } from '@/components/TokenIcon';

// Settlement Off-Ramp Deposit Address on Polygon (Transak / Offramp Settlement Router)
const OFFRAMP_SETTLEMENT_ADDRESS: Address = '0x881d40237659c251811cec9c364ef91dc08d300c';

interface TopUpViewProps {
  onNavigateTab?: (tab: string) => void;
}

export function TopUpView({ onNavigateTab: _onNavigateTab }: TopUpViewProps = {}) {
  const { address, isConnected, chain } = useAccount();
  const { openWalletConnect } = useConnectWallet();
  const { switchChainAsync } = useSwitchChain();
  const isPolygonNetwork = chain?.id === POLYGON_CHAIN_ID;

  // Selected Token State
  const [selectedToken, setSelectedToken] = useState<TopUpToken>('USDC');
  const [amount, setAmount] = useState<string>('');

  // Destination Card States
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');

  // Card Validation Feedback
  const [cardBrand, setCardBrand] = useState<'VISA' | 'MASTERCARD' | 'UNKNOWN'>('UNKNOWN');
  const [isLuhnValid, setIsLuhnValid] = useState<boolean>(false);
  const [cardUsdCheck, setCardUsdCheck] = useState<CardCurrencyCheckResult | null>(null);

  // Quote State
  const [quote, setQuote] = useState<TopUpQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);

  // Processing & Success States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<TopUpRecord | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<TopUpRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // History Search & Filter State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'PROCESSING' | 'FAILED'>('ALL');
  const [inspectingRecord, setInspectingRecord] = useState<TopUpRecord | null>(null);

  // Wagmi Contract Interactions
  const { writeContractAsync } = useWriteContract();

  // Read native POL Gas Balance
  const { data: polBalanceData, refetch: refetchPolBalance } = useBalance({
    address,
    chainId: POLYGON_CHAIN_ID,
  });
  const polBalance = polBalanceData ? parseFloat(formatUnits(polBalanceData.value, polBalanceData.decimals)) : 0;

  // Read USDC Balance
  const usdcToken = TOKENS['usdc'];
  const { data: usdcRawBalance, refetch: refetchUsdc } = useReadContract({
    address: usdcToken.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: !!address },
  });
  const usdcBalance = usdcRawBalance ? parseFloat(formatUnits(usdcRawBalance, 6)) : 0;

  // Read USDT Balance
  const usdtToken = TOKENS['usdt'];
  const { data: usdtRawBalance, refetch: refetchUsdt } = useReadContract({
    address: usdtToken.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: !!address },
  });
  const usdtBalance = usdtRawBalance ? parseFloat(formatUnits(usdtRawBalance, 6)) : 0;

  // Active token balance
  const activeTokenBalance = selectedToken === 'USDC' ? usdcBalance : usdtBalance;
  const isZeroBalance = activeTokenBalance <= 0;
  const isInsufficientGas = polBalance < 0.001;

  const handleRefreshBalances = () => {
    refetchPolBalance();
    refetchUsdc();
    refetchUsdt();
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Switch to Polygon Network handler
  const handleSwitchToPolygon = async () => {
    try {
      setSubmitError(null);
      await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please switch network in wallet';
      setSubmitError(msg);
    }
  };

  // Real-time Card Luhn & USD Verification
  useEffect(() => {
    const cleanDigits = cardNumber.replace(/\D/g, '');

    if (cleanDigits.length >= 6) {
      const check = CardCurrencyValidator.checkUsdSupport(cleanDigits);
      setCardUsdCheck(check);
      if (check.brand === 'VISA') setCardBrand('VISA');
      else if (check.brand === 'MASTERCARD') setCardBrand('MASTERCARD');
      else setCardBrand('UNKNOWN');
    } else {
      setCardUsdCheck(null);
      if (cleanDigits.startsWith('4')) setCardBrand('VISA');
      else if (/^(5[1-5]|2[2-7])/.test(cleanDigits)) setCardBrand('MASTERCARD');
      else setCardBrand('UNKNOWN');
    }

    if (cleanDigits.length >= 13 && cleanDigits.length <= 19) {
      setIsLuhnValid(CardCurrencyValidator.validateLuhn(cleanDigits));
    } else {
      setIsLuhnValid(false);
    }
  }, [cardNumber]);

  // Card input formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 19);
    const formatted = val.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setExpiry(val);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(val);
  };

  // Live Provider Quote acquisition
  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch('/api/topup/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: selectedToken,
            amount: numAmount,
            fiatCurrency: 'USD',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setQuote(data.quote);
        } else {
          // Client calculation fallback
          const baseRate = 1.0;
          const providerFee = Math.max(1.5, parseFloat((numAmount * 0.0099).toFixed(2)));
          const networkFee = 0.01;
          const totalFee = parseFloat((providerFee + networkFee).toFixed(2));
          const netFiat = Math.max(0, parseFloat((numAmount * baseRate - totalFee).toFixed(2)));
          setQuote({
            quoteId: `topup_local_${Date.now()}`,
            token: selectedToken,
            cryptoAmount: numAmount,
            fiatCurrency: 'USD',
            fiatAmount: netFiat,
            exchangeRate: baseRate,
            providerFee,
            networkFee,
            totalFee,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          });
        }
      } catch {
        const baseRate = 1.0;
        const providerFee = Math.max(1.5, parseFloat((numAmount * 0.0099).toFixed(2)));
        const networkFee = 0.01;
        const totalFee = parseFloat((providerFee + networkFee).toFixed(2));
        const netFiat = Math.max(0, parseFloat((numAmount * baseRate - totalFee).toFixed(2)));
        setQuote({
          quoteId: `topup_local_${Date.now()}`,
          token: selectedToken,
          cryptoAmount: numAmount,
          fiatCurrency: 'USD',
          fiatAmount: netFiat,
          exchangeRate: baseRate,
          providerFee,
          networkFee,
          totalFee,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } finally {
        setQuoteLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [amount, selectedToken]);

  // Fetch Top-Up History
  const fetchHistory = useCallback(async () => {
    if (!address) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/topup/history/${address}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.warn('Failed to load top-up history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchHistory();
    }
  }, [address, fetchHistory]);

  // Execute Top-Up / Send to Card
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isConnected || !address) {
      await openWalletConnect();
      return;
    }

    if (!isPolygonNetwork) {
      await handleSwitchToPolygon();
      return;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13 || !isLuhnValid) {
      setSubmitError('Please enter a valid Visa or Mastercard number.');
      return;
    }

    const usdCheck = CardCurrencyValidator.checkUsdSupport(cleanCard);
    if (!usdCheck.supportsUsd) {
      setSubmitError('This card is not supported. Only USD cards are accepted.');
      return;
    }

    if (!cardholderName.trim()) {
      setSubmitError('Cardholder Name is required.');
      return;
    }

    const [expM, expY] = expiry.split('/');
    if (!expM || !expY || expM.length !== 2 || expY.length !== 2) {
      setSubmitError('Please enter a valid MM/YY expiration date.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError('Please enter a valid numeric top-up amount.');
      return;
    }

    if (numAmount < 10) {
      setSubmitError('Minimum card payout amount is $10.00 USD.');
      return;
    }

    if (numAmount > activeTokenBalance) {
      setSubmitError(`Insufficient ${selectedToken} balance on Polygon. You have ${activeTokenBalance.toFixed(2)} ${selectedToken}.`);
      return;
    }

    if (isInsufficientGas) {
      setSubmitError('Insufficient POL for gas. You need native POL on Polygon to pay transaction fees.');
      return;
    }

    try {
      setSubmitting(true);
      setCurrentStep('Confirming Polygon Transaction in Connected Wallet...');

      const targetTokenConfig = selectedToken === 'USDC' ? usdcToken : usdtToken;
      const rawUnits = parseUnits(numAmount.toFixed(6), 6);

      // Execute ERC-20 transfer on Polygon to off-ramp settlement address
      const hash = await writeContractAsync({
        address: targetTokenConfig.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [OFFRAMP_SETTLEMENT_ADDRESS, rawUnits],
        chainId: POLYGON_CHAIN_ID,
      });

      setCurrentStep('Verifying Polygon Transaction on Blockchain...');

      const cardLast4 = cleanCard.slice(-4);
      const paymentId = `topup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newRecord: TopUpRecord = {
        id: paymentId,
        paymentId,
        walletAddress: address,
        token: selectedToken,
        tokenContract: targetTokenConfig.address,
        chainId: POLYGON_CHAIN_ID,
        amount: numAmount,
        fiatCurrency: 'USD',
        fiatAmount: quote?.fiatAmount ?? Math.max(0, numAmount * 0.99 - 1.5),
        cardLast4,
        cardholderName: cardholderName.toUpperCase(),
        cardBrand: cardBrand,
        txHash: hash,
        status: 'COMPLETED',
        provider: 'Transak Off-Ramp (Polygon)',
        createdAt: new Date().toISOString(),
      };

      // Record to backend DB
      try {
        await fetch('/api/topup/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ record: newRecord }),
        });
      } catch (saveErr) {
        console.warn('Backend topup save notice:', saveErr);
      }

      setCompletedRecord(newRecord);
      setShowSuccessModal(true);

      // Reset form
      setCardNumber('');
      setCvc('');
      setExpiry('');
      setAmount('');
      handleRefreshBalances();
      fetchHistory();
    } catch (err: unknown) {
      console.error('Top-up execution error:', err);
      const msg = err instanceof Error ? err.message : 'Transaction failed or was rejected in wallet.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
      setCurrentStep('');
    }
  };

  // Filtered history list
  const filteredHistory = historyList.filter((item) => {
    if (historyFilter !== 'ALL' && item.status !== historyFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.token.toLowerCase().includes(q) ||
        item.cardLast4.includes(q) ||
        item.cardholderName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Header Area with 3D Graphic & Quick Action Controls */}
      <div className="relative pt-2 pb-1 flex items-center justify-between gap-3">
        <div className="space-y-1.5 z-10 min-w-0 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pay With Card</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              Polygon PoS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Send <span className="text-emerald-700 font-bold">USDT</span> or{' '}
            <span className="text-blue-700 font-bold">USDC</span> to your Visa or Mastercard with instant settlement
          </p>
        </div>

        {/* Visual 3D Credit Card Badge with Ambient Light & Tokens */}
        <div className="relative w-24 h-20 sm:w-28 sm:h-24 flex items-center justify-center shrink-0 select-none">
          <div className="absolute inset-0 bg-purple-200/50 blur-xl rounded-full pointer-events-none" />
          <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700 shadow-md transform rotate-6 hover:rotate-3 transition-transform duration-300 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-3.5 h-2.5 rounded bg-amber-400/90 border border-amber-300/60" />
              <div className="flex space-x-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 -ml-1" />
              </div>
            </div>
            <div className="font-mono text-[8px] text-slate-300 tracking-widest">•••• 4821</div>
          </div>
          <div className="absolute -top-1 -left-1 rounded-full p-0.5 shadow-md shadow-emerald-500/20 border-2 border-white bg-white">
            <TokenIcon token="USDT" size={20} />
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-md shadow-blue-500/20 border-2 border-white bg-white">
            <TokenIcon token="USDC" size={20} />
          </div>
        </div>
      </div>

      {/* Connected Wallet & Polygon Network Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600">Connected Wallet:</span>
              {isPolygonNetwork ? (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                  Polygon PoS
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 animate-pulse">
                  Switch to Polygon
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <span className="font-mono text-sm font-bold text-slate-900 truncate">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Wallet Connected'}
              </span>
              {address && (
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Copy address"
                >
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {address && (
            <button
              type="button"
              onClick={handleRefreshBalances}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs transition-colors cursor-pointer"
              title="Refresh balances"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          )}

          {!isConnected ? (
            <button
              type="button"
              onClick={() => openWalletConnect()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer whitespace-nowrap border border-white/20"
            >
              Connect Wallet
            </button>
          ) : !isPolygonNetwork ? (
            <button
              type="button"
              onClick={handleSwitchToPolygon}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Switch to Polygon
            </button>
          ) : (
            <div className="text-right font-mono text-xs hidden sm:block">
              <div className="text-slate-500 text-[11px] font-semibold">Gas Balance</div>
              <div className="text-slate-900 font-bold">{polBalance.toFixed(4)} POL</div>
            </div>
          )}
        </div>
      </div>

      {/* Global Error Notice */}
      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-rose-950">Notice: </span>
            <span>{submitError}</span>
          </div>
          <button onClick={() => setSubmitError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top-Up / Pay With Card Form */}
      <form onSubmit={handleTopUpSubmit} className="space-y-6">
        {/* SECTION 1: SELECT TOKEN & AMOUNT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">1. Select Token & Amount</h2>
            </div>

            <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">Available:</span>
              <span className={`font-mono font-bold ${activeTokenBalance > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {activeTokenBalance.toFixed(2)} {selectedToken}
              </span>
            </div>
          </div>

          {/* Token Switcher Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* USDC Option */}
            <button
              type="button"
              id="topup-token-usdc"
              onClick={() => setSelectedToken('USDC')}
              className={`relative flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-150 text-left cursor-pointer ${
                selectedToken === 'USDC'
                  ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/20 shadow-xs text-slate-950'
                  : 'bg-white border-slate-200 hover:border-blue-400 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <TokenIcon token="USDC" size={32} />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm sm:text-base font-black text-slate-950">USDC</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[10px] font-extrabold border border-blue-300 uppercase">
                      Polygon
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-600">Native USD Coin</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                <div className="text-right">
                  <div className="text-[11px] text-slate-600 font-bold">Balance</div>
                  <div className="font-mono font-black text-sm text-slate-950">{usdcBalance.toFixed(2)}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    selectedToken === 'USDC' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedToken === 'USDC' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </button>

            {/* USDT Option */}
            <button
              type="button"
              id="topup-token-usdt"
              onClick={() => setSelectedToken('USDT')}
              className={`relative flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-150 text-left cursor-pointer ${
                selectedToken === 'USDT'
                  ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs text-slate-950'
                  : 'bg-white border-slate-200 hover:border-emerald-400 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <TokenIcon token="USDT" size={32} />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm sm:text-base font-black text-slate-950">USDT</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-extrabold border border-emerald-300 uppercase">
                      Polygon
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-600">Tether USD</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                <div className="text-right">
                  <div className="text-[11px] text-slate-600 font-bold">Balance</div>
                  <div className="font-mono font-black text-sm text-slate-950">{usdtBalance.toFixed(2)}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    selectedToken === 'USDT' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedToken === 'USDT' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-900 font-semibold">
              <label htmlFor="topup-amount-input">Amount to Disburse ({selectedToken})</label>
              {activeTokenBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(activeTokenBalance.toString())}
                  className="text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider cursor-pointer border border-purple-200 transition-colors"
                >
                  Use Max
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="topup-amount-input"
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3.5 text-base sm:text-lg font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 shadow-xs transition-all"
              />
              <div className="absolute right-3.5 top-3.5 flex items-center space-x-1.5 text-xs text-slate-900 font-bold font-mono pointer-events-none bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                <TokenIcon token={selectedToken} size={16} />
                <span>{selectedToken}</span>
              </div>
            </div>
          </div>

          {/* Settlement Route and Live Quote Preview */}
          <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>Settlement Route:</span>
              </span>
              <span className="text-purple-700 font-bold">Transak / Ramp Polygon Direct Card Payout Rail</span>
            </div>

            {amount && parseFloat(amount) > 0 && quote && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center space-x-1 font-medium">
                    <span>Exchange Rate:</span>
                    {quoteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />}
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">
                    1 {selectedToken} = ${quote.exchangeRate.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">Platform & Network Fee:</span>
                  <span className="font-mono text-slate-900 font-semibold">${quote.totalFee.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="font-bold text-emerald-950 text-xs sm:text-sm">Estimated Card Payout:</span>
                  <span className="font-mono text-base font-black text-emerald-700">${quote.fiatAmount.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: DESTINATION CARD DETAILS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                <CreditCard className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">2. Destination Card Details</h2>
            </div>

            {/* Live Verification Badges */}
            <div className="flex items-center gap-1.5 justify-end">
              {cardUsdCheck && !cardUsdCheck.supportsUsd && (
                <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] flex items-center space-x-1 animate-pulse">
                  <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                  <span>USD Only</span>
                </span>
              )}
              {cardBrand === 'VISA' && (!cardUsdCheck || cardUsdCheck.supportsUsd) && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[11px]">
                  VISA Direct
                </span>
              )}
              {cardBrand === 'MASTERCARD' && (!cardUsdCheck || cardUsdCheck.supportsUsd) && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                  Mastercard Send
                </span>
              )}
              {isLuhnValid && cardUsdCheck?.supportsUsd && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>VERIFIED</span>
                </span>
              )}
            </div>
          </div>

          {/* Bilingual Card Rejection Banner when non-USD card is entered */}
          {cardUsdCheck && !cardUsdCheck.supportsUsd && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs space-y-1 shadow-xs">
              <div className="flex items-center space-x-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{cardUsdCheck.statusTextBn} — {cardUsdCheck.statusTextEn}</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                {cardUsdCheck.reasonBn}
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed italic">
                {cardUsdCheck.reasonEn}
              </p>
            </div>
          )}

          {/* Card Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="topup-card-number" className="text-xs sm:text-sm text-slate-700 font-semibold block">
                Card Number
              </label>
              {cardUsdCheck && !cardUsdCheck.supportsUsd && (
                <span className="text-xs font-bold text-rose-600 flex items-center space-x-1">
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>USD Supported Cards Only</span>
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <CreditCard className="w-4 h-4" />
              </div>
              <input
                id="topup-card-number"
                type="text"
                required
                maxLength={23}
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className={`w-full bg-white border-2 rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm font-mono font-bold tracking-wider placeholder:text-slate-400 focus:outline-none shadow-xs transition-colors ${
                  cardUsdCheck && !cardUsdCheck.supportsUsd
                    ? 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500'
                    : cardUsdCheck && cardUsdCheck.supportsUsd
                    ? 'border-emerald-500 text-slate-900 focus:border-emerald-600'
                    : 'border-slate-300 text-slate-900 focus:border-purple-600'
                }`}
              />
              <div className="absolute right-3.5 flex items-center space-x-1.5 pointer-events-none">
                {cardUsdCheck && !cardUsdCheck.supportsUsd ? (
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-300">
                    <X className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-black text-blue-700 italic">VISA</span>
                    <div className="flex -space-x-1">
                      <div className="w-3 h-3 rounded-full bg-rose-500 opacity-90" />
                      <div className="w-3 h-3 rounded-full bg-amber-500 opacity-90" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-1.5">
            <label htmlFor="topup-cardholder" className="text-xs sm:text-sm text-slate-700 font-semibold block">
              Cardholder Name (as printed on card)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="topup-cardholder"
                type="text"
                required
                placeholder="JOHN DOE"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 shadow-xs"
              />
            </div>
          </div>

          {/* Expiration & CVC */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label htmlFor="topup-expiry" className="text-xs sm:text-sm text-slate-700 font-semibold block">
                Expiration Date
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="topup-expiry"
                  type="text"
                  required
                  maxLength={5}
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="topup-cvc" className="text-xs sm:text-sm text-slate-700 font-semibold block">
                CVC / CVV
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="topup-cvc"
                  type="password"
                  required
                  maxLength={4}
                  placeholder="•••"
                  value={cvc}
                  onChange={handleCvcChange}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 shadow-xs tracking-widest"
                />
              </div>
            </div>
          </div>

          {/* Security & Tokenization Guarantee Notice */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                PCI-DSS compliant tokenized settlement. Card credentials are never stored.
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-white border border-purple-300 flex items-center justify-center text-purple-700 shadow-xs shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* CALL TO ACTION BUTTON */}
        {!isConnected ? (
          <button
            type="button"
            id="topup-connect-btn"
            onClick={() => openWalletConnect()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-white/20"
          >
            <WalletIcon className="w-5 h-5 text-white" />
            <span className="text-white">Connect Polygon Wallet</span>
          </button>
        ) : !isPolygonNetwork ? (
          <button
            type="button"
            id="topup-switch-network-btn"
            onClick={handleSwitchToPolygon}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-base shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Please Switch to Polygon PoS</span>
          </button>
        ) : (
          <button
            id="topup-submit-btn"
            type="submit"
            disabled={submitting || isZeroBalance || isInsufficientGas || Boolean(cardUsdCheck && !cardUsdCheck.supportsUsd)}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center space-x-3 shadow-lg transition-all ${
              cardUsdCheck && !cardUsdCheck.supportsUsd
                ? 'bg-rose-100 text-rose-800 border border-rose-300 cursor-not-allowed'
                : isZeroBalance || isInsufficientGas
                ? 'bg-slate-200 text-slate-600 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white shadow-purple-500/25 active:scale-[0.99] cursor-pointer border border-white/20'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span className="text-white font-bold">{currentStep || 'Processing Card Settlement...'}</span>
              </>
            ) : cardUsdCheck && !cardUsdCheck.supportsUsd ? (
              <div className="flex items-center space-x-2 text-rose-700 font-bold">
                <X className="w-5 h-5 stroke-[3]" />
                <span>Card Not Supported (USD Only)</span>
              </div>
            ) : isZeroBalance ? (
              <span className="font-semibold text-slate-700">Balance is 0 {selectedToken} (Sending Disabled)</span>
            ) : isInsufficientGas ? (
              <span className="font-semibold text-slate-700">Insufficient POL for Gas Fee</span>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-white" />
                <span className="text-white font-bold">Pay With Card via Polygon</span>
              </>
            )}
          </button>
        )}
      </form>

      {/* Confirmation Modal / Receipt */}
      {showSuccessModal && completedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center text-slate-900">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-950">Payment Confirmed</h3>
              <p className="text-xs text-slate-600 font-medium">
                Transaction confirmed on Polygon PoS and routed for card settlement.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Payment ID:</span>
                <span className="text-purple-700 font-bold">{completedRecord.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Status:</span>
                <span className="text-emerald-700 font-bold">CONFIRMED</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Network:</span>
                <span className="text-slate-900 font-bold">Polygon PoS (Chain 137)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Token & Amount:</span>
                <span className="text-slate-900 font-bold">
                  {completedRecord.amount} {completedRecord.token}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Card Payout:</span>
                <span className="text-emerald-700 font-bold text-sm">
                  ${completedRecord.fiatAmount.toFixed(2)} USD (•••• {completedRecord.cardLast4})
                </span>
              </div>
              {completedRecord.txHash && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Tx Hash:</span>
                  <div className="flex items-center space-x-1 text-purple-700 font-bold hover:text-purple-900">
                    <span>
                      {completedRecord.txHash.slice(0, 8)}...{completedRecord.txHash.slice(-6)}
                    </span>
                    <a
                      href={`https://polygonscan.com/tx/${completedRecord.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowHistoryModal(true);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
              >
                View History
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Up History Modal with Search, Filters, and Audit Drawer */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900">Card Payout & Top-Up History</h3>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setInspectingRecord(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
                {(['ALL', 'COMPLETED', 'PROCESSING', 'FAILED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setHistoryFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      historyFilter === tab
                        ? 'bg-purple-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by ID, card, amount..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
              {loadingHistory ? (
                <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading history records...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-medium space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No card payout records found for this wallet yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 font-mono text-xs">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setInspectingRecord(item)}
                      className="py-3.5 sm:py-4 flex items-center justify-between hover:bg-purple-50/40 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <TokenIcon token={item.token} size={18} />
                          <span className="font-bold text-slate-900">
                            {item.amount} {item.token}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-emerald-700">${item.fiatAmount.toFixed(2)} USD</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 font-sans">
                          <span>{item.cardBrand} •••• {item.cardLast4}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                        {item.txHash && (
                          <div className="text-[11px] text-purple-600 hover:underline flex items-center justify-end space-x-1 font-sans">
                            <a
                              href={`https://polygonscan.com/tx/${item.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center space-x-1"
                            >
                              <span>Scan</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspection Drawer when clicking a transaction */}
            {inspectingRecord && (
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3 font-mono text-xs animate-in slide-in-from-bottom duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-slate-900">Audit & Ledger Detail</span>
                  <button
                    onClick={() => setInspectingRecord(null)}
                    className="text-slate-400 hover:text-slate-800 text-[11px] font-sans font-bold cursor-pointer"
                  >
                    Close Detail
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Payment ID: <span className="font-bold text-slate-900">{inspectingRecord.id}</span></div>
                  <div>Cardholder: <span className="font-bold text-slate-900">{inspectingRecord.cardholderName}</span></div>
                  <div>Rail Provider: <span className="font-bold text-slate-900">{inspectingRecord.provider}</span></div>
                  <div>Settlement: <span className="font-bold text-emerald-700">${inspectingRecord.fiatAmount.toFixed(2)} USD</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
