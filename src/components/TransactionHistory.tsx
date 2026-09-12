import React, { useState, useEffect } from 'react';
import { Payout, LedgerEntry, ProviderTransaction } from '../types/database';
import { TokenLogo } from './TokenLogo';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  X,
  ShieldCheck,
  Server,
} from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer / Inspection
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [providerTxs, setProviderTxs] = useState<ProviderTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts');
      const data = await res.json();
      if (data.payouts) {
        setPayouts(data.payouts);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const openInspection = async (payout: Payout) => {
    setSelectedPayout(payout);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/payouts/${payout.id}`);
      const data = await res.json();
      setLedgerEntries(data.ledger || []);
      setProviderTxs(data.providerTxs || []);
    } catch {
      setLedgerEntries([]);
      setProviderTxs([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.source_asset.toLowerCase().includes(search.toLowerCase()) ||
      (p.provider_transaction_id && p.provider_transaction_id.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'PROCESSING':
      case 'PAYOUT_SUBMITTED':
      case 'CONVERSION_COMPLETED':
      case 'BALANCE_RESERVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> Processing
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Payout Transactions & Ledger</h2>
          <p className="text-xs text-slate-400">Auditable record of all push-to-card financial settlements</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, asset..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={fetchPayouts}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {['ALL', 'COMPLETED', 'PROCESSING', 'FAILED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600/20 border border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-5">Payout ID</th>
                <th className="py-4 px-5">Crypto Paid</th>
                <th className="py-4 px-5">Card Received</th>
                <th className="py-4 px-5">Exchange Rate</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Created</th>
                <th className="py-4 px-5 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No payouts found. Initiate a Pay to Card transfer to see records here.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openInspection(p)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-5 font-mono text-slate-300 font-medium">{p.id}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={p.source_asset} size="sm" />
                        <span className="font-semibold text-white">
                          {p.source_amount.toFixed(4)} {p.source_asset}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-bold text-emerald-400">
                      ${p.destination_amount.toFixed(2)} {p.destination_currency}
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-mono">
                      1 {p.source_asset} = ${p.exchange_rate.toFixed(4)}
                    </td>
                    <td className="py-4 px-5">{getStatusBadge(p.status)}</td>
                    <td className="py-4 px-5 text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal for Ledger Inspection */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-blue-400">{selectedPayout.id}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Payout Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedPayout(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Details */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span>{getStatusBadge(selectedPayout.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source Debit</span>
                <span className="text-white font-medium">
                  {selectedPayout.source_amount} {selectedPayout.source_asset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Card Payout</span>
                <span className="text-emerald-400 font-bold">
                  ${selectedPayout.destination_amount.toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provider Ref</span>
                <span className="text-slate-300 font-mono">
                  {selectedPayout.provider_transaction_id || 'Instant Clearing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key</span>
                <span className="text-slate-400 font-mono">{selectedPayout.idempotency_key}</span>
              </div>
            </div>

            {/* Double-Entry Ledger Entries */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">Double-Entry Ledger Audit Trail</h4>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading ledger journal entries...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs bg-slate-800/30 rounded-xl border border-slate-800">
                  No ledger entries recorded for this transaction.
                </div>
              ) : (
                <div className="space-y-3">
                  {ledgerEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-800/30 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs font-mono"
                    >
                      <div className="flex justify-between text-slate-400">
                        <span className="text-blue-400 font-bold">{entry.entry_type}</span>
                        <span className="text-slate-500">{new Date(entry.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">{entry.description}</div>
                      <div className="pt-2 border-t border-slate-700/40 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-rose-400 font-semibold">DR:</span>{' '}
                          <span className="text-slate-300">{entry.debit_account}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400 font-semibold">CR:</span>{' '}
                          <span className="text-slate-300">{entry.credit_account}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provider Rail Transactions */}
            {providerTxs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-semibold text-white">Card Rail Provider Calls</h4>
                </div>
                <div className="space-y-2">
                  {providerTxs.map((ptx) => (
                    <div
                      key={ptx.id}
                      className="bg-slate-800/30 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1"
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-bold">{ptx.provider}</span>
                        <span className="text-emerald-400">{ptx.provider_status}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] truncate">Tx ID: {ptx.provider_transaction_id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
