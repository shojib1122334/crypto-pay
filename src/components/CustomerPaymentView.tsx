import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useBalance,
  usePublicClient,
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
  Fuel,
  Info,
} from 'lucide-react';
import {
  isAddress,
  getAddress,
  parseUnits,
  formatUnits,
  formatEther,
  decodeEventLog,
  type Address,
  type Hash,
} from 'viem';
import {
  getPaymentSession,
  updatePaymentSession,
  type PaymentLinkParams,
} from '@/lib/payments';
import type { PaymentSession } from '@/lib/supabase';
import { useEnsureNetwork } from '@/hooks/useEnsurePolygon';
import { getToken, ERC20_ABI, POLYGON_CHAIN_ID } from '@/lib/tokens';
import { TokenIcon } from '@/components/TokenIcon';

type PayState = 'idle' | 'sending' | 'confirming' | 'success' | 'error';

/**
 * Extracts human-readable and technical details from wallet / provider errors.
 */
function parseTransactionError(err: unknown): { userMessage: string; techDetail: string } {
  console.error('[CryptoPay Transaction Error Diagnostic]:', err);

  if (!err) {
    return {
      userMessage: 'Unknown error occurred while submitting transaction.',
      techDetail: 'No error details provided',
    };
  }

  const errObj = err as Record<string, unknown>;
  const rawMessage = typeof errObj.message === 'string' ? errObj.message : String(err);
  const shortMessage = typeof errObj.shortMessage === 'string' ? errObj.shortMessage : rawMessage;
  const details = typeof errObj.details === 'string' ? errObj.details : '';
  const lower = (rawMessage + ' ' + details).toLowerCase();

  // User rejection
  if (
    lower.includes('user rejected') ||
    lower.includes('user cancelled') ||
    lower.includes('rejected the request') ||
    lower.includes('action_rejected') ||
    lower.includes('4001')
  ) {
    return {
      userMessage: 'Transaction was cancelled in your wallet.',
      techDetail: shortMessage,
    };
  }

  // Session / Timeout / Reset
  if (
    lower.includes('connection request reset') ||
    lower.includes('proposal expired') ||
    lower.includes('session proposal expired') ||
    lower.includes('pairing proposal expired') ||
    lower.includes('relay: connection reset')
  ) {
    return {
      userMessage: 'Wallet session timed out. Please tap "Pay" to reconnect.',
      techDetail: shortMessage,
    };
  }

  // Insufficient native gas (POL/MATIC)
  if (
    lower.includes('insufficient funds for gas') ||
    lower.includes('insufficient funds for transfer') ||
    lower.includes('gas * price + value') ||
    lower.includes('insufficient balance for transfer') ||
    lower.includes('out of gas')
  ) {
    return {
      userMessage: 'Insufficient POL/MATIC for gas. Your wallet needs a small amount of POL to pay Polygon network transaction fees.',
      techDetail: shortMessage,
    };
  }

  // Token transfer reverted
  if (
    lower.includes('execution reverted') ||
    lower.includes('transfer amount exceeds balance') ||
    lower.includes('exceeds balance') ||
    lower.includes('erc20:')
  ) {
    return {
      userMessage: 'ERC-20 transfer reverted on-chain. Please verify your token balance and try again.',
      techDetail: shortMessage,
    };
  }

  // RPC / Network Error
  if (lower.includes('failed to fetch') || lower.includes('network error') || lower.includes('http request failed')) {
    return {
      userMessage: 'Polygon RPC network response error. Please try again.',
      techDetail: shortMessage,
    };
  }

  return {
    userMessage: shortMessage || 'Transaction failed to send. Please check your wallet and try again.',
    techDetail: `${shortMessage} ${details}`.trim(),
  };
}

