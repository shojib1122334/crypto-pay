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

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [techErrorDetails, setTechErrorDetails] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [transferVerified, setTransferVerified] = useState(false);

  // Validate and checksum merchant address
  const rawMerchant = params.merchantAddress;
  const isValidMerchant = isAddress(rawMerchant);
  const merchantAddress: Address = isValidMerchant ? getAddress(rawMerchant) : (rawMerchant as Address);
  const amountDisplay = params.amount;

  // Read native POL/MATIC balance for gas fees
  const { data: nativeBalanceData } = useBalance({
    address,
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: !!address && isCorrect, refetchInterval: 10_000 },
  });

  // Read token decimals directly from the Polygon contract
  const { data: onChainDecimals } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: !!token && isCorrect },
  });

  const effectiveDecimals = onChainDecimals ?? token?.decimals ?? 18;

  // Compute exact raw amount (e.g. 1 VERSE = 1000000000000000000)
  const amountRaw = (() => {
    if (!token) return 0n;
    try {
      return parseUnits(amountDisplay, effectiveDecimals);
    } catch {
      return 0n;
    }
  })();

  // Read the customer's ERC-20 token balance directly from the Polygon token contract
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: !!address && !!token && isCorrect, refetchInterval: 8_000 },
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
      setTransferVerified(true);
      setPayState('success');
    }
  }, [session]);

  const { data: receipt, isError: isReceiptError } = useWaitForTransactionReceipt({
    chainId: POLYGON_CHAIN_ID,
    hash: txHash ? (txHash as Hash) : undefined,
    query: { enabled: !!txHash && payState === 'confirming' },
  });

  // Handle transaction confirmation and verify Transfer event in logs
  useEffect(() => {
    if (!receipt || payState !== 'confirming' || !txHash || !address || !token) return;

    if (receipt.status === 'success') {
      console.log('[CryptoPay On-Chain Receipt Confirmed]:', receipt);

      // Verify the ERC-20 Transfer event log
      let verifiedOnChain = false;
      try {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === token.address.toLowerCase()) {
            try {
              const decoded = decodeEventLog({
                abi: ERC20_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (
                decoded.eventName === 'Transfer' &&
                decoded.args &&
                'from' in decoded.args &&
                'to' in decoded.args &&
                'value' in decoded.args
              ) {
                const logFrom = (decoded.args.from as string).toLowerCase();
                const logTo = (decoded.args.to as string).toLowerCase();
                const logValue = BigInt(decoded.args.value as bigint | string | number);

                if (
                  logFrom === address.toLowerCase() &&
                  logTo === merchantAddress.toLowerCase() &&
                  logValue >= amountRaw
                ) {
                  console.log('[CryptoPay Transfer Event Verified]:', {
                    token: token.symbol,
                    from: decoded.args.from,
                    to: decoded.args.to,
                    value: decoded.args.value.toString(),
                  });
                  verifiedOnChain = true;
                  break;
                }
              }
            } catch {
              // Non-matching log item, continue
            }
          }
        }
      } catch (err) {
        console.warn('Log verification check skipped:', err);
      }

      setTransferVerified(verifiedOnChain);
      setPayState('success');
      updatePaymentSession(params.sessionId, {
        status: 'success',
        tx_hash: txHash,
        customer_address: address,
      });
      refetchTokenBalance();
    } else {
      setPayState('error');
      setErrorMessage('Transaction failed or reverted on Polygon blockchain.');
      setTechErrorDetails(`Transaction ${txHash} reverted with status 0`);
      updatePaymentSession(params.sessionId, {
        status: 'failed',
        tx_hash: txHash,
        customer_address: address,
      });
    }
  }, [
    receipt,
    payState,
    txHash,
    address,
    token,
    merchantAddress,
    amountRaw,
    params.sessionId,
    refetchTokenBalance,
  ]);

  if (isReceiptError && payState === 'confirming') {
    setPayState('error');
    setErrorMessage('Failed to fetch transaction confirmation. Check Polygonscan for details.');
  }

  const handlePay = useCallback(async () => {
    setErrorMessage(null);
    setTechErrorDetails(null);

    // 1. Connection check
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first.');
      return;
    }

    // 2. Token configuration check
    if (!token) {
      setErrorMessage('Unsupported token. Please use a valid payment link.');
      return;
    }

    // 3. Merchant EVM address verification
    if (!isValidMerchant) {
      setErrorMessage(`Invalid merchant address (${params.merchantAddress}).`);
      return;
    }

    // 4. Amount validation
    if (amountRaw <= 0n) {
      setErrorMessage('Invalid payment amount. Amount must be greater than zero.');
      return;
    }

    // 5. Polygon Network Check
    if (!isCorrect) {
      setErrorMessage('Please switch your wallet to Polygon Mainnet (Chain ID 137).');
      return;
    }

    // 6. Balance verification
    if (tokenBalance !== undefined && tokenBalance < amountRaw) {
      const userBalanceFormatted = formatUnits(tokenBalance, effectiveDecimals);
      setErrorMessage(
        `Insufficient ${token.label} balance. You have ${userBalanceFormatted} ${token.label}, but this payment requires ${amountDisplay} ${token.label}.`,
      );
      return;
    }

    // 7. POL/MATIC Gas verification
    if (nativeBalanceData && nativeBalanceData.value === 0n) {
      setErrorMessage(
        'Insufficient POL/MATIC for gas. Your wallet needs a small amount of POL/MATIC to pay Polygon network transaction fees.',
      );
      return;
    }

    console.log('[CryptoPay Initiating ERC-20 Transfer]:', {
      network: 'Polygon Mainnet',
      chainId: POLYGON_CHAIN_ID,
      tokenSymbol: token.symbol,
      tokenContract: token.address,
      onChainDecimals: effectiveDecimals,
      merchantRecipient: merchantAddress,
      customerSender: address,
      rawAmount: amountRaw.toString(),
      displayAmount: amountDisplay,
    });

    setPayState('sending');

    // 8. Pre-flight gas estimation / call simulation
    if (publicClient) {
      try {
        console.log('[CryptoPay Pre-flight Simulation]: Estimating gas on Polygon...');
        const estimatedGas = await publicClient.estimateContractGas({
          account: address,
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [merchantAddress, amountRaw],
        });
        console.log('[CryptoPay Gas Estimation Success]: Estimated gas units:', estimatedGas.toString());
      } catch (simErr) {
        console.warn('[CryptoPay Simulation Warning]: Gas estimation note:', simErr);
        // If simulation explicitly reveals lack of balance or revert, extract it
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

    // 9. Execute transaction through the connected wallet provider
    try {
      const hash = await writeContractAsync({
        chainId: POLYGON_CHAIN_ID,
        address: token.address, // Must be the VERSE token contract (0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc)
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [merchantAddress, amountRaw], // Merchant is only recipient argument inside transfer()
      });

      console.log('[CryptoPay Transaction Submitted Successfully]: Hash:', hash);
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
    amountRaw,
    effectiveDecimals,
    isConnected,
    isCorrect,
    isValidMerchant,
    merchantAddress,
    nativeBalanceData,
    params.merchantAddress,
    params.sessionId,
    publicClient,
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
            <strong className="text-[#0B1220] inline-flex items-center gap-1.5 align-middle">
              <TokenIcon token={params.token} size={18} />
              {amountDisplay} {tokenLabel}
            </strong>{' '}
            directly to the merchant wallet on Polygon Mainnet.
          </p>

          <div className="bg-[#F5F7FB] rounded-2xl border border-[#E2E8F0] p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Merchant Recipient</span>
              <span className="font-mono font-bold text-[#0B1220]">
                {merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Network</span>
              <span className="font-semibold text-slate-800">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Token Contract</span>
              <span className="font-mono text-xs text-slate-700 truncate max-w-[180px]">
                {token?.address}
              </span>
            </div>
            {transferVerified && (
              <div className="flex justify-between text-xs text-emerald-700 font-semibold pt-1">
                <span>Transfer Verification</span>
                <span>Verified in Event Logs ✓</span>
              </div>
            )}
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
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-[#DC2626]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1220] mb-2">
            Invalid Payment Link
          </h2>
          <p className="text-[#64748B] text-xs leading-relaxed">
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Non-Custodial Payment Request
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight">
          Review & Complete Payment
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Direct peer-to-peer settlement to merchant on Polygon Mainnet (Chain ID 137).
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
            Polygon Mainnet (137)
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
            
            <TokenIcon token={params.token} size={48} className="shadow-sm" />
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

            {/* Token Balance */}
            {tokenBalance !== undefined && (
              <div className="flex items-center justify-between bg-[#F5F7FB] border border-[#E2E8F0] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <TokenIcon token={params.token} size={20} />
                  <span className="text-xs font-bold text-[#64748B]">
                    Your {tokenLabel} Balance
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    insufficientTokenFunds ? 'text-[#DC2626]' : 'text-[#0B1220]'
                  }`}
                >
                  {parseFloat(formatUnits(tokenBalance, effectiveDecimals)).toFixed(4)}{' '}
                  {tokenLabel}
                </span>
              </div>
            )}

            {/* Native Gas Balance Check */}
            {nativeBalanceData && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">
                    Polygon Gas (POL/MATIC)
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    insufficientGas ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {parseFloat(formatEther(nativeBalanceData.value)).toFixed(4)} POL
                </span>
              </div>
            )}
          </div>

          {/* Network Mismatch Warning */}
          {isConnected && !isCorrect && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900">
                    Network Mismatch
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your wallet is connected to a different network. Please switch to Polygon Mainnet.
                  </p>
                  <button
                    onClick={requestSwitch}
                    disabled={switching}
                    className="mt-2 text-xs font-bold text-[#1D4ED8] underline disabled:opacity-50"
                  >
                    {switching ? 'Switching Network...' : 'Switch to Polygon Mainnet'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Token Warning */}
          {isConnected && isCorrect && insufficientTokenFunds && payState === 'idle' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    Insufficient {tokenLabel} Balance
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">
                    You need at least {amountDisplay} {tokenLabel} on Polygon to complete this transfer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Gas Warning */}
          {isConnected && isCorrect && !insufficientTokenFunds && insufficientGas && payState === 'idle' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Low Gas Balance (POL)
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your wallet has 0 POL. You need a fraction of a POL ($0.01) to pay Polygon blockchain transaction fees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Error Card with Diagnostics */}
          {errorMessage && payState === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-900">
                    Transaction Notice
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">{errorMessage}</p>
                  {techErrorDetails && (
                    <details className="mt-2 text-[11px] text-rose-700 bg-rose-100/60 p-2 rounded border border-rose-200 font-mono break-all cursor-pointer">
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
                !isConnected || !isCorrect || sending || loadingSession || insufficientTokenFunds
              }
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] px-5 py-4 text-white font-bold text-sm shadow-md shadow-blue-900/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#1D4ED8] hover:text-[#2563EB] transition"
            >
              Track on Polygonscan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {!isConnected && (
        <p className="text-center text-xs text-[#64748B]">
          Connect your Web3 wallet using the header button to approve and execute this payment on Polygon.
        </p>
      )}
    </div>
  );
}
