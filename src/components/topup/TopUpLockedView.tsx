import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { TokenIcon } from '@/components/TokenIcon';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface TopUpLockedViewProps {
  onUnlockSuccess?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const TopUpLockedView: React.FC<TopUpLockedViewProps> = ({
  onUnlockSuccess,
  onNavigateTab,
}) => {
  const { unlock } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage('Please enter the admin password to continue.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = unlock(trimmed);
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMessage('Admin access verified. Unlocking Top Up option...');
        setPassword('');
        if (onUnlockSuccess) {
          setTimeout(() => onUnlockSuccess(), 400);
        }
      } else {
        setErrorMessage(res.error || 'Incorrect admin password. Access denied.');
      }
    }, 200);
  };

  return (
    <div
      id="topup-locked-view"
      className="max-w-2xl mx-auto my-6 sm:my-10 px-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Top Banner with Lock Theme */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-xs text-[11px] font-bold tracking-wide uppercase text-amber-100 border border-white/20 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-200" />
                Service Restricted
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Top Up Option is Locked
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-1 leading-relaxed">
                Crypto-to-Card Top Up is currently locked for general users. Only authorized administrators with the verified admin key can access and use this feature.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Lock Summary */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-700" />
              Protected Module Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <TokenIcon token="USDT" size={16} />
                </div>
                <span className="font-semibold text-slate-700">Tether (USDT) Card Off-Ramp</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <TokenIcon token="USDC" size={16} />
                </div>
                <span className="font-semibold text-slate-700">USD Coin (USDC) Card Off-Ramp</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
                <span className="font-semibold text-slate-700">Visa & Mastercard Disbursals</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
                <span className="font-semibold text-slate-700">Live FX Settlement Quotes</span>
              </div>
            </div>
          </div>

          {/* Admin Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="topup-admin-password-input"
                className="text-xs font-bold text-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Administrator Password
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Admin authorization required
                </span>
              </label>

              <div className="relative flex items-center">
                <input
                  id="topup-admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter admin password to unlock..."
                  autoComplete="off"
                  disabled={isSubmitting}
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs bg-slate-50 hover:bg-white focus:bg-white disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error feedback */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success feedback */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                id="topup-unlock-submit-btn"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-blue-600 active:scale-98 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying...' : 'Unlock Top Up Access'}</span>
              </button>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('pay-system')}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Pay System</span>
                </button>
              )}
            </div>
          </form>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Security Status: Enforcement Mode</span>
            <span className="font-mono text-slate-400">Lock Rule: #TOPUP-ADMIN-ONLY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
