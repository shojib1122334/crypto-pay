import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  History,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
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
    isDbLoading,
    walletAddress,
    isWalletConnected,
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
    <div id="settings-subscription-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {isActive ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">⚙️ Settings → Subscription</h2>
              {isActive && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700">
                  Active
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-700">
                  Expired
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Manage your Subscription Payment Tools for Credit Invoice.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isActive ? (
            <button
              type="button"
              onClick={() => openUpgradeModal('1_month')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Extend / Renew Plan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openUpgradeModal('1_month')}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade Subscription</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔒 EXPIRED STATE BANNER                                                   */}
      {/* ========================================================================= */}
      {isExpired && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-rose-900">
                🔒 Subscription Expired
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Your subscription has expired. Subscription Payment Tools are now locked.
              </p>
              <p className="text-xs text-rose-700">
                Upgrade your subscription to continue using Subscription Payment Features in Credit Invoice.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openUpgradeModal('1_month')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>[ Upgrade Subscription ]</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSCRIPTION DETAILS BREAKDOWN CARD                                       */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 text-xs sm:text-sm">
        {/* Connected Wallet */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Connected Wallet:</span>
          <div className="flex items-center gap-2">
            {isWalletConnected ? (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 bg-white border border-slate-300 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span title={walletAddress}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-sans font-bold">
                  Permanent DB
                </span>
              </div>
            ) : (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                Wallet not connected
              </span>
            )}
          </div>
        </div>

        {/* Current Plan */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Current Plan:</span>
          <span className="font-black text-slate-900 text-sm sm:text-base">
            {subscription ? subscription.planName : isActive ? 'Active Pro Plan' : 'Free Trial'}
          </span>
        </div>

        {/* Free Run / Trial Access */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Free 1st Run Trial:</span>
          <span className="font-bold text-xs flex items-center gap-1.5">
            {isDbLoading ? (
              <span className="text-slate-500 text-xs">Checking DB...</span>
            ) : hasFreeRun ? (
              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                🎁 1 Free Run Available for this wallet
              </span>
            ) : (
              <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                ✓ Free Trial Used (1/1) — Permanent in DB
              </span>
            )}
          </span>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Subscription Status:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase flex items-center gap-1.5 ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : isExpired
              ? 'bg-rose-50 text-rose-700 border border-rose-300'
              : 'bg-slate-200 text-slate-700 border border-slate-300'
          }`}>
            {isActive ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active ({daysRemaining} days remaining)</span>
              </>
            ) : isExpired ? (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Expired</span>
              </>
            ) : (
              <span>Locked (Upgrade Required)</span>
            )}
          </span>
        </div>

        {/* Start Date */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Start Date:</span>
          <span className="font-semibold text-slate-800">
            {subscription?.startDate || '—'}
          </span>
        </div>

        {/* Expiry Date */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Expiry Date:</span>
          <span className="font-semibold text-slate-800">
            {subscription?.expiryDate || '—'}
          </span>
        </div>

        {/* Payment Token */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Payment Token:</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            {subscription?.token ? (
              <>
                <TokenIcon token={subscription.token} size={18} />
                <span>{subscription.token} (${subscription.usdAmount})</span>
              </>
            ) : (
              'USDT / USDC'
            )}
          </span>
        </div>

        {/* Receiving Wallet */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Receiving Wallet:</span>
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
            <span title={SUBSCRIPTION_RECEIVER_WALLET}>
              {SUBSCRIPTION_RECEIVER_WALLET.slice(0, 6)}...{SUBSCRIPTION_RECEIVER_WALLET.slice(-4)}
            </span>
            <button
              type="button"
              onClick={handleCopyWallet}
              className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              title="Copy Receiving Wallet"
            >
              {copiedWallet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Transaction Hash:</span>
          {subscription?.txHash ? (
            <a
              href={`https://polygonscan.com/tx/${subscription.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-blue-700 hover:underline text-xs flex items-center gap-1"
            >
              <span>{subscription.txHash.slice(0, 8)}...{subscription.txHash.slice(-6)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </div>

        {/* Payment History */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-slate-500 font-medium">Payment History:</span>
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>View ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Upgrade Modal Trigger */}
      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onSuccess={() => {
          refresh();
        }}
      />

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-black text-slate-900">Subscription Payment History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 p-1.5"
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
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">{item.planName}</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                        ${item.usdAmount} USD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>Token: <strong className="text-slate-900">{item.tokenAmount} {item.token}</strong></div>
                      <div>Start: <strong className="text-slate-900">{item.startDate}</strong></div>
                      <div>Expiry: <strong className="text-slate-900">{item.expiryDate}</strong></div>
                      <div>Status: <strong className="text-slate-900">{item.status}</strong></div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500">Tx:</span>
                      <a
                        href={`https://polygonscan.com/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-blue-700 hover:underline flex items-center gap-1"
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
