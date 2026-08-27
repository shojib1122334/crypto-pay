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
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  buildPaymentLink,
  buildPaymentQRUri,
  createPaymentSession,
  subscribeToPaymentSession,
  STATUS_LABELS,
  STATUS_ORDER,
  type PaymentLinkParams,
} from '@/lib/payments';
import { TOKEN_LIST, type TokenSymbol } from '@/lib/tokens';
import type { PaymentSession, PaymentStatus } from '@/lib/supabase';
import { TokenIcon } from '@/components/TokenIcon';

const STATUS_BADGE_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-[#D97706]',
    dot: 'bg-[#D97706]',
    border: 'border-amber-200',
  },
  confirming: {
    label: 'Payment Detected',
    bg: 'bg-blue-50',
    text: 'text-[#2563EB]',
    dot: 'bg-[#2563EB]',
    border: 'border-blue-200',
  },
  success: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-[#059669]',
    dot: 'bg-[#059669]',
    border: 'border-emerald-200',
  },
  failed: {
    label: 'Expired / Failed',
    bg: 'bg-rose-50',
    text: 'text-[#DC2626]',
    dot: 'bg-[#DC2626]',
    border: 'border-rose-200',
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
  const [amount, setAmount] = useState('');
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
  const [secondsRemaining, setSecondsRemaining] = useState(1800); // 30 mins expiry counter

  const qrRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Expiry countdown timer when QR is active
  useEffect(() => {
    if (!qrPayload) return;
    setSecondsRemaining(1785); // 29:45
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

  // Subscribe to live status updates once a session is created
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = subscribeToPaymentSession(sessionId, (s) => {
      setSession(s);
    });
    return unsubscribe;
  }, [sessionId]);

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

  const currentStatus: PaymentStatus = session?.status ?? 'pending';
  const activeStep = STEP_INDEX[currentStatus];
  const activeTokenConfig = TOKEN_LIST.find((t) => t.symbol === selectedToken);
  const currentTokenLabel = activeTokenConfig?.label ?? 'USDT';
  const statusBadge = STATUS_BADGE_CONFIG[currentStatus];

  const formattedShortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <div id="merchant-dashboard" className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      
      {/* Dashboard Section Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100/70 text-[#1D4ED8] text-xs font-semibold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" />
              Direct Polygon Gateway
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight">
              Merchant Dashboard
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-1">
              Create and manage crypto payment requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-slate-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Settlement: Direct to Wallet
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Merchant Wallet & Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Connected Wallet Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                YOUR MERCHANT WALLET
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] text-xs font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[#D97706] text-xs font-semibold border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  Not Connected
                </span>
              )}
            </div>

            <div className="flex items-center gap-3.5 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#1D4ED8] shadow-sm flex-shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#0B1220] font-mono truncate">
                    {formattedShortAddress ?? 'Connect wallet to activate'}
                  </p>
                  {address && (
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 text-slate-400 hover:text-slate-700 transition rounded"
                      title="Copy full merchant address"
                    >
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#64748B]">
                    {address ? 'Polygon Mainnet / EVM' : 'Receiving address required'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Creation Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#0B1220]">
                Create Payment
              </h3>
              <span className="text-xs text-[#64748B]">
                Non-custodial QR Generation
              </span>
            </div>

            {/* Amount & Token Fields */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="payment-amount"
                  className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2"
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
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] px-4 py-3.5 text-xl font-bold text-[#0B1220] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm text-xs font-bold text-[#0B1220]">
                    <TokenIcon token={selectedToken} size={20} />
                    <span>{currentTokenLabel}</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[11px] text-[#64748B]">Quick presets:</span>
                  {['5.00', '10.00', '25.00', '50.00', '100.00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      ${parseInt(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Settlement Token
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] px-4 py-3 text-sm font-semibold text-[#0B1220] hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon token={selectedToken} size={32} />
                      <div className="text-left">
                        <span className="font-bold text-[#0B1220]">{currentTokenLabel}</span>
                        <span className="text-xs text-[#64748B] ml-2">
                          {activeTokenConfig?.networkName ?? 'Polygon'}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-[#E2E8F0] overflow-hidden z-30">
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
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition ${
                              isSelected
                                ? 'bg-blue-50/70 text-[#0B1220]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <TokenIcon token={token.symbol} size={32} />
                              <div className="text-left">
                                <span className="font-bold">{token.label}</span>
                                <span className="text-xs text-[#64748B] block">
                                  {token.networkName}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#1D4ED8]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Action Button (Royal Blue) */}
              <button
                onClick={handleGenerate}
                disabled={generating || isConnecting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] px-5 py-3.5 text-white font-bold text-sm shadow-md shadow-blue-900/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Payment Request...
                  </>
                ) : (
                  'Generate Payment QR'
                )}
              </button>

              {error && (
                <p className="text-xs font-medium text-[#DC2626] bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Payment QR Section & Status Tracker */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Payment QR Terminal Card */}
          {qrPayload && qrParams ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-md overflow-hidden">
              {/* Terminal Title Bar */}
              <div className="bg-[#0B1220] text-white px-5 py-4 flex items-center justify-between border-b border-[#1E293B]">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Payment Request
                  </h4>
                  <span className="text-[11px] text-slate-300">
                    Polygon Mainnet
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-900/50 border border-blue-700/50 px-2.5 py-1 rounded-lg text-blue-300 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  Expires in {formatCountdown(secondsRemaining)}
                </div>
              </div>

              <div className="p-6 flex flex-col items-center">
                {/* Big Amount Badge */}
                <div className="text-center mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Total Amount
                  </span>
                  <div className="inline-flex items-center justify-center gap-2 text-3xl font-extrabold text-[#0B1220] tracking-tight">
                    <TokenIcon token={qrParams.token} size={30} />
                    <span>{qrParams.amount}</span>
                    <span className="text-[#1D4ED8]">
                      {TOKEN_LIST.find((t) => t.symbol === qrParams.token)?.label}
                    </span>
                  </div>
                </div>

                {/* QR Code SVG */}
                <div
                  ref={qrRef}
                  className="p-4 bg-white rounded-2xl border-2 border-[#E2E8F0] shadow-sm flex items-center justify-center"
                >
                  <QRCodeSVG
                    value={qrPayload}
                    size={190}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* EIP-681 Standard URI Box */}
                <div className="mt-4 w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      EIP-681 Standard Payment URI
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Universal Scanner Compatible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 break-all font-mono select-all leading-tight">
                    {qrPayload}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4 w-full">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyPayload}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-[#0B1220] shadow-sm transition"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          URI Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Copy URI
                        </>
                      )}
                    </button>

                    {webLink && (
                      <button
                        onClick={handleCopyWebLink}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-[#0B1220] shadow-sm transition"
                      >
                        {copiedWebLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Link Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            Copy Payment Link
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#EEF2F7] hover:bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standby Card when no QR generated yet */
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[320px]">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F7FB] border border-[#E2E8F0] flex items-center justify-center text-[#1D4ED8] mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-[#0B1220] mb-1">
                Payment Terminal Standby
              </h4>
              <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">
                Enter an amount and select your token to generate a live, standards-compliant on-chain payment QR code.
              </p>
            </div>
          )}

          {/* Live Transaction Status Tracker */}
          {sessionId && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#0B1220]">
                  Transaction Status
                </h4>
                {/* Status Badge */}
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
                                ? 'bg-[#1D4ED8] text-white ring-4 ring-blue-100'
                                : 'bg-[#059669] text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isActive && !isCurrent ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`mt-1.5 text-[10px] font-semibold text-center ${
                            isActive ? 'text-[#0B1220]' : 'text-slate-400'
                          }`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                      {idx < STATUS_ORDER.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-1.5 transition-colors duration-300 ${
                            idx < activeStep ? 'bg-[#059669]' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Transaction Hash */}
              {session?.tx_hash && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Transaction Hash
                    </p>
                    <p className="text-xs font-mono text-slate-700 truncate max-w-[200px] sm:max-w-xs">
                      {session.tx_hash}
                    </p>
                  </div>
                  <a
                    href={`https://polygonscan.com/tx/${session.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1D4ED8] hover:text-[#2563EB] transition"
                  >
                    Polygonscan <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
