import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Lock,
  Unlock,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  History,
  QrCode,
  ArrowRight,
  Layers,
  CreditCard,
  User,
  ShieldCheck,
} from 'lucide-react';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKENS, POLYGON_CHAIN_ID } from '@/lib/tokens';
import { buildPaymentQRUri } from '@/lib/payments';
import {
  type BillingFrequency,
  type RecurringStatus,
  type RecurringInvoiceData,
  getSavedRecurringInvoices,
  saveRecurringInvoice,
  calculateNextBillingDate,
} from '@/lib/subscription';
import { generateSubscriptionInvoicePdf } from '@/lib/invoices';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionUpgradeModal } from '@/components/SubscriptionUpgradeModal';

interface RecurringSubscriptionInvoiceSectionProps {
  effectiveReceiverAddress: string;
  storeName: string;
}

export const RecurringSubscriptionInvoiceSection: React.FC<
  RecurringSubscriptionInvoiceSectionProps
> = ({ effectiveReceiverAddress, storeName }) => {
  const {
    subscription,
    isActive,
    versePrice,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    refresh,
  } = useSubscription();

  // Form State
  const [subscriberName, setSubscriberName] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('Monthly');
  const [paymentToken, setPaymentToken] = useState<'USDT' | 'USDC' | 'VERSE'>('USDT');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [nextPaymentDate, setNextPaymentDate] = useState(() =>
    calculateNextBillingDate(new Date().toISOString().split('T')[0], 'Monthly')
  );
  const [status, setStatus] = useState<RecurringStatus>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // Created Recurring Invoice view & list
  const [activeInvoice, setActiveInvoice] = useState<RecurringInvoiceData | null>(null);
  const [savedInvoices, setSavedInvoices] = useState<RecurringInvoiceData[]>(() =>
    getSavedRecurringInvoices()
  );

  // QR Modal / Copy state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedQrUri, setCopiedQrUri] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  // Sync saved invoices
  const reloadInvoices = () => {
    setSavedInvoices(getSavedRecurringInvoices());
  };

  useEffect(() => {
    window.addEventListener('cryptopay_recurring_updated', reloadInvoices);
    return () => {
      window.removeEventListener('cryptopay_recurring_updated', reloadInvoices);
    };
  }, []);

  // Update nextPaymentDate when startDate or frequency changes
  useEffect(() => {
    setNextPaymentDate(calculateNextBillingDate(startDate, billingFrequency));
  }, [startDate, billingFrequency]);

  // Handle Create Recurring Invoice
  const handleCreateRecurringInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!subscriberName.trim()) {
      setFormError('Please enter the Subscriber / Customer Name.');
      return;
    }
    if (!serviceName.trim()) {
      setFormError('Please enter the Subscription Plan / Service Name.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid recurring billing amount.');
      return;
    }

    const newRecInvoice: RecurringInvoiceData = {
      id: `SUB-INV-${Date.now().toString().slice(-6)}`,
      storeName: storeName || 'CryptoPay Official Store',
      subscriberName: subscriberName.trim(),
      subscriberEmail: subscriberEmail.trim() || undefined,
      serviceName: serviceName.trim(),
      billingFrequency,
      amount: numAmount.toFixed(2),
      paymentToken,
      network: 'Polygon',
      receiverAddress: effectiveReceiverAddress,
      status,
      startDate,
      nextPaymentDate,
      totalPaidCount: 0,
      createdAt: Date.now(),
    };

    saveRecurringInvoice(newRecInvoice);
    setActiveInvoice(newRecInvoice);
    reloadInvoices();
  };

  // Payment QR Code URI
  const paymentQRUri = React.useMemo(() => {
    if (!activeInvoice) return '';
    let tokenConfig = TOKENS.usdt;
    if (activeInvoice.paymentToken === 'USDC') tokenConfig = TOKENS.usdc;
    if (activeInvoice.paymentToken === 'VERSE') tokenConfig = TOKENS.verse;

    return buildPaymentQRUri(
      activeInvoice.receiverAddress,
      activeInvoice.amount,
      tokenConfig,
      POLYGON_CHAIN_ID,
      tokenConfig.decimals
    );
  }, [activeInvoice]);

  // Copy helpers
  const handleCopyUri = () => {
    if (paymentQRUri) {
      navigator.clipboard.writeText(paymentQRUri);
      setCopiedQrUri(true);
      setTimeout(() => setCopiedQrUri(false), 2000);
    }
  };

  const handleCopyWallet = () => {
    if (activeInvoice?.receiverAddress) {
      navigator.clipboard.writeText(activeInvoice.receiverAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  // Download PDF helper
  const handleDownloadPdf = (inv: RecurringInvoiceData) => {
    generateSubscriptionInvoicePdf(inv);
  };

  // =========================================================================
  // 1. LOCKED STATE (Upgrade Required)
  // =========================================================================
  if (!isActive) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Upgrade Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Subscription Upgrade</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              🔒 Subscription Payment Tools — Upgrade Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Unlock Subscription Payment Tools for Credit Invoice. Upgrading will unlock all Subscription Payment Features inside Credit Invoice.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openUpgradeModal('1_month')}
            className="px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Unlock</span>
          </button>
        </div>

        {/* ✨ Included Features */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>✨ Included Features</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Recurring Subscription Payments</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Weekly / Monthly / Yearly Billing</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Subscription Invoice</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Next Payment Date</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Subscription Status</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Payment History</span>
            </div>
          </div>
        </div>

        {/* 💳 Choose Your Plan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span>💳 Choose Your Plan</span>
            </h3>
            <span className="text-[11px] text-slate-500">Polygon Network</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1 Month Plan Card */}
            <div className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-600 transition flex flex-col justify-between gap-4 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Standard Plan</span>
                  <h4 className="text-lg font-black text-slate-900 mt-0.5">1 Month — $2</h4>
                  <p className="text-xs text-slate-600 mt-1">Full access to recurring subscription invoice tools for 30 days.</p>
                </div>
                <span className="text-2xl font-black text-blue-700">$2</span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <span>Payment Tokens:</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="flex items-center gap-1"><TokenIcon token="USDT" size={18} /> USDT</span>
                  <span>/</span>
                  <span className="flex items-center gap-1"><TokenIcon token="USDC" size={18} /> USDC</span>
                  <span>/</span>
                  <span className="flex items-center gap-1"><TokenIcon token="VERSE" size={18} /> VERSE</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openUpgradeModal('1_month')}
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span>[ Upgrade for 1 Month ]</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Months Plan Card */}
            <div className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-600 transition flex flex-col justify-between gap-4 relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                Best Value
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Quarterly Plan</span>
                  <h4 className="text-lg font-black text-slate-900 mt-0.5">3 Months — $5</h4>
                  <p className="text-xs text-slate-600 mt-1">Full access to recurring subscription invoice tools for 90 days.</p>
                </div>
                <span className="text-2xl font-black text-blue-700">$5</span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <span>Payment Tokens:</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="flex items-center gap-1"><TokenIcon token="USDT" size={18} /> USDT</span>
                  <span>/</span>
                  <span className="flex items-center gap-1"><TokenIcon token="USDC" size={18} /> USDC</span>
                  <span>/</span>
                  <span className="flex items-center gap-1"><TokenIcon token="VERSE" size={18} /> VERSE</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openUpgradeModal('3_months')}
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span>[ Upgrade for 3 Months ]</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        <SubscriptionUpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={closeUpgradeModal}
          versePrice={versePrice}
          onSuccess={() => {
            refresh();
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. UNLOCKED ACTIVE STATE (Subscription Payment Tools Enabled)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Active Subscription Status Card */}
      <div className="bg-emerald-50/70 border border-emerald-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-black">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-emerald-950">
                ✨ Subscription Payment Tools Unlocked
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                {subscription?.planName || 'Active Plan'}
              </span>
            </div>
            <p className="text-xs text-emerald-800">
              Valid until <strong>{subscription?.expiryDate}</strong> • Recurring Billing Engine Active
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openUpgradeModal('1_month')}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-900 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-700" />
          <span>Renew / Extend</span>
        </button>
      </div>

      {/* Main Recurring Invoice Generator Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">
            Create Recurring Subscription Invoice
          </h3>
          <p className="text-xs text-slate-600">
            Configure automated recurring billing schedules (Weekly / Monthly / Yearly) for your clients and members.
          </p>
        </div>

        <form onSubmit={handleCreateRecurringInvoice} className="space-y-5">
          {/* Row 1: Subscriber Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                <span>Subscriber / Customer Name</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subscriberName}
                onChange={(e) => {
                  setSubscriberName(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., Alex Johnson, Satoshi LLC"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Subscriber Email / Contact (Optional)
              </label>
              <input
                type="email"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Row 2: Service / Plan Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Subscription Plan / Service Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. VIP Club Membership, SaaS License Tier 1"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Row 3: Billing Frequency (Weekly / Monthly / Yearly) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                <span>Weekly / Monthly / Yearly Billing</span>
              </span>
              <span className="text-[11px] text-slate-500">Auto Cycle</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Weekly', 'Monthly', 'Yearly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setBillingFrequency(freq)}
                  className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border-2 transition cursor-pointer ${
                    billingFrequency === freq
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Payment Token & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Payment Token (Polygon)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['USDT', 'USDC', 'VERSE'] as const).map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => setPaymentToken(tok)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition cursor-pointer ${
                      paymentToken === tok
                        ? 'bg-blue-50 border-blue-600 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token={tok} size={18} />
                    <span>{tok}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Recurring Amount</span>
                <span className="text-xs text-slate-500 font-semibold">{paymentToken}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. 50.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 pr-16"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  {paymentToken}
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Start Date & Next Payment Date & Subscription Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>Next Payment Date</span>
              </label>
              <input
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold text-blue-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Subscription Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RecurringStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Form Error */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Recurring Subscription Invoice</span>
          </button>
        </form>

        {/* Active Created Subscription Invoice Card */}
        {activeInvoice && (
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="p-6 rounded-3xl bg-slate-50 border-2 border-blue-600 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Subscription Invoice #{activeInvoice.id}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900">{activeInvoice.serviceName}</h4>
                  <p className="text-xs text-slate-600">Subscriber: <strong>{activeInvoice.subscriberName}</strong></p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-emerald-700 flex items-center sm:justify-end gap-1.5">
                    <TokenIcon token={activeInvoice.paymentToken} size={20} />
                    <span>{activeInvoice.amount} {activeInvoice.paymentToken}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Billed {activeInvoice.billingFrequency}
                  </span>
                </div>
              </div>

              {/* Schedule Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <strong className="text-emerald-700 uppercase">{activeInvoice.status}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Frequency:</span>
                  <strong className="text-slate-900">{activeInvoice.billingFrequency}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Start Date:</span>
                  <strong className="text-slate-900">{activeInvoice.startDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Next Payment Date:</span>
                  <strong className="text-blue-700">{activeInvoice.nextPaymentDate}</strong>
                </div>
              </div>

              {/* Buttons: Claim QR, Download PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show Subscription Payment QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeInvoice)}
                  className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-700" />
                  <span>Download Subscription PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Payment History & All Invoices Ledger */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-black text-slate-900">
              Subscription Invoices & Payment History
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {savedInvoices.length} Registered Subscriptions
          </span>
        </div>

        {savedInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No subscriber invoices created yet. Fill the form above to generate recurring Web3 billing schedules.
          </div>
        ) : (
          <div className="space-y-3">
            {savedInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{inv.serviceName}</span>
                    <span className="font-mono text-[10px] text-slate-500">#{inv.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inv.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Subscriber: <strong>{inv.subscriberName}</strong></span>
                    <span>Frequency: <strong>{inv.billingFrequency}</strong></span>
                    <span>Next Due: <strong className="text-blue-700">{inv.nextPaymentDate}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="font-black text-emerald-700 text-sm flex items-center gap-1 mr-2">
                    <TokenIcon token={inv.paymentToken} size={16} />
                    <span>{inv.amount} {inv.paymentToken}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveInvoice(inv);
                      setIsQrModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4 text-blue-700" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(inv)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition cursor-pointer"
                    title="Download Subscription PDF"
                  >
                    <Download className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {isQrModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-base font-black text-slate-900">Subscription QR Payment</h4>
                <p className="text-xs text-slate-600">{activeInvoice.serviceName} ({activeInvoice.billingFrequency})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="p-3 bg-white rounded-2xl shadow-xs">
                <QRCodeSVG
                  value={paymentQRUri}
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="mt-3 text-center">
                <div className="font-black text-emerald-700 text-lg flex items-center justify-center gap-1.5">
                  <TokenIcon token={activeInvoice.paymentToken} size={20} />
                  <span>{activeInvoice.amount} {activeInvoice.paymentToken}</span>
                </div>
                <span className="text-[11px] text-slate-500">Polygon Network</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyUri}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedQrUri ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedQrUri ? 'Copied Payment Link!' : 'Copy Payment Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyWallet}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedWallet ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWallet ? 'Copied Address!' : 'Copy Receiver Address'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
