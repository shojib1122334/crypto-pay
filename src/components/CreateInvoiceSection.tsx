import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Store,
  User,
  MapPin,
  Building2,
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
import { parseUnits, erc20Abi, type Address } from 'viem';
import { useConnectWallet } from '@/hooks/useConnectWallet';
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
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionUpgradeModal } from '@/components/SubscriptionUpgradeModal';
import type { NavTab } from '@/types/navigation';

interface CreateInvoiceSectionProps {
  onNavigateTab?: (tab: NavTab) => void;
}

const STORE_NAME_KEY = 'cryptopay_saved_store_name';

export const CreateInvoiceSection: React.FC<CreateInvoiceSectionProps> = ({ onNavigateTab }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { openWalletConnect } = useConnectWallet();
  const { activeReceiver } = useSavedReceivers();
  const {
    isActive: isSubscriptionActive,
    hasFreeRun,
    versePrice,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    consumeFreeRun,
    refresh: refreshSubscription,
  } = useSubscription();

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

  // Customer Name
  const [customerName, setCustomerName] = useState<string>('');

  // Customer Address (Optional)
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Customer Company Name
  const [customerCompanyName, setCustomerCompanyName] = useState<string>('');

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

  // Determine Effective Settlement Address
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
          const rec = result.record;
          setVerifiedRecord(rec);
          setCreatedInvoice((prev) => {
            if (!prev) return null;
            const updated: CryptoPayInvoiceData = {
              ...prev,
              status: 'Paid',
              txHash: targetHash,
              paidAt: rec.timestamp,
              verifiedBlock: rec.blockNumber,
            };
            saveInvoiceRecord(updated);
            return updated;
          });
          if (createdInvoice?.id) {
            markInvoiceAsPaid(createdInvoice.id, targetHash, rec.blockNumber);
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
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 0. Enforce Wallet Connection Requirement
    if (!isConnected || !connectedAddress) {
      setFormError('Please connect your Web3 wallet first to receive payments on this Credit Invoice.');
      return;
    }

    if (!productName.trim()) {
      setFormError('Please enter the Product Name.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    // Enforce Subscription & Free Run Lifecycle ONLY when validations pass
    if (!isSubscriptionActive) {
      if (!hasFreeRun) {
        setFormError(
          'Your 1 free trial invoice run has been used. Please upgrade your subscription to continue generating invoices.'
        );
        openUpgradeModal('1_month');
        return;
      }
      // Consume 1st free run in real-time
      consumeFreeRun();
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
      customerName: customerName.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerCompanyName: customerCompanyName.trim() || undefined,
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
    <div className="w-full sm:max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
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

      {/* Tagline Hero Banner */}
      <div className="w-full bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-3 sm:px-4 shadow-xs flex items-center justify-center text-center">
        <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-amber-500 leading-tight select-none">
          Create Invoices. Accept Crypto. Get Paid.
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full web3-glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 shadow-xl shadow-purple-500/5 space-y-5 sm:space-y-7 relative overflow-hidden">
        {/* Top gradient highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

        {/* Real Wallet Notice Banner */}
        {!isConnected && (
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Notice:</strong> Connect your wallet to automatically generate authentic settlement QR codes routing directly to your address.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openWalletConnect()}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold whitespace-nowrap transition cursor-pointer"
            >
              Connect Now
            </button>
          </div>
        )}

            {/* SECTION 1: INVOICE GENERATION FORM */}
            <form onSubmit={handleCreateInvoice} className="space-y-4 sm:space-y-6">
              
              {/* Store Name / Company Name */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#D6E0F5] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/30">
                      <Store className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-extrabold text-base text-[#101B5C]">
                      Store Name / Company Name
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
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                  >
                    {isEditingStore ? 'Save' : 'Edit'}
                  </button>
                </div>

                {isEditingStore ? (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      placeholder="Enter Store Name or Company Name"
                      className="flex-1 bg-white border border-[#D6E0F5] rounded-xl px-3 py-2 text-xs font-semibold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveStoreName}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[#F6F8FE] px-3.5 py-2.5 rounded-xl border border-[#D6E0F5] text-xs sm:text-sm font-bold text-[#101B5C]">
                    <span className="truncate">{storeName}</span>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-xs shadow-cyan-500/30">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Customer Name
                  </span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter Customer Name (e.g. John Doe, Alice)"
                  className="w-full bg-white border border-[#D6E0F5] rounded-xl px-4 py-3 text-sm font-semibold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-400/20 shadow-xs transition-all"
                />
              </div>

              {/* Customer Address (Optional) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/30">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Customer Address (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Enter Customer Address"
                  className="w-full bg-white border border-[#D6E0F5] rounded-xl px-4 py-3 text-sm font-semibold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-400/20 shadow-xs transition-all"
                />
              </div>

              {/* Customer Company Name */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center shadow-xs shadow-orange-500/30">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Customer Company Name
                  </span>
                </label>
                <input
                  type="text"
                  value={customerCompanyName}
                  onChange={(e) => setCustomerCompanyName(e.target.value)}
                  placeholder="Enter Company Name (e.g. Acme Ltd.)"
                  className="w-full bg-white border border-[#D6E0F5] rounded-xl px-4 py-3 text-sm font-semibold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-400/20 shadow-xs transition-all"
                />
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs shadow-pink-500/30">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Product Name
                  </span>
                  <span className="text-xs text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Wireless Headphones, Laptop, etc."
                  className="w-full bg-white border border-[#D6E0F5] rounded-xl px-4 py-3 text-sm font-semibold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-400/20 shadow-xs transition-all"
                />
              </div>

              {/* Product Image: Take Photo | Upload Image (Matches UI Screenshot) */}
              <div className="space-y-3">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center shadow-xs shadow-sky-500/30">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Product Image
                  </span>
                </label>

                {/* Stacked Full-Width Buttons matching screenshot */}
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Take Photo Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                        photoInputRef.current?.click();
                      } else {
                        startLiveCamera();
                      }
                    }}
                    className="w-full py-3.5 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#FAF8FF] hover:bg-purple-50/50 border-2 border-[#D1BBFC] hover:border-purple-400 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 sm:gap-3 shadow-xs group"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] group-hover:scale-110 transition-transform">
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-[#7C3AED] stroke-[2.2]" />
                    </div>
                    <span className="text-[#101B5C] font-extrabold text-sm sm:text-lg">
                      Take Photo
                    </span>
                  </button>

                  {/* Upload Image Card */}
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="w-full py-3.5 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#EFF6FE] hover:bg-blue-50/70 border-2 border-[#B4D8FB] hover:border-blue-400 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 sm:gap-3 shadow-xs group"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#2563EB] group-hover:scale-110 transition-transform">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563EB] stroke-[2.2]" />
                    </div>
                    <span className="text-[#101B5C] font-extrabold text-sm sm:text-lg">
                      Upload Image
                    </span>
                  </button>
                </div>

                {/* Product Image Preview */}
                {productImage && (
                  <div className="relative inline-block mt-2">
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-purple-500 bg-white shadow-md">
                      <img
                        src={productImage}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setProductImage(null)}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 🌐 Network: Polygon 137 | Ethereum 1 (Matches UI Screenshot) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white flex items-center justify-center shadow-xs shadow-cyan-500/30">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base text-[#101B5C]">
                    Network
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {/* Polygon 137 */}
                  <button
                    type="button"
                    onClick={() => setNetwork('Polygon')}
                    className={`py-3 sm:py-3.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-extrabold flex items-center justify-between transition cursor-pointer border-2 ${
                      network === 'Polygon'
                        ? 'bg-[#EEEDFD] border-[#8457F7] shadow-sm shadow-purple-500/15'
                        : 'bg-white border-[#D6E0F5] hover:border-purple-300 hover:bg-purple-50/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                      <TokenIcon token="POL" size={22} className="sm:w-6 sm:h-6" />
                      <span className={network === 'Polygon' ? 'text-[#101B5C] font-extrabold' : 'text-slate-700 font-bold'}>
                        Polygon
                      </span>
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-mono font-bold ${
                        network === 'Polygon'
                          ? 'bg-[#E6DFFD] text-[#8457F7] border border-[#D5C8FA]'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      137
                    </span>
                  </button>

                  {/* Ethereum 1 */}
                  <button
                    type="button"
                    onClick={() => setNetwork('Ethereum')}
                    className={`py-3 sm:py-3.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-extrabold flex items-center justify-between transition cursor-pointer border-2 ${
                      network === 'Ethereum'
                        ? 'bg-[#EFF6FE] border-[#3B82F6] shadow-sm shadow-blue-500/15'
                        : 'bg-white border-[#D6E0F5] hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                      <TokenIcon token="ETH" size={22} className="sm:w-6 sm:h-6" />
                      <span className={network === 'Ethereum' ? 'text-[#101B5C] font-extrabold' : 'text-slate-700 font-bold'}>
                        Ethereum
                      </span>
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-mono font-bold ${
                        network === 'Ethereum'
                          ? 'bg-[#E2EFFD] text-[#2563EB] border border-[#BFDBFE]'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      1
                    </span>
                  </button>
                </div>
              </div>

              {/* 💰 Payment Method: USDT | USDC | VERSE (Matches UI Screenshot) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-white flex items-center justify-center shadow-xs shadow-rose-500/30">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-extrabold text-base text-[#101B5C]">
                      Payment Method
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-extrabold text-white bg-[#4E3DF7] px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full shadow-xs">
                    Official Web3 Tokens
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                  {/* USDT */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('USDT')}
                    className={`py-3 sm:py-4 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-extrabold flex items-center justify-center gap-1 sm:gap-2.5 transition cursor-pointer border-2 ${
                      paymentMethod === 'USDT'
                        ? 'bg-[#EAF9F4] border-[#10B981] shadow-sm shadow-emerald-500/15'
                        : 'bg-white border-[#D6E0F5] hover:border-emerald-300 hover:bg-emerald-50/20'
                    }`}
                  >
                    <TokenIcon token="USDT" size={22} className="sm:w-[26px] sm:h-[26px]" />
                    <span className={paymentMethod === 'USDT' ? 'text-[#101B5C] font-extrabold' : 'text-slate-700 font-bold'}>
                      USDT
                    </span>
                  </button>

                  {/* USDC */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('USDC')}
                    className={`py-3 sm:py-4 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-extrabold flex items-center justify-center gap-1 sm:gap-2.5 transition cursor-pointer border-2 ${
                      paymentMethod === 'USDC'
                        ? 'bg-[#EFF6FE] border-[#2563EB] shadow-sm shadow-blue-500/15'
                        : 'bg-white border-[#D6E0F5] hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                  >
                    <TokenIcon token="USDC" size={22} className="sm:w-[26px] sm:h-[26px]" />
                    <span className={paymentMethod === 'USDC' ? 'text-[#101B5C] font-extrabold' : 'text-slate-700 font-bold'}>
                      USDC
                    </span>
                  </button>

                  {/* VERSE */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('VERSE')}
                    className={`py-3 sm:py-4 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-extrabold flex items-center justify-center gap-1 sm:gap-2.5 transition cursor-pointer border-2 ${
                      paymentMethod === 'VERSE'
                        ? 'bg-[#FAF5FF] border-[#8B5CF6] shadow-sm shadow-purple-500/15'
                        : 'bg-white border-[#D6E0F5] hover:border-purple-300 hover:bg-purple-50/20'
                    }`}
                  >
                    <TokenIcon token="VERSE" size={22} className="sm:w-[26px] sm:h-[26px]" />
                    <span className={paymentMethod === 'VERSE' ? 'text-[#101B5C] font-extrabold' : 'text-slate-700 font-bold'}>
                      VERSE
                    </span>
                  </button>
                </div>
              </div>

              {/* 💵 Amount / Transaction */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/30">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-extrabold text-base text-[#101B5C]">
                      Transaction Amount
                    </span>
                    <span className="text-xs text-red-500 font-bold">*</span>
                  </span>
                  <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">{paymentMethod}</span>
                </div>
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
                    className="w-full bg-white border border-[#D6E0F5] rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 text-base sm:text-lg font-bold text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-400/20 pr-24 shadow-xs transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0F4FF] border border-[#D6E0F5] text-xs font-bold text-[#101B5C]">
                    <TokenIcon token={paymentMethod} size={16} />
                    <span>{paymentMethod}</span>
                  </div>
                </div>

                {/* Quick Amount Suggestion Chips */}
                <div className="flex items-center gap-1.5 sm:gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-[#5367A5] font-semibold">Quick:</span>
                  {['10.00', '25.00', '50.00', '100.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 border border-[#D6E0F5] hover:border-purple-300 text-xs text-[#5367A5] hover:text-[#101B5C] font-bold transition cursor-pointer shadow-2xs"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Error Notice */}
              {formError && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 🔵 Create Invoice Button (State & Wallet-Aware) */}
              {!isConnected ? (
                <button
                  type="button"
                  onClick={() => openWalletConnect()}
                  className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all cursor-pointer border border-white/20"
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.2]" />
                  <span className="text-white">Connect Wallet to Create Invoice</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all cursor-pointer border border-white/20"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="text-white">Create Credit Invoice</span>
                </button>
              )}
            </form>

            {/* SECTION 2: GENERATED CRYPTOPAY INVOICE CARD WITH "CLAIM" BUTTON */}
            {createdInvoice && (
              <div className="pt-6 sm:pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="w-full sm:max-w-md mx-auto web3-glass-card border-2 border-purple-400/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-2xl shadow-purple-500/10 space-y-4 sm:space-y-6 relative overflow-hidden">
                  
                  {/* Background ambient badge */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 blur-2xl pointer-events-none rounded-full" />

                  {/* Title / Header */}
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 text-xs font-bold mb-1 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Verified Web3 Credit Invoice</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      CryptoPay Invoice
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      Invoice #{createdInvoice.id}
                    </p>
                  </div>

                  {/* Optional Product Image Preview */}
                  {createdInvoice.productImage && (
                    <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img
                        src={createdInvoice.productImage}
                        alt={createdInvoice.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Invoice Key Details */}
                  <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-3 sm:space-y-3.5 text-xs sm:text-sm">
                    
                    {/* Store: Store name / Company name */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                      <span className="text-slate-500 font-medium">Store / Company:</span>
                      <span className="text-slate-900 font-bold text-right truncate max-w-[180px] sm:max-w-[200px]">
                        {createdInvoice.storeName}
                      </span>
                    </div>

                    {/* Customer: Customer name (if provided) */}
                    {createdInvoice.customerName && (
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                        <span className="text-slate-500 font-medium">Customer:</span>
                        <span className="text-slate-900 font-bold text-right truncate max-w-[180px] sm:max-w-[200px]">
                          {createdInvoice.customerName}
                        </span>
                      </div>
                    )}

                    {/* Customer Address: Only if provided */}
                    {createdInvoice.customerAddress && (
                      <div className="flex items-start justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                        <span className="text-slate-500 font-medium">Customer Address:</span>
                        <span className="text-slate-900 font-bold text-right whitespace-pre-line max-w-[180px] sm:max-w-[200px] text-[11px] sm:text-xs">
                          {createdInvoice.customerAddress}
                        </span>
                      </div>
                    )}

                    {/* Customer Company Name: Only if provided */}
                    {createdInvoice.customerCompanyName && (
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                        <span className="text-slate-500 font-medium">Customer Company:</span>
                        <span className="text-slate-900 font-bold text-right truncate max-w-[180px] sm:max-w-[200px]">
                          {createdInvoice.customerCompanyName}
                        </span>
                      </div>
                    )}

                    {/* Item: Item name */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                      <span className="text-slate-500 font-medium">Item:</span>
                      <span className="text-slate-900 font-bold text-right truncate max-w-[180px] sm:max-w-[200px]">
                        {createdInvoice.productName}
                      </span>
                    </div>

                    {/* Amount: Amount value + Official Token Logo */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                      <span className="text-slate-500 font-medium">Amount:</span>
                      <div className="flex items-center gap-1.5 text-right font-black text-emerald-700 text-sm sm:text-base">
                        <TokenIcon token={createdInvoice.paymentMethod} size={18} />
                        <span>{createdInvoice.amount}</span>
                        <span>{createdInvoice.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Network: Polygon / Ethereum with Official Network Logo */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                      <span className="text-slate-500 font-medium">Network:</span>
                      <span className="text-slate-900 font-semibold flex items-center gap-1.5">
                        <TokenIcon
                          token={createdInvoice.network === 'Polygon' ? 'POL' : 'ETH'}
                          size={16}
                        />
                        <span>{createdInvoice.network}</span>
                      </span>
                    </div>

                    {/* Settlement Wallet */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-2.5">
                      <span className="text-slate-500 font-medium">Receiver:</span>
                      <span className="font-mono text-xs text-slate-800 font-semibold truncate max-w-[150px] sm:max-w-[170px]" title={createdInvoice.receiverAddress}>
                        {createdInvoice.receiverAddress.slice(0, 6)}...{createdInvoice.receiverAddress.slice(-4)}
                      </span>
                    </div>

                    {/* Status: Pending */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                        createdInvoice.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border border-amber-300'
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
                    className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all cursor-pointer border border-white/20"
                  >
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span className="text-white">Claim Invoice</span>
                    <ArrowRight className="w-4 h-4 text-white stroke-[2.5]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6 relative max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-slate-900">Scan to Claim & Pay</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                      Live Web3
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {createdInvoice.storeName}
                    {createdInvoice.customerName ? ` • ${createdInvoice.customerName}` : ''} • {createdInvoice.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Authentic Web3 Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 text-center space-y-1">
              <p className="font-semibold">
                The customer scans the QR code to make the payment using the specified network ({createdInvoice.network}) and token ({createdInvoice.paymentMethod}).
              </p>
              <p className="text-[11px] text-blue-700">
                Payment routes directly to the merchant connected address with zero intermediary custody.
              </p>
            </div>

            {/* QR Code Container with High Quality Error Correction */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner mx-auto w-fit">
              <QRCodeSVG
                id="cryptopay-invoice-qr"
                value={paymentQRUri}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Payment Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              
              {/* Total Due */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total Due:</span>
                <div className="flex items-center gap-1.5 text-sm font-black text-emerald-700">
                  <TokenIcon token={createdInvoice.paymentMethod} size={18} />
                  <span>{createdInvoice.amount} {createdInvoice.paymentMethod}</span>
                </div>
              </div>

              {/* Network */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Network:</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <TokenIcon
                    token={createdInvoice.network === 'Polygon' ? 'POL' : 'ETH'}
                    size={16}
                  />
                  <span>{createdInvoice.network} (Chain ID: {createdInvoice.networkChainId})</span>
                </div>
              </div>

              {/* Settlement Receiver */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Receiver Wallet:</span>
                <div className="flex items-center gap-1.5 font-mono text-slate-800">
                  <span title={createdInvoice.receiverAddress}>
                    {createdInvoice.receiverAddress.slice(0, 6)}...{createdInvoice.receiverAddress.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-1 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedAddress ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Smart Contract Info */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-medium">Contract:</span>
                <a
                  href={
                    createdInvoice.network === 'Polygon'
                      ? `https://polygonscan.com/token/${createdInvoice.tokenContractAddress}`
                      : `https://etherscan.io/token/${createdInvoice.tokenContractAddress}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>{createdInvoice.tokenContractAddress.slice(0, 6)}...{createdInvoice.tokenContractAddress.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 🔍 VERIFY TRANSACTION HASH SECTION */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verify Transaction Hash
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Synced with Activity
                </span>
              </div>

              {/* If already verified */}
              {createdInvoice.status === 'Paid' || verifiedRecord ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>Transaction Verified & Settled on {createdInvoice.network}!</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    This transaction is recorded on-chain and permanently visible under the <strong className="text-slate-900">Activity</strong> section.
                  </p>
                  
                  {verifiedRecord && (
                    <div className="bg-white rounded-lg p-2 font-mono text-[11px] text-slate-600 border border-slate-200 flex items-center justify-between">
                      <span>Tx: {verifiedRecord.txHash.slice(0, 8)}...{verifiedRecord.txHash.slice(-6)}</span>
                      <a
                        href={`https://polygonscan.com/tx/${verifiedRecord.txHash}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-700 hover:underline flex items-center gap-1"
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
                        className="flex-1 py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>View in Activity</span>
                      </button>
                    )}
                    {verifiedRecord && (
                      <button
                        type="button"
                        onClick={() => generatePaymentReceiptPdf(verifiedRecord)}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 transition pr-20"
                    />
                    {verifyTxHashInput && (
                      <button
                        type="button"
                        onClick={() => setVerifyTxHashInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-900 px-1.5 py-0.5 rounded bg-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Verify Transaction Hash Button */}
                  <button
                    type="submit"
                    disabled={isVerifyingTx || !verifyTxHashInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
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

                  {/* Connected Wallet Direct Broadcast */}
                  {isConnected && (
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={handleDirectWeb3Pay}
                        disabled={isTxPending || isTxConfirming}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
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
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {txError && (
                    <p className="text-[11px] text-rose-600 text-center">
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
                className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Download Credit Invoice (PDF)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyUri}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedUri ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
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
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
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
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <span>Take Product Photo</span>
              </h3>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs space-y-3">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    uploadInputRef.current?.click();
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
                >
                  Upload File Instead
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200">
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Upgrade Modal */}
      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        versePrice={versePrice}
        onSuccess={() => {
          refreshSubscription();
        }}
      />
    </div>
  );
};
