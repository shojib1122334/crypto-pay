import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Store,
  Package,
  Camera,
  Upload,
  Globe,
  Coins,
  DollarSign,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  Check,
  Download,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Wallet,
  ArrowRight,
  Send,
  Loader2,
  FileText,
  History,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, erc20Abi, type Address } from 'viem';
import { POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID, TOKENS } from '@/lib/tokens';
import { buildPaymentQRUri } from '@/lib/payments';
import { useSavedReceivers } from '@/context/useSavedReceivers';
import { TokenIcon } from '@/components/TokenIcon';
import {
  verifyOnChainPayment,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';
import {
  saveInvoiceRecord,
  markInvoiceAsPaid,
  generateInvoicePdf,
  type CryptoPayInvoiceData,
} from '@/lib/invoices';
import type { NavTab } from '@/types/navigation';

interface CreateInvoiceSectionProps {
  onNavigateTab?: (tab: NavTab) => void;
}

const STORE_NAME_KEY = 'cryptopay_saved_store_name';

export const CreateInvoiceSection: React.FC<CreateInvoiceSectionProps> = ({ onNavigateTab }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { activeReceiver } = useSavedReceivers();

  // 1. Store Name (Saved during initial setup / editable)
  const [storeName, setStoreName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORE_NAME_KEY);
      if (saved && saved.trim()) return saved;
    } catch {
      // Ignore read error
    }
    return 'CryptoPay Official Store';
  });

  const [isEditingStore, setIsEditingStore] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState(storeName);

  // 2. Product Name
  const [productName, setProductName] = useState<string>('');

  // 3. Product Image
  const [productImage, setProductImage] = useState<string | null>(null);

  // 4. Network: Polygon | Ethereum
  const [network, setNetwork] = useState<'Polygon' | 'Ethereum'>('Polygon');

  // 5. Payment Method: USDT | USDC | VERSE
  const [paymentMethod, setPaymentMethod] = useState<'USDT' | 'USDC' | 'VERSE'>('USDT');

  // 6. Amount
  const [amount, setAmount] = useState<string>('');

  // Form Validation & Errors
  const [formError, setFormError] = useState<string | null>(null);

  // Generated Invoice
  const [createdInvoice, setCreatedInvoice] = useState<CryptoPayInvoiceData | null>(null);

  // Claim & Pay QR Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Transaction Hash Verification State
  const [verifyTxHashInput, setVerifyTxHashInput] = useState('');
  const [isVerifyingTx, setIsVerifyingTx] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedRecord, setVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // Direct On-Chain Web3 Execution (Optional direct wallet write from browser)
  const {
    data: txHash,
    isPending: isTxPending,
    writeContract,
    error: txError,
  } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // File Inputs references
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Camera Live Modal State
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Auto-save Store Name changes
  const handleSaveStoreName = () => {
    const trimmed = storeNameInput.trim() || 'CryptoPay Official Store';
    setStoreName(trimmed);
    try {
      localStorage.setItem(STORE_NAME_KEY, trimmed);
    } catch {
      // Ignore
    }
    setIsEditingStore(false);
  };

  // Determine Effective Settlement Address (Prioritize the real connected wallet)
  const effectiveReceiverAddress =
    connectedAddress ||
    activeReceiver?.address ||
    '0x0000000000000000000000000000000000000000';

  // Handle Image File Conversion
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProductImage(result);
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  // Start Live Camera
  const startLiveCamera = async () => {
    setCameraError(null);
    setIsLiveCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera directly. Please use photo file upload.');
    }
  };

  // Stop Live Camera
  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveCameraOpen(false);
    setCameraError(null);
  };

  // Capture Live Photo from Camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setProductImage(dataUrl);
      stopLiveCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Verify Transaction Hash on-chain and record to Activity ledger
  const handleVerifyTransactionHash = useCallback(
    async (hashToVerify?: string) => {
      const targetHash = (hashToVerify || verifyTxHashInput).trim();
      if (!targetHash) {
        setVerificationError('Please enter a valid 66-character transaction hash starting with 0x.');
        return;
      }

      setIsVerifyingTx(true);
      setVerificationError(null);

      try {
        const result = await verifyOnChainPayment(targetHash, {
          expectedMerchant: createdInvoice?.receiverAddress,
          expectedAmount: createdInvoice?.amount,
          expectedToken: createdInvoice?.paymentMethod.toLowerCase(),
          expectedChainId: createdInvoice?.networkChainId,
          sessionId: createdInvoice?.id,
        });

        setIsVerifyingTx(false);

        if (result.success && result.record) {
          setVerifiedRecord(result.record);
          setCreatedInvoice((prev) => {
            if (!prev) return null;
            const updated: CryptoPayInvoiceData = {
              ...prev,
              status: 'Paid',
              txHash: targetHash,
              paidAt: result.record.timestamp,
              verifiedBlock: result.record.blockNumber,
            };
            saveInvoiceRecord(updated);
            return updated;
          });
          if (createdInvoice?.id) {
            markInvoiceAsPaid(createdInvoice.id, targetHash, result.record.blockNumber);
          }
          setVerifyTxHashInput(targetHash);
        } else {
          setVerificationError(
            result.error || 'Failed to verify transaction hash on-chain. Please verify the hash and network.'
          );
        }
      } catch (err) {
        setIsVerifyingTx(false);
        const msg = err instanceof Error ? err.message : 'Verification failed';
        setVerificationError(msg);
      }
    },
    [verifyTxHashInput, createdInvoice]
  );

  // Update status when transaction confirms and auto-verify
  useEffect(() => {
    if (isTxSuccess && txHash && createdInvoice) {
      setVerifyTxHashInput(txHash);
      handleVerifyTransactionHash(txHash);
    }
  }, [isTxSuccess, txHash, createdInvoice, handleVerifyTransactionHash]);

  // Execute Direct On-Chain Payment
  const handleDirectWeb3Pay = () => {
    if (!createdInvoice) return;
    try {
      const parsedAmount = parseUnits(createdInvoice.amount, createdInvoice.tokenDecimals);
      writeContract({
        address: createdInvoice.tokenContractAddress as Address,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [createdInvoice.receiverAddress as Address, parsedAmount],
      });
    } catch (err) {
      console.error('Direct payment error:', err);
    }
  };

  // Handle Form Submission: Create Credit Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!productName.trim()) {
      setFormError('Please enter the Product Name.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    const chainId = network === 'Polygon' ? POLYGON_CHAIN_ID : ETHEREUM_CHAIN_ID;
    const tokenKey =
      network === 'Polygon'
        ? paymentMethod.toLowerCase()
        : `${paymentMethod.toLowerCase()}-eth`;

    const tokenConfig = TOKENS[tokenKey] || TOKENS.usdt;

    const newInvoice: CryptoPayInvoiceData = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      storeName: storeName.trim() || 'CryptoPay Official Store',
      productName: productName.trim(),
      productImage,
      network,
      networkChainId: chainId,
      paymentMethod,
      amount: numAmount.toFixed(2),
      status: 'Pending',
      receiverAddress: effectiveReceiverAddress,
      tokenContractAddress: tokenConfig.address,
      tokenDecimals: tokenConfig.decimals,
      createdAt: Date.now(),
    };

    saveInvoiceRecord(newInvoice);
    setCreatedInvoice(newInvoice);
  };

  // Calculate EIP-681 Payment URI for QR Code
  const paymentQRUri = React.useMemo(() => {
    if (!createdInvoice) return '';

    const tokenKey =
      createdInvoice.network === 'Polygon'
        ? createdInvoice.paymentMethod.toLowerCase()
        : `${createdInvoice.paymentMethod.toLowerCase()}-eth`;

    const tokenConfig = TOKENS[tokenKey] || TOKENS.usdt;

    return buildPaymentQRUri(
      createdInvoice.receiverAddress,
      createdInvoice.amount,
      tokenConfig,
      createdInvoice.networkChainId,
      tokenConfig.decimals
    );
  }, [createdInvoice]);

  // Copy Helpers
  const handleCopyAddress = () => {
    if (createdInvoice?.receiverAddress) {
      navigator.clipboard.writeText(createdInvoice.receiverAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyUri = () => {
    if (paymentQRUri) {
      navigator.clipboard.writeText(paymentQRUri);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    }
  };

  // Download QR Code PNG
  const handleDownloadQR = () => {
    const svg = document.getElementById('cryptopay-invoice-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const a = document.createElement('a');
        a.download = `CryptoPay-Credit-Invoice-${createdInvoice?.id || 'QR'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={uploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
        }}
      />

      {/* Main Container */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Credit Invoice
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Generate authentic Web3 credit payment invoices settled directly to your connected wallet.
            </p>
          </div>

          {/* Connected Wallet / Settlement Receiver Indicator */}
          <div className="flex items-center gap-2.5">
            {isConnected && connectedAddress ? (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-[#00E676]/30 px-3.5 py-2 rounded-2xl text-xs">
                <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                <span className="text-zinc-400">Connected Wallet:</span>
                <span className="font-mono font-semibold text-[#00E676]">
                  {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            )}
          </div>
        </div>

        {/* Real Wallet Notice Banner */}
        {!isConnected && (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Notice:</strong> Connect your wallet to automatically generate authentic settlement QR codes routing directly to your address.
              </span>
            </div>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold whitespace-nowrap transition cursor-pointer"
                >
                  Connect Now
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        )}

        {/* SECTION 1: INVOICE GENERATION FORM */}
        <form onSubmit={handleCreateInvoice} className="space-y-6">
          
          {/* 🏪 Store Name — Saved during initial setup */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-[#3B82F6]" />
                <span>🏪 Store Name</span>
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                  Saved during initial setup
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isEditingStore) {
                    handleSaveStoreName();
                  } else {
                    setStoreNameInput(storeName);
                    setIsEditingStore(true);
                  }
                }}
                className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
              >
                {isEditingStore ? 'Save Name' : 'Edit Store'}
              </button>
            </div>

            {isEditingStore ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  placeholder="Enter Store Name"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveStoreName}
                  className="px-4 py-2 bg-[#3B82F6] text-white text-xs font-bold rounded-xl hover:bg-blue-600 cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 text-sm font-semibold text-white">
                <span className="truncate">{storeName}</span>
                <span className="text-xs text-[#00E676] font-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Setup
                </span>
              </div>
            )}
          </div>

          {/* 📦 Product Name */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-[#00E676]" />
              <span>📦 Product Name</span>
              <span className="text-xs text-red-400">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. VIP Subscription, Hardware Wallet, Coffee"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>

          {/* 📷 Product Image: Take Photo | Upload Image */}
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>📷 Product Image</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Take Photo Button */}
              <button
                type="button"
                onClick={() => {
                  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                    photoInputRef.current?.click();
                  } else {
                    startLiveCamera();
                  }
                }}
                className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/40 text-sm font-semibold text-white transition active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-4 h-4 text-purple-400" />
                <span>Take Photo</span>
              </button>

              {/* Upload Image Button */}
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#3B82F6]/40 text-sm font-semibold text-white transition active:scale-[0.98] cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#3B82F6]" />
                <span>Upload Image</span>
              </button>
            </div>

            {/* Product Image Preview */}
            {productImage && (
              <div className="relative inline-block mt-2">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-[#3B82F6]/50 bg-zinc-900 shadow-lg">
                  <img
                    src={productImage}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setProductImage(null)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-red-400 hover:text-red-300 hover:bg-black transition cursor-pointer"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🌐 Network: Polygon | Ethereum (Official Network Logos) */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#3B82F6]" />
              <span>🌐 Network</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Polygon */}
              <button
                type="button"
                onClick={() => setNetwork('Polygon')}
                className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition cursor-pointer ${
                  network === 'Polygon'
                    ? 'bg-[#8247E5]/20 text-[#8247E5] border-2 border-[#8247E5] shadow-[0_0_14px_rgba(130,71,229,0.35)]'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white'
                }`}
              >
                <TokenIcon token="POL" size={22} />
                <span>Polygon</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">137</span>
              </button>

              {/* Ethereum */}
              <button
                type="button"
                onClick={() => setNetwork('Ethereum')}
                className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition cursor-pointer ${
                  network === 'Ethereum'
                    ? 'bg-[#627EEA]/20 text-[#627EEA] border-2 border-[#627EEA] shadow-[0_0_14px_rgba(98,126,234,0.35)]'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white'
                }`}
              >
                <TokenIcon token="ETH" size={22} />
                <span>Ethereum</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">1</span>
              </button>
            </div>
          </div>

          {/* 💰 Payment Method: USDT | USDC | VERSE (Official Token Logos) */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FACC15]" />
                <span>💰 Payment Method</span>
              </span>
              <span className="text-[11px] text-zinc-400">Official Web3 Tokens</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['USDT', 'USDC', 'VERSE'] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-2.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#00E676]/20 text-[#00E676] border-2 border-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.3)]'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white'
                    }`}
                  >
                    <TokenIcon token={method} size={24} />
                    <span>{method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 💵 Amount */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#00E676]" />
                <span>💵 Amount</span>
                <span className="text-xs text-red-400">*</span>
              </span>
              <span className="text-xs text-zinc-400 font-semibold">{paymentMethod}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., 25.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-base sm:text-lg font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-xs font-bold text-white">
                <TokenIcon token={paymentMethod} size={16} />
                <span>{paymentMethod}</span>
              </div>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-400">Quick:</span>
              {['10.00', '25.00', '50.00', '100.00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-medium transition cursor-pointer"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Form Error Notice */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 🔵 Create Invoice Button */}
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>🔵 Create Credit Invoice</span>
          </button>
        </form>

        {/* SECTION 2: GENERATED CRYPTOPAY INVOICE CARD WITH "CLAIM" BUTTON */}
        {createdInvoice && (
          <div className="pt-8 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-md mx-auto bg-zinc-900 border-2 border-[#3B82F6]/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
              
              {/* Background ambient badge */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/10 blur-3xl pointer-events-none rounded-full" />

              {/* Title / Header */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] text-xs font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Web3 Credit Invoice</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  CryptoPay Invoice
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  Invoice #{createdInvoice.id}
                </p>
              </div>

              {/* Optional Product Image Preview */}
              {createdInvoice.productImage && (
                <div className="w-full h-40 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                  <img
                    src={createdInvoice.productImage}
                    alt={createdInvoice.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Invoice Key Details */}
              <div className="bg-zinc-950 rounded-2xl p-4 sm:p-5 border border-zinc-800 space-y-3.5 text-sm">
                
                {/* Store: Store name */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-zinc-400 font-medium">Store:</span>
                  <span className="text-white font-bold text-right truncate max-w-[200px]">
                    {createdInvoice.storeName}
                  </span>
                </div>

                {/* Item: Item name */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-zinc-400 font-medium">Item:</span>
                  <span className="text-white font-bold text-right truncate max-w-[200px]">
                    {createdInvoice.productName}
                  </span>
                </div>

                {/* Amount: Amount value + Official Token Logo */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-zinc-400 font-medium">Amount:</span>
                  <div className="flex items-center gap-1.5 text-right font-extrabold text-[#00E676] text-base">
                    <TokenIcon token={createdInvoice.paymentMethod} size={18} />
                    <span>{createdInvoice.amount}</span>
                    <span>{createdInvoice.paymentMethod}</span>
                  </div>
                </div>

                {/* Network: Polygon / Ethereum with Official Network Logo */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-zinc-400 font-medium">Network:</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <TokenIcon
                      token={createdInvoice.network === 'Polygon' ? 'POL' : 'ETH'}
                      size={16}
                    />
                    <span>{createdInvoice.network}</span>
                  </span>
                </div>

                {/* Settlement Wallet */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-zinc-400 font-medium">Receiver:</span>
                  <span className="font-mono text-xs text-zinc-300 font-semibold truncate max-w-[170px]" title={createdInvoice.receiverAddress}>
                    {createdInvoice.receiverAddress.slice(0, 6)}...{createdInvoice.receiverAddress.slice(-4)}
                  </span>
                </div>

                {/* Status: Pending */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                    createdInvoice.status === 'Paid'
                      ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{createdInvoice.status}</span>
                  </span>
                </div>
              </div>

              {/* 🔥 CLAIM BUTTON — Generates and Reveals Authentic QR Code */}
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="w-full py-4 px-6 rounded-2xl bg-[#00E676] hover:bg-[#00c864] active:scale-[0.99] text-zinc-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-zinc-950" />
                <span>Claim</span>
                <ArrowRight className="w-4 h-4 text-zinc-950" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. CLAIM QR CODE SETTLEMENT MODAL                                         */}
      {/* Generated based on the wallet connected to the site. Everything operates */}
      {/* genuinely on-chain.                                                      */}
      {/* ========================================================================= */}
      {isClaimModalOpen && createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center text-[#00E676]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-white">Scan to Claim & Pay</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
                      Live Web3
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {createdInvoice.storeName} • {createdInvoice.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Authentic Web3 Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-[#3B82F6]/30 text-xs text-blue-200 text-center space-y-1">
              <p className="font-semibold">
                The customer scans the QR code to make the payment using the specified network ({createdInvoice.network}) and token ({createdInvoice.paymentMethod}).
              </p>
              <p className="text-[11px] text-blue-300/80">
                Payment routes directly to the merchant connected address with zero intermediary custody.
              </p>
            </div>

            {/* QR Code Container with High Quality Error Correction */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner mx-auto w-fit">
              <QRCodeSVG
                id="cryptopay-invoice-qr"
                value={paymentQRUri}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Payment Summary Box */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-2.5 text-xs">
              
              {/* Total Due */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Total Due:</span>
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#00E676]">
                  <TokenIcon token={createdInvoice.paymentMethod} size={18} />
                  <span>{createdInvoice.amount} {createdInvoice.paymentMethod}</span>
                </div>
              </div>

              {/* Network */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Network:</span>
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <TokenIcon
                    token={createdInvoice.network === 'Polygon' ? 'POL' : 'ETH'}
                    size={16}
                  />
                  <span>{createdInvoice.network} (Chain ID: {createdInvoice.networkChainId})</span>
                </div>
              </div>

              {/* Settlement Receiver */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Receiver Wallet:</span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                  <span title={createdInvoice.receiverAddress}>
                    {createdInvoice.receiverAddress.slice(0, 6)}...{createdInvoice.receiverAddress.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedAddress ? (
                      <Check className="w-3.5 h-3.5 text-[#00E676]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Smart Contract Info */}
              <div className="flex justify-between items-center pt-1 border-t border-zinc-800 text-[11px]">
                <span className="text-zinc-500 font-medium">Contract:</span>
                <a
                  href={
                    createdInvoice.network === 'Polygon'
                      ? `https://polygonscan.com/token/${createdInvoice.tokenContractAddress}`
                      : `https://etherscan.io/token/${createdInvoice.tokenContractAddress}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>{createdInvoice.tokenContractAddress.slice(0, 6)}...{createdInvoice.tokenContractAddress.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 🔍 VERIFY TRANSACTION HASH SECTION (Authentic On-Chain Settlement Verification & Activity Sync) */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Verify Transaction Hash
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Synced with Activity
                </span>
              </div>

              {/* If already verified */}
              {createdInvoice.status === 'Paid' || verifiedRecord ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-[#00E676]/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#00E676] text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Transaction Verified & Settled on {createdInvoice.network}!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    This transaction is recorded on-chain and permanently visible under the <strong className="text-white">Activity</strong> section.
                  </p>
                  
                  {verifiedRecord && (
                    <div className="bg-black/40 rounded-lg p-2 font-mono text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Tx: {verifiedRecord.txHash.slice(0, 8)}...{verifiedRecord.txHash.slice(-6)}</span>
                      <a
                        href={verifiedRecord.explorerUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsClaimModalOpen(false);
                          onNavigateTab('activity');
                        }}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>View in Activity</span>
                      </button>
                    )}
                    {verifiedRecord && (
                      <button
                        type="button"
                        onClick={() => generatePaymentReceiptPdf(verifiedRecord)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#00E676] hover:bg-[#00c864] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyTransactionHash();
                  }}
                  className="space-y-2.5"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste transaction hash (0x...)"
                      value={verifyTxHashInput}
                      onChange={(e) => {
                        setVerifyTxHashInput(e.target.value);
                        setVerificationError(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-mono text-white placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-[#3B82F6] transition pr-20"
                    />
                    {verifyTxHashInput && (
                      <button
                        type="button"
                        onClick={() => setVerifyTxHashInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Verify Transaction Hash Button */}
                  <button
                    type="submit"
                    disabled={isVerifyingTx || !verifyTxHashInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
                  >
                    {isVerifyingTx ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying On Blockchain...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-white" />
                        <span>Verify Transaction Hash</span>
                      </>
                    )}
                  </button>

                  {/* Connected Wallet Direct Broadcast (Optional helper that populates txHash for verification) */}
                  {isConnected && (
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={handleDirectWeb3Pay}
                        disabled={isTxPending || isTxConfirming}
                        className="text-[11px] text-zinc-400 hover:text-white underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {isTxPending || isTxConfirming ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Broadcasting from connected wallet...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Broadcast directly via connected wallet</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {verificationError && (
                    <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {txError && (
                    <p className="text-[11px] text-red-400 text-center">
                      {txError.message ? txError.message.slice(0, 90) : 'Transaction rejected or failed'}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Actions: Download Invoice PDF, Copy URI, Download QR */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => generateInvoicePdf(createdInvoice)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Download Credit Invoice (PDF)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyUri}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedUri ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      <span>URI Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Web3 URI</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR Image</span>
                </button>
              </div>
            </div>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIVE CAMERA MODAL (For desktop / web camera capture)                   */}
      {/* ========================================================================= */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span>Take Product Photo</span>
              </h3>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs space-y-3">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    uploadInputRef.current?.click();
                  }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold"
                >
                  Upload File Instead
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {!cameraError && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={stopLiveCamera}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
