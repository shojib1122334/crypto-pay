import React, { useState } from 'react';
import { X, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { TokenLogo } from './TokenLogo';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onDepositSuccess }) => {
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/wallets/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amount: parseFloat(amount) }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error?.message || data.error || 'Deposit failed');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onDepositSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Deposit Crypto</h3>
            <p className="text-xs text-slate-400">Instantly credit your PayFlux settlement balances</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-medium text-white mb-1">Deposit Credited!</h4>
            <p className="text-sm text-slate-400">Your available balance has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Select Asset</label>
              <div className="grid grid-cols-2 gap-2">
                {['USDT', 'USDC', 'BTC', 'ETH'].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setAsset(token)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                      asset === token
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <TokenLogo symbol={token} size="sm" />
                    <span>{token}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <span className="absolute right-4 top-3 text-sm font-semibold text-slate-400">{asset}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Simulate On-Chain Deposit</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
