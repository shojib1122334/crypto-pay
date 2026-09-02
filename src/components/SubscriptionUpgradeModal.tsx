import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Wallet,
  Loader2,
  X,
  CreditCard,
} from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, erc20Abi, type Address } from 'viem';
import { TokenIcon } from '@/components/TokenIcon';
import { TOKENS, POLYGON_CHAIN_ID } from '@/lib/tokens';
import {
  SUBSCRIPTION_RECEIVER_WALLET,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
  type SubscriptionToken,
  type SubscriptionRecord,
  verifySubscriptionPaymentOnChain,
} from '@/lib/subscription';
import { buildPaymentQRUri } from '@/lib/payments';

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: SubscriptionPlanId;
  onSuccess?: (sub: SubscriptionRecord) => void;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({
  isOpen,
  onClose,
  initialPlanId = '1_month',
  onSuccess,
}) => {
  // Selected Plan: '1_month' ($2) | '3_months' ($5)
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(initialPlanId);

  // Selected Payment Token: USDT | USDC only
  const [selectedToken, setSelectedToken] = useState<SubscriptionToken>('USDT');

  // Copy States
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Verification Input & States
  const [txHashInput, setTxHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedSuccessRecord, setVerifiedSuccessRecord] = useState<SubscriptionRecord | null>(null);

  // Web3 direct on-chain write
  const {
    data: directTxHash,
    isPending: isDirectTxPending,
    writeContract,
  } = useWriteContract();

  const { isLoading: isDirectTxConfirming, isSuccess: isDirectTxSuccess } =
    useWaitForTransactionReceipt({
      hash: directTxHash,
    });

  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlanId];
  const exactTokenAmountToPay = currentPlan.usdPrice.toFixed(2);

  // On-Chain Polygon Verification
  const handleVerify = useCallback(
    async (hashToVerify?: string) => {
      const hash = (hashToVerify || txHashInput).trim();
      if (!hash) {
        setVerificationError('Please enter a valid 66-character transaction hash starting with 0x.');
        return;
      }

      setIsVerifying(true);
      setVerificationError(null);

      try {
        const result = await verifySubscriptionPaymentOnChain(
          hash,
          selectedPlanId,
          selectedToken
        );

        setIsVerifying(false);

        if (result.success && result.record) {
          setVerifiedSuccessRecord(result.record);
          if (onSuccess) {
            onSuccess(result.record);
          }
        } else {
          setVerificationError(
            result.error ||
              'This transaction does not match the required payment. Please make sure you sent the correct token and amount to the correct Receiving Wallet.'
          );
        }
      } catch {
        setIsVerifying(false);
        setVerificationError(
          'This transaction does not match the required payment. Please make sure you sent the correct token and amount to the correct Receiving Wallet.'
        );
      }
    },
    [txHashInput, selectedPlanId, selectedToken, onSuccess]
  );

  // Auto-fill and auto-verify when direct wallet write succeeds
  useEffect(() => {
    if (isDirectTxSuccess && directTxHash) {
      setTxHashInput(directTxHash);
      handleVerify(directTxHash);
    }
  }, [isDirectTxSuccess, directTxHash, handleVerify]);

  // Copy wallet handler
  const handleCopyWallet = () => {
    navigator.clipboard.writeText(SUBSCRIPTION_RECEIVER_WALLET);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  // Copy amount handler
  const handleCopyAmount = () => {
    navigator.clipboard.writeText(exactTokenAmountToPay);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Direct Web3 Send
  const handleDirectWeb3Pay = () => {
    try {
      setVerificationError(null);
      const tokenConfig = selectedToken === 'USDC' ? TOKENS.usdc : TOKENS.usdt;

      const parsedUnits = parseUnits(exactTokenAmountToPay, tokenConfig.decimals);

      writeContract({
        address: tokenConfig.address as Address,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [SUBSCRIPTION_RECEIVER_WALLET as Address, parsedUnits],
      });
    } catch (err: unknown) {
      console.error('Direct Web3 send error:', err);
      const msg = err instanceof Error ? err.message : 'Wallet transaction failed';
      setVerificationError(msg);
    }
  };

  // Generate QR URI for the subscription payment
  const subscriptionQRUri = React.useMemo(() => {
    const tokenConfig = selectedToken === 'USDC' ? TOKENS.usdc : TOKENS.usdt;

    return buildPaymentQRUri(
      SUBSCRIPTION_RECEIVER_WALLET,
      exactTokenAmountToPay,
      tokenConfig,
      POLYGON_CHAIN_ID,
      tokenConfig.decimals
    );
  }, [selectedToken, exactTokenAmountToPay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto">
        
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close Upgrade Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ================================================================= */}
        {/* SUCCESS VERIFIED VIEW                                              */}
        {/* ================================================================= */}
        {verifiedSuccessRecord ? (
          <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Polygon On-Chain Verified</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                ✅ Payment Verified
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Your payment has been successfully verified.
              </p>
            </div>

            {/* Verified Subscription Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs sm:text-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Subscription Status:</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase">
                  Active
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Plan:</span>
                <span className="font-bold text-slate-900">{verifiedSuccessRecord.planName}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Start Date:</span>
                <span className="font-semibold text-slate-800">{verifiedSuccessRecord.startDate}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Expiry Date:</span>
                <span className="font-semibold text-slate-800">{verifiedSuccessRecord.expiryDate}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Payment Token:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <TokenIcon token={verifiedSuccessRecord.token} size={18} />
                  <span>{verifiedSuccessRecord.tokenAmount} {verifiedSuccessRecord.token}</span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Transaction Hash:</span>
                <a
                  href={`https://polygonscan.com/tx/${verifiedSuccessRecord.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-blue-700 hover:underline text-xs flex items-center gap-1"
                >
                  <span>{verifiedSuccessRecord.txHash.slice(0, 8)}...{verifiedSuccessRecord.txHash.slice(-6)}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-semibold">
              ✨ Subscription Payment Tools are now unlocked in Credit Invoice!
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition cursor-pointer"
            >
              Start Using Subscription Tools
            </button>
          </div>
        ) : (
          <>
            {/* ================================================================= */}
            {/* STEP 1: UPGRADE REQUIRED & PLAN SELECTION                         */}
            {/* ================================================================= */}
            {/* Modal Header */}
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Subscription Upgrade</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                🔒 Subscription Payment Tools — Upgrade Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Unlock Subscription Payment Tools for Credit Invoice. Upgrading will unlock all Subscription Payment Features inside Credit Invoice.
              </p>
            </div>

            {/* ✨ Included Features */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>✨ Included Features</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Recurring Subscription Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Weekly / Monthly / Yearly Billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Subscription Invoice</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Next Payment Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Subscription Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Payment History</span>
                </div>
              </div>
            </div>

            {/* 💳 Choose Your Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  <span>💳 Choose Your Plan</span>
                </h3>
                <span className="text-[11px] text-slate-500">Polygon Network</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1 Month Plan */}
                <div
                  onClick={() => setSelectedPlanId('1_month')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedPlanId === '1_month'
                      ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Standard</span>
                      <h4 className="text-base font-black text-slate-900">1 Month</h4>
                      <p className="text-xs text-slate-600">30 days unlimited access</p>
                    </div>
                    <span className="text-xl font-black text-blue-700">$2</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                    <span>Payment Tokens:</span>
                    <div className="flex items-center gap-1">
                      <TokenIcon token="USDT" size={16} />
                      <TokenIcon token="USDC" size={16} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanId('1_month');
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedPlanId === '1_month'
                        ? 'bg-blue-700 text-white hover:bg-blue-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Upgrade for 1 Month</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3 Months Plan */}
                <div
                  onClick={() => setSelectedPlanId('3_months')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden ${
                    selectedPlanId === '3_months'
                      ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                    Best Value
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-amber-700 uppercase">Quarterly</span>
                      <h4 className="text-base font-black text-slate-900">3 Months</h4>
                      <p className="text-xs text-slate-600">90 days unlimited access</p>
                    </div>
                    <span className="text-xl font-black text-blue-700">$5</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                    <span>Payment Tokens:</span>
                    <div className="flex items-center gap-1">
                      <TokenIcon token="USDT" size={16} />
                      <TokenIcon token="USDC" size={16} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanId('3_months');
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedPlanId === '3_months'
                        ? 'bg-blue-700 text-white hover:bg-blue-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Upgrade for 3 Months</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 💰 PAYMENT & VERIFY SECTION */}
            <div className="border-t border-slate-200 pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>💰 Payment Details</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold">
                  Status: Waiting for Payment
                </span>
              </div>

              {/* Select Payment Token: USDT / USDC */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Select Payment Token (Polygon)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['USDT', 'USDC'] as const).map((tok) => {
                    const isTokSelected = selectedToken === tok;
                    return (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setSelectedToken(tok)}
                        className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 border-2 transition cursor-pointer ${
                          isTokSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <TokenIcon token={tok} size={22} />
                        <span>{tok}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Network + Amount + Token Rule Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500 font-medium">Network:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <TokenIcon token="POL" size={16} />
                    <span>Polygon (Chain ID: 137)</span>
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500 font-medium">Selected Plan Price:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">
                      ${currentPlan.usdPrice.toFixed(2)} USD
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Stablecoin Dollar Pegged
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500 font-medium">Total Amount to Send:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-700 text-base sm:text-lg flex items-center gap-1.5">
                      <TokenIcon token={selectedToken} size={18} />
                      <span>{exactTokenAmountToPay} {selectedToken}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                      title="Copy Amount"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Payment Amount Rule notice */}
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                  <strong>💵 Stablecoin Pricing:</strong>
                  <p className="mt-0.5 text-slate-700">
                    Pay exactly <strong>${currentPlan.usdPrice.toFixed(2)} {selectedToken}</strong> on the Polygon network to activate your subscription.
                  </p>
                </div>

                {/* Receiving Wallet */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-bold">Send Payment To This Wallet:</span>
                    <button
                      type="button"
                      onClick={handleCopyWallet}
                      className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedWallet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>[ Copy Wallet Address ]</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 break-all select-all font-semibold">
                    "{SUBSCRIPTION_RECEIVER_WALLET}"
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Your payment must be sent to the Receiving Wallet Address shown above.
                  </p>
                </div>
              </div>

              {/* Direct QR Code + Web3 Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white border border-slate-200 rounded-2xl p-4">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2 bg-white rounded-xl shadow-xs">
                    <QRCodeSVG
                      value={subscriptionQRUri}
                      size={130}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 font-medium">
                    Scan with Web3 Wallet (Polygon)
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleDirectWeb3Pay}
                    disabled={isDirectTxPending || isDirectTxConfirming}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    {isDirectTxPending || isDirectTxConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming on Polygon...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>[ Pay & Upgrade ]</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyWallet}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Receiving Address</span>
                  </button>
                </div>
              </div>

              {/* 🔗 VERIFY PAYMENT SECTION */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>🔗 Verify Payment</span>
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold">
                    Payment Completed?
                  </p>
                  <p className="text-xs text-slate-500">
                    After sending the payment from your wallet, enter the Transaction Hash below to verify the payment.
                  </p>
                </div>

                {/* Transaction Hash Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Transaction Hash
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={txHashInput}
                      onChange={(e) => {
                        setTxHashInput(e.target.value);
                        setVerificationError(null);
                      }}
                      placeholder="Paste your Polygon transaction hash (0x...)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* ❌ Error Notice */}
                {verificationError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">❌ Payment Verification Failed</strong>
                      <p className="mt-0.5 leading-relaxed">{verificationError}</p>
                    </div>
                  </div>
                )}

                {/* 🔐 Blockchain Verification Rule explanation */}
                <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                    <span>🔐 Payment Verification Rules</span>
                  </span>
                  <p>
                    The system will verify the transaction directly on the Polygon blockchain. The transaction will be accepted only if:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Network is Polygon</li>
                    <li>Transaction is successful and confirmed</li>
                    <li>Selected token matches ({selectedToken})</li>
                    <li>Payment amount matches the selected plan (${currentPlan.usdPrice} {selectedToken})</li>
                    <li>Payment was sent to the correct Receiving Wallet</li>
                    <li>Transaction has not been used previously</li>
                  </ul>
                  <p className="text-rose-700 font-semibold pt-1">
                    A transaction sent to any other wallet will be rejected.
                  </p>
                </div>

                {/* [ Verify Payment ] Button */}
                <button
                  type="button"
                  onClick={() => handleVerify()}
                  disabled={isVerifying || !txHashInput.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying On-Chain...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>[ Verify Payment ]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
