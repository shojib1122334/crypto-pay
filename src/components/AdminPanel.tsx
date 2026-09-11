import React, { useState, useEffect } from 'react';
import { ReconciliationReport } from '../types/database';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [reconRes, provRes] = await Promise.all([
        fetch('/api/admin/reconciliation'),
        fetch('/api/admin/providers'),
      ]);
      const reconData = await reconRes.json();
      const provData = await provRes.json();

      setReports(reconData.reports || []);
      setProviders(provData.providers || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Treasury & Reconciliation Hub</h2>
          <p className="text-xs text-slate-400">Continuous 3-way reconciliation across database, ledger, and card rails</p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run Reconciliation Engine</span>
        </button>
      </div>

      {/* Provider Health Cards */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          Card Payout Rail Adapters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div key={p.provider} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-sm">{p.provider}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    p.configured
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {p.configured ? 'Active Provider' : 'Sandbox Simulated'}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Endpoint: <span className="font-mono text-slate-300">{p.baseUrl}</span></div>
                {p.missingVars && p.missingVars.length > 0 && (
                  <div className="text-amber-400 text-[11px]">
                    Missing optional env: {p.missingVars.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Way Reconciliation Audit */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            3-Way Financial Reconciliation Records
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {reports.filter((r) => r.reconciliation_status === 'MATCHED').length} / {reports.length} Balanced
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Payout ID</th>
                  <th className="py-4 px-5">PayFlux State</th>
                  <th className="py-4 px-5">Provider Tx ID</th>
                  <th className="py-4 px-5">Ledger Balanced</th>
                  <th className="py-4 px-5">Reconciliation Status</th>
                  <th className="py-4 px-5">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No payout records available to reconcile.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.payout_id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-5 font-mono text-slate-300 font-medium">{r.payout_id}</td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-slate-300">{r.payout_status}</span>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-400">
                        {r.provider_tx_id || 'Instant Settlement'}
                      </td>
                      <td className="py-4 px-5">
                        {r.ledger_balanced ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Imbalance
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.reconciliation_status === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {r.reconciliation_status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-400">
                        {r.issues && r.issues.length > 0 ? (
                          <span className="text-rose-400">{r.issues.join(', ')}</span>
                        ) : (
                          <span className="text-slate-500">Zero variance confirmed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
