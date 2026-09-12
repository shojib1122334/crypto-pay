import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectWallet } from '@/hooks/useConnectWallet';
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
  AlertTriangle,
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
  Search,
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
import { parseRpcError, type ParsedRpcError } from '@/lib/rpcError';
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
import { useSavedReceivers } from '@/context/useSavedReceivers';
import type { NavTab } from '@/types/navigation';

type PayTabMode = 'send' | 'receive';


// Define the 4 primary tokens displayed in the 2x2 grid
const PRIMARY_GRID_TOKENS = [
  { id: 'usdt', symbol: 'USDT', name: 'Tether' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin' },
  { id: 'pol', symbol: 'POL', name: 'Polygon' },
  { id: 'verse', symbol: 'VERSE', name: 'Verse' },
];

interface PaySystemTerminalProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export default function PaySystemTerminal({ onNavigateTab }: PaySystemTerminalProps = {}) {
  const { address, isConnected, chain } = useAccount();
  const { openWalletConnect } = useConnectWallet();
  const { switchChainAsync } = useSwitchChain();
  const { activeReceiver } = useSavedReceivers();

  // Active Terminal Tab: Send Crypto | Receive / QR
  const [activeTab, setActiveTab] = useState<PayTabMode>('send');

  // Multi-chain and token states
  const [selectedChainId, setSelectedChainId] = useState<number>(POLYGON_CHAIN_ID);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('usdt');

  // Balances
  const [balances, setBalances] = useState<TokenBalanceInfo[]>([]);

  // Send Form State - Auto-populated from Active Receiver
  const [recipientAddress, setRecipientAddress] = useState(activeReceiver?.address || '');
  const [sendAmount, setSendAmount] = useState('10.00');
  const [sendError, setSendError] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<'idle' | 'preparing' | 'awaiting_signature' | 'broadcasting' | 'success' | 'error'>('idle');
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedRpcError, setParsedRpcError] = useState<ParsedRpcError | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [lastVerifiedRecord, setLastVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // Receive Form State - Auto-populated from Active Receiver
  const [receiveReceiverAddress, setReceiveReceiverAddress] = useState<string>(activeReceiver?.address || '');
  const [receiveNetworkId, setReceiveNetworkId] = useState<number>(POLYGON_CHAIN_ID);
  const [receiveTokenId, setReceiveTokenId] = useState<string>('usdt');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);
  const [copiedReceiveAddress, setCopiedReceiveAddress] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);
  const [manualTxHash, setManualTxHash] = useState<string>('');
  const [isVerifyingTx, setIsVerifyingTx] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [receiveValidationError, setReceiveValidationError] = useState<string | null>(null);
  const [receiveVerifiedRecord, setReceiveVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // Automatically sync Active Receiver address to both Send and Receive forms
  useEffect(() => {
    if (activeReceiver?.address) {
      setRecipientAddress(activeReceiver.address);
      setReceiveReceiverAddress(activeReceiver.address);
      setSendError(null);
      setReceiveValidationError(null);
    } else {
      setRecipientAddress('');
      setReceiveReceiverAddress('');
    }
  }, [activeReceiver?.address]);

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
    setSendError(null);
    setErrorMessage('');
    setParsedRpcError(null);
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
    setParsedRpcError(null);

    if (!isConnected || !address) {
      openWalletConnect();
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

    // 1. Verify Connected Wallet Network
    if (chain?.id !== selectedChainId) {
      if (switchChainAsync) {
        try {
          await switchChainAsync({ chainId: selectedChainId });
        } catch (switchErr: unknown) {
          const targetName = selectedChainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : 'Ethereum';
          const parsed = parseRpcError(switchErr, {
            chainId: selectedChainId,
            tokenSymbol: currentToken?.symbol,
            amount: sendAmount,
          });
          setSendError(`Please switch your wallet to ${targetName} (Chain ID ${selectedChainId}) to continue. ${parsed.message}`);
          return;
        }
      } else {
        const targetName = selectedChainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : 'Ethereum';
        setSendError(`Network mismatch: Please open your wallet and switch to ${targetName} (Chain ID ${selectedChainId}).`);
        return;
      }
    }

    // 2. Pre-flight Balance Checks (Token balance & POL gas)
    const cleanTokenBalance = parseFloat(currentTokenBalance.replace(/,/g, ''));
    if (!isNaN(cleanTokenBalance) && parsedAmount > cleanTokenBalance) {
      setSendError(
        `Insufficient ${currentToken?.symbol || 'token'} balance: You have ${currentTokenBalance} ${currentToken?.symbol || ''}, which is less than the entered amount (${sendAmount} ${currentToken?.symbol || ''}).`
      );
      return;
    }

    if (selectedChainId === POLYGON_CHAIN_ID && !currentNetworkConfig?.isNative) {
      const polBalanceStr = getTokenBalance('POL').replace(/,/g, '');
      const polBalanceNum = parseFloat(polBalanceStr);
      if (!isNaN(polBalanceNum) && polBalanceNum < 0.001) {
        setSendError(
          `Insufficient POL for gas: Your wallet has ${polBalanceStr} POL. You need a small amount of native POL (~0.01 POL) to pay Polygon transaction fees.`
        );
        return;
      }
    }

    try {
      setTxStep('awaiting_signature');

      if (currentNetworkConfig?.isNative) {
        const valueInWei = parseUnits(sendAmount, 18);
        const txHash = await sendTransactionAsync({
          chainId: selectedChainId as 137 | 1,
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
          chainId: selectedChainId as 137 | 1,
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
      const parsed = parseRpcError(err, {
        tokenSymbol: currentToken?.symbol,
        networkName: currentNetworkConfig?.networkName,
        amount: sendAmount,
        chainId: selectedChainId,
        userBalance: currentTokenBalance,
        nativeBalance: getTokenBalance('POL'),
        walletAddress: address,
      });
      setParsedRpcError(parsed);
      setErrorMessage(parsed.message);
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

  // Robust validation handler for generating Payment QR
  const handleGenerateReceiveQR = () => {
    // 1. Validate Receiver Address
    if (!receiveReceiverAddress || !receiveReceiverAddress.trim()) {
      setReceiveValidationError('Please enter a recipient wallet address (Step 1).');
      setIsQrGenerated(false);
      return;
    }

    if (!isAddress(receiveReceiverAddress.trim())) {
      setReceiveValidationError('Invalid wallet address format. Must be a valid 42-character 0x EVM hex address.');
      setIsQrGenerated(false);
      return;
    }

    // 2. Validate Network
    if (receiveNetworkId !== POLYGON_CHAIN_ID && receiveNetworkId !== ETHEREUM_CHAIN_ID) {
      setReceiveValidationError('Please select a supported network (Polygon PoS or Ethereum).');
      setIsQrGenerated(false);
      return;
    }

    // 3. Validate Token Config
    if (!receiveSelectedToken || !receiveNetworkConfig) {
      setReceiveValidationError('The selected token is not supported on this network.');
      setIsQrGenerated(false);
      return;
    }

    // 4. Validate Amount (if provided)
    if (receiveAmount && receiveAmount.trim() !== '') {
      const num = Number(receiveAmount.trim());
      if (isNaN(num) || num <= 0) {
        setReceiveValidationError('Please enter a valid positive number for amount, or leave empty for open payment.');
        setIsQrGenerated(false);
        return;
      }
      try {
        parseUnits(receiveAmount.trim(), receiveNetworkConfig.decimals || 18);
      } catch {
        setReceiveValidationError('Amount format exceeds maximum supported decimals for this token.');
        setIsQrGenerated(false);
        return;
      }
    }

    // All clear - generate QR and reset validation error
    setReceiveValidationError(null);
    setIsQrGenerated(true);
    setReceiveVerifiedRecord(null);

    const el = document.getElementById('payment-qr-display-panel');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div id="cryptopay-terminal-container" className="w-full sm:max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-10 font-sans">
      
      {/* Top Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border-2 border-slate-300 shadow-sm grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'send'
              ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.01]'
              : 'bg-slate-100 text-slate-800 hover:text-purple-700 hover:bg-purple-50 border border-slate-300'
          }`}
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span>Send Crypto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receive')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'receive'
              ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.01]'
              : 'bg-slate-100 text-slate-800 hover:text-purple-700 hover:bg-purple-50 border border-slate-300'
          }`}
        >
          <QrCode className="w-4 h-4 stroke-[2.5]" />
          <span>Receive / QR</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SEND CRYPTO */}
      {/* ========================================================================= */}
      {activeTab === 'send' && (
        <div className="web3-glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border-2 border-slate-200 shadow-xl shadow-purple-500/5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
          
          {/* A. Network Selection Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-950">Network</h3>
              <span className="text-xs font-black text-emerald-900 bg-emerald-100 border-2 border-emerald-400 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Live EVM Mainnets
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Polygon PoS Option */}
              <button
                type="button"
                onClick={() => handleNetworkSwitch(POLYGON_CHAIN_ID)}
                className={`relative p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedChainId === POLYGON_CHAIN_ID
                    ? 'bg-purple-50 border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/40'
                    : 'bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50/40 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="POL" size={36} />
                  </div>
                  <div>
                    <span className={`text-sm sm:text-base font-black block ${selectedChainId === POLYGON_CHAIN_ID ? 'text-purple-950' : 'text-slate-950'}`}>
                      Polygon PoS
                    </span>
                    <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md mt-0.5 border ${
                      selectedChainId === POLYGON_CHAIN_ID
                        ? 'bg-purple-200 text-purple-950 border-purple-400'
                        : 'bg-slate-100 text-slate-900 border-slate-300'
                    }`}>
                      Chain ID 137 • ~2s Finality
                    </span>
                  </div>
                </div>

                {selectedChainId === POLYGON_CHAIN_ID && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Ethereum Option */}
              <button
                type="button"
                onClick={() => handleNetworkSwitch(ETHEREUM_CHAIN_ID)}
                className={`relative p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedChainId === ETHEREUM_CHAIN_ID
                    ? 'bg-blue-50 border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/40'
                    : 'bg-white border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="ETH" size={36} />
                  </div>
                  <div>
                    <span className={`text-sm sm:text-base font-black block ${selectedChainId === ETHEREUM_CHAIN_ID ? 'text-blue-950' : 'text-slate-950'}`}>
                      Ethereum
                    </span>
                    <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md mt-0.5 border ${
                      selectedChainId === ETHEREUM_CHAIN_ID
                        ? 'bg-blue-200 text-blue-950 border-blue-400'
                        : 'bg-slate-100 text-slate-900 border-slate-300'
                    }`}>
                      Chain ID 1 • Mainnet
                    </span>
                  </div>
                </div>

                {selectedChainId === ETHEREUM_CHAIN_ID && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Connected Wallet Network Mismatch Verification Notice */}
            {isConnected && chain && chain.id !== selectedChainId && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Your wallet is currently on <strong>{chain.name || `Chain ID ${chain.id}`}</strong>. Transactions on this page require{' '}
                    <strong>{selectedChainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : 'Ethereum'}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNetworkSwitch(selectedChainId)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs whitespace-nowrap transition cursor-pointer self-end sm:self-auto shadow-xs"
                >
                  Switch Network
                </button>
              </div>
            )}
          </div>

          {/* B. Token Selection Section (2x2 Grid) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-950">Token</h3>
              <span className="text-xs font-black text-amber-950 bg-amber-100 border-2 border-amber-400 px-3 py-0.5 rounded-full shadow-2xs">
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
                    className={`relative p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/40'
                        : 'bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50/30 shadow-xs'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <TokenIcon token={item.symbol} size={32} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className={`text-sm sm:text-base font-black leading-tight ${isSelected ? 'text-purple-950' : 'text-slate-950'}`}>
                        {item.symbol}
                      </div>
                      <div className={`text-xs font-extrabold leading-tight mt-0.5 ${isSelected ? 'text-purple-800' : 'text-slate-700'}`}>
                        {item.name}
                      </div>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center text-xs font-mono font-black px-2 py-0.5 rounded-md border ${
                          isSelected
                            ? 'bg-amber-200 text-amber-950 border-amber-400'
                            : 'bg-slate-100 text-slate-950 border-slate-300'
                        }`}>
                          {tokenBal} {item.symbol}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Recipient Address Section */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#101B5C]">Receiver Address</h3>
                {activeReceiver ? (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-Populated
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                    Manual / Unset
                  </span>
                )}
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('settings')}
                  className="text-xs text-blue-600 hover:text-purple-600 hover:underline font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Settings → Saved Receivers</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Active Receiver Highlight Card */}
            {activeReceiver && (
              <div className="mb-2 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#101B5C]">Active Receiver:</span>
                  <span className="text-emerald-700 font-bold">{activeReceiver.telegramUsername}</span>
                </div>
                <span className="font-mono text-[#5367A5] text-[11px] truncate font-semibold">
                  {activeReceiver.address}
                </span>
              </div>
            )}

            {!activeReceiver && (
              <div className="mb-2 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>No Active Receiver selected in Settings.</span>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('settings')}
                    className="font-bold underline text-amber-800 hover:text-amber-950"
                  >
                    Select Receiver
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value.trim());
                  setSendError(null);
                }}
                placeholder="0x... EVM receiver address"
                className="w-full bg-[#F8FAFF] hover:bg-white focus:bg-white border border-[#D6E0F5] rounded-2xl px-4 py-3 text-sm font-mono text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 pr-12 shadow-xs transition-all"
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-[#5367A5] hover:text-[#101B5C] hover:bg-blue-50/60 transition cursor-pointer"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5 text-purple-600" />
              </button>
            </div>

            {/* Validation & Hint */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Supports all EVM compatible addresses</span>
              </div>

              {address && !recipientAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientAddress(address);
                    setSendError(null);
                  }}
                  className="text-xs text-[#5367A5] hover:text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Use My Connected Address
                </button>
              )}
            </div>

            {scannedSuccessToast && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{scannedSuccessToast}</span>
              </div>
            )}
          </div>

          {/* D. Amount Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-slate-950">Amount</h3>
              <span className="text-xs font-black text-amber-950 bg-amber-100 border-2 border-amber-400 px-3 py-0.5 rounded-full shadow-2xs">
                Balance: {currentTokenBalance} {currentToken?.symbol}
              </span>
            </div>

            {/* Amount input box with Token badge on right */}
            <div className="relative border-2 border-slate-300 rounded-2xl p-2.5 bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-400/30 flex items-center justify-between mb-3 shadow-xs transition-all">
              <input
                type="number"
                step="any"
                value={sendAmount}
                onChange={(e) => {
                  setSendAmount(e.target.value);
                  setSendError(null);
                }}
                placeholder="10.00"
                className="w-full bg-transparent text-2xl sm:text-3xl font-black text-slate-950 focus:outline-none pl-2 font-mono"
              />

              <div className="px-3.5 py-1.5 bg-slate-100 border-2 border-slate-300 rounded-full flex items-center gap-2 shadow-xs flex-shrink-0">
                <TokenIcon token={currentToken?.symbol || 'USDT'} size={22} />
                <span className="text-xs font-black text-slate-950">{currentToken?.symbol}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
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
                  className={`px-4 py-1.5 rounded-full border-2 text-xs transition cursor-pointer ${
                    sendAmount === val
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white font-black border-transparent shadow-md scale-105'
                      : 'border-slate-300 bg-white text-slate-950 font-black hover:border-purple-500 hover:text-purple-800 hover:bg-purple-50/40 shadow-xs'
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
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-xs transition cursor-pointer border border-amber-600"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Error Message */}
          {sendError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-medium flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Transaction Steps & Confirmation */}
          {txStep === 'awaiting_signature' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 mb-4 animate-pulse">
              <div className="text-xs font-bold">Please approve the transaction in your wallet...</div>
            </div>
          )}

          {txStep === 'broadcasting' && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-[#101B5C] mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Broadcasting on-chain settlement...</span>
              </div>
              {activeTxHash && (
                <a
                  href={`${currentNetworkConfig?.blockExplorerUrl}/tx/${activeTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {txStep === 'success' && (
            <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-[#101B5C] mb-6 space-y-3 shadow-md shadow-emerald-500/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#101B5C]">
                      Transaction Settled & Verified On-Chain
                    </h4>
                    <p className="text-xs text-emerald-800 font-semibold">
                      Transferred {sendAmount} {currentToken?.symbol} to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Confirmed
                </span>
              </div>

              {lastVerifiedRecord && (
                <div className="bg-white rounded-xl p-3.5 border border-emerald-200 text-xs space-y-1.5 font-medium shadow-xs">
                  <div className="flex justify-between">
                    <span className="text-[#5367A5]">Polygon Block:</span>
                    <span className="font-mono text-[#101B5C] font-bold">#{lastVerifiedRecord.blockNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5367A5]">Tx Hash:</span>
                    <a
                      href={`https://polygonscan.com/tx/${lastVerifiedRecord.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 hover:text-purple-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      {lastVerifiedRecord.txHash.slice(0, 10)}...{lastVerifiedRecord.txHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {lastVerifiedRecord && (
                  <button
                    type="button"
                    onClick={() => generatePaymentReceiptPdf(lastVerifiedRecord)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#D6E0F5] text-[#101B5C] text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <span>Send Another Transfer</span>
                </button>
              </div>
            </div>
          )}

          {txStep === 'error' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/90 border border-rose-300 text-rose-950 mb-5 space-y-3 shadow-md shadow-rose-500/10 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-[#101B5C]">
                      {parsedRpcError?.title || 'Transaction Request Failed'}
                    </h4>
                    {parsedRpcError?.category && (
                      <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        {parsedRpcError.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-900 font-medium mt-1.5 leading-relaxed">
                    {parsedRpcError?.message || errorMessage}
                  </p>
                </div>
              </div>

              {parsedRpcError?.actionHint && (
                <div className="p-3 rounded-xl bg-white border border-rose-200 flex items-start gap-2.5 text-xs text-[#5367A5]">
                  <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#101B5C] font-bold">Recommended Fix: </strong>
                    <span>{parsedRpcError.actionHint}</span>
                  </div>
                </div>
              )}

              {/* Technical Blockchain Diagnostics Accordion */}
              {parsedRpcError?.technicalDetails && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTechDetails(!showTechDetails)}
                    className="text-[11px] text-[#5367A5] hover:text-[#101B5C] flex items-center gap-1 font-mono transition cursor-pointer"
                  >
                    <span>{showTechDetails ? 'Hide' : 'Show'} Blockchain Diagnostics</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTechDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showTechDetails && (
                    <div className="mt-2 p-3 rounded-xl bg-white border border-[#D6E0F5] text-[11px] font-mono text-[#5367A5] break-all leading-relaxed shadow-xs">
                      {parsedRpcError.technicalDetails}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-200">
                {parsedRpcError?.category === 'network' && (
                  <button
                    type="button"
                    onClick={() => handleNetworkSwitch(selectedChainId)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Switch to {selectedChainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : 'Ethereum'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTxStep('idle');
                    setSendError(null);
                    setParsedRpcError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#D6E0F5] text-[#101B5C] font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Dismiss / Try Again
                </button>
              </div>
            </div>
          )}

          {/* E. Bottom Call to Action Button */}
          {isConnected ? (
            <button
              type="button"
              onClick={handleSendTransaction}
              disabled={txStep === 'awaiting_signature' || txStep === 'broadcasting'}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all disabled:opacity-50 cursor-pointer border border-white/20"
            >
              <div className="w-6" />
              <span className="flex-1 text-center text-white">
                {txStep === 'awaiting_signature'
                  ? 'Confirming in Wallet...'
                  : txStep === 'broadcasting'
                  ? 'Broadcasting...'
                  : `Send ${sendAmount || '0.00'} ${currentToken?.symbol || ''}`}
              </span>
              <ArrowRight className="w-5 h-5 text-white stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openWalletConnect()}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all cursor-pointer border border-white/20"
            >
              <Wallet className="w-5 h-5 text-white stroke-[2.2]" />
              <span className="flex-1 text-center text-white">Connect Wallet to Send</span>
              <ArrowRight className="w-5 h-5 text-white stroke-[2.5]" />
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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Create Receive QR
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Enter your receiver wallet address, select network and token to generate a real payment request QR
              </p>
            </div>
            {address && !receiveReceiverAddress && (
              <button
                type="button"
                onClick={() => {
                  setReceiveReceiverAddress(address);
                  setIsQrGenerated(false);
                  setReceiveValidationError(null);
                }}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>Use Connected Wallet ({address.slice(0, 6)}...{address.slice(-4)})</span>
              </button>
            )}
          </div>

          {/* Two-Column Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ----------------- LEFT PANEL: Form Configuration (7 cols) ----------------- */}
            <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-slate-200 shadow-xl space-y-5 sm:space-y-6">
              
              {/* 01 Receiver Address */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                      01
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Receiver Address <span className="text-red-500">*</span>
                    </h3>
                    {activeReceiver ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Auto-Populated
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Step 1 of 4</span>
                </div>

                {/* Active Receiver Display Card */}
                {activeReceiver && (
                  <div className="mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-slate-800">Active Receiver:</span>
                      <span className="text-emerald-700 font-semibold">{activeReceiver.telegramUsername}</span>
                    </div>
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('settings')}
                        className="text-[11px] text-blue-600 hover:underline font-medium flex items-center gap-1 flex-shrink-0 cursor-pointer"
                      >
                        <span>Change in Settings</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={receiveReceiverAddress}
                    onChange={(e) => {
                      setReceiveReceiverAddress(e.target.value.trim());
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                      setReceiveVerifiedRecord(null);
                    }}
                    placeholder="0x... Enter EVM receiver address"
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none pr-10 shadow-inner transition ${
                      receiveReceiverAddress
                        ? isReceiveAddressValid
                          ? 'border-emerald-500 ring-1 ring-emerald-500/40 bg-white'
                          : 'border-red-500 ring-1 ring-red-500/40 bg-white'
                        : 'border-slate-300 focus:border-blue-600 bg-white'
                    }`}
                  />
                  {receiveReceiverAddress && (
                    <button
                      type="button"
                      onClick={handleCopyReceiveAddress}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedReceiveAddress ? (
                        <Check className="w-4 h-4 text-emerald-600" />
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
                      <span>Enter the merchant wallet that will receive funds or select an Active Receiver in Settings.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 02 Select Network */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                      02
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Select Network <span className="text-red-500">*</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Step 2 of 4</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Polygon Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveNetworkId(POLYGON_CHAIN_ID);
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2.5 text-sm font-black transition cursor-pointer ${
                      receiveNetworkId === POLYGON_CHAIN_ID
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token="POL" size={24} />
                    <span>Polygon PoS</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                      receiveNetworkId === POLYGON_CHAIN_ID
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}>137</span>
                  </button>

                  {/* Ethereum Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveNetworkId(ETHEREUM_CHAIN_ID);
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2.5 text-sm font-black transition cursor-pointer ${
                      receiveNetworkId === ETHEREUM_CHAIN_ID
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-2 ring-blue-500/30'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-blue-500 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token="ETH" size={24} />
                    <span>Ethereum</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                      receiveNetworkId === ETHEREUM_CHAIN_ID
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}>1</span>
                  </button>
                </div>
              </div>

              {/* 03 Select Token */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                      03
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Select Token <span className="text-red-500">*</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Step 3 of 4</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* USDT */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('usdt');
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-black transition cursor-pointer ${
                      receiveTokenId === 'usdt'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token="USDT" size={22} />
                    <span>USDT</span>
                  </button>

                  {/* USDC */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('usdc');
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-black transition cursor-pointer ${
                      receiveTokenId === 'usdc'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-2 ring-blue-500/30'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-blue-500 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token="USDC" size={22} />
                    <span>USDC</span>
                  </button>

                  {/* VERSE */}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveTokenId('verse');
                      setIsQrGenerated(false);
                      setReceiveValidationError(null);
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-black transition cursor-pointer ${
                      receiveTokenId === 'verse'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-sm ring-2 ring-purple-500/30'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-purple-500 hover:bg-slate-100'
                    }`}
                  >
                    <TokenIcon token="VERSE" size={22} />
                    <span>VERSE</span>
                  </button>
                </div>

                {/* Contract address preview */}
                {receiveNetworkConfig && !receiveNetworkConfig.isNative && (
                  <p className="mt-2 text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate">
                    <span>Contract:</span>
                    <span className="truncate text-slate-700 font-semibold">{receiveNetworkConfig.address}</span>
                  </p>
                )}
              </div>

              {/* 04 Amount (Optional) */}
              <div className={!isReceiveAddressValid ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                      04
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Amount (Optional)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Step 4 of 4</span>
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
                      setReceiveValidationError(null);
                    }}
                    placeholder="Leave empty for customer-specified amount"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 pr-16 shadow-inner font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-700 select-none">
                    {receiveSelectedToken?.symbol || 'USDT'}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500">
                  {receiveAmount && parseFloat(receiveAmount) > 0
                    ? `Requesting exactly ${receiveAmount} ${receiveSelectedToken?.symbol}. The customer wallet will prefill this amount.`
                    : 'Customer wallet will prompt the payer to specify any amount.'}
                </p>
              </div>

              {/* Validation Error Banner (if any) */}
              {receiveValidationError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-red-900 block">Action Required</span>
                    <span>{receiveValidationError}</span>
                  </div>
                </div>
              )}

              {/* Action Button: Generate Payment QR */}
              <div>
                <button
                  type="button"
                  onClick={handleGenerateReceiveQR}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 text-white active:scale-[0.99] shadow-purple-500/25 border border-white/20"
                >
                  <span>Generate Payment QR</span>
                  <LayoutGrid className="w-4 h-4 stroke-[2.5] text-white" />
                </button>

                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400 font-medium justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676] flex-shrink-0" />
                  <span>
                    {isReceiveAddressValid
                      ? 'Valid inputs ready. Click generate to produce live EIP-681 payment request.'
                      : 'Enter a receiver address above to generate standard payment QR.'}
                  </span>
                </div>
              </div>

            </div>

            {/* ----------------- RIGHT PANEL: Payment QR Display (5 cols) ----------------- */}
            <div id="payment-qr-display-panel" className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-slate-200 shadow-xl flex flex-col justify-between space-y-5">
              
              {/* Header with LIVE badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Payment QR</h3>
                {isQrGenerated && isReceiveAddressValid ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE ON-CHAIN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold tracking-wide uppercase">
                    Awaiting Inputs
                  </span>
                )}
              </div>

              {/* QR Code Frame with centered logo badge */}
              <div className="relative mx-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center min-h-[240px] w-full">
                {isQrGenerated && isReceiveAddressValid && generatedReceiveQrUri ? (
                  <QRCodeSVG
                    id="payment-qr-svg"
                    value={generatedReceiveQrUri}
                    size={210}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: '/icons/icon-192x192.png',
                      x: undefined,
                      y: undefined,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                ) : (
                  <div className="py-12 px-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Payment QR Not Generated</p>
                    <p className="text-xs text-slate-500 max-w-[220px] mx-auto">
                      Fill out the receiver address, select network & token, then click Generate Payment QR.
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Details Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Request Parameters
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <TokenIcon token={receiveNetworkId === POLYGON_CHAIN_ID ? 'POL' : 'ETH'} size={14} />
                      <span>Network</span>
                    </div>
                    <span className="font-bold text-emerald-700">
                      {receiveNetworkId === POLYGON_CHAIN_ID ? 'Polygon PoS (Chain ID 137)' : 'Ethereum (Chain ID 1)'}
                    </span>
                  </div>

                  {/* Token */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <TokenIcon token={receiveSelectedToken?.symbol || 'USDT'} size={14} />
                      <span>Token</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {receiveSelectedToken?.symbol} ({receiveSelectedToken?.name})
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Amount</span>
                    </div>
                    <span className="font-bold text-amber-700">
                      {receiveAmount && parseFloat(receiveAmount) > 0
                        ? `${parseFloat(receiveAmount).toFixed(2)} ${receiveSelectedToken?.symbol}`
                        : 'Any amount (Open)'}
                    </span>
                  </div>

                  {/* Receiver */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Receiver</span>
                    </div>
                    <span className="font-mono text-slate-800 font-bold truncate max-w-[140px]" title={receiveReceiverAddress}>
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
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-900">{shareSuccessToast ? 'Link / URI Copied!' : 'Share / Copy Payment URI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-900">Download QR Image</span>
                  </button>
                </div>
              )}

              {/* On-Chain Payment Verification Box */}
              {isQrGenerated && isReceiveAddressValid && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">Verify Payment On-Chain</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">RPC Node Verified</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
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
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        disabled={isVerifyingTx || !manualTxHash}
                        onClick={() => handleVerifyIncomingPayment()}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs"
                      >
                        {isVerifyingTx ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-white" />
                        )}
                        <span className="text-white">{isVerifyingTx ? 'Checking...' : 'Verify'}</span>
                      </button>
                    </div>

                    {verificationError && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{verificationError}</span>
                      </div>
                    )}

                    {receiveVerifiedRecord && (
                      <div className="p-2.5 rounded-xl bg-white border border-emerald-400 text-slate-900 text-xs space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Payment Verified & Saved!</span>
                          </span>
                          <span className="text-[10px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-700 font-bold">
                            Block #{receiveVerifiedRecord.blockNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 space-y-0.5 font-mono">
                          <div>Amount: <span className="text-emerald-700 font-bold">{receiveVerifiedRecord.amount} {receiveVerifiedRecord.tokenLabel}</span></div>
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
                            className="text-[11px] font-semibold text-blue-600 underline hover:text-blue-800 flex items-center gap-1"
                          >
                            <span>View on Explorer</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => generatePaymentReceiptPdf(receiveVerifiedRecord)}
                            className="text-[11px] font-semibold text-emerald-700 underline hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
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
