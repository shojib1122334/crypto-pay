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
  X,
  FileText,
  Trash2,
  CreditCard,
  AlertTriangle,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKEN_LIST, type TokenSymbol } from '@/lib/tokens';
import type { TopUpRecord } from '@/types/topup';
import type { SwapHistoryRecord } from '@/types/swap';
import { getLocalSwapHistory, syncSwapHistory } from '@/services/swapHistoryStorage';
import { formatTokenAmount, getPolygonscanTxUrl } from '@/components/exchange/tokenData';

export const TransactionHistoryView: React.FC = () => {
  const { address } = useAccount();

  // Subtabs: 'all', 'payouts', or 'swaps'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'payouts' | 'swaps'>('all');

  const [payouts, setPayouts] = useState<TopUpRecord[]>([]);
  const [swaps, setSwaps] = useState<SwapHistoryRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>('all');
  const [filterMyWalletOnly, setFilterMyWalletOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected for payout modal
  const [selectedPayout, setSelectedPayout] = useState<TopUpRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Load payout and swap records
  const loadData = useCallback(async () => {
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

    // 4. Load Swap History
    try {
      const localSwaps = getLocalSwapHistory(address);
      setSwaps(localSwaps);
      if (address) {
        syncSwapHistory(address)
          .then(({ history }) => {
            if (Array.isArray(history) && history.length > 0) {
              setSwaps(history);
            }
          })
          .catch((err) => console.warn('Could not sync swap history:', err));
      }
    } catch (err) {
      console.warn('Could not load swap history:', err);
    }
  }, [address]);

  useEffect(() => {
    loadData();

    const handleHistoryUpdate = () => {
      loadData();
    };

    window.addEventListener('cryptopay_payout_update', handleHistoryUpdate);
    window.addEventListener('cryptopay_swap_history_update', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);

    return () => {
      window.removeEventListener('cryptopay_payout_update', handleHistoryUpdate);
      window.removeEventListener('cryptopay_swap_history_update', handleHistoryUpdate);
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

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your local history cache?')) {
      localStorage.removeItem('cryptopay_topup_history');
      localStorage.removeItem('cryptopay_swap_history');
      loadData();
    }
  };

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

  // Filtered swaps
  const filteredSwaps = useMemo(() => {
    return swaps.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id?.toLowerCase().includes(q);
        const matchesHash = s.txHash?.toLowerCase().includes(q);
        const matchesInput = s.inputToken?.toLowerCase().includes(q);
        const matchesOutput = s.outputToken?.toLowerCase().includes(q);
        const matchesWallet = s.walletAddress?.toLowerCase().includes(q);
        const matchesRouter = s.routerName?.toLowerCase().includes(q);
        if (
          !matchesId &&
          !matchesHash &&
          !matchesInput &&
          !matchesOutput &&
          !matchesWallet &&
          !matchesRouter
        ) {
          return false;
        }
      }

      if (selectedTokenFilter !== 'all') {
        const tok = selectedTokenFilter.toLowerCase();
        if (s.inputToken?.toLowerCase() !== tok && s.outputToken?.toLowerCase() !== tok) {
          return false;
        }
      }

      if (filterMyWalletOnly && address) {
        if (s.walletAddress?.toLowerCase() !== address.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [swaps, searchQuery, selectedTokenFilter, filterMyWalletOnly, address]);

  // Total Payout Volume
  const totalPayoutVolume = useMemo(() => {
    return payouts
      .filter((p) => p.status === 'COMPLETED')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0)
      .toFixed(2);
  }, [payouts]);

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
              Activity Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Payout & Swap History
            </h1>
            <p className="text-sm text-zinc-200 mt-1.5 font-medium leading-relaxed">
              Complete on-chain audit trail of Card Payouts and Polygon DEX Swaps.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {(payouts.length > 0 || swaps.length > 0) && (
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t-2 border-zinc-800">
          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Card Payouts Settled
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#00E676] tracking-tight">
                ${totalPayoutVolume}
              </span>
              <span className="text-[11px] font-black text-[#00E676] px-2 py-0.5 rounded-md bg-emerald-950/80 border border-[#00E676]/60">
                {payouts.filter((p) => p.status === 'COMPLETED').length} Settled
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Total Payout Requests
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 block">
              {payouts.length}
            </span>
          </div>

          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
              Polygon DEX Swaps
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-purple-400 tracking-tight">
                {swaps.length}
              </span>
              <span className="text-[11px] font-black text-purple-300 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/60">
                On-Chain
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtab Segmented Control: All / Payout History / Swap History */}
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
            <span>All History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'all' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {payouts.length + swaps.length}
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

          <button
            type="button"
            id="activity-subtab-swaps"
            onClick={() => setActiveSubTab('swaps')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'swaps'
                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 shadow-2xs'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Swap History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'swaps' ? 'bg-black/40 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-600'
            }`}>
              {swaps.length}
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
      {(payouts.length > 0 || swaps.length > 0) && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl p-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input
              type="text"
              placeholder="Search by payout ID, card digits, transaction hash, token, amount..."
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

      {/* SECTION: CARD PAYOUT HISTORY (Rendered if activeSubTab is 'all' or 'payouts') */}
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
                                Processing
                              </>
                            )}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 px-2 py-0.5 rounded">
                            {payout.cardBrand} •••• {payout.cardLast4}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1.5 flex-wrap font-medium">
                          <span className="text-zinc-300 font-bold">{payout.cardholderName}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{payout.provider || 'Card Gateway'}</span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-zinc-300">{new Date(payout.createdAt).toLocaleString()}</span>
                          {payout.txHash && (
                            <>
                              <span className="text-zinc-600 font-bold hidden sm:inline">•</span>
                              <span className="font-mono hidden sm:inline text-zinc-400">
                                Tx: {payout.txHash.slice(0, 8)}...{payout.txHash.slice(-6)}
                              </span>
                            </>
                          )}
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold transition"
                          title="View on Polygonscan"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedPayout(payout)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION: SWAP HISTORY (Rendered if activeSubTab is 'all' or 'swaps') */}
      {(activeSubTab === 'all' || activeSubTab === 'swaps') && (
        <div className="bg-zinc-950 rounded-2xl border-2 border-zinc-700 shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-zinc-900 border-b-2 border-zinc-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Swap History ({filteredSwaps.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Polygon DEX Aggregator Swaps & Smart Routing
            </span>
          </div>

          {swaps.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <ArrowLeftRight className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Swap Transactions Yet</h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed font-normal">
                Transactions executed through CryptoPay Swap will be automatically recorded here with live Polygonscan transaction proofs.
              </p>
            </div>
          ) : filteredSwaps.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-zinc-300">No swaps match your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredSwaps.map((record) => {
                const isSuccess = record.status === 'COMPLETED';
                const isPending = record.status === 'PENDING';
                const isFailed = !isSuccess && !isPending;

                return (
                  <div
                    key={record.id || record.txHash}
                    className="p-4 sm:p-5 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Token Swap Details */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                          <ArrowLeftRight className="w-6 h-6 text-purple-400" />
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-zinc-950 ${
                            isSuccess
                              ? 'bg-[#00E676] text-black'
                              : isFailed
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-black'
                          }`}
                        >
                          {isSuccess ? (
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
                          <span className="font-black text-sm sm:text-base text-white">
                            {formatTokenAmount(record.inputAmount)} {record.inputToken}
                          </span>
                          <span className="text-zinc-500 font-bold">→</span>
                          <span className="font-black text-sm sm:text-base text-[#00E676]">
                            {formatTokenAmount(record.expectedOutputAmount)} {record.outputToken}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isSuccess
                                ? 'bg-emerald-950/80 text-[#00E676] border-[#00E676]/60'
                                : isFailed
                                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                            }`}
                          >
                            {isSuccess ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                                Completed
                              </>
                            ) : isFailed ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                Failed
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                Pending
                              </>
                            )}
                          </span>
                          {record.routerName && (
                            <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 px-2 py-0.5 rounded">
                              {record.routerName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-300 mt-1.5 flex-wrap font-medium">
                          <span className="text-zinc-300">
                            {new Date(record.createdAt).toLocaleDateString()} at{' '}
                            {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {record.walletAddress && (
                            <>
                              <span className="text-zinc-600 font-bold">•</span>
                              <span className="text-zinc-400 font-mono text-[11px]">
                                {record.walletAddress.substring(0, 6)}...{record.walletAddress.substring(record.walletAddress.length - 4)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      {record.txHash && (
                        <a
                          href={getPolygonscanTxUrl(record.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold transition"
                          title="View on Polygonscan"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
