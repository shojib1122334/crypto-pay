import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setSummary(data.summary);
      setResults(data.results || []);
    } catch {
      // Ignored
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 md:p-8 max-h-[90vh] flex flex-col relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Automated Compliance Test Suite</h3>
            <p className="text-xs text-slate-400">Verifies Luhn verification, zero-PAN PCI-DSS security, and idempotency</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-800 rounded-2xl mb-6">
          <div>
            <span className="text-sm font-semibold text-white block">Run Automated Verification Engine</span>
            <span className="text-xs text-slate-400">Executes institutional invariant tests directly against backend logic</span>
          </div>
          <button
            onClick={runTests}
            disabled={running}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute All Invariant Tests</span>
              </>
            )}
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-xl text-center">
              <span className="text-xs text-slate-400 block">Total Invariants</span>
              <span className="text-xl font-bold text-white">{summary.total}</span>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <span className="text-xs text-emerald-400 block">Passed</span>
              <span className="text-xl font-bold text-emerald-400">{summary.passed}</span>
            </div>
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
              <span className="text-xs text-rose-400 block">Failed</span>
              <span className="text-xl font-bold text-rose-400">{summary.failed}</span>
            </div>
          </div>
        )}

        {/* Test Result List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {results.length === 0 && !running && (
            <div className="py-12 text-center text-slate-500 text-sm">
              Click &quot;Execute All Invariant Tests&quot; to begin automated testing.
            </div>
          )}

          {results.map((r, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                r.passed
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                  : 'bg-rose-500/5 border-rose-500/20 text-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 font-mono">[{r.category}]</span>
                  <h4 className="text-sm font-semibold text-white">{r.name}</h4>
                </div>
                <p className="text-xs text-slate-400">{r.details}</p>
              </div>

              <div className="flex-shrink-0 mt-0.5">
                {r.passed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-bold px-2 py-1 bg-rose-500/10 rounded-md border border-rose-500/20">
                    <XCircle className="w-3.5 h-3.5" /> FAILED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
