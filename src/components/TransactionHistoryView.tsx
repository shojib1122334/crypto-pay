import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  CheckCircle2,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Coins,
  ShieldCheck,
  ChevronRight,
  X,
  Download,
  FileText,
  Trash2,
  ArrowDownLeft,
  Loader2,
  ArrowRight,
  Clock,
  Receipt,
  Eye,
  QrCode,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAccount } from 'wagmi';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKEN_LIST, TOKENS, type TokenSymbol } from '@/lib/tokens';
import type { TopUpRecord } from '@/types/topup';
import {
  getVerifiedTransactions,
  verifyOnChainPayment,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';
import {
  getSavedInvoices,
  generateInvoicePdf,
  markInvoiceAsPaid,
  type CryptoPayInvoiceData,
} from '@/lib/invoices';
import { buildPaymentQRUri } from '@/lib/payments';

export const TransactionHistoryView: React.FC = () => {
  const { address } = useAccount();

  // Top subtab: 'all', 'invoices', 'transactions', or 'payouts'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'invoices' | 'transactions' | 'payouts'>('all');

  const [transactions, setTransactions] = useState<VerifiedTransactionRecord[]>([]);
  const [invoices, setInvoices] = useState<CryptoPayInvoiceData[]>([]);
  const [payouts, setPayouts] = useState<TopUpRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('all');
  const [filterMyWalletOnly, setFilterMyWalletOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected for modals
  const [selectedTx, setSelectedTx] = useState<VerifiedTransactionRecord | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CryptoPayInvoiceData | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<TopUpRecord | null>(null);

  // Invoice Verification Modal & In-line Verification State
  const [invoiceVerifyHashInput, setInvoiceVerifyHashInput] = useState('');
  const [invoiceVerifyError, setInvoiceVerifyError] = useState<string | null>(null);
  const [invoiceVerifySuccess, setInvoiceVerifySuccess] = useState<string | null>(null);
  const [isVerifyingInvoiceHash, setIsVerifyingInvoiceHash] = useState(false);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Manual verify input in history view
  const [manualHash, setManualHash] = useState('');
  const [verifyingManual, setVerifyingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Load all records
  const loadData = useCallback(async () => {
    const txList = getVerifiedTransactions();
    setTransactions(txList);

    const invList = getSavedInvoices();
    setInvoices(invList);

    try {
      let combinedPayouts: TopUpRecord[] = [];

      // 1. Fetch from /api/topup/history
      try {
        const topupRes = await fetch('/api/topup/history');
        if (topupRes.ok) {
          const data = await topupRes.json();
          if (data.success && Array.isArray(data.history)) {
            combinedPayouts = data.history;
          }
        }
      } catch {
        // network or server error
      }

      // 2. Fetch from /api/payouts
      try {
        const payoutsRes = await fetch('/api/payouts');
        if (payoutsRes.ok) {
          const pData = await payoutsRes.json();
          if (Array.isArray(pData.payouts)) {
            const mappedPayouts: TopUpRecord[] = pData.payouts.map((p: any) => ({
              id: p.id,
              paymentId: p.id,
              walletAddress: p.user_id || '',
              token: (p.source_asset?.toUpperCase() || 'USDT') as 'USDT' | 'USDC',
              tokenContract: '',
              chainId: 137,
              amount: p.source_amount || 0,
              fiatCurrency: p.destination_currency || 'USD',
              fiatAmount: p.destination_amount || 0,
              cardLast4: p.destination_mask || '4242',
              cardholderName: p.cardholder_name || 'CARDHOLDER',
              cardBrand: p.card_brand || 'VISA',
              txHash: p.provider_transaction_id || '',
              status: p.status === 'COMPLETED' ? 'COMPLETED' : p.status === 'FAILED' ? 'FAILED' : 'CONFIRMING',
              provider: p.provider || 'Stripe Card Rail',
              createdAt: p.created_at || new Date().toISOString(),
            }));
            const existingIds = new Set(combinedPayouts.map((cp) => cp.id));
            for (const mp of mappedPayouts) {
              if (!existingIds.has(mp.id)) {
                combinedPayouts.push(mp);
              }
            }
          }
        }
      } catch {
        // silent
      }

      // 3. Fallback to localStorage cache
      try {
        const local = localStorage.getItem('cryptopay_topup_history');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const existingIds = new Set(combinedPayouts.map((cp) => cp.id));
            for (const item of parsed) {
              if (!existingIds.has(item.id)) {
                combinedPayouts.push(item);
              }
            }
          }
        }
      } catch {
        // silent
      }

      combinedPayouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayouts(combinedPayouts);
    } catch (err) {
      console.warn('Could not load payout history:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleHistoryUpdate = () => {
      loadData();
    };

    window.addEventListener('cryptopay_history_update', handleHistoryUpdate);
    window.addEventListener('cryptopay_invoices_update', handleHistoryUpdate);
    window.addEventListener('cryptopay_payout_update', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      window.removeEventListener('cryptopay_history_update', handleHistoryUpdate);
      window.removeEventListener('cryptopay_invoices_update', handleHistoryUpdate);
      window.removeEventListener('cryptopay_payout_update', handleHistoryUpdate);
      window.removeEventListener('storage', handleHistoryUpdate);
    };
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  // Manual verify general transaction
  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHash.trim()) return;

    setVerifyingManual(true);
    setManualError(null);
    setManualSuccess(null);

    const result = await verifyOnChainPayment(manualHash.trim());
    setVerifyingManual(false);

    if (result.success && result.record) {
      setManualSuccess(
        `Successfully verified! +${result.record.amount} ${result.record.tokenLabel} confirmed on ${result.record.network} block #${result.record.blockNumber}.`
      );
      setManualHash('');
      loadData();
    } else {
      setManualError(result.error || 'Failed to verify transaction on-chain.');
    }
  };

  // Verify specific Invoice with Transaction Hash
  const handleVerifyInvoicePayment = async (invoice: CryptoPayInvoiceData, targetHashInput?: string) => {
    const hash = (targetHashInput || invoiceVerifyHashInput).trim();
    if (!hash) {
      setInvoiceVerifyError('Please enter a valid 66-character transaction hash starting with 0x.');
      return;
    }

    setIsVerifyingInvoiceHash(true);
    setInvoiceVerifyError(null);
    setInvoiceVerifySuccess(null);

    const result = await verifyOnChainPayment(hash, {
      expectedMerchant: invoice.receiverAddress,
      expectedAmount: invoice.amount,
      expectedToken: invoice.paymentMethod.toLowerCase(),
      expectedChainId: invoice.networkChainId,
      sessionId: invoice.id,
    });

    setIsVerifyingInvoiceHash(false);

    if (result.success && result.record) {
      setInvoiceVerifySuccess(
        `Payment confirmed on ${result.record.network}! Invoice status updated to 'Paid / Verified'.`
      );
      markInvoiceAsPaid(invoice.id, hash, result.record.blockNumber);
      setInvoiceVerifyHashInput('');
      loadData();
      if (selectedInvoice && selectedInvoice.id === invoice.id) {
        setSelectedInvoice({
          ...selectedInvoice,
          status: 'Paid',
          txHash: hash,
          paidAt: result.record.timestamp,
          verifiedBlock: result.record.blockNumber,
        });
      }
    } else {
      setInvoiceVerifyError(
        result.error || 'Failed to verify transaction hash on-chain. Please verify the network and hash.'
      );
    }
  };

  const handleClearHistory = () => {
    if (
      window.confirm(
        'Are you sure you want to clear your local transaction history and invoices? This action will reset local ledger data.'
      )
    ) {
      localStorage.removeItem('cryptopay_real_transaction_history');
      localStorage.removeItem('cryptopay_created_invoices');
      loadData();
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHash = tx.txHash.toLowerCase().includes(q);
        const matchesSender = tx.senderAddress.toLowerCase().includes(q);
        const matchesRecipient = tx.recipientAddress.toLowerCase().includes(q);
        const matchesAmount = tx.amount.includes(q);
        const matchesToken = tx.tokenLabel.toLowerCase().includes(q);
        if (!matchesHash && !matchesSender && !matchesRecipient && !matchesAmount && !matchesToken) {
          return false;
        }
      }

      if (selectedTokenFilter !== 'all' && tx.token !== selectedTokenFilter) {
        return false;
      }

      if (filterMyWalletOnly && address) {
        const isParticipant =
          tx.recipientAddress.toLowerCase() === address.toLowerCase() ||
          tx.senderAddress.toLowerCase() === address.toLowerCase();
        if (!isParticipant) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, selectedTokenFilter, filterMyWalletOnly, address]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesStore = inv.storeName.toLowerCase().includes(q);
        const matchesCustomer = inv.customerName?.toLowerCase().includes(q) || false;
        const matchesCompany = inv.customerCompanyName?.toLowerCase().includes(q) || false;
        const matchesAddress = inv.customerAddress?.toLowerCase().includes(q) || false;
        const matchesProduct = inv.productName.toLowerCase().includes(q);
        const matchesAmount = inv.amount.includes(q);
        const matchesReceiver = inv.receiverAddress.toLowerCase().includes(q);
        const matchesTx = inv.txHash?.toLowerCase().includes(q) || false;
        if (
          !matchesId &&
          !matchesStore &&
          !matchesCustomer &&
          !matchesCompany &&
          !matchesAddress &&
          !matchesProduct &&
          !matchesAmount &&
          !matchesReceiver &&
          !matchesTx
        ) {
          return false;
        }
      }

      if (selectedTokenFilter !== 'all' && inv.paymentMethod.toLowerCase() !== selectedTokenFilter.toLowerCase()) {
        return false;
      }

      if (filterMyWalletOnly && address) {
        if (inv.receiverAddress.toLowerCase() !== address.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, searchQuery, selectedTokenFilter, filterMyWalletOnly, address]);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(q) || p.paymentId?.toLowerCase().includes(q);
        const matchesHash = p.txHash?.toLowerCase().includes(q) || false;
        const matchesWallet = p.walletAddress?.toLowerCase().includes(q) || false;
        const matchesCard = p.cardLast4?.includes(q) || p.cardBrand?.toLowerCase().includes(q) || false;
        const matchesName = p.cardholderName?.toLowerCase().includes(q) || false;
        const matchesAmount = p.amount.toString().includes(q) || p.fiatAmount?.toString().includes(q);
        const matchesToken = p.token?.toLowerCase().includes(q);
        if (
          !matchesId &&
          !matchesHash &&
          !matchesWallet &&
          !matchesCard &&
          !matchesName &&
          !matchesAmount &&
          !matchesToken
        ) {
          return false;
        }
      }

      if (selectedTokenFilter !== 'all' && p.token?.toLowerCase() !== selectedTokenFilter.toLowerCase()) {
        return false;
      }

      if (filterMyWalletOnly && address) {
        if (p.walletAddress?.toLowerCase() !== address.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [payouts, searchQuery, selectedTokenFilter, filterMyWalletOnly, address]);

  // Aggregate stats
  const totalVolume = useMemo(() => {
    const txVol = transactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const paidInvVol = invoices
      .filter((i) => i.status === 'Paid')
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const payoutVol = payouts
      .filter((p) => p.status === 'COMPLETED')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return (txVol + paidInvVol + payoutVol).toFixed(2);
  }, [transactions, invoices, payouts]);

  const paidInvoicesCount = useMemo(() => {
    return invoices.filter((i) => i.status === 'Paid').length;
  }, [invoices]);

  const pendingInvoicesCount = useMemo(() => {
    return invoices.filter((i) => i.status === 'Pending').length;
  }, [invoices]);

  return (
    <div
      id="cryptopay-activity-view"
      className="w-full sm:max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-8 pb-20 sm:pb-28 text-white"
    >
      {/* Activity Top Header */}
      <div className="relative overflow-hidden bg-zinc-950 rounded-2xl sm:rounded-3xl border-2 border-zinc-700 shadow-2xl p-4 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border-2 border-[#3B82F6] text-[#3B82F6] text-xs font-black uppercase tracking-wider mb-3 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <History className="w-4 h-4 text-[#3B82F6] stroke-[2.5]" />
              Real-Time Ledger & Invoices
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Transaction History & Invoices
            </h1>
            <p className="text-sm text-zinc-200 mt-1.5 font-medium leading-relaxed">
              Complete audit trail of generated Credit Invoices, QR payments, on-chain hash verifications, and downloadable receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {(transactions.length > 0 || invoices.length > 0) && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-[#EF4444]/60 bg-zinc-900 hover:bg-zinc-800 text-[#EF4444] text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                title="Clear local record list"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-zinc-300 bg-white hover:bg-zinc-100 text-black text-xs font-black shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-black ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-black font-black">Refresh</span>
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t-2 border-zinc-800">
          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Settled Volume
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#00E676] tracking-tight mt-1.5 block">
              ${totalVolume}
            </span>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Credit Invoices
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {invoices.length}
              </span>
              <span className="text-[11px] font-black text-[#00E676] px-2 py-0.5 rounded-md bg-emerald-950/80 border border-[#00E676]/60">
                {paidInvoicesCount} Paid
              </span>
              {pendingInvoicesCount > 0 && (
                <span className="text-[11px] font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/60">
                  {pendingInvoicesCount} Pend
                </span>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Settled On-Chain
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 block">
              {transactions.length}
            </span>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Networks & Assets
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Coins className="w-4 h-4 text-[#FACC15]" />
              <span className="text-xs font-black text-[#FACC15]">Polygon & Ethereum</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Verification Bar */}
      <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Verify Any Blockchain Transaction Hash
            </h2>
          </div>
          <span className="text-xs text-zinc-300 font-semibold hidden sm:inline">
            Fetches on-chain receipt, updates invoices & generates PDF receipt
          </span>
        </div>

        <form onSubmit={handleManualVerify} className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            placeholder="Paste Polygon or Ethereum transaction hash (0x...)"
            value={manualHash}
            onChange={(e) => {
              setManualHash(e.target.value);
              setManualError(null);
              setManualSuccess(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-zinc-700 bg-zinc-900 text-xs sm:text-sm font-mono text-white placeholder:text-zinc-400 placeholder:font-sans focus:outline-none focus:border-[#3B82F6] transition font-semibold"
          />
          <button
            type="submit"
            disabled={verifyingManual || !manualHash.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-purple-500/25 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer border border-white/30"
          >
            {verifyingManual ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying On-Chain...</span>
              </>
            ) : (
              <>
                <span>Verify Payment</span>
                <ArrowRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {manualError && (
          <p className="text-xs font-bold text-[#EF4444] mt-2.5 bg-zinc-900 border-2 border-[#EF4444]/50 rounded-xl p-2.5">
            {manualError}
          </p>
        )}

        {manualSuccess && (
          <p className="text-xs font-bold text-[#00E676] mt-2.5 bg-zinc-900 border-2 border-[#00E676]/50 rounded-xl p-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00E676] flex-shrink-0" />
            {manualSuccess}
          </p>
        )}
      </div>

      {/* Subtab Segmented Control: All / Invoices / On-Chain TXs / Payout History */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 p-1.5 bg-zinc-950 border-2 border-zinc-700 rounded-2xl flex-wrap">
          <button
            type="button"
            id="activity-subtab-all"
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'all'
                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 shadow-2xs'
            }`}
          >
            <span>All Records</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'all' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {invoices.length + transactions.length + payouts.length}
            </span>
          </button>

          <button
            type="button"
            id="activity-subtab-invoices"
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'invoices'
                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 shadow-2xs'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Credit Invoices</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'invoices' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            id="activity-subtab-transactions"
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'transactions'
                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 shadow-2xs'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>On-Chain Settlements</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'transactions' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            id="activity-subtab-payouts"
            onClick={() => setActiveSubTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'payouts'
                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 shadow-2xs'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Payout History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'payouts' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {payouts.length}
            </span>
          </button>
        </div>

        {/* Token Filter & Connected Wallet */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-zinc-700 bg-zinc-900 text-xs font-black text-white shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#3B82F6]" />
            <select
              value={selectedTokenFilter}
              onChange={(e) => setSelectedTokenFilter(e.target.value)}
              className="bg-transparent font-black text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-zinc-900 text-white font-bold">
                All Tokens
              </option>
              {TOKEN_LIST.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white font-bold">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {address && (
            <button
              onClick={() => setFilterMyWalletOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition border-2 cursor-pointer ${
                filterMyWalletOnly
                  ? 'bg-[#3B82F6] text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 shadow-2xs'
              }`}
            >
              <span>My Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      {(transactions.length > 0 || invoices.length > 0 || payouts.length > 0) && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl p-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input
              type="text"
              placeholder="Search by invoice ID, card digits, store, product, transaction hash, address, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-zinc-700 bg-zinc-900 text-xs sm:text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#3B82F6] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: INVOICES LIST (Rendered if activeSubTab is 'all' or 'invoices') */}
      {(activeSubTab === 'all' || activeSubTab === 'invoices') && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-zinc-900 border-b-2 border-zinc-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Credit Invoices ({filteredInvoices.length})
              </h2>
            </div>
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              Complete invoice records with QR payment & hash verification
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-[#3B82F6] mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Receipt className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Credit Invoices Created Yet</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed font-normal">
                When you create a Credit Invoice (Store, Product, Amount, Network, Payment Method), a permanent record is maintained here.
              </p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-zinc-300">No invoices match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.status === 'Paid';
                const tokenSymbol = (inv.paymentMethod.toLowerCase() as TokenSymbol) || 'usdt';

                return (
                  <div
                    key={inv.id}
                    className="p-4 sm:p-5 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Product Photo & Details */}
                    <div
                      onClick={() => setSelectedInvoice(inv)}
                      className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="relative flex-shrink-0">
                        {inv.productImage ? (
                          <img
                            src={inv.productImage}
                            alt={inv.productName}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-zinc-600 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                            <TokenIcon token={tokenSymbol} size={32} />
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-zinc-950 ${
                            isPaid ? 'bg-[#00E676] text-black' : 'bg-amber-500 text-black'
                          }`}
                        >
                          {isPaid ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Clock className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm sm:text-base text-white group-hover:underline">
                            {inv.amount} {inv.paymentMethod}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isPaid
                                ? 'bg-emerald-950/80 text-[#00E676] border-[#00E676]/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                                Paid / Verified
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-300" />
                                Payment Pending
                              </>
                            )}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 px-2 py-0.5 rounded">
                            #{inv.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1.5 flex-wrap font-medium">
                          <span className="font-bold text-white">{inv.productName}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{inv.storeName}</span>
                          {inv.customerName && (
                            <>
                              <span className="text-zinc-600 font-bold">•</span>
                              <span className="text-blue-400 font-bold">Customer: {inv.customerName}</span>
                            </>
                          )}
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{inv.network}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{new Date(inv.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Download Invoice, Pay/Verify QR, Details) */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800 flex-wrap">
                      <button
                        type="button"
                        onClick={() => generateInvoicePdf(inv)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-600 transition cursor-pointer shadow-xs"
                        title="Download Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>Download Invoice</span>
                      </button>

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs shadow-md transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay & Verify</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[#3B82F6] hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: VERIFIED ON-CHAIN SETTLEMENTS (Rendered if activeSubTab is 'all' or 'transactions') */}
      {(activeSubTab === 'all' || activeSubTab === 'transactions') && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-zinc-900 border-b-2 border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                On-Chain Verified Transactions ({filteredTransactions.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-[#00E676] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Live Blockchain Settlement Records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-[#3B82F6] mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <History className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No On-Chain Transactions Recorded Yet</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed font-normal">
                When payments are completed via QR code or verified using a Transaction Hash, real blockchain receipts appear here automatically.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-zinc-300">No transactions match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredTransactions.map((tx) => {
                const tokenSymbol = (tx.token as TokenSymbol) || 'usdt';

                return (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Direction Icon & Token Details */}
                    <div
                      onClick={() => setSelectedTx(tx)}
                      className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="relative flex-shrink-0">
                        <TokenIcon token={tokenSymbol} size={40} className="shadow-xs" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00E676] text-zinc-950 flex items-center justify-center border-2 border-zinc-950 shadow-2xs">
                          <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm sm:text-base text-[#00E676] group-hover:underline transition-colors">
                            +{tx.amount} {tx.tokenLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-zinc-900 text-[#00E676] border border-[#00E676]/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                            Confirmed On-Chain
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1.5 flex-wrap font-medium">
                          <span className="font-mono text-zinc-100 font-semibold">
                            From: {tx.senderAddress.slice(0, 6)}...{tx.senderAddress.slice(-4)}
                          </span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{tx.formattedDate || new Date(tx.timestamp).toLocaleString()}</span>
                          <span className="text-zinc-600 font-bold hidden sm:inline">•</span>
                          <span className="font-mono hidden sm:inline text-zinc-300">{tx.network} Block #{tx.blockNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: PDF Receipt and Details */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <button
                        onClick={() => generatePaymentReceiptPdf(tx)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 font-black text-xs shadow-[0_0_10px_rgba(0,230,118,0.25)] transition active:scale-95 cursor-pointer"
                        title="Download PDF Receipt"
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-950" />
                        <span>PDF Receipt</span>
                      </button>

                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[#3B82F6] hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold transition cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#3B82F6]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CARD PAYOUT HISTORY (Rendered if activeSubTab is 'all' or 'payouts') */}
      {(activeSubTab === 'all' || activeSubTab === 'payouts') && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-zinc-900 border-b-2 border-zinc-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Card Payout History ({filteredPayouts.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
              Visa & Mastercard Direct Off-Ramp Disbursals
            </span>
          </div>

          {payouts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-[#3B82F6] mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <CreditCard className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Card Payouts Recorded Yet</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed font-normal">
                When you execute crypto-to-card disbursals or top up your card via Polygon PoS, full settlement records with card masks and transaction proofs will be tracked here.
              </p>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-zinc-300">No card payouts match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredPayouts.map((payout) => {
                const tokenSymbol = (payout.token?.toLowerCase() as TokenSymbol) || 'usdt';
                const isCompleted = payout.status === 'COMPLETED';
                const isFailed = payout.status === 'FAILED';

                return (
                  <div
                    key={payout.id}
                    className="p-4 sm:p-5 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Token & Card Details */}
                    <div
                      onClick={() => setSelectedPayout(payout)}
                      className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                          <TokenIcon token={tokenSymbol} size={32} />
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-zinc-950 ${
                            isCompleted
                              ? 'bg-[#00E676] text-black'
                              : isFailed
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-black'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : isFailed ? (
                            <AlertTriangle className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 stroke-[3]" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm sm:text-base text-white group-hover:underline">
                            {payout.amount} {payout.token}
                          </span>
                          <span className="text-zinc-500 font-bold">→</span>
                          <span className="font-black text-sm sm:text-base text-[#00E676]">
                            ${(payout.fiatAmount ?? payout.amount).toFixed(2)} {payout.fiatCurrency || 'USD'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isCompleted
                                ? 'bg-emerald-950/80 text-[#00E676] border-[#00E676]/60'
                                : isFailed
                                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                                Settled / Dispatched
                              </>
                            ) : isFailed ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                Failed
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                Confirming
                              </>
                            )}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 px-2 py-0.5 rounded">
                            #{payout.id.slice(0, 14)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1.5 flex-wrap font-medium">
                          <span className="inline-flex items-center gap-1.5 font-bold text-zinc-100">
                            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                            {payout.cardBrand || 'Card'} •••• {payout.cardLast4 || '4242'}
                          </span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-200 font-semibold">{payout.cardholderName || 'Cardholder'}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{new Date(payout.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      {payout.txHash && (
                        <a
                          href={`https://polygonscan.com/tx/${payout.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold transition"
                          title="View on Polygonscan"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() => setSelectedPayout(payout)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVOICE DETAILS & QR SETTLEMENT MODAL                                     */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 rounded-3xl border-2 border-zinc-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 border-b-2 border-zinc-700 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                  Credit Invoice Details (#{selectedInvoice.id})
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceVerifyError(null);
                  setInvoiceVerifySuccess(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Product & Store Header */}
              <div className="text-center pb-4 border-b-2 border-zinc-800">
                {selectedInvoice.productImage && (
                  <img
                    src={selectedInvoice.productImage}
                    alt={selectedInvoice.productName}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-zinc-600 shadow-md"
                  />
                )}
                <h4 className="text-xl font-black text-white">{selectedInvoice.productName}</h4>
                <p className="text-xs text-zinc-300 font-medium mb-1">{selectedInvoice.storeName}</p>
                {selectedInvoice.customerName && (
                  <p className="text-xs text-blue-400 font-bold mb-1">
                    Customer: {selectedInvoice.customerName}
                  </p>
                )}
                {selectedInvoice.customerCompanyName && (
                  <p className="text-xs text-indigo-400 font-bold mb-1">
                    Company: {selectedInvoice.customerCompanyName}
                  </p>
                )}
                {selectedInvoice.customerAddress && (
                  <p className="text-xs text-zinc-300 font-medium mb-2 whitespace-pre-line">
                    Address: {selectedInvoice.customerAddress}
                  </p>
                )}
                {!selectedInvoice.customerName && !selectedInvoice.customerCompanyName && !selectedInvoice.customerAddress && <div className="mb-3" />}
                {(selectedInvoice.customerName || selectedInvoice.customerCompanyName || selectedInvoice.customerAddress) && <div className="mb-2" />}

                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon
                    token={(selectedInvoice.paymentMethod.toLowerCase() as TokenSymbol) || 'usdt'}
                    size={32}
                  />
                  <span className="text-3xl font-black text-white">
                    {selectedInvoice.amount}
                  </span>
                  <span className="text-xl font-black text-[#3B82F6]">
                    {selectedInvoice.paymentMethod}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                    selectedInvoice.status === 'Paid'
                      ? 'bg-emerald-950/80 text-[#00E676] border-[#00E676]/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                  }`}
                >
                  {selectedInvoice.status === 'Paid' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                      Paid / Verified On-Chain
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      Pending Payment & Verification
                    </>
                  )}
                </span>
              </div>

              {/* QR Code Section (if Pending) */}
              {selectedInvoice.status === 'Pending' && (
                <div className="p-4 bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-center space-y-3">
                  <span className="text-xs font-bold text-white block">
                    Scan with any Web3 Wallet to Pay
                  </span>
                  <div className="inline-block p-3 bg-white rounded-2xl shadow-lg border-2 border-zinc-700">
                    <QRCodeSVG
                      value={buildPaymentQRUri(
                        selectedInvoice.receiverAddress,
                        selectedInvoice.amount,
                        TOKENS[
                          selectedInvoice.network === 'Polygon'
                            ? selectedInvoice.paymentMethod.toLowerCase()
                            : `${selectedInvoice.paymentMethod.toLowerCase()}-eth`
                        ] || TOKENS.usdt,
                        selectedInvoice.networkChainId,
                        selectedInvoice.tokenDecimals
                      )}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs text-zinc-300 font-mono break-all font-semibold bg-zinc-950 p-2.5 rounded-xl border border-zinc-700">
                    Pay to: {selectedInvoice.receiverAddress}
                  </p>
                </div>
              )}

              {/* Verify Transaction Hash Form for this Invoice */}
              <div className="p-4 bg-zinc-900 border-2 border-zinc-700 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    {selectedInvoice.status === 'Paid'
                      ? 'Verified Settlement Details'
                      : 'Verify Transaction Hash for this Invoice'}
                  </span>
                </div>

                {selectedInvoice.status === 'Paid' ? (
                  <div className="space-y-2 text-xs">
                    {selectedInvoice.txHash && (
                      <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-700">
                        <span className="text-zinc-400 block text-[10px] uppercase font-bold">
                          Transaction Hash
                        </span>
                        <span className="font-mono text-[#3B82F6] break-all font-bold select-all">
                          {selectedInvoice.txHash}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.paidAt && (
                      <div className="flex items-center justify-between text-zinc-300 p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="font-semibold">Paid & Verified At:</span>
                        <span className="font-bold text-white">
                          {new Date(selectedInvoice.paidAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.verifiedBlock && (
                      <div className="flex items-center justify-between text-zinc-300 p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="font-semibold">Confirmation Block:</span>
                        <span className="font-mono font-bold text-white">
                          #{selectedInvoice.verifiedBlock}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      After broadcasting your payment on-chain via QR scan or wallet, enter the transaction hash to verify and mark this invoice as <strong className="text-white font-bold">Paid / Verified</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Paste transaction hash (0x...)"
                        value={invoiceVerifyHashInput}
                        onChange={(e) => {
                          setInvoiceVerifyHashInput(e.target.value);
                          setInvoiceVerifyError(null);
                        }}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-zinc-700 bg-zinc-950 text-xs font-mono text-white placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-[#3B82F6]"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyInvoicePayment(selectedInvoice)}
                        disabled={isVerifyingInvoiceHash || !invoiceVerifyHashInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm"
                      >
                        {isVerifyingInvoiceHash ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Payment</span>
                          </>
                        )}
                      </button>
                    </div>

                    {invoiceVerifyError && (
                      <p className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-500/60 rounded-xl p-2.5">
                        {invoiceVerifyError}
                      </p>
                    )}

                    {invoiceVerifySuccess && (
                      <p className="text-xs font-bold text-[#00E676] bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-2.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00E676] flex-shrink-0" />
                        {invoiceVerifySuccess}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Data Specifications Table */}
              <div className="space-y-2 text-xs">
                {selectedInvoice.customerName && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                    <span className="text-zinc-300 font-bold">Customer Name</span>
                    <span className="font-bold text-white">{selectedInvoice.customerName}</span>
                  </div>
                )}

                {selectedInvoice.customerCompanyName && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                    <span className="text-zinc-300 font-bold">Customer Company Name</span>
                    <span className="font-bold text-white">{selectedInvoice.customerCompanyName}</span>
                  </div>
                )}

                {selectedInvoice.customerAddress && (
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                    <span className="text-zinc-300 font-bold">Customer Address</span>
                    <span className="font-medium text-white text-right whitespace-pre-line max-w-[240px]">
                      {selectedInvoice.customerAddress}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Settlement Network</span>
                  <span className="font-bold text-white">
                    {selectedInvoice.network} (Chain ID {selectedInvoice.networkChainId})
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Receiver Wallet</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-zinc-100 font-semibold">
                      {selectedInvoice.receiverAddress.slice(0, 8)}...{selectedInvoice.receiverAddress.slice(-6)}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedInvoice.receiverAddress, 'invReceiver')}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedHash === 'invReceiver' ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Generated Date</span>
                  <span className="text-zinc-200 font-semibold">
                    {new Date(selectedInvoice.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => generateInvoicePdf(selectedInvoice)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs py-3 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Invoice (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3 border border-zinc-600 transition cursor-pointer"
                >
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ON-CHAIN SETTLEMENT TRANSACTION MODAL                                     */}
      {/* ========================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 rounded-3xl border-2 border-zinc-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 border-b-2 border-zinc-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00E676]" />
                <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                  Verified Payment Receipt
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Big Amount Header */}
              <div className="text-center pb-4 border-b-2 border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon token={(selectedTx.token as TokenSymbol) || 'usdt'} size={36} />
                  <span className="text-3xl font-black text-[#00E676]">
                    +{selectedTx.amount}
                  </span>
                  <span className="text-xl font-black text-[#FFFFFF]">
                    {selectedTx.tokenLabel}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-zinc-900 text-[#00E676] border border-[#00E676]/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                  Settled on {selectedTx.network} ({selectedTx.chainId})
                </span>
              </div>

              {/* Data Properties */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Status</span>
                  <span className="font-black text-[#00E676] uppercase">Success / Finalized</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Exact Timestamp</span>
                  <span className="font-bold text-white">
                    {selectedTx.formattedDate || new Date(selectedTx.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Block Height</span>
                  <span className="font-mono font-black text-white">#{selectedTx.blockNumber}</span>
                </div>

                {/* Sender Address */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-300 uppercase">Customer Sender</span>
                    <button
                      onClick={() => handleCopy(selectedTx.senderAddress, 'sender')}
                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      {copiedHash === 'sender' ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-zinc-100 break-all select-all font-semibold">
                    {selectedTx.senderAddress}
                  </p>
                </div>

                {/* Recipient Address */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-300 uppercase">Merchant Recipient</span>
                    <button
                      onClick={() => handleCopy(selectedTx.recipientAddress, 'recipient')}
                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      {copiedHash === 'recipient' ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-zinc-100 break-all select-all font-semibold">
                    {selectedTx.recipientAddress}
                  </p>
                </div>

                {/* Transaction Hash */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-300 uppercase">Transaction Hash</span>
                    <button
                      onClick={() => handleCopy(selectedTx.txHash, 'hash')}
                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      {copiedHash === 'hash' ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-[#3B82F6] break-all select-all font-bold">
                    {selectedTx.txHash}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => generatePaymentReceiptPdf(selectedTx)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 font-black text-xs py-3.5 shadow-[0_0_15px_rgba(0,230,118,0.3)] transition active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-zinc-950" />
                  <span>Download PDF Receipt</span>
                </button>

                <a
                  href={
                    selectedTx.chainId === 1
                      ? `https://etherscan.io/tx/${selectedTx.txHash}`
                      : `https://polygonscan.com/tx/${selectedTx.txHash}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs py-3.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition active:scale-95"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CARD PAYOUT DETAIL & RECEIPT MODAL                                        */}
      {/* ========================================================================= */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 rounded-3xl border-2 border-zinc-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 border-b-2 border-zinc-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                  Card Payout Audit & Receipt
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayout(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Gross Amount Header */}
              <div className="text-center pb-4 border-b-2 border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon token={(selectedPayout.token?.toLowerCase() as TokenSymbol) || 'usdt'} size={36} />
                  <span className="text-3xl font-black text-[#00E676]">
                    ${(selectedPayout.fiatAmount ?? selectedPayout.amount).toFixed(2)}
                  </span>
                  <span className="text-xl font-black text-white">
                    {selectedPayout.fiatCurrency || 'USD'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-300 font-medium">
                    Source: {selectedPayout.amount} {selectedPayout.token} via Polygon PoS
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      selectedPayout.status === 'COMPLETED'
                        ? 'bg-emerald-950/80 text-[#00E676] border-[#00E676]/60'
                        : selectedPayout.status === 'FAILED'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                    }`}
                  >
                    {selectedPayout.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                        Dispatched & Settled
                      </>
                    ) : selectedPayout.status === 'FAILED' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Failed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Confirming on Polygon
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Detail Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Payment ID</span>
                  <span className="font-mono font-bold text-white">#{selectedPayout.id}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Destination Card</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#3B82F6]" />
                    {selectedPayout.cardBrand || 'Card'} •••• {selectedPayout.cardLast4 || '4242'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Cardholder</span>
                  <span className="font-bold text-zinc-100">{selectedPayout.cardholderName || 'Cardholder'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Payout Rail / Gateway</span>
                  <span className="font-bold text-zinc-100">{selectedPayout.provider || 'Stripe Card Rail'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                  <span className="text-zinc-300 font-bold">Execution Timestamp</span>
                  <span className="font-bold text-zinc-200">
                    {new Date(selectedPayout.createdAt).toLocaleString()}
                  </span>
                </div>

                {selectedPayout.walletAddress && (
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-300 font-bold">Initiating Wallet</span>
                      <button
                        onClick={() => handleCopy(selectedPayout.walletAddress, 'payout-wallet')}
                        className="text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedHash === 'payout-wallet' ? (
                          <Check className="w-3.5 h-3.5 text-[#00E676]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-zinc-200 text-xs break-all select-all font-semibold">
                      {selectedPayout.walletAddress}
                    </p>
                  </div>
                )}

                {selectedPayout.txHash && (
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-300 font-bold">Polygon PoS Transaction Hash</span>
                      <button
                        onClick={() => handleCopy(selectedPayout.txHash!, 'payout-hash')}
                        className="text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedHash === 'payout-hash' ? (
                          <Check className="w-3.5 h-3.5 text-[#00E676]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[#3B82F6] text-xs break-all select-all font-bold">
                      {selectedPayout.txHash}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 font-black text-xs py-3.5 shadow-[0_0_15px_rgba(0,230,118,0.3)] transition active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-zinc-950" />
                  <span>Print Receipt</span>
                </button>

                {selectedPayout.txHash ? (
                  <a
                    href={`https://polygonscan.com/tx/${selectedPayout.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs py-3.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition active:scale-95"
                  >
                    <span>Polygonscan</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                ) : (
                  <button
                    onClick={() => setSelectedPayout(null)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3.5 border border-zinc-600 transition active:scale-95 cursor-pointer"
                  >
                    <span>Close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryView;
