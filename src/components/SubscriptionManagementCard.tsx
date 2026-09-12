import React, { useState } from 'react';
import {
  Lock,
  History,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Settings,
  FileText,
  Gift,
  Calendar,
  Wallet,
} from 'lucide-react';
import { TokenIcon } from '@/components/TokenIcon';
import {
  SUBSCRIPTION_RECEIVER_WALLET,
} from '@/lib/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionUpgradeModal } from '@/components/SubscriptionUpgradeModal';

export const SubscriptionManagementCard: React.FC = () => {
  const {
    subscription,
    history,
    isActive,
    hasFreeRun,
    daysRemaining,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    refresh,
  } = useSubscription();

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const isExpired = subscription && subscription.status === 'Expired';

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(SUBSCRIPTION_RECEIVER_WALLET);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <div
      id="settings-subscription-section"
      className="web3-glass-card rounded-3xl border border-white/80 p-5 sm:p-6 shadow-xl shadow-purple-500/5 space-y-4 font-sans text-[#101B5C] relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

      {/* ========================================================================= */}
      {/* 1. COMPACT HEADER & UPGRADE BUTTON BAR                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D6E0F5]">
        <div className="flex items-center gap-3">
          {/* Padlock Icon in circular gradient background */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/20">
            <Lock className="w-5 h-5 text-white stroke-[2.2]" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-[#101B5C] tracking-tight">
                Settings → Upgrade Subscription
              </h2>
            </div>
            <p className="text-xs text-[#5367A5] font-medium">
              Manage your Subscription Payment Tools for Credit Invoice.
            </p>
          </div>
        </div>

        {/* Upgrade Subscription Button */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => openUpgradeModal('1_month')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer border border-white/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
            <span>Upgrade Subscription</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔒 EXPIRED STATE NOTICE (IF EXPIRED)                                      */}
      {/* ========================================================================= */}
      {isExpired && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <strong className="font-bold text-rose-900">Subscription Expired:</strong> Your subscription period has ended. Please upgrade or renew to continue using subscription features.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPACT INFORMATION GRID (9 ROWS ORGANIZED IN 2 RESPONSIVE COLUMNS)     */}
      {/* ========================================================================= */}
      <div className="bg-white/90 border border-[#D6E0F5] rounded-2xl p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm">
          {/* ROW 1: Current Plan */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Current Plan:</span>
            </div>
            <span className="font-black text-[#101B5C] text-right">
              {subscription ? subscription.planName : isActive ? 'Active Pro Plan' : 'Free Trial'}
            </span>
          </div>

          {/* ROW 2: Free 1st Run Trial */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-purple-600 flex items-center justify-center flex-shrink-0">
                <Gift className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Free 1st Run Trial:</span>
            </div>
            <div>
              {hasFreeRun ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span>🎁 1 Free Run Available</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Free Run Used (1/1)</span>
                </span>
              )}
            </div>
          </div>

          {/* ROW 3: Subscription Status */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-blue-600 flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Subscription Status:</span>
            </div>
            <div>
              {isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold uppercase">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>ACTIVE ({daysRemaining} DAYS)</span>
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold uppercase">
                  <span>EXPIRED (UPGRADE REQUIRED)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-extrabold tracking-wide uppercase">
                  <span>LOCKED (UPGRADE REQUIRED)</span>
                </span>
              )}
            </div>
          </div>

          {/* ROW 4: Start Date */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-purple-600 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Start Date:</span>
            </div>
            <span className="font-bold text-[#101B5C] text-right">
              {subscription?.startDate || '—'}
            </span>
          </div>

          {/* ROW 5: Expiry Date */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-purple-600 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Expiry Date:</span>
            </div>
            <span className="font-bold text-[#101B5C] text-right">
              {subscription?.expiryDate || '—'}
            </span>
          </div>

          {/* ROW 6: Payment Token */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                🪙
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Payment Token:</span>
            </div>
            <div className="font-bold text-[#101B5C] flex items-center gap-1 text-right">
              {subscription?.token ? (
                <>
                  <TokenIcon token={subscription.token} size={14} />
                  <span>{subscription.token} (${subscription.usdAmount})</span>
                </>
              ) : (
                <span>USDT / USDC</span>
              )}
            </div>
          </div>

          {/* ROW 7: Receiving Wallet */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-blue-600 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Receiving Wallet:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-[#101B5C] font-semibold">
              <span title={SUBSCRIPTION_RECEIVER_WALLET}>
                {SUBSCRIPTION_RECEIVER_WALLET.slice(0, 6)}...{SUBSCRIPTION_RECEIVER_WALLET.slice(-4)}
              </span>
              <button
                type="button"
                onClick={handleCopyWallet}
                className="p-1 text-[#5367A5] hover:text-[#101B5C] transition cursor-pointer"
                title="Copy Receiving Wallet"
              >
                {copiedWallet ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* ROW 8: Transaction Hash */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#D6E0F5]/50 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Transaction Hash:</span>
            </div>
            <div>
              {subscription?.txHash ? (
                <a
                  href={`https://polygonscan.com/tx/${subscription.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-purple-600 hover:underline text-[11px] sm:text-xs flex items-center gap-1 font-bold"
                >
                  <span>{subscription.txHash.slice(0, 6)}...{subscription.txHash.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="font-semibold text-[#5367A5]">—</span>
              )}
            </div>
          </div>

          {/* ROW 9: Payment History */}
          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#F0F4FF] text-purple-600 flex items-center justify-center flex-shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#5367A5] truncate">Payment History:</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View ({history.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UPGRADE & HISTORY MODALS (FUNCTIONALITY PRESERVED)                     */}
      {/* ========================================================================= */}
      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onSuccess={() => {
          refresh();
        }}
      />

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="web3-glass-card border border-white/90 bg-white/95 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E0F5]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-[#101B5C]">Subscription Payment History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-xs font-bold text-[#5367A5] hover:text-[#101B5C] p-1.5 cursor-pointer"
              >
                Close
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-[#5367A5] text-xs font-medium">
                No past subscription payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#D6E0F5] space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#101B5C] text-sm">{item.planName}</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ${item.usdAmount} USD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[#5367A5]">
                      <div>Token: <strong className="text-[#101B5C]">{item.tokenAmount} {item.token}</strong></div>
                      <div>Start: <strong className="text-[#101B5C]">{item.startDate}</strong></div>
                      <div>Expiry: <strong className="text-[#101B5C]">{item.expiryDate}</strong></div>
                      <div>Status: <strong className="text-[#101B5C]">{item.status}</strong></div>
                    </div>

                    <div className="pt-2 border-t border-[#D6E0F5] flex justify-between items-center">
                      <span className="text-[#5367A5]">Tx:</span>
                      <a
                        href={`https://polygonscan.com/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-purple-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>{item.txHash.slice(0, 10)}...{item.txHash.slice(-8)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
