import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import {
  Wallet,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
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

export default function CustomerPaymentView({
  params,
}: {
  params: PaymentLinkParams;
}) {
  const { address, isConnected } = useAccount();
  const token = getToken(params.token);
  const targetChainId = token?.chainId ?? 11155111;
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
      setError(
        message.includes('user rejected')
          ? 'Transaction was rejected in your wallet.'
          : message,
      );
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
      ? `https://sepolia.etherscan.io/tx/${txHash}`
      : null;
  const explorerName = token?.chainId === 137 ? 'Polygonscan' : 'Etherscan';

  const tokenLabel = token?.label ?? params.token.toUpperCase();
  const networkName = token?.networkName ?? 'Sepolia';
  const insufficientFunds =
    tokenBalance !== undefined && amountRaw > 0n && tokenBalance < amountRaw;

  // Success screen
  if (payState === 'success') {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful</h2>
        <p className="text-slate-500 text-sm text-center mb-6">
          You sent{' '}
          <span className="font-semibold text-slate-700">
            {amountDisplay} {tokenLabel}
          </span>{' '}
          to the merchant.
        </p>
        {explorerTxUrl && (
          <a
            href={explorerTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ExternalLink className="w-4 h-4" />
            View on {explorerName}
          </a>
        )}
      </div>
    );
  }

  // Invalid token fallback
  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Invalid Payment Link
        </h2>
        <p className="text-slate-500 text-sm">
          This payment link uses an unsupported token. Please ask the merchant
          to generate a new QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 mb-4 shadow-lg shadow-slate-900/20">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Crypto Payment
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Review and complete your payment below.
        </p>
      </div>

      {/* Payment summary card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden mb-6">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Amount due
            </span>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {tokenLabel.slice(0, 1)}
                </span>
                <p className="text-2xl font-bold text-slate-900">
                  {amountDisplay}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{tokenLabel} on {networkName}</p>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-4" />

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Pay to
              </p>
              <p className="text-sm font-mono text-slate-700 break-all">
                {merchantAddress}
              </p>
            </div>
            {address && isCorrect && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Your wallet
                </p>
                <p className="text-sm font-mono text-slate-700 break-all">
                  {address}
                </p>
              </div>
            )}
            {tokenBalance !== undefined && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {tokenLabel} balance
                </p>
                <p
                  className={`text-sm font-medium ${insufficientFunds ? 'text-red-600' : 'text-slate-600'}`}
                >
                  {parseFloat(formatUnits(tokenBalance, token.decimals)).toFixed(4)}{' '}
                  {tokenLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wrong network warning */}
      {isConnected && !isCorrect && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Wrong network
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Switch to {networkName} to continue.
              </p>
              <button
                onClick={requestSwitch}
                disabled={switching}
                className="mt-2 text-xs font-semibold text-amber-800 underline disabled:opacity-50"
              >
                {switching ? 'Switching...' : `Switch to ${networkName}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient funds warning */}
      {isConnected && isCorrect && insufficientFunds && payState === 'idle' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Insufficient {tokenLabel} balance
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                You need more {tokenLabel} tokens to complete this payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && payState === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Payment failed
              </p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pay button / status */}
      {payState === 'sending' || payState === 'confirming' ? (
        <div className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-100 px-4 py-3.5 text-slate-700 font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {payState === 'sending'
            ? 'Waiting for wallet approval...'
            : 'Confirming transaction...'}
        </div>
      ) : (
        <button
          onClick={handlePay}
          disabled={!isConnected || !isCorrect || sending || loadingSession || insufficientFunds}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-white font-semibold text-sm shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Track on {explorerName}
        </a>
      )}

      {!isConnected && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Connect your wallet to proceed with payment.
        </p>
      )}
    </div>
  );
}

