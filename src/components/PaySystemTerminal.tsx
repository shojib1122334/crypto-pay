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
  Coins,
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

type PayTabMode = 'send' | 'receive' | 'balances';

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

  // Active Terminal Tab: Send Crypto | Receive / QR | Token Balance
  const [activeTab, setActiveTab] = useState<PayTabMode>('send');

  // Multi-chain and token states
  const [selectedChainId, setSelectedChainId] = useState<number>(POLYGON_CHAIN_ID);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('usdt');

  // Balances & Prices
  const [balances, setBalances] = useState<TokenBalanceInfo[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [, setLastSyncTime] = useState<Date>(new Date());

  // Send Form State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('10.00');
  const [sendError, setSendError] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<'idle' | 'preparing' | 'awaiting_signature' | 'broadcasting' | 'success' | 'error'>('idle');
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastVerifiedRecord, setLastVerifiedRecord] = useState<VerifiedTransactionRecord | null>(null);

  // Receive Form State
  const [receiveReceiverAddress, setReceiveReceiverAddress] = useState<string>('0x82af8d4a91F2b3c4D56e7F81731536bDEcf43c0a');
  const [receiveNetworkId, setReceiveNetworkId] = useState<number>(POLYGON_CHAIN_ID);
  const [receiveTokenId, setReceiveTokenId] = useState<string>('usdt');
  const [receiveAmount, setReceiveAmount] = useState('50.00');
  const [copiedReceiveAddress, setCopiedReceiveAddress] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);

  // Sync connected wallet address into receiver address if empty or when connected
  useEffect(() => {
    if (address && isAddress(address)) {
      setReceiveReceiverAddress(address);
    }
  }, [address]);

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

  // Load balances and prices
  const loadBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    try {
      const priceMap = await fetchCryptoPrices();
      setPrices(priceMap);

      if (address && isAddress(address)) {
        const userBalances = await fetchAllUserBalances(address as Address, priceMap);
        setBalances(userBalances);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Failed to sync on-chain data:', err);
    } finally {
      setIsLoadingBalances(false);
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

  // Generate Receive URI for the QR code
  const generatedReceiveQrUri = useMemo(() => {
    const targetAddr = receiveReceiverAddress || address || '0x82af8d4a91F2b3c4D56e7F81731536bDEcf43c0a';
    if (!isAddress(targetAddr)) {
      return targetAddr;
    }
    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      return targetAddr;
    }
    if (receiveNetworkConfig?.isNative) {
      return `ethereum:${targetAddr}?value=${parseUnits(receiveAmount, 18)}`;
    }
    return buildPaymentQRUri(
      targetAddr,
      receiveAmount,
      receiveNetworkConfig?.address || ('0x000' as Address),
      receiveNetworkId,
      receiveNetworkConfig?.decimals || 18
    );
  }, [receiveReceiverAddress, address, receiveAmount, receiveNetworkConfig, receiveNetworkId]);

  // Copy Receive Address Handler
  const handleCopyReceiveAddress = () => {
    navigator.clipboard.writeText(receiveReceiverAddress);
    setCopiedReceiveAddress(true);
    setTimeout(() => setCopiedReceiveAddress(false), 2000);
  };

  // Share QR Handler
  const handleShareQR = () => {
    if (navigator.share) {
      navigator.share({
        title: `Payment Request: ${receiveAmount} ${receiveSelectedToken?.symbol}`,
        text: `Send ${receiveAmount} ${receiveSelectedToken?.symbol} on ${receiveNetworkId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'} to ${receiveReceiverAddress}`,
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

  const isReceiveAddressValid = isAddress(receiveReceiverAddress);

  return (
    <div id="cryptopay-terminal-container" className="py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      
      {/* Top Navigation Tabs */}
      <div className="bg-slate-100/90 rounded-2xl p-1.5 border border-slate-200/90 shadow-2xs flex items-center gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'send'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Send className={`w-4 h-4 ${activeTab === 'send' ? 'text-slate-900' : 'text-slate-500'}`} />
          <span>Send Crypto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receive')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'receive'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <QrCode className={`w-4 h-4 ${activeTab === 'receive' ? 'text-slate-900' : 'text-slate-500'}`} />
          <span>Receive / QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Coins className={`w-4 h-4 ${activeTab === 'balances' ? 'text-slate-900' : 'text-slate-500'}`} />
          <span>Token Balance</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SEND CRYPTO (Exact Layout & Elements from Screenshot 1) */}
      {/* ========================================================================= */}
      {activeTab === 'send' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl">
          
          {/* A. Network Selection Section */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 mb-3">Network</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Polygon PoS Option */}
              <button
                type="button"
                onClick={() => handleNetworkSwitch(POLYGON_CHAIN_ID)}
                className={`relative p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedChainId === POLYGON_CHAIN_ID
                    ? 'bg-white border-slate-300 ring-1 ring-slate-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="POL" size={30} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">Polygon PoS</span>
                  </div>
                </div>

                {selectedChainId === POLYGON_CHAIN_ID && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
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
                    ? 'bg-white border-slate-300 ring-1 ring-slate-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <TokenIcon token="ETH" size={30} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">Ethereum</span>
                  </div>
                </div>

                {selectedChainId === ETHEREUM_CHAIN_ID && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* B. Token Selection Section (2x2 Grid) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Token</h3>
              <span className="text-xs font-normal text-slate-400">
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
                        ? 'bg-white border-slate-300 ring-1 ring-slate-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <TokenIcon token={item.symbol} size={32} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {item.symbol}
                      </div>
                      <div className="text-xs text-slate-400 font-normal leading-tight mt-0.5">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 font-normal mt-1 truncate">
                        {tokenBal} {item.symbol}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
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
            <h3 className="text-base font-bold text-slate-900 mb-2">Recipient Address</h3>
            <div className="relative">
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value.trim());
                  setSendError(null);
                }}
                placeholder="0x... Enter EVM address"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 pr-12 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>

            {/* Validation & Hint */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
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
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-medium cursor-pointer"
                >
                  Use My Address
                </button>
              )}
            </div>

            {scannedSuccessToast && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{scannedSuccessToast}</span>
              </div>
            )}
          </div>

          {/* D. Amount Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">Amount</h3>
              <span className="text-xs font-normal text-slate-400">
                Balance: {currentTokenBalance} {currentToken?.symbol}
              </span>
            </div>

            {/* Amount input box with Token badge on right */}
            <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-between mb-3 shadow-inner">
              <input
                type="number"
                step="any"
                value={sendAmount}
                onChange={(e) => {
                  setSendAmount(e.target.value);
                  setSendError(null);
                }}
                placeholder="10.00"
                className="w-full bg-transparent text-2xl font-bold text-slate-900 focus:outline-none pl-2 font-mono"
              />

              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-full flex items-center gap-1.5 shadow-sm flex-shrink-0">
                <TokenIcon token={currentToken?.symbol || 'USDT'} size={18} />
                <span className="text-xs font-bold text-slate-800">{currentToken?.symbol}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                      ? 'border-slate-400 bg-slate-100 text-slate-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
                className="px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold shadow-sm transition cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Error Message */}
          {sendError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Transaction Steps & Confirmation */}
          {txStep === 'awaiting_signature' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mb-4 animate-pulse">
              <div className="text-xs font-bold">Please approve the transaction in your wallet...</div>
            </div>
          )}

          {txStep === 'broadcasting' && (
            <div className="p-4 rounded-xl bg-slate-900 text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Broadcasting on-chain settlement...</span>
              </div>
              {activeTxHash && (
                <a
                  href={`${currentNetworkConfig?.blockExplorerUrl}/tx/${activeTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-yellow-300 hover:underline flex items-center gap-1"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {txStep === 'success' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 mb-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Transaction Settled & Verified On-Chain
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Transferred {sendAmount} {currentToken?.symbol} to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Confirmed
                </span>
              </div>

              {lastVerifiedRecord && (
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/60 text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Polygon Block:</span>
                    <span className="font-mono text-slate-800 font-bold">#{lastVerifiedRecord.blockNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tx Hash:</span>
                    <a
                      href={`https://polygonscan.com/tx/${lastVerifiedRecord.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
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
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <span>Send Another Transfer</span>
                </button>
              </div>
            </div>
          )}

          {txStep === 'error' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 mb-4 text-xs font-mono break-all">
              {errorMessage}
            </div>
          )}

          {/* E. Bottom Call to Action Button */}
          {isConnected ? (
            <button
              type="button"
              onClick={handleSendTransaction}
              disabled={txStep === 'awaiting_signature' || txStep === 'broadcasting'}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-lg transition disabled:opacity-50 cursor-pointer"
            >
              <div className="w-6" />
              <span className="flex-1 text-center">
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
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-base flex items-center justify-between shadow-lg transition cursor-pointer"
            >
              <Wallet className="w-5 h-5 text-white" />
              <span className="flex-1 text-center">Connect Wallet to Send</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: RECEIVE CRYPTO QR (Exact 2-Panel Layout from Screenshot 2) */}
      {/* ========================================================================= */}
      {activeTab === 'receive' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Receive QR
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter receiver address and amount to generate payment QR
            </p>
          </div>

          {/* Two-Column Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ----------------- LEFT PANEL: Form Configuration (7 cols) ----------------- */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
              
              {/* 01 Receiver Address */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    01
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Receiver Address
                  </h3>
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={receiveReceiverAddress}
                    onChange={(e) => setReceiveReceiverAddress(e.target.value.trim())}
                    placeholder="0x... Enter EVM receiver address"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 pr-10 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReceiveAddress}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedReceiveAddress ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{isReceiveAddressValid ? 'Valid address' : 'Enter a valid 0x address'}</span>
                </div>
              </div>

              {/* 02 Select Network */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    02
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Select Network
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Polygon Button */}
                  <button
                    type="button"
                    onClick={() => setReceiveNetworkId(POLYGON_CHAIN_ID)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition cursor-pointer ${
                      receiveNetworkId === POLYGON_CHAIN_ID
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TokenIcon token="POL" size={20} />
                    <span>Polygon</span>
                  </button>

                  {/* Ethereum Button */}
                  <button
                    type="button"
                    onClick={() => setReceiveNetworkId(ETHEREUM_CHAIN_ID)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition cursor-pointer ${
                      receiveNetworkId === ETHEREUM_CHAIN_ID
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TokenIcon token="ETH" size={20} />
                    <span>Ethereum</span>
                  </button>
                </div>
              </div>

              {/* 03 Select Token */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    03
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Select Token
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* USDT */}
                  <button
                    type="button"
                    onClick={() => setReceiveTokenId('usdt')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'usdt'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TokenIcon token="USDT" size={20} />
                    <span>USDT</span>
                  </button>

                  {/* USDC */}
                  <button
                    type="button"
                    onClick={() => setReceiveTokenId('usdc')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'usdc'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TokenIcon token="USDC" size={20} />
                    <span>USDC</span>
                  </button>

                  {/* VERSE */}
                  <button
                    type="button"
                    onClick={() => setReceiveTokenId('verse')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                      receiveTokenId === 'verse'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TokenIcon token="VERSE" size={20} />
                    <span>VERSE</span>
                  </button>
                </div>
              </div>

              {/* 04 Amount (Optional) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    04
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Amount (Optional)
                  </h3>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    placeholder="50.00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 pr-16 shadow-sm font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
                    {receiveSelectedToken?.symbol || 'USDT'}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-400">
                  If amount is set, the wallet will pre-fill this amount.
                </p>
              </div>

              {/* Action Button: Generate Payment QR */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('payment-qr-display-panel');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Generate Payment QR</span>
                  <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
                </button>

                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 font-medium justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />
                  <span>QR will include address, network, token and amount (if set).</span>
                </div>
              </div>

            </div>

            {/* ----------------- RIGHT PANEL: Payment QR Display (5 cols) ----------------- */}
            <div id="payment-qr-display-panel" className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-5">
              
              {/* Header with LIVE badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Payment QR</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wide uppercase">
                  LIVE
                </span>
              </div>

              {/* QR Code Frame with centered logo badge */}
              <div className="relative mx-auto p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
                <QRCodeSVG
                  id="payment-qr-svg"
                  value={generatedReceiveQrUri || '0x82af8d4a91F2b3c4D56e7F81731536bDEcf43c0a'}
                  size={200}
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
              </div>

              {/* Payment Details Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Payment Details
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <TokenIcon token={receiveNetworkId === POLYGON_CHAIN_ID ? 'POL' : 'ETH'} size={14} />
                      <span>Network</span>
                    </div>
                    <span className="font-semibold text-purple-700">
                      {receiveNetworkId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'}
                    </span>
                  </div>

                  {/* Token */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <TokenIcon token={receiveSelectedToken?.symbol || 'USDT'} size={14} />
                      <span>Token</span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {receiveSelectedToken?.symbol}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Amount</span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {receiveAmount ? `${parseFloat(receiveAmount).toFixed(2)} ${receiveSelectedToken?.symbol}` : 'Any amount'}
                    </span>
                  </div>

                  {/* Receiver */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Receiver</span>
                    </div>
                    <span className="font-mono text-slate-700 truncate max-w-[140px]" title={receiveReceiverAddress}>
                      {receiveReceiverAddress.slice(0, 6)}...{receiveReceiverAddress.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Share QR & Download QR */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareQR}
                  className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/70 hover:bg-emerald-50 text-emerald-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{shareSuccessToast ? 'Link / URI Copied!' : 'Share QR'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/70 hover:bg-emerald-50 text-emerald-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TOKEN BALANCE */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Token Balances</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live on-chain wallet holdings across Polygon & Ethereum</p>
            </div>

            <button
              type="button"
              onClick={loadBalances}
              disabled={isLoadingBalances}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-3">
            {PRIMARY_GRID_TOKENS.map((tok) => {
              const polyBal = balances.find((b) => b.symbol.toLowerCase() === tok.symbol.toLowerCase() && b.chainId === POLYGON_CHAIN_ID)?.balance || '0.00';
              const ethBal = balances.find((b) => b.symbol.toLowerCase() === tok.symbol.toLowerCase() && b.chainId === ETHEREUM_CHAIN_ID)?.balance || '0.00';
              const tokenPrice = prices[tok.symbol] || 1.0;

              return (
                <div
                  key={tok.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <TokenIcon token={tok.symbol} size={36} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{tok.symbol}</span>
                        <span className="text-xs text-slate-400">({tok.name})</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        ${tokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block uppercase font-medium">Polygon</span>
                      <span className="font-mono text-xs font-bold text-slate-800">{polyBal} {tok.symbol}</span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block uppercase font-medium">Ethereum</span>
                      <span className="font-mono text-xs font-bold text-slate-800">{ethBal} {tok.symbol}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTokenId(tok.id);
                        setActiveTab('send');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              );
            })}
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
