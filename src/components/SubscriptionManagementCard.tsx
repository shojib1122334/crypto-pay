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
      className="bg-[#FFFBF8] border border-[#F2E8DF] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 font-sans text-[#212121]"
    >
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-start gap-4">
        {/* Large Padlock Icon in circular warm background */}
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
          <Lock className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#AA7752] flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#212121] tracking-tight">
              Settings → Subscription
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#555555] font-normal leading-relaxed">
            Manage your Subscription Payment Tools for Credit Invoice.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. UPGRADE SUBSCRIPTION BUTTON                                             */}
      {/* ========================================================================= */}
      <div>
        <button
          type="button"
          onClick={() => openUpgradeModal('1_month')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F16F2E] hover:bg-[#E05D1C] active:scale-[0.99] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-white fill-white" />
          <span>Upgrade Subscription</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🔒 EXPIRED STATE NOTICE (IF EXPIRED)                                      */}
      {/* ========================================================================= */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <strong className="font-bold text-rose-900">Subscription Expired:</strong> Your subscription period has ended. Please upgrade or renew to continue using subscription features.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN INFORMATION CARD (WHITE CARD WITH 9 ROWS)                         */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#F2E8DF]/70 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 sm:space-y-4.5">
        {/* ROW 1: Current Plan */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Current Plan:</span>
          </div>
          <span className="font-bold text-[#212121]">
            {subscription ? subscription.planName : isActive ? 'Active Pro Plan' : 'Free Trial'}
          </span>
        </div>

        {/* ROW 2: Free 1st Run Trial */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Free 1st Run Trial:</span>
          </div>
          <div>
            {hasFreeRun ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-xs font-semibold">
                <span>🎁 1 Free Run Available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-xs font-semibold">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Free Run Used (1/1)</span>
              </span>
            )}
          </div>
        </div>

        {/* ROW 3: Subscription Status */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Subscription Status:</span>
          </div>
          <div>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2EFE7] text-[#1B4D3E] border border-[#C5E1D0] text-xs font-bold uppercase">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ACTIVE ({daysRemaining} DAYS)</span>
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold uppercase">
                <span>EXPIRED (UPGRADE REQUIRED)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F7EBE1] text-[#AA7752] border border-[#ECD9CA] text-xs font-bold tracking-wide uppercase">
                <span>LOCKED (UPGRADE REQUIRED)</span>
              </span>
            )}
          </div>
        </div>

        {/* ROW 4: Start Date */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Start Date:</span>
          </div>
          <span className="font-semibold text-[#212121]">
            {subscription?.startDate || '—'}
          </span>
        </div>

        {/* ROW 5: Expiry Date */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Expiry Date:</span>
          </div>
          <span className="font-semibold text-[#212121]">
            {subscription?.expiryDate || '—'}
          </span>
        </div>

        {/* ROW 6: Payment Token */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              {/* Token Circular Icon with 'T' matching reference */}
              <div className="w-4 h-4 rounded-full border-1.5 border-[#AA7752] flex items-center justify-center text-[9px] font-black leading-none text-[#AA7752]">
                T
              </div>
            </div>
            <span className="font-medium text-[#212121]">Payment Token:</span>
          </div>
          <div className="font-semibold text-[#212121] flex items-center gap-1.5">
            {subscription?.token ? (
              <>
                <TokenIcon token={subscription.token} size={16} />
                <span>{subscription.token} (${subscription.usdAmount})</span>
              </>
            ) : (
              <span>USDT / USDC</span>
            )}
          </div>
        </div>

        {/* ROW 7: Receiving Wallet */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Receiving Wallet:</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#212121]">
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
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ROW 8: Transaction Hash */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Transaction Hash:</span>
          </div>
          <div>
            {subscription?.txHash ? (
              <a
                href={`https://polygonscan.com/tx/${subscription.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[#AA7752] hover:underline text-xs sm:text-sm flex items-center gap-1 font-semibold"
              >
                <span>{subscription.txHash.slice(0, 8)}...{subscription.txHash.slice(-6)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="font-semibold text-[#212121]">—</span>
            )}
          </div>
        </div>

        {/* ROW 9: Payment History */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7EBE1] text-[#AA7752] flex items-center justify-center flex-shrink-0">
              <History className="w-4.5 h-4.5" />
            </div>
            <span className="font-medium text-[#212121]">Payment History:</span>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="font-semibold text-[#AA7752] hover:text-[#825433] hover:underline flex items-center gap-1.5 cursor-pointer text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View ({history.length})</span>
            </button>
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
