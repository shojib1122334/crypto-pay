import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { useConnectWallet } from '@/hooks/useConnectWallet';
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Fuel,
  Info,
  FileText,
  Wallet,
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
import { parseRpcError } from '@/lib/rpcError';
import { TokenIcon } from '@/components/TokenIcon';
import {
  saveVerifiedTransaction,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';

interface CustomerPaymentViewProps {
  params: PaymentLinkParams;
}

type PayState = 'idle' | 'sending' | 'confirming' | 'success' | 'error';

/**
 * Extracts human-readable and technical details from wallet / provider errors.
 */
function parseTransactionError(err: unknown, tokenSymbol = 'USDT', amount?: string): { userMessage: string; techDetail: string } {
  console.error('[CryptoPay Transaction Error Diagnostic]:', err);

  const parsed = parseRpcError(err, {
    tokenSymbol,
    amount,
    chainId: POLYGON_CHAIN_ID,
  });

  return {
    userMessage: parsed.message,
    techDetail: parsed.technicalDetails || parsed.message,
  };
}

export default function CustomerPaymentView({
  params,
}: CustomerPaymentViewProps) {
  const { address, isConnected } = useAccount();
  const { openWalletConnect } = useConnectWallet();
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
  const [verifiedRecord, setVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  const tokenLabel = token?.label ?? params.token.toUpperCase();

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

      // Create and persist verified record to Activity / Transaction History
      const now = new Date();
      const newRecord: VerifiedTransactionRecord = {
        id: `tx_${receipt.transactionHash.slice(0, 10)}_${Date.now()}`,
        txHash: receipt.transactionHash,
        senderAddress: address || '0x...',
        recipientAddress: merchantAddress,
        amount: amountDisplay,
        token: params.token,
        tokenLabel,
        blockNumber: Number(receipt.blockNumber),
        timestamp: now.toISOString(),
        formattedDate: now.toLocaleString(),
        status: 'success',
        network: 'Polygon Mainnet',
        chainId: POLYGON_CHAIN_ID,
        sessionId: params.sessionId,
        verifiedAt: now.toISOString(),
      };

      setVerifiedRecord(newRecord);
      saveVerifiedTransaction(newRecord);

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
    params.token,
    amountDisplay,
    tokenLabel,
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
      openWalletConnect();
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
        'Insufficient POL/MATIC for gas. Your wallet needs a small amount of POL to pay Polygon network transaction fees.',
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
    openWalletConnect,
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

  const insufficientTokenFunds =
    tokenBalance !== undefined && amountRaw > 0n && tokenBalance < amountRaw;
  const insufficientGas =
    nativeBalanceData !== undefined && nativeBalanceData.value === 0n;

  // Success screen
  if (payState === 'success') {
    return (
      <div className="w-full sm:max-w-lg mx-auto px-3.5 sm:px-6 py-6 sm:py-20 flex flex-col items-center">
        <div className="w-full web3-glass-card rounded-2xl sm:rounded-3xl border border-white/80 shadow-2xl shadow-purple-500/10 p-4 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto mb-6 shadow-md shadow-emerald-500/15">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold uppercase tracking-wider mb-2">
            Settled On-Chain
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#101B5C] tracking-tight mb-2">
            Payment Completed
          </h2>
          
          <p className="text-[#5367A5] text-sm leading-relaxed mb-6 font-medium">
            You successfully transferred{' '}
            <strong className="text-[#101B5C] inline-flex items-center gap-1.5 align-middle font-black">
              <TokenIcon token={params.token} size={18} />
              {amountDisplay} {tokenLabel}
            </strong>{' '}
            directly to the merchant wallet on Polygon Mainnet.
          </p>

          <div className="bg-[#F8FAFF] rounded-2xl border border-[#D6E0F5] p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-[#5367A5] font-medium">Merchant Recipient</span>
              <span className="font-mono font-bold text-[#101B5C]">
                {merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5367A5] font-medium">Network</span>
              <span className="font-bold text-[#101B5C]">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5367A5] font-medium">Token Contract</span>
              <span className="font-mono text-xs text-[#5367A5] truncate max-w-[180px]">
                {token?.address}
              </span>
            </div>
            {transferVerified && (
              <div className="flex justify-between text-xs text-emerald-600 font-bold pt-1">
                <span>Transfer Verification</span>
                <span>Verified in Event Logs ✓</span>
              </div>
            )}
            {txHash && (
              <div className="flex justify-between text-xs pt-2 border-t border-[#D6E0F5]">
                <span className="text-[#5367A5] font-medium">Transaction</span>
                <span className="font-mono text-xs text-blue-600 font-bold truncate max-w-[180px]">
                  {txHash}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {verifiedRecord && (
              <button
                onClick={() => generatePaymentReceiptPdf(verifiedRecord)}
                className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm px-5 py-3.5 shadow-md shadow-emerald-500/25 active:scale-[0.99] transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Download Payment Receipt (PDF)</span>
              </button>
            )}

            {explorerTxUrl && (
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm px-5 py-3.5 shadow-md shadow-purple-500/25 transition"
              >
                <span>View on Polygonscan</span>
                <ExternalLink className="w-4 h-4 text-white" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Invalid token fallback
  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="web3-glass-card rounded-3xl border border-rose-200 shadow-xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-xs">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-[#101B5C] mb-2">
            Invalid Payment Link
          </h2>
          <p className="text-[#5367A5] text-xs leading-relaxed font-medium">
            This payment link specifies an unsupported asset. Supported tokens are USDT, USDC, and VERSE on Polygon Mainnet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full sm:max-w-lg mx-auto px-3.5 sm:px-6 py-6 sm:py-16">
      
      {/* Customer Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D6E0F5] text-blue-700 text-xs font-extrabold uppercase tracking-wider mb-3 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Non-Custodial Payment Request
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#101B5C] tracking-tight">
          Review & Complete Payment
        </h1>
        <p className="text-sm text-[#5367A5] mt-1 font-medium">
          Direct peer-to-peer settlement to merchant on Polygon Mainnet (Chain ID 137).
        </p>
      </div>

      {/* Payment Summary Card */}
      <div className="web3-glass-card rounded-2xl sm:rounded-3xl border border-white/80 shadow-2xl shadow-purple-500/10 overflow-hidden mb-6 relative">
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
        
        {/* Terminal top bar */}
        <div className="bg-[#F6F8FE] px-3.5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-[#D6E0F5]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5367A5]">
            Payment Invoice
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Polygon Mainnet (137)
          </span>
        </div>

        <div className="p-3.5 sm:p-6">
          
          {/* Amount Due Big Display */}
          <div className="flex items-center justify-between pb-5 border-b border-[#D6E0F5]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5367A5]">
                Amount Due
              </span>
              <div className="text-3xl font-black text-[#101B5C] tracking-tight mt-0.5">
                {amountDisplay}{' '}
                <span className="text-blue-600 text-xl font-bold">{tokenLabel}</span>
              </div>
            </div>
            
            <TokenIcon token={params.token} size={48} className="shadow-xs" />
          </div>

          {/* Details list */}
          <div className="py-4 space-y-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5367A5] block mb-1">
                Recipient (Merchant Wallet)
              </span>
              <p className="text-xs font-mono font-bold text-[#101B5C] bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl p-2.5 break-all select-all">
                {merchantAddress}
              </p>
            </div>

            {address && isCorrect && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5367A5] block mb-1">
                  Your Connected Wallet
                </span>
                <p className="text-xs font-mono font-semibold text-[#5367A5] bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl p-2.5 break-all">
                  {address}
                </p>
              </div>
            )}

            {/* Token Balance */}
            {tokenBalance !== undefined && (
              <div className="flex items-center justify-between bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <TokenIcon token={params.token} size={20} />
                  <span className="text-xs font-bold text-[#101B5C]">
                    Your {tokenLabel} Balance
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    insufficientTokenFunds ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {parseFloat(formatUnits(tokenBalance, effectiveDecimals)).toFixed(4)}{' '}
                  {tokenLabel}
                </span>
              </div>
            )}

            {/* Native Gas Balance Check */}
            {nativeBalanceData && (
              <div className="flex items-center justify-between bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-[#5367A5]">
                    Polygon Gas (POL/MATIC)
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    insufficientGas ? 'text-rose-600' : 'text-[#101B5C]'
                  }`}
                >
                  {parseFloat(formatEther(nativeBalanceData.value)).toFixed(4)} POL
                </span>
              </div>
            )}
          </div>

          {/* Network Mismatch Warning */}
          {isConnected && !isCorrect && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">
                    Network Mismatch
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5 font-medium">
                    Your wallet is connected to a different network. Please switch to Polygon Mainnet.
                  </p>
                  <button
                    onClick={requestSwitch}
                    disabled={switching}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 underline disabled:opacity-50 cursor-pointer"
                  >
                    {switching ? 'Switching Network...' : 'Switch to Polygon Mainnet'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Token Warning */}
          {isConnected && isCorrect && insufficientTokenFunds && payState === 'idle' && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800">
                    Insufficient {tokenLabel} Balance
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium">
                    You need at least {amountDisplay} {tokenLabel} on Polygon to complete this transfer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Gas Warning */}
          {isConnected && isCorrect && !insufficientTokenFunds && insufficientGas && payState === 'idle' && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Low Gas Balance (POL)
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5 font-medium">
                    Your wallet has 0 POL. You need a small fraction of a POL ($0.01) to pay Polygon blockchain transaction fees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Error Card with Diagnostics */}
          {errorMessage && payState === 'error' && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-800">
                    Transaction Notice
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium">{errorMessage}</p>
                  {techErrorDetails && (
                    <details className="mt-2 text-[11px] text-rose-800 bg-white p-2 rounded-lg border border-rose-200 font-mono break-all cursor-pointer">
                      <summary className="font-semibold select-none text-rose-700">Technical Error Log</summary>
                      <p className="mt-1 text-rose-600">{techErrorDetails}</p>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {payState === 'sending' || payState === 'confirming' ? (
            <div className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-4 text-blue-700 font-bold text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              {payState === 'sending'
                ? 'Awaiting wallet signature...'
                : 'Confirming on Polygon blockchain...'}
            </div>
          ) : !isConnected ? (
            <button
              onClick={handlePay}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 px-5 py-4 text-white font-bold text-sm shadow-lg shadow-purple-500/25 active:scale-[0.99] transition cursor-pointer border border-white/20"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet & Pay {amountDisplay} {tokenLabel}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          ) : !isCorrect ? (
            <button
              onClick={requestSwitch}
              disabled={switching}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 px-5 py-4 text-slate-900 font-bold text-sm shadow-md shadow-amber-500/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {switching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Switching to Polygon Mainnet...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  <span>Switch to Polygon & Pay {amountDisplay} {tokenLabel}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 text-slate-900" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePay}
              disabled={sending || loadingSession || (insufficientTokenFunds && payState === 'idle')}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 px-5 py-4 text-white font-bold text-sm shadow-lg shadow-purple-500/25 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-white/20"
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
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-purple-600 hover:underline transition"
            >
              Track on Polygonscan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {!isConnected && (
        <p className="text-center text-xs text-[#5367A5] font-medium">
          Connect your Web3 wallet using the header button to approve and execute this payment on Polygon.
        </p>
      )}
    </div>
  );
}
