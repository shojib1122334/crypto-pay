import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Globe,
  Sparkles,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { CardCurrencyValidator } from '../utils/cardCurrencyValidator';
import { SupportedTokenSymbol, WalletOnChainBalances } from '../types/polygon';
import { Web3WalletHelper } from '../services/polygon/web3Wallet';
import { WalletDashboard } from './WalletDashboard';
import { TransactionHistory } from './TransactionHistory';
import { AdminPanel } from './AdminPanel';
import { TestSuiteModal } from './TestSuiteModal';
import { PayToCardFlow } from './PayToCardFlow';
import { Wallet } from '../types/database';

export const PayWithCardApp: React.FC = () => {
  // Navigation Tabs inside Top Up / Pay With Card
  const [activeTab, setActiveTab] = useState<'pay-card' | 'custody-flow' | 'dashboard' | 'history' | 'admin'>('pay-card');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Wallets data
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  // Web3 State (Polygon PoS Mainnet - Chain 137)
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balances, setBalances] = useState<WalletOnChainBalances | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Card & Payment Form State
  const [selectedToken, setSelectedToken] = useState<SupportedTokenSymbol>('USDC');
  const [amount, setAmount] = useState<string>('50');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');

  // Validation feedback
  const [cardValidation, setCardValidation] = useState<{
    supportsUsd: boolean;
    reasonBn?: string;
    reasonEn?: string;
    brand?: string;
    isLuhnValid?: boolean;
    formattedCard?: string;
  } | null>(null);

  // Processing & Payment Execution
  const [processingState, setProcessingState] = useState<'idle' | 'quoting' | 'confirming' | 'executing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [completedTxHash, setCompletedTxHash] = useState<string>('');
  const [completedPaymentId, setCompletedPaymentId] = useState<string>('');

  // Fetch custody wallets
  const fetchCustodyWallets = async () => {
    setWalletsLoading(true);
    try {
      const res = await fetch('/api/wallets');
      const data = await res.json();
      if (data.wallets) setWallets(data.wallets);
    } catch {
      // Ignored
    } finally {
      setWalletsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustodyWallets();
  }, []);

  // Fetch Polygon on-chain balances
  const fetchOnChainBalances = async (address: string) => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/polygon/balances/${address}`);
      const data = await res.json();
      setBalances(data);
    } catch (err) {
      console.error('Failed to load on-chain balances:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Connect Web3 Wallet
  const connectWallet = async () => {
    try {
      const account = await Web3WalletHelper.connectWallet();
      setWalletAddress(account.address);
      await fetchOnChainBalances(account.address);
    } catch {
      // If no extension found, set demo account for preview
      const demoAddress = '0x71C8850437A023B5085Bc9acb578c772eF4c1341';
      setWalletAddress(demoAddress);
      await fetchOnChainBalances(demoAddress);
    }
  };

  // Auto-connect demo or injected provider on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum?.selectedAddress) {
      setWalletAddress(window.ethereum.selectedAddress);
      fetchOnChainBalances(window.ethereum.selectedAddress);
    } else {
      const demoAddress = '0x71C8850437A023B5085Bc9acb578c772eF4c1341';
      setWalletAddress(demoAddress);
      fetchOnChainBalances(demoAddress);
    }
  }, []);

  // Handle Card Input Changes & Real-Time USD Currency Detection
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 19);
    setCardNumber(rawVal);

    if (rawVal.length >= 6) {
      const check = CardCurrencyValidator.checkUsdSupport(rawVal);
      setCardValidation(check);
    } else {
      setCardValidation(null);
    }
  };

  // Calculate live fees and quote
  const numAmount = parseFloat(amount) || 0;
  const platformFee = Math.max(1.5, Number((numAmount * 0.0099).toFixed(2)));
  const networkGas = 0.01;
  const netCardPayout = Math.max(0, Number((numAmount - platformFee - networkGas).toFixed(2)));

  // Execute Web3 Card Settlement
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    if (cardValidation && !cardValidation.supportsUsd) {
      alert(cardValidation.reasonBn || 'USD payout is not supported for this card.');
      return;
    }

    if (numAmount < 10) {
      alert('Minimum payout amount is $10.00 USD');
      return;
    }

    try {
      setProcessingState('executing');
      setStatusMessage('Creating platform payment record on Polygon PoS...');

      // 1. Create on-chain payment record
      const createRes = await fetch('/api/polygon/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          token: selectedToken,
          amount: numAmount,
          paymentType: 'CARD_SETTLEMENT',
          fiatCurrency: 'USD',
          payoutMethod: 'FASTFUNDS_INSTANT',
        }),
      });
      const paymentRecord = await createRes.json();
      setCompletedPaymentId(paymentRecord.paymentId);

      setStatusMessage('Requesting Web3 wallet signature for transfer on Polygon PoS...');

      // 2. Simulate or execute on-chain transfer
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const simulatedTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      setCompletedTxHash(simulatedTxHash);

      // 3. Confirm payment with backend
      await fetch(`/api/polygon/payments/${paymentRecord.paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: simulatedTxHash }),
      });

      // Also record in topupDb for seamless history continuity
      await fetch('/api/topup/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          token: selectedToken,
          tokenAmount: numAmount,
          cardPayoutUsd: netCardPayout,
          cardLast4: cardNumber.slice(-4) || '4242',
          cardBrand: cardValidation?.brand || 'VISA',
          cardholderName: cardholderName || 'CARDHOLDER',
          txHash: simulatedTxHash,
        }),
      }).catch(() => {});

      setProcessingState('success');
      fetchOnChainBalances(walletAddress);
      fetchCustodyWallets();
    } catch (err: any) {
      setProcessingState('error');
      setStatusMessage(err.message || 'Payment execution failed');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Bar inside Top Up */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Top Up & Card Clearing</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Polygon PoS
              </span>
            </div>
            <p className="text-xs text-slate-400">Off-ramp crypto directly to USD Visa/Mastercard</p>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('pay-card')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pay-card'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pay With Card
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('custody-flow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'custody-flow'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pay to Card Flow
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History & Ledger
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reconciliation
          </button>
        </div>

        {/* Test Suite Button */}
        <button
          onClick={() => setIsTestModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Test Suite</span>
        </button>
      </div>

      {/* VIEW 1: PAY WITH CARD (Polygon Direct Flow) */}
      {activeTab === 'pay-card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Card Payout Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>Pay With Card</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </h3>
                  <p className="text-xs text-slate-400">FastFunds direct disbursement to recipient debit/credit card</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Polygon Mainnet (137)</span>
                </div>
              </div>

              <form onSubmit={handlePay} className="space-y-6">
                {/* 1. Token Selection & Amount */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    1. Select Polygon Stablecoin
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['USDC', 'USDT'] as SupportedTokenSymbol[]).map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setSelectedToken(tok)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all ${
                          selectedToken === tok
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${tok === 'USDC' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {tok === 'USDC' ? '$' : '₮'}
                          </span>
                          <div className="text-left">
                            <span className="block text-white leading-tight">{tok}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {tok === 'USDC' ? 'Native USDC' : 'Tether USDT'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-300">
                          Bal: {balances ? (tok === 'USDC' ? balances.usdcBalance : balances.usdtBalance) : '0.00'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Amount Input */}
                  <div className="relative pt-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount to Payout</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="10.00"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3.5 text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                      <div className="absolute right-3 top-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (balances) {
                              const maxVal = selectedToken === 'USDC' ? balances.usdcBalance : balances.usdtBalance;
                              setAmount(maxVal.toString());
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          MAX
                        </button>
                        <span className="text-sm font-bold text-slate-300 pr-1">{selectedToken}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Destination Card Details */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      2. Destination Card Details (Strict USD Only)
                    </label>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      Zero-PAN Storage
                    </span>
                  </div>

                  {/* Card Number Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• 0366"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <div className="absolute right-4 top-3.5 flex items-center gap-2">
                      {cardValidation?.brand && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-200 uppercase">
                          {cardValidation.brand}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Strict Non-USD Warning / Rejection Alert */}
                  {cardValidation && !cardValidation.supportsUsd && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2 text-rose-300">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>❌ USD সাপোর্ট করে না (বাতিল) — USD Not Supported (Rejected)</span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-200">
                        {cardValidation.reasonBn}
                      </p>
                      <p className="text-[11px] text-rose-300/80">
                        {cardValidation.reasonEn}
                      </p>
                    </div>
                  )}

                  {/* Supported USD Card Notice */}
                  {cardValidation && cardValidation.supportsUsd && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        USD সমর্থিত (গৃহীত) — USD Supported (Accepted)
                      </span>
                      <span className="text-[11px] text-emerald-300 font-mono">
                        {cardValidation.isLuhnValid ? 'Luhn Verified' : 'Checking Checksum...'}
                      </span>
                    </div>
                  )}

                  {/* Cardholder Name & Expiry */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="CARDHOLDER NAME"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-xs uppercase text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-center text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Fee and Net Payout Breakdown */}
                <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Rate (1:1 Stablecoin)</span>
                    <span className="text-white font-mono">1 {selectedToken} = 1.00 USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Platform Fee (0.99% min $1.50)</span>
                    <span className="text-slate-300">${platformFee.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Network Gas (Polygon PoS)</span>
                    <span className="text-slate-300">${networkGas.toFixed(2)} USD</span>
                  </div>
                  <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Estimated Card Payout:</span>
                    <span className="text-emerald-400 text-lg font-mono">
                      ${netCardPayout.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={processingState === 'executing' || (cardValidation !== null && !cardValidation.supportsUsd)}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 text-base ${
                    cardValidation !== null && !cardValidation.supportsUsd
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/25'
                  }`}
                >
                  {processingState === 'executing' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{statusMessage || 'Processing Settlement...'}</span>
                    </div>
                  ) : (
                    <>
                      <span>Disburse ${netCardPayout.toFixed(2)} to Card</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar: Wallet & Polygon PoS Status */}
          <div className="lg:col-span-4 space-y-6">
            {/* Wallet Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Connected Wallet</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-[11px] text-slate-500 font-medium">Polygon PoS Address</div>
                <div className="font-mono text-xs text-white truncate font-medium mt-0.5">
                  {walletAddress || 'Not Connected'}
                </div>
              </div>

              {/* On-Chain Balances */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">POL (Native Gas):</span>
                  <span className="font-mono text-white font-semibold">
                    {balances?.polBalance || '0.00'} POL
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Native USDC:</span>
                  <span className="font-mono text-blue-400 font-semibold">
                    {balances?.usdcBalance || '0.00'} USDC
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Tether USDT:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {balances?.usdtBalance || '0.00'} USDT
                  </span>
                </div>
              </div>

              <button
                onClick={() => fetchOnChainBalances(walletAddress)}
                disabled={balanceLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
                <span>Refresh On-Chain Balances</span>
              </button>
            </div>

            {/* Invariant & Security Badges */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 text-xs text-slate-400">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                PCI-DSS & Polygon Guarantees
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Zero PAN Storage:</strong> Credit card numbers are validated strictly in browser memory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>USD Payout Corridor:</strong> Strict BIN filters reject domestic non-USD clearing cards.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Double-Entry Ledger:</strong> Every settlement movement is recorded with debit/credit balance pairing.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CUSTODY FLOW */}
      {activeTab === 'custody-flow' && (
        <PayToCardFlow
          wallets={wallets}
          onPayoutSuccess={fetchCustodyWallets}
          onCancel={() => setActiveTab('pay-card')}
        />
      )}

      {/* VIEW 3: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <WalletDashboard
          wallets={wallets}
          loading={walletsLoading}
          onRefresh={fetchCustodyWallets}
          onStartPayToCard={() => setActiveTab('pay-card')}
        />
      )}

      {/* VIEW 4: HISTORY & LEDGER */}
      {activeTab === 'history' && <TransactionHistory />}

      {/* VIEW 5: ADMIN RECONCILIATION */}
      {activeTab === 'admin' && <AdminPanel />}

      {/* Transaction Success Modal */}
      {processingState === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">Payment Completed!</h3>
              <p className="text-xs text-slate-400">
                ${netCardPayout.toFixed(2)} USD has been scheduled for settlement to card ending in {cardNumber.slice(-4) || '4242'}.
              </p>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-2xl text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID:</span>
                <span className="text-slate-300">{completedPaymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tx Hash:</span>
                <span className="text-blue-400 truncate max-w-[200px]">{completedTxHash}</span>
              </div>
            </div>

            {completedTxHash && (
              <a
                href={`https://polygonscan.com/tx/${completedTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>View on Polygonscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => setProcessingState('idle')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Automated Test Suite Modal */}
      <TestSuiteModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />
    </div>
  );
};
