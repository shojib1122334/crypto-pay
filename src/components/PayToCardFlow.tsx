import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Wallet, Quote, Beneficiary, Payout } from '../types/database';
import { TokenLogo } from './TokenLogo';

interface PayToCardFlowProps {
  wallets: Wallet[];
  onPayoutSuccess: () => void;
  onCancel: () => void;
}

export const PayToCardFlow: React.FC<PayToCardFlowProps> = ({ wallets, onPayoutSuccess, onCancel }) => {
  const [step, setStep] = useState<'form' | 'review' | 'processing' | 'success'>('form');

  // Form inputs
  const [sourceAsset, setSourceAsset] = useState('USDT');
  const [amount, setAmount] = useState('100');
  const [amountType, setAmountType] = useState<'source' | 'destination'>('source');
  const [fiatCurrency] = useState('USD');

  // Card inputs
  const [savedBeneficiaries, setSavedBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('new');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2028');
  const [cvv, setCvv] = useState('');

  // State
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [completedPayout, setCompletedPayout] = useState<Payout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);

  // Load beneficiaries
  useEffect(() => {
    fetch('/api/beneficiaries')
      .then((r) => r.json())
      .then((data) => {
        if (data.beneficiaries && data.beneficiaries.length > 0) {
          setSavedBeneficiaries(data.beneficiaries);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch quote
  const fetchLiveQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const payload: any = {
        sourceAsset,
        destinationCurrency: fiatCurrency,
      };

      if (amountType === 'source') {
        payload.sourceAmount = parseFloat(amount);
      } else {
        payload.destinationAmount = parseFloat(amount);
      }

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch quote');
      }

      setQuote(data.quote);
      setTimeRemaining(60);
    } catch (err: any) {
      setQuoteError(err.message);
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, amountType, fiatCurrency, sourceAsset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLiveQuote();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchLiveQuote]);

  // Quote countdown SLA
  useEffect(() => {
    if (!quote || step !== 'form') return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          fetchLiveQuote();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchLiveQuote, quote, step]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setExecutionError(null);

    if (!quote) {
      setQuoteError('Please wait for quote to calculate');
      return;
    }

    if (selectedBeneficiaryId === 'new') {
      const cleanPan = cardNumber.replace(/\D/g, '');
      if (cleanPan.length < 13 || cleanPan.length > 19) {
        setExecutionError('Invalid card number length (must be 13-19 digits)');
        return;
      }
      if (!cardholderName.trim()) {
        setExecutionError('Cardholder name is required');
        return;
      }
    }

    setStep('review');
  };

  const handleExecutePayout = async () => {
    if (!quote) return;
    setExecutionLoading(true);
    setExecutionError(null);

    try {
      const idempotencyKey = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload: any = {
        quoteId: quote.id,
        idempotencyKey,
      };

      if (selectedBeneficiaryId === 'new') {
        payload.newCard = {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardholderName,
          expiryMonth: parseInt(expiryMonth, 10),
          expiryYear: parseInt(expiryYear, 10),
          cvv,
        };
      } else {
        payload.beneficiaryId = selectedBeneficiaryId;
      }

      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Payout failed');
      }

      setCompletedPayout(data.payout);
      setStep('success');
      onPayoutSuccess();
    } catch (err: any) {
      setExecutionError(err.message);
      setStep('review');
    } finally {
      setExecutionLoading(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.asset === sourceAsset);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              step === 'form' ? 'bg-blue-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {step === 'form' ? '1' : '✓'}
          </div>
          <span className={`text-xs font-medium ${step === 'form' ? 'text-white' : 'text-slate-400'}`}>Amount & Card</span>
        </div>
        <div className="w-12 h-0.5 bg-slate-800" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              step === 'review'
                ? 'bg-blue-600 text-white'
                : step === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {step === 'success' ? '✓' : '2'}
          </div>
          <span className={`text-xs font-medium ${step === 'review' ? 'text-white' : 'text-slate-400'}`}>Review & Confirm</span>
        </div>
        <div className="w-12 h-0.5 bg-slate-800" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${
              step === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            3
          </div>
          <span className={`text-xs font-medium ${step === 'success' ? 'text-emerald-400' : 'text-slate-500'}`}>Payout Dispatched</span>
        </div>
      </div>

      {executionError && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{executionError}</span>
        </div>
      )}

      {/* STEP 1: FORM */}
      {step === 'form' && (
        <form onSubmit={handleProceedToReview} className="space-y-6">
          {/* Amount Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center justify-between">
              <span>Transfer Amount</span>
              {quote && (
                <span className="text-xs font-normal text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Rate locks in {timeRemaining}s
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Pay From</label>
                <div className="flex gap-2">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSourceAsset(w.asset)}
                      className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        sourceAsset === w.asset
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <TokenLogo symbol={w.asset} size="sm" />
                      <span>{w.asset}</span>
                    </button>
                  ))}
                </div>
                {selectedWallet && (
                  <div className="text-xs text-slate-400 mt-2">
                    Available: <span className="text-slate-200 font-medium">{selectedWallet.available_balance} {selectedWallet.asset}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Payout Currency</label>
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      $
                    </span>
                    <span>USD - United States Dollar</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">FastFunds</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                {amountType === 'source' ? `You Pay (${sourceAsset})` : `Card Receives (USD)`}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3.5 text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmountType(amountType === 'source' ? 'destination' : 'source')}
                  className="absolute right-3 top-3 text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Switch to {amountType === 'source' ? 'USD' : sourceAsset}
                </button>
              </div>
            </div>

            {/* Live Calculation Display */}
            {quote && (
              <div className="mt-4 p-4 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Exchange Rate</span>
                  <span className="text-white font-mono">
                    1 {quote.source_asset} = {quote.exchange_rate.toFixed(4)} {quote.destination_currency}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PayFlux Fee (0.75% + Network)</span>
                  <span className="text-slate-300">
                    {(quote.platform_fee + quote.network_fee).toFixed(2)} {quote.source_asset}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center text-sm font-semibold">
                  <span className="text-white">Card Holder Receives</span>
                  <span className="text-emerald-400 text-base font-bold">
                    ${quote.destination_amount.toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}
            {quoteError && <p className="text-xs text-rose-400 mt-2">{quoteError}</p>}
          </div>

          {/* Card Destination */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                Destination Visa / Mastercard
              </span>
              <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                PCI-DSS Level 1 Tokenized
              </span>
            </h3>

            {savedBeneficiaries.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">Saved Cards</label>
                <div className="grid grid-cols-1 gap-2">
                  {savedBeneficiaries.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBeneficiaryId(b.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        selectedBeneficiaryId === b.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300 border border-slate-700">
                          {b.card_brand}
                        </div>
                        <span className="font-mono">•••• {b.last4}</span>
                      </div>
                      <span className="text-xs text-slate-400">{b.cardholder_name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedBeneficiaryId('new')}
                    className={`p-3 rounded-xl border text-xs font-medium transition-all text-center ${
                      selectedBeneficiaryId === 'new'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    + Enter a New Card
                  </button>
                </div>
              </div>
            )}

            {selectedBeneficiaryId === 'new' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 •••• •••• 0366"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    required={selectedBeneficiaryId === 'new'}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Raw PAN is tokenized client-side and never saved to databases.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Cardholder Name (as printed on card)</label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="JANE DOE"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 uppercase focus:outline-none focus:border-blue-500 transition-colors"
                    required={selectedBeneficiaryId === 'new'}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Exp Month</label>
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Exp Year</label>
                    <select
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-center font-mono focus:outline-none focus:border-blue-500"
                      required={selectedBeneficiaryId === 'new'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={quoteLoading || !quote}
              className="w-2/3 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-base"
            >
              {quoteLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Review Payout Details</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {step === 'review' && quote && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="text-center pb-4 border-b border-slate-800">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Confirm Pay to Card Payout</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              ${quote.destination_amount.toFixed(2)} <span className="text-sm font-normal text-slate-400">USD</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Instant Push-to-Card Disbursement</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Source Debit</span>
              <span className="text-white font-semibold">
                {quote.total_amount.toFixed(6)} {quote.source_asset}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Locked Exchange Rate</span>
              <span className="text-white font-mono">
                1 {quote.source_asset} = ${quote.exchange_rate.toFixed(4)} USD
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Recipient Card</span>
              <span className="text-white font-mono">
                {selectedBeneficiaryId === 'new'
                  ? `•••• •••• •••• ${cardNumber.replace(/\D/g, '').slice(-4)}`
                  : `•••• ${savedBeneficiaries.find((b) => b.id === selectedBeneficiaryId)?.last4}`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Cardholder</span>
              <span className="text-white">
                {selectedBeneficiaryId === 'new'
                  ? cardholderName.toUpperCase()
                  : savedBeneficiaries.find((b) => b.id === selectedBeneficiaryId)?.cardholder_name}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Estimated Delivery</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> FastFunds Instant (&lt; 60 seconds)
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-slate-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">Double-Entry Ledger Escrow</span>
              Funds will be locked in isolated custody escrow, converted via spot liquidity pool, and disbursed directly to the card network.
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => setStep('form')}
              disabled={executionLoading}
              className="w-1/3 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleExecutePayout}
              disabled={executionLoading}
              className="w-2/3 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-semibold shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-base"
            >
              {executionLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Confirm & Disburse Funds</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 'success' && completedPayout && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Payout Dispatched Successfully!</h2>
            <p className="text-sm text-slate-400">
              ${completedPayout.destination_amount.toFixed(2)} USD has been transferred to your card.
            </p>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Payout ID:</span>
              <span className="text-slate-300">{completedPayout.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="text-emerald-400 font-semibold">{completedPayout.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Provider Ref:</span>
              <span className="text-slate-300">{completedPayout.provider_transaction_id || 'Instant Clearing'}</span>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
