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
      className="bg-[#FFFBF8] border border-[#F2E8DF] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 font-sans text-[#212121]"
    >
      {/* ========================================================================= */}
      {/* 1. COMPACT HEADER & UPGRADE BUTTON BAR                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F2E8DF]/70">
        <div className="flex items-center gap-3">
          {/* Padlock Icon in circular warm background */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Lock className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#AA7752] flex-shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#212121] tracking-tight">
                Settings → Upgrade Subscription
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-[#555555] font-normal">
              Manage your Subscription Payment Tools for Credit Invoice.
            </p>
          </div>
        </div>

        {/* Upgrade Subscription Button */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => openUpgradeModal('1_month')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#F16F2E] hover:bg-[#E05D1C] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
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
      <div className="bg-white border border-[#F2E8DF]/80 rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
          {/* ROW 1: Current Plan */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Current Plan:</span>
            </div>
            <span className="font-bold text-[#212121] text-right">
              {subscription ? subscription.planName : isActive ? 'Active Pro Plan' : 'Free Trial'}
            </span>
          </div>

          {/* ROW 2: Free 1st Run Trial */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <Gift className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Free 1st Run Trial:</span>
            </div>
            <div>
              {hasFreeRun ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-[11px] font-semibold">
                  <span>🎁 1 Free Run Available</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-[11px] font-semibold">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Free Run Used (1/1)</span>
                </span>
              )}
            </div>
          </div>

          {/* ROW 3: Subscription Status */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Subscription Status:</span>
            </div>
            <div>
              {isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-[11px] font-bold uppercase">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>ACTIVE ({daysRemaining} DAYS)</span>
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase">
                  <span>EXPIRED (UPGRADE REQUIRED)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7EBE1] text-[#AA7752] border border-[#ECD9CA] text-[11px] font-bold tracking-wide uppercase">
                  <span>LOCKED (UPGRADE REQUIRED)</span>
                </span>
              )}
            </div>
          </div>

          {/* ROW 4: Start Date */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Start Date:</span>
            </div>
            <span className="font-semibold text-[#212121] text-right">
              {subscription?.startDate || '—'}
            </span>
          </div>

          {/* ROW 5: Expiry Date */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Expiry Date:</span>
            </div>
            <span className="font-semibold text-[#212121] text-right">
              {subscription?.expiryDate || '—'}
            </span>
          </div>

          {/* ROW 6: Payment Token */}
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <div className="w-3.5 h-3.5 rounded-full border border-[#AA7752] flex items-center justify-center text-[8px] font-black leading-none text-[#AA7752]">
                  T
                </div>
              </div>
              <span className="font-medium text-[#212121] truncate">Payment Token:</span>
            </div>
            <div className="font-semibold text-[#212121] flex items-center gap-1 text-right">
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
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Receiving Wallet:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-[#212121]">
              <span title={SUBSCRIPTION_RECEIVER_WALLET}>
                {SUBSCRIPTION_RECEIVER_WALLET.slice(0, 6)}...{SUBSCRIPTION_RECEIVER_WALLET.slice(-4)}
              </span>
              <button
                type="button"
                onClick={handleCopyWallet}
                className="p-1 text-[#AA7752] hover:text-[#825433] transition cursor-pointer"
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
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F2E8DF]/40 md:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Transaction Hash:</span>
            </div>
            <div>
              {subscription?.txHash ? (
                <a
                  href={`https://polygonscan.com/tx/${subscription.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#AA7752] hover:underline text-[11px] sm:text-xs flex items-center gap-1 font-semibold"
                >
                  <span>{subscription.txHash.slice(0, 6)}...{subscription.txHash.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="font-semibold text-[#212121]">—</span>
              )}
            </div>
          </div>

          {/* ROW 9: Payment History */}
          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[#212121] truncate">Payment History:</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="font-semibold text-[#AA7752] hover:text-[#825433] hover:underline flex items-center gap-1 cursor-pointer text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#AA7752]" />
                <h3 className="text-base font-bold text-slate-900">Subscription Payment History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 p-1.5 cursor-pointer"
              >
                Close
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No past subscription payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-[#FFFBF8] border border-[#F2E8DF] space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">{item.planName}</span>
                      <span className="font-extrabold text-[#1B4D3E] bg-[#E2EFE7] px-2.5 py-0.5 rounded-full border border-[#C5E1D0]">
                        ${item.usdAmount} USD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>Token: <strong className="text-slate-900">{item.tokenAmount} {item.token}</strong></div>
                      <div>Start: <strong className="text-slate-900">{item.startDate}</strong></div>
                      <div>Expiry: <strong className="text-slate-900">{item.expiryDate}</strong></div>
                      <div>Status: <strong className="text-slate-900">{item.status}</strong></div>
                    </div>

                    <div className="pt-2 border-t border-[#F2E8DF] flex justify-between items-center">
                      <span className="text-slate-500">Tx:</span>
                      <a
                        href={`https://polygonscan.com/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[#AA7752] hover:underline flex items-center gap-1"
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
