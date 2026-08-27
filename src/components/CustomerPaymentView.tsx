import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { isAddress, parseUnits, formatUnits, type Address } from 'viem';
import {
  getPaymentSession,
  updatePaymentSession,
  type PaymentLinkParams,
} from '@/lib/payments';
import type { PaymentSession } from '@/lib/supabase';
import { useEnsureNetwork } from '@/hooks/useEnsureSepolia';
import { getToken, ERC20_ABI } from '@/lib/tokens';

type PayState = 'idle' | 'sending' | 'confirming' | 'success' | 'error';

const TOKEN_COLOR_MAP: Record<string, { bg: string; text: string; accent: string }> = {
  usdt: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    accent: 'bg-emerald-600',
  },
  usdc: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    accent: 'bg-blue-600',
  },
  verse: {
    bg: 'bg-purple-50',
    text: 'text-[#7C3AED]',
    accent: 'bg-[#7C3AED]',
  },
};

export default function CustomerPaymentView({
  params,
}: {
  params: PaymentLinkParams;
}) {
  const { address, isConnected } = useAccount();
  const token = getToken(params.token);
  const targetChainId = token?.chainId ?? 137;
  const { isCorrect, requestSwitch, switching } = useEnsureNetwork(targetChainId);
  const { writeContractAsync, isPending: sending } = useWriteContract();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const merchantAddress = params.merchantAddress as Address;
  const amountDisplay = params.amount;

  const amountRaw = (() => {
    if (!token) return 0n;
    try {
      return parseUnits(amountDisplay, token.decimals);
    } catch {
      return 0n;
    }
  })();

  // Read the customer's ERC-20 token balance on the token's network
  const { data: tokenBalance } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address && !!token && isCorrect },
  });

  // Fetch session details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getPaymentSession(params.sessionId);
      if (!cancelled) {
        setSession(s);
        setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  // If session is already successful, reflect that
  useEffect(() => {
    if (session?.status === 'success' && session.tx_hash) {
      setTxHash(session.tx_hash);
      setPayState('success');
    }
  }, [session]);

  const { data: receipt } = useWaitForTransactionReceipt({
    chainId: targetChainId,
    hash: txHash ? (txHash as `0x${string}`) : undefined,
    query: { enabled: !!txHash && payState === 'confirming' },
  });

  // React to receipt once the transaction is confirmed on-chain
  useEffect(() => {
    if (!receipt || payState !== 'confirming' || !txHash || !address) return;
    if (receipt.status === 'success') {
      setPayState('success');
      updatePaymentSession(params.sessionId, {
        status: 'success',
        tx_hash: txHash,
        customer_address: address,
      });
    } else {
      setPayState('error');
      setError('Transaction failed on-chain.');
      updatePaymentSession(params.sessionId, {
        status: 'failed',
        tx_hash: txHash,
        customer_address: address,
      });
    }
  }, [receipt, payState, txHash, address, params.sessionId]);

  const handlePay = useCallback(async () => {
    setError(null);
    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!token) {
      setError('Unknown token. Please use a valid payment link.');
      return;
    }
    if (!isAddress(merchantAddress)) {
      setError('Invalid merchant address.');
      return;
    }
    if (amountRaw <= 0n) {
      setError('Invalid payment amount.');
      return;
    }

    setPayState('sending');
    try {
      const hash = await writeContractAsync({
        chainId: targetChainId,
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [merchantAddress, amountRaw],
      });
      setTxHash(hash);
      setPayState('confirming');
      updatePaymentSession(params.sessionId, {
        status: 'confirming',
        tx_hash: hash,
        customer_address: address,
      });
    } catch (err) {
      setPayState('error');
      const message =
        err instanceof Error ? err.message : 'Transaction was rejected.';
      const lower = message.toLowerCase();
      if (
        lower.includes('user rejected') ||
        lower.includes('user cancelled') ||
        lower.includes('connection request reset') ||
        lower.includes('rejected the request')
      ) {
        setError('Transaction request was cancelled or reset in your wallet. Please try again.');
      } else {
        setError(message);
      }
    }
  }, [
    address,
    amountRaw,
    isConnected,
    merchantAddress,
    params.sessionId,
    targetChainId,
    token,
    writeContractAsync,
  ]);

  const explorerTxUrl = txHash && token
    ? `${token.blockExplorerUrl}/tx/${txHash}`
    : txHash
      ? `https://polygonscan.com/tx/${txHash}`
      : null;
  const explorerName = token?.chainId === 137 ? 'Polygonscan' : 'Etherscan';

  const tokenLabel = token?.label ?? params.token.toUpperCase();
  const networkName = token?.networkName ?? 'Polygon';
  const tokenAccent = TOKEN_COLOR_MAP[params.token.toLowerCase()] ?? {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    accent: 'bg-blue-600',
  };
  const insufficientFunds =
    tokenBalance !== undefined && amountRaw > 0n && tokenBalance < amountRaw;

  // Success screen
  if (payState === 'success') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center">
        <div className="w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 sm:p-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-[#059669] text-xs font-bold uppercase tracking-wider mb-2">
            Settled On-Chain
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight mb-2">
            Payment Completed
          </h2>
          
          <p className="text-[#64748B] text-sm leading-relaxed mb-6">
            You successfully transferred{' '}
            <strong className="text-[#0B1220]">
              {amountDisplay} {tokenLabel}
            </strong>{' '}
            directly to the merchant wallet on {networkName}.
          </p>

          <div className="bg-[#F5F7FB] rounded-2xl border border-[#E2E8F0] p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Merchant</span>
              <span className="font-mono font-bold text-[#0B1220]">
                {merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Network</span>
              <span className="font-semibold text-slate-800">{networkName}</span>
            </div>
            {txHash && (
              <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-[#64748B]">Transaction</span>
                <span className="font-mono text-xs text-blue-700 truncate max-w-[180px]">
                  {txHash}
                </span>
              </div>
            )}
          </div>

          {explorerTxUrl && (
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] text-white font-bold text-sm px-5 py-3.5 shadow-md shadow-blue-900/20 transition"
            >
              View on {explorerName}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // Invalid token fallback
  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-[#DC2626]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1220] mb-2">
            Invalid Payment Link
          </h2>
          <p className="text-[#64748B] text-xs leading-relaxed">
            This payment link specifies an unsupported asset. Please request a new payment QR code from the merchant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
      
      {/* Customer Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Non-Custodial Payment Request
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight">
          Review & Complete Payment
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Direct peer-to-peer settlement to merchant on {networkName}.
        </p>
      </div>

      {/* Payment Summary Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-md overflow-hidden mb-6">
        
        {/* Terminal top bar */}
        <div className="bg-[#0B1220] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E293B]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Payment Invoice
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
            {networkName}
          </span>
        </div>

        <div className="p-6">
          
          {/* Amount Due Big Display */}
          <div className="flex items-center justify-between pb-5 border-b border-[#E2E8F0]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Amount Due
              </span>
              <div className="text-3xl font-extrabold text-[#0B1220] tracking-tight mt-0.5">
                {amountDisplay}{' '}
                <span className="text-[#1D4ED8] text-xl">{tokenLabel}</span>
              </div>
            </div>
            
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm ${tokenAccent.accent}`}
            >
              {tokenLabel.slice(0, 1)}
            </div>
          </div>

          {/* Details list */}
          <div className="py-4 space-y-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Recipient (Merchant Wallet)
              </span>
              <p className="text-xs font-mono font-medium text-[#0B1220] bg-[#F5F7FB] border border-[#E2E8F0] rounded-lg p-2.5 break-all select-all">
                {merchantAddress}
              </p>
            </div>

            {address && isCorrect && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Your Connected Wallet
                </span>
                <p className="text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 break-all">
                  {address}
                </p>
              </div>
            )}

            {tokenBalance !== undefined && (
              <div className="flex items-center justify-between bg-[#F5F7FB] border border-[#E2E8F0] rounded-lg p-3">
                <span className="text-xs font-bold text-[#64748B]">
                  Your {tokenLabel} Balance
                </span>
                <span
                  className={`text-xs font-bold ${
                    insufficientFunds ? 'text-[#DC2626]' : 'text-[#0B1220]'
                  }`}
                >
                  {parseFloat(formatUnits(tokenBalance, token.decimals)).toFixed(4)}{' '}
                  {tokenLabel}
                </span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {isConnected && !isCorrect && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900">
                    Network Mismatch
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your wallet is connected to a different network. Please switch to {networkName}.
                  </p>
                  <button
                    onClick={requestSwitch}
                    disabled={switching}
                    className="mt-2 text-xs font-bold text-[#1D4ED8] underline disabled:opacity-50"
                  >
                    {switching ? 'Switching Network...' : `Switch to ${networkName}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isConnected && isCorrect && insufficientFunds && payState === 'idle' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    Insufficient {tokenLabel} Balance
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">
                    You need at least {amountDisplay} {tokenLabel} to complete this transfer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && payState === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    Payment Error
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {payState === 'sending' || payState === 'confirming' ? (
            <div className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-4 py-4 text-[#1D4ED8] font-bold text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" />
              {payState === 'sending'
                ? 'Awaiting wallet signature...'
                : 'Confirming on Polygon blockchain...'}
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={
                !isConnected || !isCorrect || sending || loadingSession || insufficientFunds
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] px-5 py-4 text-white font-bold text-sm shadow-md shadow-blue-900/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pay {amountDisplay} {tokenLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {payState === 'confirming' && explorerTxUrl && (
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#1D4ED8] hover:text-[#2563EB] transition"
            >
              Track on {explorerName} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {!isConnected && (
        <p className="text-center text-xs text-[#64748B]">
          Connect your Web3 wallet using the header button to approve and execute this payment.
        </p>
      )}
    </div>
  );
}