export default function CustomerPaymentView({
  params,
}: {
  params: PaymentLinkParams;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: POLYGON_CHAIN_ID });
  const token = getToken(params.token);
  const targetChainId = token?.chainId ?? POLYGON_CHAIN_ID;
  const { isCorrect, requestSwitch, switching } = useEnsureNetwork(targetChainId);
  const { writeContractAsync, isPending: sending } = useWriteContract();

  const [, setSession] = useState<PaymentSession | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [techErrorDetails, setTechErrorDetails] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [transferVerified, setTransferVerified] = useState(false);

  // Validate and checksum merchant address
  const isValidMerchant = isAddress(params.merchantAddress);
  const merchantAddress: Address = isValidMerchant
    ? getAddress(params.merchantAddress)
    : ('0x0000000000000000000000000000000000000000' as Address);

  // Read ERC-20 Decimals on-chain
  const { data: onChainDecimals } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: POLYGON_CHAIN_ID,
    query: {
      enabled: !!token?.address,
      staleTime: Infinity,
    },
  });

  const effectiveDecimals = (typeof onChainDecimals === 'number' ? onChainDecimals : token?.decimals) ?? 6;

  // Read Customer ERC-20 Token Balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: POLYGON_CHAIN_ID,
    query: {
      enabled: !!token?.address && !!address,
      refetchInterval: 5000,
    },
  });

  // Read Customer Native Gas Balance (POL/MATIC)
  const { data: nativeBalanceData } = useBalance({
    address,
    chainId: POLYGON_CHAIN_ID,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Calculate parsed integer transfer amount safely
  let amountRaw = 0n;
  let amountParseError = false;
  try {
    const cleanAmount = (params.amount || '0').trim();
    if (cleanAmount && !isNaN(parseFloat(cleanAmount)) && parseFloat(cleanAmount) > 0) {
      amountRaw = parseUnits(cleanAmount, effectiveDecimals);
    }
  } catch (err) {
    console.error('Failed to parse token amount units:', err);
    amountParseError = true;
  }

  const amountDisplay = params.amount || '0';

  // Load session from Supabase/cache
  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingSession(true);
      if (params.sessionId) {
        const s = await getPaymentSession(params.sessionId);
        if (active && s) {
          setSession(s);
          if (s.status === 'success') {
            setPayState('success');
            setTxHash(s.tx_hash ?? null);
          }
        }
      }
      if (active) setLoadingSession(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [params.sessionId]);

  // Track confirmation via Viem / Wagmi
  const {
    data: receipt,
    isSuccess: isConfirmed,
    isError: receiptFailed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash as Hash | undefined,
    chainId: POLYGON_CHAIN_ID,
    query: {
      enabled: !!txHash && payState === 'confirming',
    },
  });

  // Handle Receipt Confirmation
  useEffect(() => {
    if (isConfirmed && receipt && payState === 'confirming' && token) {
      console.log('[CryptoPay Receipt Confirmed]:', receipt);

      let foundValidLog = false;
      try {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === token.address.toLowerCase()) {
            try {
              const decoded = decodeEventLog({
                abi: ERC20_ABI,
                data: log.data,
                topics: log.topics,
              });

              if (decoded.eventName === 'Transfer') {
                const args = decoded.args as { from: string; to: string; value: bigint };
                if (args.to.toLowerCase() === merchantAddress.toLowerCase()) {
                  foundValidLog = true;
                  break;
                }
              }
            } catch {
              // Ignore non-matching logs
            }
          }
        }
      } catch (logErr) {
        console.warn('Could not parse receipt logs:', logErr);
      }

      setTransferVerified(foundValidLog);
      setPayState('success');

      if (params.sessionId) {
        updatePaymentSession(params.sessionId, {
          status: 'success',
          tx_hash: receipt.transactionHash,
          customer_address: address,
        });
      }

      refetchTokenBalance();
    }
  }, [
    isConfirmed,
    receipt,
    payState,
    token,
    params.sessionId,
    address,
    merchantAddress,
    refetchTokenBalance,
  ]);

  // Handle Reverted Transaction
  useEffect(() => {
    if (receiptFailed && payState === 'confirming') {
      setPayState('error');
      const { userMessage, techDetail } = parseTransactionError(receiptError);
      setErrorMessage(userMessage || 'Transaction failed or was reverted on-chain.');
      setTechErrorDetails(techDetail);
    }
  }, [receiptFailed, receiptError, payState]);

  // Primary Payment Execution
  const handlePay = useCallback(async () => {
    setErrorMessage(null);
    setTechErrorDetails(null);

    // 1. Validation checks
    if (!token) {
      setErrorMessage('Unsupported or unconfigured token.');
      return;
    }

    if (!isValidMerchant) {
      setErrorMessage('Invalid merchant recipient address provided in payment link.');
      return;
    }

    if (!isConnected || !address) {
      setErrorMessage('Please connect your Web3 wallet using the header button first.');
      return;
    }

    // 2. Ensure network is Polygon
    if (!isCorrect) {
      try {
        await requestSwitch();
      } catch (switchErr) {
        const parsed = parseTransactionError(switchErr);
        setErrorMessage(`Please switch your wallet to Polygon Mainnet: ${parsed.userMessage}`);
        return;
      }
    }

    // 3. Amount checks
    if (amountParseError || amountRaw <= 0n) {
      setErrorMessage('Invalid payment amount. Amount must be a positive number.');
      return;
    }

    // 4. Token balance verification
    if (tokenBalance !== undefined && tokenBalance < amountRaw) {
      const userBalanceFormatted = parseFloat(formatUnits(tokenBalance, effectiveDecimals)).toFixed(4);
      setErrorMessage(
        `Insufficient ${token.label} balance. You have ${userBalanceFormatted} ${token.label}, but this payment requires ${amountDisplay} ${token.label}.`,
      );
      return;
    }

    // 5. POL/MATIC Gas verification
    if (nativeBalanceData && nativeBalanceData.value === 0n) {
      setErrorMessage(
        'Insufficient POL/MATIC for gas. Your wallet needs a small amount of POL/MATIC to pay Polygon network transaction fees.',
      );
      return;
    }

    setPayState('sending');

    // 6. Pre-flight gas estimation
    if (publicClient) {
      try {
        await publicClient.estimateContractGas({
          account: address,
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [merchantAddress, amountRaw],
        });
      } catch (simErr) {
        console.warn('[CryptoPay Simulation Warning]:', simErr);
        const parsed = parseTransactionError(simErr);
        if (
          parsed.techDetail.toLowerCase().includes('exceeds balance') ||
          parsed.techDetail.toLowerCase().includes('insufficient funds')
        ) {
          setPayState('error');
          setErrorMessage(parsed.userMessage);
          setTechErrorDetails(parsed.techDetail);
          return;
        }
      }
    }

    // 7. Execute transaction
    try {
      const hash = await writeContractAsync({
        chainId: POLYGON_CHAIN_ID,
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
      const { userMessage, techDetail } = parseTransactionError(err);
      setErrorMessage(userMessage);
      setTechErrorDetails(techDetail);
    }
  }, [
    address,
    amountDisplay,
    amountParseError,
    amountRaw,
    effectiveDecimals,
    isConnected,
    isCorrect,
    isValidMerchant,
    merchantAddress,
    nativeBalanceData,
    params.sessionId,
    publicClient,
    requestSwitch,
    token,
    tokenBalance,
    writeContractAsync,
  ]);

  const explorerTxUrl = txHash && token
    ? `${token.blockExplorerUrl}/tx/${txHash}`
    : txHash
      ? `https://polygonscan.com/tx/${txHash}`
      : null;

  const tokenLabel = token?.label ?? params.token.toUpperCase();
  const insufficientTokenFunds =
    tokenBalance !== undefined && amountRaw > 0n && tokenBalance < amountRaw;
  const insufficientGas =
    nativeBalanceData !== undefined && nativeBalanceData.value === 0n;

  // Success screen
  if (payState === 'success') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center">
        <div className="w-full bg-[#0F172A]/90 backdrop-blur-md rounded-3xl border border-slate-700/70 shadow-2xl p-8 sm:p-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            Settled On-Chain
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Payment Completed
          </h2>
          
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            You successfully transferred{' '}
            <strong className="text-white inline-flex items-center gap-1.5 align-middle">
              <TokenIcon token={params.token} size={18} />
              {amountDisplay} {tokenLabel}
            </strong>{' '}
            directly to the merchant wallet on Polygon Mainnet.
          </p>

          <div className="bg-[#1E293B]/90 rounded-2xl border border-slate-700 p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Merchant Recipient</span>
              <span className="font-mono font-bold text-white">
                {merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Network</span>
              <span className="font-semibold text-slate-200">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Token Contract</span>
              <span className="font-mono text-xs text-slate-300 truncate max-w-[180px]">
                {token?.address}
              </span>
            </div>
            {transferVerified && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold pt-1">
                <span>Transfer Verification</span>
                <span>Verified in Event Logs ✓</span>
              </div>
            )}
            {txHash && (
              <div className="flex justify-between text-xs pt-2 border-t border-slate-700">
                <span className="text-slate-400">Transaction</span>
                <span className="font-mono text-xs text-blue-400 truncate max-w-[180px]">
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
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-3.5 shadow-lg shadow-blue-950/50 transition"
            >
              View on Polygonscan
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
        <div className="bg-[#0F172A]/90 backdrop-blur-md rounded-3xl border border-slate-700/70 shadow-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Invalid Payment Link
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            This payment link specifies an unsupported asset. Supported tokens are USDT, USDC, and VERSE on Polygon Mainnet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
      
      {/* Customer Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          Non-Custodial Payment Request
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Review & Complete Payment
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Direct peer-to-peer settlement to merchant on Polygon Mainnet (Chain ID 137).
        </p>
      </div>

      {/* Payment Summary Card */}
      <div className="bg-[#0F172A]/85 backdrop-blur-md rounded-2xl border border-slate-700/70 shadow-xl overflow-hidden mb-6">
        
        {/* Terminal top bar */}
        <div className="bg-[#0B1220] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E293B]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Payment Invoice
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40">
            Polygon Mainnet (137)
          </span>
        </div>

        <div className="p-6">
          
          {/* Amount Due Big Display */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Amount Due
              </span>
              <div className="text-3xl font-extrabold text-white tracking-tight mt-0.5">
                {amountDisplay}{' '}
                <span className="text-blue-400 text-xl">{tokenLabel}</span>
              </div>
            </div>
            
            <TokenIcon token={params.token} size={48} className="shadow-md" />
          </div>

          {/* Details list */}
          <div className="py-4 space-y-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Recipient (Merchant Wallet)
              </span>
              <p className="text-xs font-mono font-medium text-white bg-[#1E293B]/80 border border-slate-700 rounded-lg p-2.5 break-all select-all">
                {merchantAddress}
              </p>
            </div>

            {address && isCorrect && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Your Connected Wallet
                </span>
                <p className="text-xs font-mono font-medium text-slate-200 bg-[#1E293B]/60 border border-slate-700/60 rounded-lg p-2.5 break-all">
                  {address}
                </p>
              </div>
            )}

            {/* Token Balance */}
            {tokenBalance !== undefined && (
              <div className="flex items-center justify-between bg-[#1E293B]/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <TokenIcon token={params.token} size={20} />
                  <span className="text-xs font-bold text-slate-300">
                    Your {tokenLabel} Balance
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    insufficientTokenFunds ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {parseFloat(formatUnits(tokenBalance, effectiveDecimals)).toFixed(4)}{' '}
                  {tokenLabel}
                </span>
              </div>
            )}

            {/* Native Gas Balance Check */}
            {nativeBalanceData && (
              <div className="flex items-center justify-between bg-[#1E293B]/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-slate-300">
                    Polygon Gas (POL/MATIC)
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    insufficientGas ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {parseFloat(formatEther(nativeBalanceData.value)).toFixed(4)} POL
                </span>
              </div>
            )}
          </div>

          {/* Network Mismatch Warning */}
          {isConnected && !isCorrect && (
            <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-200">
                    Network Mismatch
                  </p>
                  <p className="text-xs text-amber-300 mt-0.5">
                    Your wallet is connected to a different network. Please switch to Polygon Mainnet.
                  </p>
                  <button
                    onClick={requestSwitch}
                    disabled={switching}
                    className="mt-2 text-xs font-bold text-blue-300 hover:text-blue-200 underline disabled:opacity-50"
                  >
                    {switching ? 'Switching Network...' : 'Switch to Polygon Mainnet'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Token Warning */}
          {isConnected && isCorrect && insufficientTokenFunds && payState === 'idle' && (
            <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-200">
                    Insufficient {tokenLabel} Balance
                  </p>
                  <p className="text-xs text-rose-300 mt-0.5">
                    You need at least {amountDisplay} {tokenLabel} on Polygon to complete this transfer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Gas Warning */}
          {isConnected && isCorrect && !insufficientTokenFunds && insufficientGas && payState === 'idle' && (
            <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-200">
                    Low Gas Balance (POL)
                  </p>
                  <p className="text-xs text-amber-300 mt-0.5">
                    Your wallet has 0 POL. You need a small fraction of a POL ($0.01) to pay Polygon blockchain transaction fees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Error Card with Diagnostics */}
          {errorMessage && payState === 'error' && (
            <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-200">
                    Transaction Notice
                  </p>
                  <p className="text-xs text-rose-300 mt-0.5">{errorMessage}</p>
                  {techErrorDetails && (
                    <details className="mt-2 text-[11px] text-rose-300 bg-rose-900/30 p-2 rounded border border-rose-500/30 font-mono break-all cursor-pointer">
                      <summary className="font-semibold select-none">Technical Error Log</summary>
                      <p className="mt-1">{techErrorDetails}</p>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {payState === 'sending' || payState === 'confirming' ? (
            <div className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-blue-950/80 border border-blue-500/40 px-4 py-4 text-blue-300 font-bold text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              {payState === 'sending'
                ? 'Awaiting wallet signature...'
                : 'Confirming on Polygon blockchain...'}
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={
                !isConnected || !isCorrect || sending || loadingSession || insufficientTokenFunds
              }
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-4 text-white font-bold text-sm shadow-lg shadow-blue-950/50 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TokenIcon token={params.token} size={22} />
              <span>Pay {amountDisplay} {tokenLabel}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          )}

          {payState === 'confirming' && explorerTxUrl && (
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
            >
              Track on Polygonscan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {!isConnected && (
        <p className="text-center text-xs text-slate-400">
          Connect your Web3 wallet using the header button to approve and execute this payment on Polygon.
        </p>
      )}
    </div>
  );
}
