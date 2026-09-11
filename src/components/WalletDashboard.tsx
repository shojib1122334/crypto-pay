import React, { useState } from 'react';
import { Wallet } from '../types/database';
import { TokenLogo } from './TokenLogo';
import { DepositModal } from './DepositModal';
import { ArrowUpRight, ArrowDownRight, RefreshCw, ShieldCheck, Lock } from 'lucide-react';

interface WalletDashboardProps {
  wallets: Wallet[];
  loading: boolean;
  onRefresh: () => void;
  onStartPayToCard: () => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({ wallets, loading, onRefresh, onStartPayToCard }) => {
  const [depositOpen, setDepositOpen] = useState(false);

  // Compute total portfolio value in USD (approximate rates)
  const calculateTotalUsd = () => {
    return wallets.reduce((acc, w) => {
      let multiplier = 1;
      if (w.asset === 'BTC') multiplier = 89450;
      if (w.asset === 'ETH') multiplier = 2680;
      return acc + w.balance * multiplier;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Available Balance</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-normal">Real-Time</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              ${calculateTotalUsd().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-medium text-slate-400 ml-2">USD</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Protected by Double-Entry Ledger and Escrow Isolation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDepositOpen(true)}
              className="flex-1 md:flex-none px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium border border-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              <span>Deposit</span>
            </button>
            <button
              onClick={onStartPayToCard}
              className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pay to Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Your Balances</h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all relative overflow-hidden group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={wallet.asset} size="md" />
                  <div>
                    <h4 className="font-semibold text-white text-base">{wallet.asset}</h4>
                    <span className="text-xs text-slate-400">
                      {wallet.asset === 'USDT' || wallet.asset === 'USDC' ? 'Stablecoin' : 'Crypto Asset'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-xs text-slate-400">Available to Payout</div>
                  <div className="text-xl font-bold text-white tracking-tight">
                    {wallet.available_balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    <span className="text-xs font-normal text-slate-400">{wallet.asset}</span>
                  </div>
                </div>

                {wallet.locked_balance > 0 && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-amber-400/90">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      In Escrow Lock
                    </span>
                    <span className="font-medium">
                      {wallet.locked_balance.toLocaleString()} {wallet.asset}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        onDepositSuccess={onRefresh}
      />
    </div>
  );
};
