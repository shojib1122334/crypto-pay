import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';
import { isAddress, parseUnits, type Address } from 'viem';
import {
  Wallet,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Send,
  QrCode,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  Share2,
  Download,
  HelpCircle,
  User,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import {
  SUPPORTED_PAY_TOKENS,
  POLYGON_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  ERC20_ABI,
  type MultiChainToken,
} from '@/lib/tokens';
import { TokenIcon } from '@/components/TokenIcon';
import { QRScannerModal, type ScannedQRData } from '@/components/QRScannerModal';
import {
  fetchAllUserBalances,
  fetchCryptoPrices,
  type TokenBalanceInfo,
} from '@/lib/rpcService';
import { buildPaymentQRUri } from '@/lib/payments';
import {
  verifyOnChainPayment,
  generatePaymentReceiptPdf,
  type VerifiedTransactionRecord,
} from '@/lib/transactionHistory';

type PayTabMode = 'send' | 'receive';

// Define the 4 primary tokens displayed in the 2x2 grid
const PRIMARY_GRID_TOKENS = [
  { id: 'usdt', symbol: 'USDT', name: 'Tether' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin' },
  { id: 'pol', symbol: 'POL', name: 'Polygon' },
  { id: 'verse', symbol: 'VERSE', name: 'Verse' },
];

export default function PaySystemTerminal() {
  const { address, isConnected, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  // Active Terminal Tab: Send Crypto | Receive / QR
  const [activeTab, setActiveTab] = useState<PayTabMode>('send');

  // Multi-chain and token states
  const [selectedChainId, setSelectedChainId] = useState<number>(POLYGON_CHAIN_ID);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('usdt');

  // Balances
  const [balances, setBalances] = useState<TokenBalanceInfo[]>([]);

  // Send Form State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('10.00');
  const [sendError, setSendError] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<'idle' | 'preparing' | 'awaiting_signature' | 'broadcasting' | 'success' | 'error'>('idle');
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastVerifiedRecord, setLastVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // Receive Form State - Starts completely empty
  const [receiveReceiverAddress, setReceiveReceiverAddress] = useState<string>('');
  const [receiveNetworkId, setReceiveNetworkId] = useState<number>(POLYGON_CHAIN_ID);
  const [receiveTokenId, setReceiveTokenId] = useState<string>('usdt');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);
  const [copiedReceiveAddress, setCopiedReceiveAddress] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);
  const [manualTxHash, setManualTxHash] = useState<string>('');
  const [isVerifyingTx, setIsVerifyingTx] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [receiveVerifiedRecord, setReceiveVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedSuccessToast, setScannedSuccessToast] = useState<string | null>(null);

  // QR Scan Callback
  const handleScannedQR = useCallback(
    (data: ScannedQRData) => {
      setRecipientAddress(data.address);
      setSendError(null);

      if (data.amount) {
        setSendAmount(data.amount);
      }

      if (
        data.chainId &&
        (data.chainId === POLYGON_CHAIN_ID || data.chainId === ETHEREUM_CHAIN_ID)
      ) {
        setSelectedChainId(data.chainId);
      }

      if (data.tokenSymbol) {
        const found = SUPPORTED_PAY_TOKENS.find(
          (t) => t.symbol.toLowerCase() === data.tokenSymbol?.toLowerCase()
        );
        if (found) {
          setSelectedTokenId(found.id);
        }
      }

      setScannedSuccessToast(
        `Scanned: ${data.address.slice(0, 6)}...${data.address.slice(-4)}`
      );
      setTimeout(() => setScannedSuccessToast(null), 4000);
    },
    []
  );

  // Active token definition for Send
  const currentToken = useMemo<MultiChainToken | undefined>(() => {
    return SUPPORTED_PAY_TOKENS.find((t) => t.id === selectedTokenId) || SUPPORTED_PAY_TOKENS[0];
  }, [selectedTokenId]);

  // Active token's network configuration for Send
  const currentNetworkConfig = useMemo(() => {
    if (!currentToken) return null;
    return currentToken.networks.find((n) => n.chainId === selectedChainId) || currentToken.networks[0];
  }, [currentToken, selectedChainId]);

  // Wagmi hooks for transactions
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  // Load token balances
  const loadBalances = useCallback(async () => {
    try {
      const priceMap = await fetchCryptoPrices();

      if (address && isAddress(address)) {
        const userBalances = await fetchAllUserBalances(address as Address, priceMap);
        setBalances(userBalances);
      }
    } catch (err) {
      console.warn('Failed to sync on-chain data:', err);
    }
  }, [address]);

  // Wait for transaction receipt
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: activeTxHash as `0x${string}` | undefined,
  });

  useEffect(() => {
    if (isTxConfirmed && txStep === 'broadcasting') {
      setTxStep('success');
      loadBalances();

      // Automatically verify on-chain and record to persistent transaction history
      if (activeTxHash) {
        verifyOnChainPayment(activeTxHash, {
          expectedAmount: sendAmount,
          expectedToken: (currentToken?.symbol.toLowerCase() || 'usdt') as 'usdt' | 'usdc' | 'verse' | 'pol',
          expectedMerchant: recipientAddress,
        }).then((res) => {
          if (res.success && res.record) {
            setLastVerifiedRecord(res.record);
          }
        });
      }
    }
  }, [isTxConfirmed, txStep, loadBalances, activeTxHash, sendAmount, currentToken?.symbol, recipientAddress]);

  useEffect(() => {
    loadBalances();
    const interval = setInterval(loadBalances, 20000);
    return () => clearInterval(interval);
  }, [loadBalances]);

  // Sync chain with connected wallet chain if possible
  useEffect(() => {
    if (chain?.id === POLYGON_CHAIN_ID || chain?.id === ETHEREUM_CHAIN_ID) {
      setSelectedChainId(chain.id);
    }
  }, [chain?.id]);

  // Helper to fetch balance for any symbol
  const getTokenBalance = useCallback(
    (symbol: string) => {
      if (!address) return '0.00';
      const found = balances.find(
        (b) =>
          b.symbol.toLowerCase() === symbol.toLowerCase() &&
          b.chainId === selectedChainId
      );
      return found ? found.balance : '0.00';
    },
    [balances, selectedChainId, address]
  );

  // User's balance for the currently selected token
  const currentTokenBalance = useMemo(() => {
    return getTokenBalance(currentToken?.symbol || 'USDT');
  }, [getTokenBalance, currentToken]);

  // Switch network if needed
  const handleNetworkSwitch = async (targetChainId: number) => {
    setSelectedChainId(targetChainId);
    if (isConnected && chain?.id !== targetChainId && switchChainAsync) {
      try {
        await switchChainAsync({ chainId: targetChainId });
      } catch (err) {
        console.warn('User dismissed network switch:', err);
      }
    }
  };

  // Send Transaction Handler
  const handleSendTransaction = async () => {
    setSendError(null);
    setErrorMessage('');

    if (!isConnected || !address) {
      if (openConnectModal) {
        openConnectModal();
      } else {
        setSendError('Please connect your Web3 wallet using the Connect Wallet button.');
      }
      return;
    }

    if (!recipientAddress || !isAddress(recipientAddress)) {
      setSendError('Please enter or scan a valid recipient address (0x...)');
      return;
    }

    if (recipientAddress.toLowerCase() === address.toLowerCase()) {
      setSendError('Recipient address cannot be your own connected wallet address.');
      return;
    }

    const parsedAmount = parseFloat(sendAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setSendError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (chain?.id !== selectedChainId && switchChainAsync) {
      try {
        await switchChainAsync({ chainId: selectedChainId });
      } catch {
        setSendError(`Please switch your wallet to ${selectedChainId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'} to continue.`);
        return;
      }
    }

    try {
      setTxStep('awaiting_signature');

      if (currentNetworkConfig?.isNative) {
        const valueInWei = parseUnits(sendAmount, 18);
        const txHash = await sendTransactionAsync({
          to: recipientAddress as Address,
          value: valueInWei,
        });
        setActiveTxHash(txHash);
        setTxStep('broadcasting');
      } else {
        const decimals = currentNetworkConfig?.decimals || 18;
        const amountInUnits = parseUnits(sendAmount, decimals);
        const contractAddr = currentNetworkConfig?.address as Address;

        const txHash = await writeContractAsync({
          address: contractAddr,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipientAddress as Address, amountInUnits],
        });
        setActiveTxHash(txHash);
        setTxStep('broadcasting');
      }
    } catch (err: unknown) {
      console.error('Send transaction failed:', err);
      setTxStep('error');
      const errObj = err as { shortMessage?: string; message?: string };
      setErrorMessage(errObj?.shortMessage || errObj?.message || 'Transaction rejected or failed in wallet.');
    }
  };

  // Receive token definition
  const receiveSelectedToken = useMemo<MultiChainToken | undefined>(() => {
    return SUPPORTED_PAY_TOKENS.find((t) => t.id === receiveTokenId) || SUPPORTED_PAY_TOKENS[0];
  }, [receiveTokenId]);

  const receiveNetworkConfig = useMemo(() => {
    if (!receiveSelectedToken) return null;
    return receiveSelectedToken.networks.find((n) => n.chainId === receiveNetworkId) || receiveSelectedToken.networks[0];
  }, [receiveSelectedToken, receiveNetworkId]);

  const isReceiveAddressValid = Boolean(
    receiveReceiverAddress && isAddress(receiveReceiverAddress)
  );

  // Generate Receive URI for the QR code strictly using selected user inputs
  const generatedReceiveQrUri = useMemo(() => {
    if (!isReceiveAddressValid) {
      return '';
    }
    const targetAddr = receiveReceiverAddress;
    const isAmountSet = receiveAmount && parseFloat(receiveAmount) > 0;

    if (!isAmountSet) {
      // Direct standard address URI on specified network
      return `ethereum:${targetAddr}@${receiveNetworkId}`;
    }

    if (receiveNetworkConfig?.isNative) {
      try {
        const rawAmount = parseUnits(receiveAmount, 18);
        return `ethereum:${targetAddr}@${receiveNetworkId}?value=${rawAmount.toString()}`;
      } catch {
        return `ethereum:${targetAddr}@${receiveNetworkId}`;
      }
    }

    return buildPaymentQRUri(
      targetAddr,
      receiveAmount,
      receiveNetworkConfig?.address || ('0x000' as Address),
      receiveNetworkId,
      receiveNetworkConfig?.decimals || 18
    );
  }, [receiveReceiverAddress, isReceiveAddressValid, receiveAmount, receiveNetworkConfig, receiveNetworkId]);

  // Copy Receive Address Handler
  const handleCopyReceiveAddress = () => {
    if (!receiveReceiverAddress) return;
    navigator.clipboard.writeText(receiveReceiverAddress);
    setCopiedReceiveAddress(true);
    setTimeout(() => setCopiedReceiveAddress(false), 2000);
  };

  // Share QR Handler
  const handleShareQR = () => {
    if (!generatedReceiveQrUri) return;
    if (navigator.share) {
      navigator.share({
        title: `Payment Request: ${receiveAmount || 'Any'} ${receiveSelectedToken?.symbol}`,
        text: `Send ${receiveAmount ? `${receiveAmount} ` : ''}${receiveSelectedToken?.symbol} on ${receiveNetworkId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'} to ${receiveReceiverAddress}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(generatedReceiveQrUri);
      setShareSuccessToast(true);
      setTimeout(() => setShareSuccessToast(false), 2500);
    }
  };

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    const svgElement = document.getElementById('payment-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `payment-qr-${receiveSelectedToken?.symbol}-${receiveAmount || 'any'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Verify On-Chain Transaction for Receive
  const handleVerifyIncomingPayment = async (customHash?: string) => {
    const hashToVerify = customHash || manualTxHash;
    if (!hashToVerify || !hashToVerify.trim().startsWith('0x')) {
      setVerificationError('Please enter a valid 0x transaction hash.');
      return;
    }

    setIsVerifyingTx(true);
    setVerificationError(null);

    try {
      const res = await verifyOnChainPayment(hashToVerify.trim(), {
        expectedMerchant: receiveReceiverAddress,
        expectedAmount: receiveAmount || undefined,
        expectedToken: (receiveSelectedToken?.symbol.toLowerCase() || 'usdt') as 'usdt' | 'usdc' | 'verse' | 'pol' | 'eth',
        expectedChainId: receiveNetworkId,
      });

      if (res.success && res.record) {
        setReceiveVerifiedRecord(res.record);
        setVerificationError(null);
      } else {
        setVerificationError(res.error || 'Could not verify transaction receipt on-chain.');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setVerificationError(errObj?.message || 'Failed to verify transaction on-chain.');
    } finally {
      setIsVerifyingTx(false);
    }
  };

  return (
    <div id="cryptopay-terminal-container" className="py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      
      {/* Top Navigation Tabs */}
      <div className="bg-zinc-950 rounded-2xl p-1.5 border border-zinc-800 shadow-lg flex items-center gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'send'
              ? 'bg-[#3B82F6] text-[#FFFFFF] shadow-[0_0_15px_rgba(59,130,246,0.35)]'
              : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Send Crypto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receive')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'receive'
              ? 'bg-[#3B82F6] text-[#FFFFFF] shadow-[0_0_15px_rgba(59,130,246,0.35)]'
              : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Receive / QR</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SEND CRYPTO */}
      {/* ========================================================================= */}
      {activeTab === 'send' && (
        <div className="bg-zinc-950 rounded-3xl p-6 sm:p-8 border border-zinc-800/90 shadow-2xl">
          
          {/* A. Network Selection Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#FFFFFF]">Network</h3>
              <span className="text-xs font-semibold text-[#00E676] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                Live EVM Mainnets
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Polygon PoS Option */}
              <button
                type="button"
                onClick={() => handleNetworkSwitch(POLYGON_CHAIN_ID)}
                className={`relative p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedChainId === POLYGON_CHAIN_ID
                    ? 'bg-zinc-900 border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.15)] ring-1 ring-[#00E676]/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="POL" size={30} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-[#FFFFFF] block">Polygon PoS</span>
                    <span className="text-[11px] text-zinc-400">Chain ID 137 • ~2s Finality</span>
                  </div>
                </div>

                {selectedChainId === POLYGON_CHAIN_ID && (
                  <div className="w-5 h-5 rounded-full bg-[#00E676] text-zinc-950 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_#00E676]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Ethereum Option */}
              <button
                type="button"
                onClick={() => handleNetworkSwitch(ETHEREUM_CHAIN_ID)}
                className={`relative p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedChainId === ETHEREUM_CHAIN_ID
                    ? 'bg-zinc-900 border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.15)] ring-1 ring-[#00E676]/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="ETH" size={30} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-[#FFFFFF] block">Ethereum</span>
                    <span className="text-[11px] text-zinc-400">Chain ID 1 • Mainnet</span>
                  </div>
                </div>

                {selectedChainId === ETHEREUM_CHAIN_ID && (
                  <div className="w-5 h-5 rounded-full bg-[#00E676] text-zinc-950 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_#00E676]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* B. Token Selection Section (2x2 Grid) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#FFFFFF]">Token</h3>
              <span className="text-xs font-semibold text-[#FACC15]">
                Balance: {currentTokenBalance} {currentToken?.symbol}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIMARY_GRID_TOKENS.map((item) => {
                const isSelected = selectedTokenId === item.id;
                const tokenBal = getTokenBalance(item.symbol);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTokenId(item.id)}
                    className={`relative p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)] ring-1 ring-[#3B82F6]/50'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <TokenIcon token={item.symbol} size={32} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="text-sm font-bold text-[#FFFFFF] leading-tight">
                        {item.symbol}
                      </div>
                      <div className="text-xs text-zinc-400 font-normal leading-tight mt-0.5">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#FACC15] font-mono mt-1 truncate">
                        {tokenBal} {item.symbol}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_#3B82F6]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Recipient Address Section */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#FFFFFF] mb-2">Recipient Address</h3>
            <div className="relative">
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value.trim());
                  setSendError(null);
                }}
                placeholder="0x... Enter EVM address"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] pr-12 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5 text-[#3B82F6]" />
              </button>
            </div>

            {/* Validation & Hint */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#00E676] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00E676] flex-shrink-0" />
                <span>Supports all EVM compatible addresses</span>
              </div>

              {address && !recipientAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientAddress(address);
                    setSendError(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-[#3B82F6] hover:underline font-medium cursor-pointer"
                >
                  Use My Address
                </button>
              )}
            </div>

            {scannedSuccessToast && (
              <div className="mt-2 p-2 rounded-lg bg-zinc-900 border border-[#00E676]/40 text-[#00E676] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                <span>{scannedSuccessToast}</span>
              </div>
            )}
          </div>

          {/* D. Amount Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#FFFFFF]">Amount</h3>
              <span className="text-xs font-semibold text-[#FACC15]">
                Balance: {currentTokenBalance} {currentToken?.symbol}
              </span>
            </div>

            {/* Amount input box with Token badge on right */}
            <div className="relative border border-zinc-800 rounded-xl p-2 bg-zinc-900/80 flex items-center justify-between mb-3 shadow-inner">
              <input
                type="number"
                step="any"
                value={sendAmount}
                onChange={(e) => {
                  setSendAmount(e.target.value);
                  setSendError(null);
                }}
                placeholder="10.00"
                className="w-full bg-transparent text-2xl font-bold text-[#FFFFFF] focus:outline-none pl-2 font-mono"
              />

              <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full flex items-center gap-1.5 shadow-sm flex-shrink-0">
                <TokenIcon token={currentToken?.symbol || 'USDT'} size={18} />
                <span className="text-xs font-bold text-[#FFFFFF]">{currentToken?.symbol}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>

            {/* Quick Amount Buttons Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {['5.00', '10.00', '25.00', '50.00', '100.00'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setSendAmount(val);
                    setSendError(null);
                  }}
                  className={`px-4 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
                    sendAmount === val
                      ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-[#FFFFFF] font-semibold ring-1 ring-[#3B82F6]'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  ${parseFloat(val).toFixed(0)}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const bal = parseFloat(currentTokenBalance.replace(/,/g, ''));
                  if (!isNaN(bal) && bal > 0) {
                    setSendAmount(bal.toString());
                  } else {
                    setSendAmount('100.00');
                  }
                  setSendError(null);
                }}
                className="px-4 py-1.5 rounded-full bg-[#FACC15] hover:bg-[#FACC15]/90 text-zinc-950 text-xs font-bold shadow-[0_0_12px_rgba(250,204,21,0.3)] transition cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Error Message */}
          {sendError && (
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-[#EF4444]/60 text-[#EF4444] text-xs font-medium flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Transaction Steps & Confirmation */}
          {txStep === 'awaiting_signature' && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-[#FACC15]/60 text-[#FACC15] mb-4 animate-pulse">
              <div className="text-xs font-bold">Please approve the transaction in your wallet...</div>
            </div>
          )}

          {txStep === 'broadcasting' && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-[#3B82F6]/50 text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00E676]" />
                <span>Broadcasting on-chain settlement...</span>
              </div>
              {activeTxHash && (
                <a
                  href={`${currentNetworkConfig?.blockExplorerUrl}/tx/${activeTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#FACC15] hover:underline flex items-center gap-1"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {txStep === 'success' && (
            <div className="p-5 rounded-2xl bg-zinc-900 border border-[#00E676]/60 text-white mb-6 space-y-3 shadow-[0_0_20px_rgba(0,230,118,0.15)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00E676]/20 text-[#00E676] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#FFFFFF]">
                      Transaction Settled & Verified On-Chain
                    </h4>
                    <p className="text-xs text-[#00E676]">
                      Transferred {sendAmount} {currentToken?.symbol} to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                  Confirmed
                </span>
              </div>

              {lastVerifiedRecord && (
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Polygon Block:</span>
                    <span className="font-mono text-[#FFFFFF] font-bold">#{lastVerifiedRecord.blockNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Tx Hash:</span>
                    <a
                      href={`https://polygonscan.com/tx/${lastVerifiedRecord.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#3B82F6] hover:underline inline-flex items-center gap-1"
                    >
                      {lastVerifiedRecord.txHash.slice(0, 10)}...{lastVerifiedRecord.txHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {lastVerifiedRecord && (
                  <button
                    type="button"
                    onClick={() => generatePaymentReceiptPdf(lastVerifiedRecord)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-zinc-950 text-xs font-bold shadow-[0_0_12px_rgba(0,230,118,0.3)] active:scale-95 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Receipt</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTxStep('idle');
                    setActiveTxHash(null);
                    setLastVerifiedRecord(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <span>Send Another Transfer</span>
                </button>
              </div>
            </div>
          )}

          {txStep === 'error' && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-[#EF4444]/60 text-[#EF4444] mb-4 text-xs font-mono break-all">
              {errorMessage}
            </div>
          )}

          {/* E. Bottom Call to Action Button */}
          {isConnected ? (
            <button
              type="button"
              onClick={handleSendTransaction}
              disabled={txStep === 'awaiting_signature' || txStep === 'broadcasting'}
              className="w-full py-4 px-6 rounded-2xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-[0_0_20px_rgba(59,130,246,0.35)] transition disabled:opacity-50 cursor-pointer"
            >
              <div className="w-6" />
              <span className="flex-1 text-center text-white">
                {txStep === 'awaiting_signature'
                  ? 'Confirming in Wallet...'
                  : txStep === 'broadcasting'
                  ? 'Broadcasting...'
                  : `Send ${sendAmount || '0.00'} ${currentToken?.symbol || ''}`}
              </span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openConnectModal}
              className="w-full py-4 px-6 rounded-2xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-[0_0_20px_rgba(59,130,246,0.35)] transition cursor-pointer"
            >
              <Wallet className="w-5 h-5 text-white" />
              <span className="flex-1 text-center text-white">Connect Wallet to Send</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: RECEIVE CRYPTO QR (Real Functional Blockchain Flow) */}
      {/* ========================================================================= */}
      {activeTab === 'receive' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFFFFF] tracking-tight">
                Create Receive QR
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Enter your receiver wallet address, select network and token to generate a real payment request QR
              </p>
            </div>
            {address && !receiveReceiverAddress && (
              <button
                type="button"
                onClick={() => {
                  setReceiveReceiverAddress(address);
                  setIsQrGenerated(false);
                }}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Use Connected Wallet ({address.slice(0, 6)}...{address.slice(-4)})</span>
              </button>
            )}
          </div>

          {/* Two-Column Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ----------------- LEFT PANEL: Form Configuration (7 cols) ----------------- */}
            <div className="lg:col-span-7 bg-zinc-950 rounded-3xl p-6 sm:p-7 border border-zinc-800/90 shadow-xl space-y-6">
              
              {/* 01 Receiver Address */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-[0_0_8px_#3B82F6]">
                      01
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF]">
                      Receiver Address <span className="text-[#EF4444]">*</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">Step 1 of 4</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={receiveReceiverAddress}
                    onChange={(e) => {
                      setReceiveReceiverAddress(e.target.value.trim());
                      setIsQrGenerated(false);
                      setReceiveVerifiedRecord(null);
                    }}
                    placeholder="0x... Enter EVM receiver address"
                    className={`w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none pr-10 shadow-inner transition ${
                      receiveReceiverAddress
                        ? isReceiveAddressValid
                          ? 'border-[#00E676] ring-1 ring-[#00E676]/40'
                          : 'border-[#EF4444] ring-1 ring-[#EF4444]/40'
                        : 'border-zinc-800 focus:border-[#3B82F6]'
                    }`}
                  />
                  {receiveReceiverAddress && (
                    <button
                      type="button"
                      onClick={handleCopyReceiveAddress}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedReceiveAddress ? (
                        <Check className="w-4 h-4 text-[#00E676]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {receiveReceiverAddress ? (
                    isReceiveAddressValid ? (
                      <div className="flex items-center gap-1.5 text-[#00E676] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676] flex-shrink-0" />
                        <span>Valid blockchain address</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#EF4444] font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
                        <span>Invalid address. Must be a 42-character 0x hex address.</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-zinc-400 font-normal">
                      <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Enter the merchant wallet that will receive funds.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 02 Select Network */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-[0_0_8px_#3B82F6]">
                      02
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF]">
                      Select Network <span className="text-[#EF4444]">*</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">Step 2 of 4</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Polygon Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveNetworkId(POLYGON_CHAIN_ID);
                      setIsQrGenerated(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition cursor-pointer ${
                      receiveNetworkId === POLYGON_CHAIN_ID
                        ? 'bg-zinc-900 border-[#00E676] text-[#FFFFFF] shadow-[0_0_12px_rgba(0,230,118,0.2)] ring-1 ring-[#00E676]/40'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <TokenIcon token="POL" size={20} />
                    <span>Polygon PoS</span>
                  </button>

                  {/* Ethereum Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveNetworkId(ETHEREUM_CHAIN_ID);
                      setIsQrGenerated(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition cursor-pointer ${
                      receiveNetworkId === ETHEREUM_CHAIN_ID
                        ? 'bg-zinc-900 border-[#00E676] text-[#FFFFFF] shadow-[0_0_12px_rgba(0,230,118,0.2)] ring-1 ring-[#00E676]/40'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <TokenIcon token="ETH" size={20} />
                    <span>Ethereum</span>
                  </button>
                </div>
              </div>

              {/* 03 Select Token */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-[0_0_8px_#3B82F6]">
                      03
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF]">
                      Select Token <span className="text-[#EF4444]">*</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">Step 3 of 4</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* USDT */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('usdt');
                      setIsQrGenerated(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'usdt'
                        ? 'bg-zinc-900 border-[#3B82F6] text-[#FFFFFF] shadow-[0_0_12px_rgba(59,130,246,0.2)] ring-1 ring-[#3B82F6]/50'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <TokenIcon token="USDT" size={20} />
                    <span>USDT</span>
                  </button>

                  {/* USDC */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('usdc');
                      setIsQrGenerated(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'usdc'
                        ? 'bg-zinc-900 border-[#3B82F6] text-[#FFFFFF] shadow-[0_0_12px_rgba(59,130,246,0.2)] ring-1 ring-[#3B82F6]/50'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <TokenIcon token="USDC" size={20} />
                    <span>USDC</span>
                  </button>

                  {/* VERSE */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('verse');
                      setIsQrGenerated(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'verse'
                        ? 'bg-zinc-900 border-[#3B82F6] text-[#FFFFFF] shadow-[0_0_12px_rgba(59,130,246,0.2)] ring-1 ring-[#3B82F6]/50'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <TokenIcon token="VERSE" size={20} />
                    <span>VERSE</span>
                  </button>
                </div>

                {/* Contract address preview */}
                {receiveNetworkConfig && !receiveNetworkConfig.isNative && (
                  <p className="mt-2 text-[11px] text-zinc-400 font-mono flex items-center gap-1 truncate">
                    <span>Contract:</span>
                    <span className="truncate text-zinc-300">{receiveNetworkConfig.address}</span>
                  </p>
                )}
              </div>

              {/* 04 Amount (Optional) */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-[0_0_8px_#3B82F6]">
                      04
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF]">
                      Amount (Optional)
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">Step 4 of 4</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={receiveAmount}
                    onChange={(e) => {
                      setReceiveAmount(e.target.value);
                      setIsQrGenerated(false);
                    }}
                    placeholder="Leave empty for customer-specified amount"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] pr-16 shadow-inner font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#FACC15] select-none">
                    {receiveSelectedToken?.symbol || 'USDT'}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-zinc-400">
                  {receiveAmount && parseFloat(receiveAmount) > 0
                    ? `Requesting exactly ${receiveAmount} ${receiveSelectedToken?.symbol}. The customer wallet will prefill this amount.`
                    : 'Customer wallet will prompt the payer to specify any amount.'}
                </p>
              </div>

              {/* Action Button: Generate Payment QR */}
              <div>
                <button
                  type="button"
                  disabled={!isReceiveAddressValid}
                  onClick={() => {
                    if (!isReceiveAddressValid) return;
                    setIsQrGenerated(true);
                    setReceiveVerifiedRecord(null);
                    const el = document.getElementById('payment-qr-display-panel');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                    isReceiveAddressValid
                      ? 'bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white active:scale-[0.99] shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <span>Generate Payment QR</span>
                  <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
                </button>

                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400 font-medium justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676] flex-shrink-0" />
                  <span>
                    {isReceiveAddressValid
                      ? 'Valid inputs ready. Click generate to produce live EIP-681 payment request.'
                      : 'Enter a valid receiver address above to generate payment QR.'}
                  </span>
                </div>
              </div>

            </div>

            {/* ----------------- RIGHT PANEL: Payment QR Display (5 cols) ----------------- */}
            <div id="payment-qr-display-panel" className="lg:col-span-5 bg-zinc-950 rounded-3xl p-6 sm:p-7 border border-zinc-800/90 shadow-xl flex flex-col justify-between space-y-5">
              
              {/* Header with LIVE badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-[#FFFFFF]">Payment QR</h3>
                {isQrGenerated && isReceiveAddressValid ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-[0_0_8px_rgba(0,230,118,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                    LIVE ON-CHAIN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wide uppercase">
                    Awaiting Inputs
                  </span>
                )}
              </div>

              {/* QR Code Frame with centered logo badge */}
              <div className="relative mx-auto p-4 bg-white rounded-2xl border border-zinc-800 shadow-md flex flex-col items-center justify-center min-h-[240px] w-full">
                {isQrGenerated && isReceiveAddressValid && generatedReceiveQrUri ? (
                  <QRCodeSVG
                    id="payment-qr-svg"
                    value={generatedReceiveQrUri}
                    size={210}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: 'https://verse.bitcoin.com/favicon.png',
                      x: undefined,
                      y: undefined,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                ) : (
                  <div className="py-12 px-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 mx-auto flex items-center justify-center">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-800">Payment QR Not Generated</p>
                    <p className="text-xs text-zinc-500 max-w-[220px] mx-auto">
                      Fill out the receiver address, select network & token, then click Generate Payment QR.
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Details Section */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
                  Payment Request Parameters
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <TokenIcon token={receiveNetworkId === POLYGON_CHAIN_ID ? 'POL' : 'ETH'} size={14} />
                      <span>Network</span>
                    </div>
                    <span className="font-semibold text-[#00E676]">
                      {receiveNetworkId === POLYGON_CHAIN_ID ? 'Polygon PoS (Chain ID 137)' : 'Ethereum (Chain ID 1)'}
                    </span>
                  </div>

                  {/* Token */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <TokenIcon token={receiveSelectedToken?.symbol || 'USDT'} size={14} />
                      <span>Token</span>
                    </div>
                    <span className="font-semibold text-[#FFFFFF]">
                      {receiveSelectedToken?.symbol} ({receiveSelectedToken?.name})
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Amount</span>
                    </div>
                    <span className="font-semibold text-[#FACC15]">
                      {receiveAmount && parseFloat(receiveAmount) > 0
                        ? `${parseFloat(receiveAmount).toFixed(2)} ${receiveSelectedToken?.symbol}`
                        : 'Any amount (Open)'}
                    </span>
                  </div>

                  {/* Receiver */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Receiver</span>
                    </div>
                    <span className="font-mono text-zinc-300 truncate max-w-[140px]" title={receiveReceiverAddress}>
                      {receiveReceiverAddress
                        ? `${receiveReceiverAddress.slice(0, 6)}...${receiveReceiverAddress.slice(-4)}`
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Share QR & Download QR */}
              {isQrGenerated && isReceiveAddressValid && (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleShareQR}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[#FFFFFF] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-[#3B82F6]" />
                    <span>{shareSuccessToast ? 'Link / URI Copied!' : 'Share / Copy Payment URI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[#FFFFFF] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#00E676]" />
                    <span>Download QR Image</span>
                  </button>
                </div>
              )}

              {/* On-Chain Payment Verification Box */}
              {isQrGenerated && isReceiveAddressValid && (
                <div className="pt-3 border-t border-zinc-800">
                  <div className="bg-zinc-900 rounded-2xl p-3.5 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                        <span className="text-xs font-bold text-[#FFFFFF]">Verify Payment On-Chain</span>
                      </div>
                      <span className="text-[10px] text-[#00E676] font-medium">RPC Node Verified</span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      After customer pays via their crypto wallet, paste the transaction hash to verify receipt and save to your merchant history.
                    </p>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={manualTxHash}
                        onChange={(e) => {
                          setManualTxHash(e.target.value);
                          setVerificationError(null);
                        }}
                        placeholder="0x... Transaction hash"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#FFFFFF] placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6]"
                      />
                      <button
                        type="button"
                        disabled={isVerifyingTx || !manualTxHash}
                        onClick={() => handleVerifyIncomingPayment()}
                        className="px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      >
                        {isVerifyingTx ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>{isVerifyingTx ? 'Checking...' : 'Verify'}</span>
                      </button>
                    </div>

                    {verificationError && (
                      <div className="p-2 rounded-lg bg-zinc-950 border border-[#EF4444]/60 text-[#EF4444] text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{verificationError}</span>
                      </div>
                    )}

                    {receiveVerifiedRecord && (
                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-[#00E676]/60 text-white text-xs space-y-1.5 shadow-[0_0_15px_rgba(0,230,118,0.15)]">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1 text-[#00E676]">
                            <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                            <span>Payment Verified & Saved!</span>
                          </span>
                          <span className="text-[10px] bg-[#00E676]/20 border border-[#00E676]/40 px-1.5 py-0.5 rounded text-[#00E676]">
                            Block #{receiveVerifiedRecord.blockNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 space-y-0.5 font-mono">
                          <div>Amount: <span className="text-[#00E676] font-bold">{receiveVerifiedRecord.amount} {receiveVerifiedRecord.tokenLabel}</span></div>
                          <div>From: {receiveVerifiedRecord.senderAddress.slice(0, 6)}...{receiveVerifiedRecord.senderAddress.slice(-4)}</div>
                          <div>To: {receiveVerifiedRecord.recipientAddress.slice(0, 6)}...{receiveVerifiedRecord.recipientAddress.slice(-4)}</div>
                        </div>
                        <div className="pt-1 flex items-center justify-between">
                          <a
                            href={
                              receiveVerifiedRecord.chainId === ETHEREUM_CHAIN_ID
                                ? `https://etherscan.io/tx/${receiveVerifiedRecord.txHash}`
                                : `https://polygonscan.com/tx/${receiveVerifiedRecord.txHash}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#3B82F6] underline hover:text-[#3B82F6]/80 flex items-center gap-1"
                          >
                            <span>View on Explorer</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => generatePaymentReceiptPdf(receiveVerifiedRecord)}
                            className="text-[11px] font-semibold text-[#00E676] underline hover:text-[#00E676]/80 flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download Receipt PDF</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannedQR}
      />
    </div>
  );
}
