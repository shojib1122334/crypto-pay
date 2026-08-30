import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Copy,
  Check,
  Wallet,
  Loader2,
  ChevronDown,
  Clock,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  buildPaymentLink,
  buildPaymentQRUri,
  createPaymentSession,
  subscribeToPaymentSession,
  updatePaymentSession,
  STATUS_LABELS,
  STATUS_ORDER,
  type PaymentLinkParams,
} from '@/lib/payments';
import { TOKEN_LIST, type TokenSymbol } from '@/lib/tokens';
import type { PaymentSession, PaymentStatus } from '@/lib/supabase';
import { TokenIcon } from '@/components/TokenIcon';
import {
  verifyOnChainPayment,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';

const STATUS_BADGE_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-zinc-900',
    text: 'text-[#FACC15] font-semibold',
    dot: 'bg-[#FACC15] shadow-[0_0_6px_#FACC15]',
    border: 'border-[#FACC15]/40',
  },
  confirming: {
    label: 'Payment Detected',
    bg: 'bg-zinc-900',
    text: 'text-[#3B82F6] font-semibold',
    dot: 'bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]',
    border: 'border-[#3B82F6]/40',
  },
  success: {
    label: 'Paid & Verified',
    bg: 'bg-zinc-900',
    text: 'text-[#00E676] font-semibold',
    dot: 'bg-[#00E676] shadow-[0_0_6px_#00E676]',
    border: 'border-[#00E676]/40',
  },
  failed: {
    label: 'Expired / Failed',
    bg: 'bg-zinc-900',
    text: 'text-[#EF4444] font-semibold',
    dot: 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]',
    border: 'border-[#EF4444]/40',
  },
};

const STEP_INDEX: Record<PaymentStatus, number> = {
  pending: 0,
  confirming: 1,
  success: 2,
  failed: 1,
};

