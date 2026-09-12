import React, { useState } from 'react';
import { Shield, ShieldCheck, Lock, Unlock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { unlockAdminAccess, lockAdminAccess } from '@/lib/subscription';

export const AdminPasswordSection: React.FC = () => {
  const { isAdmin } = useSubscription();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!password) {
      setStatusMessage({ text: 'Please enter the admin password.', type: 'error' });
      return;
    }

    const result = unlockAdminAccess(password);
    if (result.success) {
      setPassword('');
      setStatusMessage({
        text: 'Admin access verified. Credit Invoice and all subscription tools are now unlocked without requiring upgrades.',
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: result.error || 'Incorrect admin password. Access denied.',
        type: 'error',
      });
    }
  };

  const handleLock = () => {
    lockAdminAccess();
    setPassword('');
    setStatusMessage({
      text: 'Admin session locked. Standard subscription rules restored.',
      type: 'success',
    });
  };

  return (
    <div
      id="settings-admin-password-section"
      className="web3-glass-card border border-white/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl shadow-purple-500/5 space-y-4 sm:space-y-5 transition-all relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D6E0F5]">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
              isAdmin
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-purple-600 border border-purple-200'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#101B5C]">Admin Security & Access</h2>
              {isAdmin ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700">
                  Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                  Protected
                </span>
              )}
            </div>
            <p className="text-xs text-[#5367A5] font-medium mt-0.5">
              Admin authentication to manage and run Credit Invoice without subscription restrictions.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleLock}
            className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-[#5367A5] hover:text-rose-700 hover:border-rose-300 text-xs font-bold border border-[#D6E0F5] transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Admin Session</span>
          </button>
        )}
      </div>

      {/* Admin Active State */}
      {isAdmin ? (
        <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-emerald-950">
                Admin Master Pass Active
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                Credit Invoice is completely unlocked for your administrative account. You can create unlimited Credit Invoices, generate QR settlement codes, download PDF invoices, and manage recurring subscription tools freely without purchasing or updating a subscription.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Password Form */
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-password-input"
              className="text-xs font-bold text-[#101B5C] block"
            >
              Admin Password
            </label>
            <div className="relative flex items-center">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password to unlock..."
                autoComplete="off"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-[#D6E0F5] text-[#101B5C] text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500 transition shadow-xs bg-[#F8FAFF] hover:bg-white focus:bg-white placeholder:text-[#8A9BC7]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#8A9BC7] hover:text-[#101B5C] transition cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white text-xs font-bold shadow-md shadow-purple-500/20 border border-white/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Access</span>
            </button>

            <span className="text-[11px] text-[#5367A5] font-medium">
              Only authorized administrators can unlock unlimited Credit Invoice access.
            </span>
          </div>
        </form>
      )}

      {/* Status Feedback Notice */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
