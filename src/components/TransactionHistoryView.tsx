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
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAccount } from 'wagmi';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKEN_LIST, TOKENS, type TokenSymbol } from '@/lib/tokens';
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

  // Top subtab: 'transactions' or 'invoices'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'invoices' | 'transactions'>('all');

  const [transactions, setTransactions] = useState<VerifiedTransactionRecord[]>([]);
  const [invoices, setInvoices] = useState<CryptoPayInvoiceData[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('all');
  const [filterMyWalletOnly, setFilterMyWalletOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected for modals
  const [selectedTx, setSelectedTx] = useState<VerifiedTransactionRecord | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CryptoPayInvoiceData | null>(null);

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
  const loadData = useCallback(() => {
    const txList = getVerifiedTransactions();
    setTransactions(txList);

    const invList = getSavedInvoices();
    setInvoices(invList);
  }, []);

  useEffect(() => {
    loadData();

    const handleHistoryUpdate = () => {
      loadData();
    };

    window.addEventListener('cryptopay_history_update', handleHistoryUpdate);
    window.addEventListener('cryptopay_invoices_update', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      window.removeEventListener('cryptopay_history_update', handleHistoryUpdate);
      window.removeEventListener('cryptopay_invoices_update', handleHistoryUpdate);
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
        const matchesProduct = inv.productName.toLowerCase().includes(q);
        const matchesAmount = inv.amount.includes(q);
        const matchesReceiver = inv.receiverAddress.toLowerCase().includes(q);
        const matchesTx = inv.txHash?.toLowerCase().includes(q) || false;
        if (
          !matchesId &&
          !matchesStore &&
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

  // Aggregate stats
  const totalVolume = useMemo(() => {
    const txVol = transactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const paidInvVol = invoices
      .filter((i) => i.status === 'Paid')
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    return Math.max(txVol, paidInvVol, txVol + paidInvVol).toFixed(2);
  }, [transactions, invoices]);

  const paidInvoicesCount = useMemo(() => {
    return invoices.filter((i) => i.status === 'Paid').length;
  }, [invoices]);

  const pendingInvoicesCount = useMemo(() => {
    return invoices.filter((i) => i.status === 'Pending').length;
  }, [invoices]);

  return (
    <div
      id="cryptopay-activity-view"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-20 sm:pb-28 text-white"
    >
      {/* Activity Top Header */}
      <div className="relative overflow-hidden bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-[#3B82F6]/40 text-[#3B82F6] text-xs font-bold uppercase tracking-wider mb-2.5 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <History className="w-3.5 h-3.5 text-[#3B82F6]" />
              Real-Time Ledger & Invoices
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFFFFF] tracking-tight">
              Transaction History & Invoices
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Complete audit trail of generated Credit Invoices, QR payments, on-chain hash verifications, and downloadable receipts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(transactions.length > 0 || invoices.length > 0) && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#EF4444]/40 bg-zinc-900 hover:bg-zinc-800 text-[#EF4444] text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                title="Clear local record list"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[#FFFFFF] text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[#3B82F6] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-800">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Settled Volume
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#00E676] tracking-tight mt-1 block">
              ${totalVolume}
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Credit Invoices
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {invoices.length}
              </span>
              <span className="text-[10px] font-semibold text-[#00E676] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                {paidInvoicesCount} Paid
              </span>
              {pendingInvoicesCount > 0 && (
                <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                  {pendingInvoicesCount} Pend
                </span>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Settled On-Chain
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#FFFFFF] tracking-tight mt-1 block">
              {transactions.length}
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Networks & Assets
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-4 h-4 text-[#FACC15]" />
              <span className="text-xs font-bold text-[#FACC15]">Polygon & Ethereum</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Verification Bar */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
              Verify Any Blockchain Transaction Hash
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
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
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs sm:text-sm font-mono text-[#FFFFFF] placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-[#3B82F6] transition"
          />
          <button
            type="submit"
            disabled={verifyingManual || !manualHash.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
          >
            {verifyingManual ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying On-Chain...</span>
              </>
            ) : (
              <>
                <span>Verify Payment</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </>
            )}
          </button>
        </form>

        {manualError && (
          <p className="text-xs font-semibold text-[#EF4444] mt-2.5 bg-zinc-900 border border-[#EF4444]/40 rounded-xl p-2.5">
            {manualError}
          </p>
        )}

        {manualSuccess && (
          <p className="text-xs font-semibold text-[#00E676] mt-2.5 bg-zinc-900 border border-[#00E676]/40 rounded-xl p-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00E676] flex-shrink-0" />
            {manualSuccess}
          </p>
        )}
      </div>

      {/* Subtab Segmented Control: All / Invoices / On-Chain TXs */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'all'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>All Records</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {invoices.length + transactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('invoices')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'invoices'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Credit Invoices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transactions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'transactions'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>On-Chain Settlements</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {transactions.length}
            </span>
          </button>
        </div>

        {/* Token Filter & Connected Wallet */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-[#FFFFFF]">
            <Filter className="w-3.5 h-3.5 text-[#3B82F6]" />
            <select
              value={selectedTokenFilter}
              onChange={(e) => setSelectedTokenFilter(e.target.value)}
              className="bg-transparent font-bold text-[#FFFFFF] focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-zinc-900 text-white">
                All Tokens
              </option>
              {TOKEN_LIST.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {address && (
            <button
              onClick={() => setFilterMyWalletOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                filterMyWalletOnly
                  ? 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <span>My Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      {(transactions.length > 0 || invoices.length > 0) && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl p-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by invoice ID, store, product, transaction hash, address, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs sm:text-sm font-medium text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: INVOICES LIST (Rendered if activeSubTab is 'all' or 'invoices') */}
      {(activeSubTab === 'all' || activeSubTab === 'invoices') && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
                Credit Invoices ({filteredInvoices.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
              Complete invoice records with QR payment & hash verification
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#3B82F6] mx-auto mb-3">
                <Receipt className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-bold text-[#FFFFFF] mb-1">No Credit Invoices Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                When you create a Credit Invoice (Store, Product, Amount, Network, Payment Method), a permanent record is maintained here.
              </p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-medium text-zinc-400">No invoices match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.status === 'Paid';
                const tokenSymbol = (inv.paymentMethod.toLowerCase() as TokenSymbol) || 'usdt';

                return (
                  <div
                    key={inv.id}
                    className="p-4 sm:p-5 hover:bg-zinc-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
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
                            className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shadow-xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
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
                          <span className="font-extrabold text-sm text-white group-hover:underline">
                            {inv.amount} {inv.paymentMethod}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-950/60 text-[#00E676] border-[#00E676]/40'
                                : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-[#00E676]" />
                                Paid / Verified
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-400" />
                                Payment Pending
                              </>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">#{inv.id}</span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 mt-1 flex-wrap font-medium">
                          <span className="font-semibold text-zinc-200">{inv.productName}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-400">{inv.storeName}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-400">{inv.network}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-400">{new Date(inv.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Download Invoice, Pay/Verify QR, Details) */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800 flex-wrap">
                      <button
                        type="button"
                        onClick={() => generateInvoicePdf(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 transition cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay & Verify</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[#3B82F6] hover:text-white hover:bg-zinc-900 text-xs font-semibold transition cursor-pointer"
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
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
                On-Chain Verified Transactions ({filteredTransactions.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-[#00E676] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Live Blockchain Settlement Records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#3B82F6] mx-auto mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <History className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-bold text-[#FFFFFF] mb-1">No On-Chain Transactions Recorded Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                When payments are completed via QR code or verified using a Transaction Hash, real blockchain receipts appear here automatically.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-medium text-zinc-400">No transactions match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredTransactions.map((tx) => {
                const tokenSymbol = (tx.token as TokenSymbol) || 'usdt';

                return (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 hover:bg-zinc-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
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
                          <span className="font-bold text-sm text-[#00E676] group-hover:underline transition-colors">
                            +{tx.amount} {tx.tokenLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 text-[#00E676] border border-[#00E676]/40">
                            <CheckCircle2 className="w-3 h-3 text-[#00E676]" />
                            Confirmed On-Chain
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 mt-1 flex-wrap font-medium">
                          <span className="font-mono text-zinc-200">
                            From: {tx.senderAddress.slice(0, 6)}...{tx.senderAddress.slice(-4)}
                          </span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-400">{tx.formattedDate || new Date(tx.timestamp).toLocaleString()}</span>
                          <span className="text-zinc-700 hidden sm:inline">•</span>
                          <span className="font-mono hidden sm:inline text-zinc-400">{tx.network} Block #{tx.blockNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: PDF Receipt and Details */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <button
                        onClick={() => generatePaymentReceiptPdf(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 font-bold text-xs shadow-[0_0_10px_rgba(0,230,118,0.25)] transition active:scale-95 cursor-pointer"
                        title="Download PDF Receipt"
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-950" />
                        <span>PDF Receipt</span>
                      </button>

                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[#3B82F6] hover:text-white hover:bg-zinc-900 text-xs font-semibold transition cursor-pointer"
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

      {/* ========================================================================= */}
      {/* INVOICE DETAILS & QR SETTLEMENT MODAL                                     */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 text-white flex items-center justify-between sticky top-0 z-10">
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
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Product & Store Header */}
              <div className="text-center pb-4 border-b border-zinc-800">
                {selectedInvoice.productImage && (
                  <img
                    src={selectedInvoice.productImage}
                    alt={selectedInvoice.productName}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border border-zinc-700 shadow-md"
                  />
                )}
                <h4 className="text-lg font-bold text-white">{selectedInvoice.productName}</h4>
                <p className="text-xs text-zinc-400 mb-3">{selectedInvoice.storeName}</p>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon
                    token={(selectedInvoice.paymentMethod.toLowerCase() as TokenSymbol) || 'usdt'}
                    size={32}
                  />
                  <span className="text-3xl font-extrabold text-white">
                    {selectedInvoice.amount}
                  </span>
                  <span className="text-xl font-bold text-[#3B82F6]">
                    {selectedInvoice.paymentMethod}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    selectedInvoice.status === 'Paid'
                      ? 'bg-emerald-950/60 text-[#00E676] border-[#00E676]/40'
                      : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                  }`}
                >
                  {selectedInvoice.status === 'Paid' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                      Paid / Verified On-Chain
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Pending Payment & Verification
                    </>
                  )}
                </span>
              </div>

              {/* QR Code Section (if Pending) */}
              {selectedInvoice.status === 'Pending' && (
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-3">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Scan with any Web3 Wallet to Pay
                  </span>
                  <div className="inline-block p-3 bg-white rounded-2xl shadow-lg">
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
                  <p className="text-[11px] text-zinc-400 font-mono break-all">
                    Pay to: {selectedInvoice.receiverAddress}
                  </p>
                </div>
              )}

              {/* Verify Transaction Hash Form for this Invoice */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedInvoice.status === 'Paid'
                      ? 'Verified Settlement Details'
                      : 'Verify Transaction Hash for this Invoice'}
                  </span>
                </div>

                {selectedInvoice.status === 'Paid' ? (
                  <div className="space-y-2 text-xs">
                    {selectedInvoice.txHash && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800">
                        <span className="text-zinc-400 block text-[10px] uppercase font-bold">
                          Transaction Hash
                        </span>
                        <span className="font-mono text-[#3B82F6] break-all font-semibold select-all">
                          {selectedInvoice.txHash}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.paidAt && (
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>Paid & Verified At:</span>
                        <span className="font-semibold text-white">
                          {new Date(selectedInvoice.paidAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.verifiedBlock && (
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>Confirmation Block:</span>
                        <span className="font-mono font-semibold text-white">
                          #{selectedInvoice.verifiedBlock}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      After broadcasting your payment on-chain via QR scan or wallet, enter the transaction hash to verify and mark this invoice as <strong className="text-white">Paid / Verified</strong>.
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
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-mono text-white placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-[#3B82F6]"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyInvoicePayment(selectedInvoice)}
                        disabled={isVerifyingInvoiceHash || !invoiceVerifyHashInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
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
                      <p className="text-xs font-semibold text-[#EF4444] bg-red-950/40 border border-red-500/40 rounded-xl p-2.5">
                        {invoiceVerifyError}
                      </p>
                    )}

                    {invoiceVerifySuccess && (
                      <p className="text-xs font-semibold text-[#00E676] bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00E676] flex-shrink-0" />
                        {invoiceVerifySuccess}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Data Specifications Table */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Settlement Network</span>
                  <span className="font-bold text-white">
                    {selectedInvoice.network} (Chain ID {selectedInvoice.networkChainId})
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Receiver Wallet</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-zinc-300">
                      {selectedInvoice.receiverAddress.slice(0, 8)}...{selectedInvoice.receiverAddress.slice(-6)}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedInvoice.receiverAddress, 'invReceiver')}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedHash === 'invReceiver' ? (
                        <Check className="w-3 h-3 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Generated Date</span>
                  <span className="text-zinc-300 font-medium">
                    {new Date(selectedInvoice.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => generateInvoicePdf(selectedInvoice)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs py-3 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Invoice (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3 transition cursor-pointer"
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
          <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00E676]" />
                <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                  Verified Payment Receipt
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Big Amount Header */}
              <div className="text-center pb-4 border-b border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon token={(selectedTx.token as TokenSymbol) || 'usdt'} size={36} />
                  <span className="text-3xl font-extrabold text-[#00E676]">
                    +{selectedTx.amount}
                  </span>
                  <span className="text-xl font-bold text-[#FFFFFF]">
                    {selectedTx.tokenLabel}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 text-[#00E676] border border-[#00E676]/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                  Settled on {selectedTx.network} ({selectedTx.chainId})
                </span>
              </div>

              {/* Data Properties */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Status</span>
                  <span className="font-bold text-[#00E676] uppercase">Success / Finalized</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Exact Timestamp</span>
                  <span className="font-semibold text-[#FFFFFF]">
                    {selectedTx.formattedDate || new Date(selectedTx.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Block Height</span>
                  <span className="font-mono font-bold text-[#FFFFFF]">#{selectedTx.blockNumber}</span>
                </div>

                {/* Sender Address */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Customer Sender</span>
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
                  <p className="font-mono text-zinc-200 break-all select-all font-medium">
                    {selectedTx.senderAddress}
                  </p>
                </div>

                {/* Recipient Address */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Merchant Recipient</span>
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
                  <p className="font-mono text-zinc-200 break-all select-all font-medium">
                    {selectedTx.recipientAddress}
                  </p>
                </div>

                {/* Transaction Hash */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Transaction Hash</span>
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
                  <p className="font-mono text-[#3B82F6] break-all select-all font-semibold">
                    {selectedTx.txHash}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => generatePaymentReceiptPdf(selectedTx)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 font-bold text-xs py-3.5 shadow-[0_0_15px_rgba(0,230,118,0.3)] transition active:scale-95 cursor-pointer"
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-bold text-xs py-3.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition active:scale-95"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryView;