export default function MerchantDashboard() {
  const { address, isConnected, isConnecting } = useAccount();
  const [amount, setAmount] = useState('10.00');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('usdt');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [webLink, setWebLink] = useState<string | null>(null);
  const [qrParams, setQrParams] = useState<PaymentLinkParams | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedWebLink, setCopiedWebLink] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(1800);

  // Verification state
  const [verifyInputHash, setVerifyInputHash] = useState('');
  const [isVerifyingHash, setIsVerifyingHash] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedRecord, setVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!qrPayload) return;
    setSecondsRemaining(1785);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrPayload]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = subscribeToPaymentSession(sessionId, async (s) => {
      setSession(s);
      if (s?.status === 'success' && s.tx_hash && !verifiedRecord) {
        const result = await verifyOnChainPayment(s.tx_hash, {
          expectedMerchant: address,
          expectedAmount: amount,
          expectedToken: selectedToken,
          sessionId,
        });
        if (result.success && result.record) {
          setVerifiedRecord(result.record);
        }
      }
    });
    return unsubscribe;
  }, [sessionId, address, amount, selectedToken, verifiedRecord]);

  // Listen to global cryptopay history updates for real-time detection
  useEffect(() => {
    const handleHistoryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<VerifiedTransactionRecord>;
      const record = customEvent.detail;
      if (!record) return;

      if (sessionId && record.sessionId === sessionId) {
        setVerifiedRecord(record);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'success',
                tx_hash: record.txHash,
                customer_address: record.senderAddress,
              }
            : null
        );
      } else if (
        address &&
        record.recipientAddress?.toLowerCase() === address.toLowerCase() &&
        record.token?.toLowerCase() === selectedToken.toLowerCase() &&
        parseFloat(record.amount) === parseFloat(amount)
      ) {
        setVerifiedRecord(record);
      }
    };

    window.addEventListener('cryptopay_history_update', handleHistoryUpdate);
    return () => window.removeEventListener('cryptopay_history_update', handleHistoryUpdate);
  }, [sessionId, address, selectedToken, amount]);

  const handleGenerate = async () => {
    setError(null);
    if (!address) {
      setError('Please connect your merchant wallet to generate a payment request.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setGenerating(true);
    setQrPayload(null);
    setWebLink(null);
    setQrParams(null);
    setSession(null);

    const newSession = await createPaymentSession(address, parsed, selectedToken);
    if (!newSession) {
      setError('Could not initialize payment session. Please check your connection.');
      setGenerating(false);
      return;
    }

    const uri = buildPaymentQRUri(address, amount, selectedToken);
    const baseUrl = window.location.origin;
    const link = buildPaymentLink(baseUrl, newSession.id, address, amount, selectedToken);

    setSessionId(newSession.id);
    setQrPayload(uri);
    setWebLink(link);
    setQrParams({
      sessionId: newSession.id,
      merchantAddress: address,
      amount,
      token: selectedToken,
    });
    setSession(newSession);
    setGenerating(false);
  };

  const handleVerifyPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifyInputHash.trim()) return;

    setIsVerifyingHash(true);
    setVerifyError(null);

    const result = await verifyOnChainPayment(verifyInputHash.trim(), {
      expectedMerchant: address,
      expectedAmount: amount,
      expectedToken: selectedToken,
      sessionId: sessionId || undefined,
    });

    setIsVerifyingHash(false);

    if (result.success && result.record) {
      setVerifiedRecord(result.record);
      // Mark session status as success if session exists
      if (sessionId) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'success',
                tx_hash: result.record?.txHash || null,
                customer_address: result.record?.senderAddress || null,
              }
            : null
        );
        updatePaymentSession(sessionId, {
          status: 'success',
          tx_hash: result.record.txHash,
          customer_address: result.record.senderAddress,
        });
      }
    } else {
      setVerifyError(result.error || 'Unable to verify transaction on Polygon Mainnet.');
    }
  };

  const handleCopyPayload = () => {
    if (!qrPayload) return;
    navigator.clipboard.writeText(qrPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyWebLink = () => {
    if (!webLink) return;
    navigator.clipboard.writeText(webLink);
    setCopiedWebLink(true);
    setTimeout(() => setCopiedWebLink(false), 2000);
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptopay-${selectedToken}-${amount || 'payment'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentStatus: PaymentStatus = verifiedRecord ? 'success' : (session?.status ?? 'pending');
  const activeStep = STEP_INDEX[currentStatus];
  const activeTokenConfig = TOKEN_LIST.find((t) => t.symbol === selectedToken);
  const currentTokenLabel = activeTokenConfig?.label ?? 'USDT';
  const statusBadge = STATUS_BADGE_CONFIG[currentStatus];

  const formattedShortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <div id="merchant-dashboard" className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-20 sm:pb-28">
      
      {/* Dashboard Welcome & Overview Hero Banner */}
      <div className="relative overflow-hidden bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl mb-6 sm:mb-8 transition-all">
        <div
          className="absolute top-0 right-0 bottom-0 w-1/3 sm:w-2/5 md:w-1/2 bg-cover bg-right bg-no-repeat pointer-events-none opacity-20"
          style={{
            backgroundImage: `url('https://i.ibb.co.com/nqVSRQwB/IMG-20260828-203555-476.jpg')`,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 20%, rgba(0,0,0,1) 60%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 20%, rgba(0,0,0,1) 60%)',
          }}
        />

        <div className="relative z-10 p-6 sm:p-8 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-[#3B82F6]/40 text-[#3B82F6] text-xs font-bold uppercase tracking-wider mb-3 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            <Zap className="w-3.5 h-3.5 text-[#FACC15] fill-[#FACC15]" />
            DIRECT POLYGON GATEWAY
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FFFFFF] tracking-tight">
            Merchant Dashboard
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-1.5 leading-relaxed">
            Create and manage crypto payment requests with instant on-chain settlement.
          </p>

          <div className="mt-4 flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_6px_#00E676]" />
              Settlements: Direct to Wallet
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Merchant Wallet & Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Connected Wallet Card */}
          <div className="bg-zinc-950 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                YOUR MERCHANT WALLET
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 text-[#00E676] text-xs font-semibold border border-[#00E676]/40 shadow-[0_0_8px_rgba(0,230,118,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 text-[#FACC15] text-xs font-semibold border border-[#FACC15]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                  Not Connected
                </span>
              )}
            </div>

            <div className="flex items-center gap-3.5 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[#3B82F6] flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#FFFFFF] font-mono truncate">
                    {formattedShortAddress ?? 'Connect wallet to activate'}
                  </p>
                  {address && (
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 text-zinc-400 hover:text-white transition rounded cursor-pointer"
                      title="Copy full merchant address"
                    >
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-400">
                    {address ? 'Polygon Mainnet / EVM' : 'Receiving address required'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Creation Card */}
          <div className="bg-zinc-950 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#FFFFFF]">
                Create Payment
              </h3>
              <span className="text-xs text-zinc-400">
                Non-custodial QR Generation
              </span>
            </div>

            {/* Amount & Token Fields */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="payment-amount"
                  className="block text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-2"
                >
                  Amount
                </label>
                <div className="relative">
                  <input
                    id="payment-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="10.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-xl font-bold text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] transition shadow-inner"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700 text-xs font-bold text-[#FFFFFF]">
                    <TokenIcon token={selectedToken} size={20} />
                    <span>{currentTokenLabel}</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-medium">Quick presets:</span>
                  {['5.00', '10.00', '25.00', '50.00', '100.00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                    >
                      ${parseInt(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-2">
                  Settlement Token
                </label>
                <div className="relative z-30" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 px-4 py-3.5 text-sm font-semibold text-[#FFFFFF] transition focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon token={selectedToken} size={32} />
                      <div className="text-left">
                        <span className="font-bold text-[#FFFFFF]">{currentTokenLabel}</span>
                        <span className="text-xs text-zinc-400 ml-2">
                          {activeTokenConfig?.networkName ?? 'Polygon'}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden z-50 divide-y divide-zinc-800">
                      {TOKEN_LIST.map((token) => {
                        const isSelected = selectedToken === token.symbol;
                        return (
                          <button
                            key={token.symbol}
                            type="button"
                            onClick={() => {
                              setSelectedToken(token.symbol);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 min-h-[52px] text-sm transition cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-800 text-[#3B82F6] font-semibold'
                                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <TokenIcon token={token.symbol} size={32} />
                              <div className="text-left">
                                <span className="font-bold">{token.label}</span>
                                <span className="text-xs text-zinc-400 block">
                                  {token.networkName}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#3B82F6]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || isConnecting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 active:opacity-95 px-5 py-4 text-white font-bold text-base shadow-[0_0_20px_rgba(59,130,246,0.35)] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Generating Payment Request...
                  </>
                ) : (
                  'Generate Payment QR'
                )}
              </button>

              {error && (
                <p className="text-xs font-medium text-[#EF4444] bg-zinc-900 border border-[#EF4444]/40 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Payment QR Section & Status Tracker */}
        <div className="lg:col-span-5 space-y-6 mt-6 lg:mt-0">
          
          {/* Payment QR Terminal Card */}
          {qrPayload && qrParams ? (
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
              {/* Terminal Title Bar */}
              <div className="bg-zinc-900 text-white px-5 py-4 flex items-center justify-between border-b border-zinc-800">
                <div>
                  <h4 className="text-sm font-bold text-[#FFFFFF] tracking-wide">
                    Payment Request
                  </h4>
                  <span className="text-[11px] text-[#00E676] font-semibold">
                    Polygon Mainnet
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-[#FACC15] text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#FACC15]" />
                  Expires in {formatCountdown(secondsRemaining)}
                </div>
              </div>

              <div className="p-6 flex flex-col items-center">
                {/* Big Amount Badge */}
                <div className="text-center mb-5">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Total Amount
                  </span>
                  <div className="inline-flex items-center justify-center gap-2 text-3xl font-extrabold text-[#FFFFFF] tracking-tight">
                    <TokenIcon token={qrParams.token} size={30} />
                    <span>{qrParams.amount}</span>
                    <span className="text-[#3B82F6]">
                      {TOKEN_LIST.find((t) => t.symbol === qrParams.token)?.label}
                    </span>
                  </div>
                </div>

                {/* QR Code SVG */}
                <div
                  ref={qrRef}
                  className="p-4 bg-white rounded-2xl border border-zinc-800 shadow-md flex items-center justify-center mb-2"
                >
                  <QRCodeSVG
                    value={qrPayload}
                    size={190}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* EIP-681 Standard URI Box */}
                <div className="mt-5 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      EIP-681 Payment Scanner URI
                    </span>
                    <span className="text-[10px] text-[#00E676] font-semibold px-2 py-0.5 rounded bg-zinc-950 border border-[#00E676]/40">
                      Scanner Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 break-all font-mono select-all leading-tight">
                    {qrPayload}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 mt-5 w-full">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyPayload}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-2.5 text-xs font-bold text-[#FFFFFF] transition cursor-pointer"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#00E676]" />
                          URI Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          Copy URI
                        </>
                      )}
                    </button>

                    {webLink && (
                      <button
                        onClick={handleCopyWebLink}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-2.5 text-xs font-bold text-[#FFFFFF] transition cursor-pointer"
                      >
                        {copiedWebLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00E676]" />
                            Link Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            Copy Link
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {webLink && (
                    <a
                      href={webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#3B82F6]/40 bg-zinc-900 hover:bg-zinc-800 px-3 py-2.5 text-xs font-bold text-[#3B82F6] transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Open Customer Pay Page
                    </a>
                  )}

                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white px-3 py-2.5 text-xs font-bold transition shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Live Transaction Status Tracker */}
          {sessionId && (
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#FFFFFF]">
                  Transaction Status
                </h4>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} animate-pulse`} />
                  {statusBadge.label}
                </span>
              </div>

              {/* Stepper */}
              <div className="flex items-center mb-6">
                {STATUS_ORDER.map((status, idx) => {
                  const isActive = idx <= activeStep;
                  const isCurrent = idx === activeStep;
                  return (
                    <div key={status} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                            isActive
                              ? isCurrent
                                ? 'bg-[#3B82F6] text-white shadow-[0_0_10px_#3B82F6]'
                                : 'bg-[#00E676] text-zinc-950 shadow-[0_0_8px_#00E676]'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          {isActive && !isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`mt-1.5 text-[10px] font-semibold text-center ${
                            isActive ? 'text-[#FFFFFF]' : 'text-zinc-500'
                          }`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                      {idx < STATUS_ORDER.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-1.5 transition-colors duration-300 ${
                            idx < activeStep ? 'bg-[#00E676]' : 'bg-zinc-800'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Verify Payment Section directly below Stepper */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
                      Verify Payment
                    </span>
                  </div>
                  <span className="text-[11px] text-[#00E676] font-medium">
                    On-chain validation
                  </span>
                </div>

                {/* If already verified, show real verified record summary */}
                {verifiedRecord ? (
                  <div className="bg-zinc-900 border border-[#00E676]/40 rounded-xl p-4 space-y-3 shadow-[0_0_15px_rgba(0,230,118,0.15)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#00E676]/20 text-[#00E676] flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#00E676]">
                            Payment Verified (Success)
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Recorded in Activity under Transaction History
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                        Finalized
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 bg-zinc-950 rounded-lg p-3 border border-zinc-800 font-medium">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Amount Settled:</span>
                        <span className="font-bold text-[#00E676]">
                          +{verifiedRecord.amount} {verifiedRecord.tokenLabel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Exact Time:</span>
                        <span className="text-zinc-200 font-semibold">
                          {verifiedRecord.formattedDate || new Date(verifiedRecord.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Polygon Block:</span>
                        <span className="font-mono text-zinc-200 font-semibold">
                          #{verifiedRecord.blockNumber}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                        <span className="text-zinc-400">Tx Hash:</span>
                        <a
                          href={`https://polygonscan.com/tx/${verifiedRecord.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#3B82F6] hover:underline inline-flex items-center gap-1"
                        >
                          {verifiedRecord.txHash.slice(0, 8)}...{verifiedRecord.txHash.slice(-6)}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        onClick={() => generatePaymentReceiptPdf(verifiedRecord)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 text-xs font-bold shadow-[0_0_10px_rgba(0,230,118,0.3)] active:scale-95 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-950" />
                        <span>Download Receipt (PDF)</span>
                      </button>
                      <a
                        href="#activity"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[#FFFFFF] text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <span>View in Activity</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyPayment} className="space-y-2">
                    <p className="text-xs text-zinc-400">
                      Enter the transaction hash here to display 'Success' status and save record.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Paste transaction hash (0x...)"
                        value={verifyInputHash}
                        onChange={(e) => {
                          setVerifyInputHash(e.target.value);
                          setVerifyError(null);
                        }}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-mono text-[#FFFFFF] placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-[#3B82F6] transition"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingHash || !verifyInputHash.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
                      >
                        {isVerifyingHash ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Payment</span>
                          </>
                        )}
                      </button>
                    </div>

                    {verifyError && (
                      <p className="text-xs font-semibold text-[#EF4444] bg-zinc-900 border border-[#EF4444]/40 rounded-lg p-2.5">
                        {verifyError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Transaction Hash link */}
              {session?.tx_hash && !verifiedRecord && (
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Transaction Hash
                      </p>
                      <p className="text-xs font-mono text-zinc-200 truncate max-w-[200px] sm:max-w-xs">
                        {session.tx_hash}
                      </p>
                    </div>
                    <a
                      href={`https://polygonscan.com/tx/${session.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#3B82F6] hover:underline transition"
                    >
                      Polygonscan <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
