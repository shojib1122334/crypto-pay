import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKEN_LIST, type TokenSymbol } from '@/lib/tokens';
import {
  getVerifiedTransactions,
  verifyOnChainPayment,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';

export const TransactionHistoryView: React.FC = () => {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<VerifiedTransactionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('all');
  const [filterMyWalletOnly, setFilterMyWalletOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<VerifiedTransactionRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Manual verify input in history view
  const [manualHash, setManualHash] = useState('');
  const [verifyingManual, setVerifyingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Load real transactions
  const loadTransactions = () => {
    const list = getVerifiedTransactions();
    setTransactions(list);
  };

  useEffect(() => {
    loadTransactions();

    const handleHistoryUpdate = () => {
      loadTransactions();
    };

    window.addEventListener('cryptopay_history_update', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      window.removeEventListener('cryptopay_history_update', handleHistoryUpdate);
      window.removeEventListener('storage', handleHistoryUpdate);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTransactions();
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
        `Successfully verified! +${result.record.amount} ${result.record.tokenLabel} confirmed on Polygon block #${result.record.blockNumber}.`
      );
      setManualHash('');
      loadTransactions();
    } else {
      setManualError(result.error || 'Failed to verify transaction on Polygon.');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your local transaction history?')) {
      localStorage.removeItem('cryptopay_real_transaction_history');
      loadTransactions();
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search matching
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

      // Token filter
      if (selectedTokenFilter !== 'all' && tx.token !== selectedTokenFilter) {
        return false;
      }

      // Filter by user connected wallet
      if (filterMyWalletOnly && address) {
        const isParticipant =
          tx.recipientAddress.toLowerCase() === address.toLowerCase() ||
          tx.senderAddress.toLowerCase() === address.toLowerCase();
        if (!isParticipant) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, selectedTokenFilter, filterMyWalletOnly, address]);

  // Aggregate stats
  const totalVolume = useMemo(() => {
    return transactions
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
      .toFixed(2);
  }, [transactions]);

  return (
    <div id="cryptopay-activity-view" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-20 sm:pb-28 text-white">
      {/* Activity Top Header */}
      <div className="relative overflow-hidden bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2.5">
              <History className="w-3.5 h-3.5 text-yellow-400" />
              Real-Time Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Transaction History
            </h1>
            <p className="text-sm text-zinc-300 mt-1">
              On-chain verified settlements with downloadable cryptographic PDF receipts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {transactions.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-bold shadow-xs active:scale-95 transition"
                title="Clear local record list"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-yellow-500/40 bg-yellow-950/40 hover:bg-yellow-900/60 text-yellow-400 text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-yellow-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-800">
          <div className="bg-black border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Verified Volume
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-yellow-400 tracking-tight mt-1 block">
              ${totalVolume}
            </span>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Settled TXs
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-red-400 tracking-tight mt-1 block">
              {transactions.length}
            </span>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Settlement Network
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-bold text-yellow-300">Polygon (137)</span>
            </div>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Supported Assets
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">USDT, USDC, VERSE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Verification Bar */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
              Verify Any Polygon Transaction
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
            Fetches on-chain receipt & generates PDF receipt
          </span>
        </div>

        <form onSubmit={handleManualVerify} className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            placeholder="Paste Polygon transaction hash (0x...)"
            value={manualHash}
            onChange={(e) => {
              setManualHash(e.target.value);
              setManualError(null);
              setManualSuccess(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-black text-xs sm:text-sm font-mono text-white placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
          />
          <button
            type="submit"
            disabled={verifyingManual || !manualHash.trim()}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold shadow-sm active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {verifyingManual ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify & Record</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </>
            )}
          </button>
        </form>

        {manualError && (
          <p className="text-xs font-semibold text-red-400 mt-2.5 bg-red-950/50 border border-red-500/40 rounded-xl p-2.5">
            {manualError}
          </p>
        )}

        {manualSuccess && (
          <p className="text-xs font-semibold text-yellow-300 mt-2.5 bg-yellow-950/50 border border-yellow-500/40 rounded-xl p-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            {manualSuccess}
          </p>
        )}
      </div>

      {/* Filter & Search Bar */}
      {transactions.length > 0 && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl p-4 mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by transaction hash, address, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-black text-xs sm:text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Token Filter Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-black text-xs font-semibold text-yellow-400">
              <Filter className="w-3.5 h-3.5 text-yellow-400" />
              <select
                value={selectedTokenFilter}
                onChange={(e) => setSelectedTokenFilter(e.target.value)}
                className="bg-transparent font-bold text-yellow-400 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-zinc-900 text-white">All Tokens</option>
                {TOKEN_LIST.map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Connected Wallet Filter Toggle */}
            {address && (
              <button
                onClick={() => setFilterMyWalletOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  filterMyWalletOnly
                    ? 'bg-red-600 text-white border-red-500 shadow-xs'
                    : 'bg-red-950/30 text-red-400 border-red-500/40 hover:bg-red-950/60'
                }`}
              >
                <span>My Wallet</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Recorded Transactions ({filteredTransactions.length})
          </h2>
          <span className="text-[11px] font-semibold text-yellow-400">
            Live Verified Polygon Records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mx-auto mb-3">
              <History className="w-7 h-7 text-yellow-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              No Recorded Transactions Yet
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
              When payments are completed or verified on Polygon via CryptoPay, real on-chain settlement details and downloadable receipts will appear here in real time.
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-medium text-zinc-400">
              No transactions match your search filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-850">
            {filteredTransactions.map((tx) => {
              const tokenSymbol = (tx.token as TokenSymbol) || 'usdt';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 hover:bg-zinc-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left Side: Direction Icon & Token Details */}
                  <div
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="relative flex-shrink-0">
                      <TokenIcon token={tokenSymbol} size={40} className="shadow-xs" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-zinc-950 shadow-2xs">
                        <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-yellow-400 group-hover:text-yellow-300 transition-colors">
                          +{tx.amount} {tx.tokenLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-500/40">
                          <CheckCircle2 className="w-3 h-3 text-red-400" />
                          Success
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1 flex-wrap font-medium">
                        <span className="font-mono text-white">
                          From: {tx.senderAddress.slice(0, 6)}...{tx.senderAddress.slice(-4)}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-300">{tx.formattedDate || new Date(tx.timestamp).toLocaleString()}</span>
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <span className="font-mono hidden sm:inline text-red-400">
                          Block #{tx.blockNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: PDF Receipt and Polygonscan actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                    <button
                      onClick={() => generatePaymentReceiptPdf(tx)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-2xs transition active:scale-95"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Receipt</span>
                    </button>

                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-yellow-400 hover:text-yellow-300 hover:bg-zinc-900 text-xs font-semibold transition"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-yellow-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Details & Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-black border-b border-zinc-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-bold text-yellow-400 tracking-wide">
                  Verified Payment Receipt
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Big Amount Header */}
              <div className="text-center pb-4 border-b border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TokenIcon token={(selectedTx.token as TokenSymbol) || 'usdt'} size={36} />
                  <span className="text-3xl font-extrabold text-yellow-400">
                    +{selectedTx.amount}
                  </span>
                  <span className="text-xl font-bold text-white">
                    {selectedTx.tokenLabel}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950/60 text-red-400 border border-red-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                  Settled on Polygon Mainnet (137)
                </span>
              </div>

              {/* Data Properties */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Status</span>
                  <span className="font-bold text-yellow-400 uppercase">Success / Finalized</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Exact Timestamp</span>
                  <span className="font-semibold text-white">
                    {selectedTx.formattedDate || new Date(selectedTx.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Polygon Block</span>
                  <span className="font-mono font-bold text-red-400">#{selectedTx.blockNumber}</span>
                </div>

                {/* Sender Address */}
                <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Customer Sender</span>
                    <button
                      onClick={() => handleCopy(selectedTx.senderAddress, 'sender')}
                      className="text-zinc-400 hover:text-white transition"
                    >
                      {copiedHash === 'sender' ? (
                        <Check className="w-3.5 h-3.5 text-yellow-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-white break-all select-all font-medium">
                    {selectedTx.senderAddress}
                  </p>
                </div>

                {/* Recipient Address */}
                <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Merchant Recipient</span>
                    <button
                      onClick={() => handleCopy(selectedTx.recipientAddress, 'recipient')}
                      className="text-zinc-400 hover:text-white transition"
                    >
                      {copiedHash === 'recipient' ? (
                        <Check className="w-3.5 h-3.5 text-yellow-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-white break-all select-all font-medium">
                    {selectedTx.recipientAddress}
                  </p>
                </div>

                {/* Transaction Hash */}
                <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Transaction Hash</span>
                    <button
                      onClick={() => handleCopy(selectedTx.txHash, 'hash')}
                      className="text-zinc-400 hover:text-white transition"
                    >
                      {copiedHash === 'hash' ? (
                        <Check className="w-3.5 h-3.5 text-yellow-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-red-400 break-all select-all font-semibold">
                    {selectedTx.txHash}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => generatePaymentReceiptPdf(selectedTx)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3.5 shadow-md shadow-red-600/30 transition active:scale-95"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Download PDF Receipt</span>
                </button>

                <a
                  href={`https://polygonscan.com/tx/${selectedTx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs py-3.5 transition active:scale-95"
                >
                  <span>Polygonscan</span>
                  <ExternalLink className="w-4 h-4 text-black" />
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
