import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, Check, Wallet, Loader2, ChevronDown } from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  buildPaymentLink,
  createPaymentSession,
  subscribeToPaymentSession,
  STATUS_LABELS,
  STATUS_ORDER,
  type PaymentLinkParams,
} from '@/lib/payments';
import { TOKEN_LIST, type TokenSymbol } from '@/lib/tokens';
import type { PaymentSession, PaymentStatus } from '@/lib/supabase';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirming: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const STEP_INDEX: Record<PaymentStatus, number> = {
  pending: 0,
  confirming: 1,
  success: 2,
  failed: 1,
};

export default function MerchantDashboard() {
  const { address, isConnecting } = useAccount();
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('usdt');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrParams, setQrParams] = useState<PaymentLinkParams | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError('Connect your wallet first to set the merchant address.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setGenerating(true);
    setQrLink(null);
    setQrParams(null);
    setSession(null);

    const newSession = await createPaymentSession(address, parsed, selectedToken);
    if (!newSession) {
      setError('Could not create a payment session. Please try again.');
      setGenerating(false);
      return;
    }

    const baseUrl = window.location.origin;
    const link = buildPaymentLink(baseUrl, newSession.id, address, amount, selectedToken);
    setSessionId(newSession.id);
    setQrLink(link);
    setQrParams({
      sessionId: newSession.id,
      merchantAddress: address,
      amount,
      token: selectedToken,
    });
    setSession(newSession);
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!qrLink) return;
    navigator.clipboard.writeText(qrLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    a.download = 'cryptopay-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentStatus: PaymentStatus = session?.status ?? 'pending';
  const activeStep = STEP_INDEX[currentStatus];
  const currentTokenLabel = TOKEN_LIST.find((t) => t.symbol === selectedToken)?.label ?? 'USDT';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 mb-4 shadow-lg shadow-slate-900/20">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Merchant Dashboard
        </h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          Create a stablecoin payment request and track it in real time.
        </p>
      </div>

      {/* Merchant address card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Your merchant wallet
            </p>
            <p className="text-sm font-mono text-slate-700 truncate">
              {address ?? 'Wallet not connected'}
            </p>
          </div>
        </div>
      </div>

      {/* Amount input + token selector */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5 sm:p-6 mb-6">
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Payment amount
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="10.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-20 text-lg font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
              {currentTokenLabel}
            </span>
          </div>

          {/* Token dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {currentTokenLabel.slice(0, 1)}
                </span>
                {currentTokenLabel}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 left-0 sm:left-auto sm:w-40 mt-1 bg-white rounded-xl shadow-lg ring-1 ring-slate-200/80 overflow-hidden z-20">
                {TOKEN_LIST.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token.symbol);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                      selectedToken === token.symbol
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {token.label.slice(0, 1)}
                    </span>
                    {token.label}
                    {selectedToken === token.symbol && (
                      <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || isConnecting}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold text-sm shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate QR'
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* QR code result */}
      {qrLink && qrParams && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5 sm:p-6 mb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                {TOKEN_LIST.find((t) => t.symbol === qrParams.token)?.label} on{' '}
                {TOKEN_LIST.find((t) => t.symbol === qrParams.token)?.networkName ?? 'Sepolia'}
              </span>
            </div>
            <div
              ref={qrRef}
              className="p-4 bg-white rounded-2xl border-2 border-slate-100"
            >
              <QRCodeSVG
                value={qrLink}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center max-w-xs break-all font-mono">
              {qrLink}
            </p>
            <div className="flex gap-3 mt-4 w-full max-w-xs">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy link
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Live transaction status tracker */}
      {sessionId && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Transaction status
          </h3>

          {/* Stepper */}
          <div className="flex items-center mb-6">
            {STATUS_ORDER.map((status, idx) => {
              const isActive = idx <= activeStep;
              const isCurrent = idx === activeStep;
              return (
                <div
                  key={status}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isActive
                          ? isCurrent
                            ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
                            : 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isActive && !isCurrent ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] sm:text-xs font-medium ${
                        isActive ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {idx < STATUS_ORDER.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-colors duration-300 ${
                        idx < activeStep ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Current state</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[currentStatus]}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentStatus === 'pending'
                    ? 'bg-amber-500 animate-pulse'
                    : currentStatus === 'confirming'
                      ? 'bg-blue-500 animate-pulse'
                      : currentStatus === 'success'
                        ? 'bg-emerald-500'
                        : 'bg-red-500'
                }`}
              />
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>

          {session?.tx_hash && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Transaction hash</p>
              <p className="text-xs font-mono text-slate-600 break-all">
                {session.tx_hash}
              </p>
            </div>
          )}
        </div>
      )}

      {!address && (
        <p className="text-center text-xs text-slate-400 mt-6">
          Connect your wallet to receive payments as a merchant.
        </p>
      )}
    </div>
  );
}
