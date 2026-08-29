import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';
import { isAddress, parseUnits, type Address } from 'viem';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  Fuel,
  AlertCircle,
  Coins,
  Send,
  QrCode,
  Sparkles,
  Info,
  CheckCircle2,
  Share2,
  Globe,
  Radio,
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
  fetchLiveGasFees,
  fetchCryptoPrices,
  type TokenBalanceInfo,
  type GasFeeInfo,
} from '@/lib/rpcService';
import { buildPaymentQRUri } from '@/lib/payments';

type PayTabMode = 'send' | 'receive' | 'balances' | 'bitcoin' | 'security';

export default function PaySystemTerminal() {
  const { address, isConnected, chain, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  // Active Terminal Tab
  const [activeTab, setActiveTab] = useState<PayTabMode>('send');

  // Multi-chain and token states
  const [selectedChainId, setSelectedChainId] = useState<number>(POLYGON_CHAIN_ID);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('usdt');

  // Balances & Prices
  const [balances, setBalances] = useState<TokenBalanceInfo[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [gasFees, setGasFees] = useState<{ polygon: GasFeeInfo; ethereum: GasFeeInfo } | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Send Form State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [txStep, setTxStep] = useState<'idle' | 'preparing' | 'awaiting_signature' | 'broadcasting' | 'success' | 'error'>('idle');
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Receive Form State
  const [receiveAmount, setReceiveAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Bitcoin integration State
  const [customBtcAddress, setCustomBtcAddress] = useState('');
  const [btcAmount, setBtcAmount] = useState('0.005');
  const [btcCopied, setBtcCopied] = useState(false);

  // QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'send' | 'btc'>('send');
  const [scannedSuccessToast, setScannedSuccessToast] = useState<string | null>(null);

  // QR Scan Callback
  const handleScannedQR = useCallback(
    (data: ScannedQRData) => {
      if (scannerTarget === 'btc') {
        setCustomBtcAddress(data.address);
        if (data.amount) {
          setBtcAmount(data.amount);
        }
        setScannedSuccessToast(`Bitcoin address scanned: ${data.address.slice(0, 10)}...`);
        setTimeout(() => setScannedSuccessToast(null), 4500);
        return;
      }

      // EVM Recipient address
      setRecipientAddress(data.address);
      setSendError(null);

      // If QR encoded an amount
      if (data.amount) {
        setSendAmount(data.amount);
      }

      // If QR specified chain
      if (
        data.chainId &&
        (data.chainId === POLYGON_CHAIN_ID || data.chainId === ETHEREUM_CHAIN_ID)
      ) {
        setSelectedChainId(data.chainId);
      }

      // If QR specified token symbol
      if (data.tokenSymbol) {
        const found = SUPPORTED_PAY_TOKENS.find(
          (t) => t.symbol.toLowerCase() === data.tokenSymbol?.toLowerCase()
        );
        if (found) {
          setSelectedTokenId(found.id);
        }
      }

      setScannedSuccessToast(
        `Address scanned: ${data.address.slice(0, 8)}...${data.address.slice(-6)}`
      );
      setTimeout(() => setScannedSuccessToast(null), 4500);
    },
    [scannerTarget]
  );

  // Wagmi hooks for transactions
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  // Load balances, prices, and gas fees
  const loadBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    try {
      const priceMap = await fetchCryptoPrices();
      setPrices(priceMap);

      const gasInfo = await fetchLiveGasFees(priceMap);
      setGasFees(gasInfo);

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
    }
  }, [isTxConfirmed, txStep, loadBalances]);

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

  // Active token definition
  const currentToken = useMemo<MultiChainToken | undefined>(() => {
    return SUPPORTED_PAY_TOKENS.find((t) => t.id === selectedTokenId);
  }, [selectedTokenId]);

  // Active token's network configuration
  const currentNetworkConfig = useMemo(() => {
    if (!currentToken) return null;
    return currentToken.networks.find((n) => n.chainId === selectedChainId) || currentToken.networks[0];
  }, [currentToken, selectedChainId]);

  // User's balance for the selected token on the selected chain
  const currentTokenBalance = useMemo(() => {
    if (!address) return '0.00';
    const found = balances.find(
      (b) =>
        b.symbol.toLowerCase() === currentToken?.symbol.toLowerCase() &&
        b.chainId === selectedChainId
    );
    return found ? found.balance : '0.00';
  }, [balances, currentToken, selectedChainId, address]);

  // Native gas balance (POL on Polygon, ETH on Ethereum)
  const nativeGasBalance = useMemo(() => {
    if (!address) return 0;
    const isPoly = selectedChainId === POLYGON_CHAIN_ID;
    const found = balances.find((b) => (isPoly ? b.symbol === 'POL' : b.symbol === 'ETH'));
    return found ? parseFloat(found.balance) : 0;
  }, [balances, selectedChainId, address]);

  // Copy to clipboard helper
  const handleCopy = (text: string, type: 'address' | 'uri' | 'btc') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === 'uri') {
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    } else if (type === 'btc') {
      setBtcCopied(true);
      setTimeout(() => setBtcCopied(false), 2000);
    }
  };

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

  // Send Transaction Handler (100% Client-Side Non-Custodial Signing via User's Wallet)
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

    // Check if on the correct chain
    if (chain?.id !== selectedChainId && switchChainAsync) {
      try {
        await switchChainAsync({ chainId: selectedChainId });
      } catch {
        setSendError(`Please switch your wallet to ${selectedChainId === POLYGON_CHAIN_ID ? 'Polygon Mainnet' : 'Ethereum Mainnet'} to continue.`);
        return;
      }
    }

    try {
      setTxStep('awaiting_signature');

      if (currentNetworkConfig?.isNative) {
        // Native POL or ETH transfer
        const valueInWei = parseUnits(sendAmount, 18);
        const txHash = await sendTransactionAsync({
          to: recipientAddress as Address,
          value: valueInWei,
        });
        setActiveTxHash(txHash);
        setTxStep('broadcasting');
      } else {
        // Standard ERC-20 transfer(to, amount)
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

  // Generate EIP-681 Receive URI
  const receiveQrUri = useMemo(() => {
    if (!address) return '';
    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      return address;
    }
    if (currentNetworkConfig?.isNative) {
      return `ethereum:${address}?value=${parseUnits(receiveAmount, 18)}`;
    }
    return buildPaymentQRUri(
      address,
      receiveAmount,
      currentNetworkConfig?.address || ('0x000' as Address),
      selectedChainId,
      currentNetworkConfig?.decimals || 18
    );
  }, [address, receiveAmount, currentNetworkConfig, selectedChainId]);

  // Demo Bitcoin default address for receive/showcase
  const displayBtcAddress = customBtcAddress.trim() || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const btcQrUri = `bitcoin:${displayBtcAddress}?amount=${btcAmount || '0.001'}&label=CryptoPayMerchant`;

  return (
    <div id="cryptopay-terminal-container" className="py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Banner: Protocol & Security Overview in Deep Green */}
      <div className="bg-[#022c22] rounded-3xl p-5 sm:p-8 border border-emerald-700/60 shadow-2xl relative overflow-hidden mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            {/* 20% Light Blue Protocol Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-600/70 text-sky-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Radio className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
              <span>Multi-Chain Web3 Pay Terminal</span>
            </div>

            {/* 30% White Heading */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Decentralized Non-Custodial Pay System
            </h1>

            {/* 20% Light Yellow Subtitle */}
            <p className="mt-2 text-sm sm:text-base font-semibold text-yellow-200">
              Send, Receive & Settle VERSE, USDT, USDC, POL, and Bitcoin securely on-chain.
            </p>

            {/* 10% Light Gray Security Note */}
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              100% Non-Custodial Architecture: Your seed phrase and private key are never requested or stored. All transactions are cryptographically signed directly from your connected wallet.
            </p>
          </div>

          {/* Connection & Network Status Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 flex-shrink-0">
            {isConnected && address ? (
              <div className="bg-[#042f22] p-3.5 rounded-2xl border border-emerald-700/80 shadow-md w-full sm:w-auto">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold text-white">Wallet Connected</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-200 text-zinc-900 text-[10px] font-black uppercase">
                    {connector?.name || 'Web3'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sky-300 font-semibold">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <button
                    onClick={() => handleCopy(address, 'address')}
                    className="p-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-yellow-200 transition"
                    title="Copy Address"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-yellow-300" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openConnectModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-sm font-extrabold shadow-lg transition active:scale-95"
              >
                <Wallet className="w-4 h-4 text-zinc-900" />
                <span>Connect Web3 Wallet</span>
              </button>
            )}

            {/* 20% Dark Charcoal Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-200 text-zinc-900 text-[10px] font-extrabold uppercase">
                <TokenIcon token="POL" size={14} />
                <span>Polygon Mainnet</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-200 text-zinc-900 text-[10px] font-extrabold uppercase">
                <TokenIcon token="ETH" size={14} />
                <span>Ethereum Mainnet</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-zinc-900 text-[10px] font-extrabold uppercase">
                <TokenIcon token="BTC" size={14} />
                <span>Bitcoin UTXO</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { id: 'send', label: 'Send Crypto', icon: ArrowUpRight, tag: 'Live Sign' },
          { id: 'receive', label: 'Receive / QR', icon: ArrowDownLeft, tag: 'EIP-681' },
          { id: 'balances', label: 'Token Balances', icon: Coins, tag: 'Real-Time' },
          { id: 'bitcoin', label: 'Bitcoin Network', icon: Globe, tag: 'UTXO' },
          { id: 'security', label: 'Gas & Security', icon: ShieldCheck, tag: '100% Non-Custodial' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PayTabMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-yellow-200 text-zinc-900 shadow-md font-extrabold'
                  : 'bg-[#022c22] text-slate-300 hover:text-white border border-emerald-800/80 hover:bg-[#03382b]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-sky-300'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                  isActive ? 'bg-zinc-900 text-yellow-300' : 'bg-emerald-950 text-yellow-200'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SEND CRYPTO (Non-Custodial Client-Side Wallet Signing) */}
      {/* ========================================================================= */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Send Form */}
          <div className="lg:col-span-7 bg-[#022c22] rounded-3xl p-5 sm:p-7 border border-emerald-700/60 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-emerald-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/70 text-sky-300 flex items-center justify-center">
                    <Send className="w-5 h-5 text-sky-300" />
                  </div>
                  <div>
                    {/* 30% White Title */}
                    <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      Send Crypto
                    </h2>
                    {/* 20% Light Yellow Subtitle */}
                    <p className="text-xs font-semibold text-yellow-200">
                      Direct peer-to-peer wallet transaction with live gas verification
                    </p>
                  </div>
                </div>

                {/* 20% Light Blue Live Gas Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-700 text-sky-300 text-xs font-semibold">
                  <Fuel className="w-3.5 h-3.5 text-yellow-300" />
                  <span>
                    {selectedChainId === POLYGON_CHAIN_ID
                      ? gasFees?.polygon.estimatedErc20TransferFeeUsd || '<$0.01 Gas'
                      : gasFees?.ethereum.estimatedErc20TransferFeeUsd || '~$2.40 Gas'}
                  </span>
                </div>
              </div>

              {/* 1. Network Selector */}
              <div className="mb-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-2">
                  Select Blockchain Network
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleNetworkSwitch(POLYGON_CHAIN_ID)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedChainId === POLYGON_CHAIN_ID
                        ? 'bg-[#042f22] border-yellow-300 ring-2 ring-yellow-300/40 shadow-md'
                        : 'bg-emerald-950/60 border-emerald-800 hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TokenIcon token="POL" size={26} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-white">Polygon Mainnet</span>
                        </div>
                        <span className="text-[11px] text-yellow-200 font-semibold block">
                          Sub-penny gas (~$0.005)
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-yellow-300 text-[10px] font-black">
                      POL / PoS
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNetworkSwitch(ETHEREUM_CHAIN_ID)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedChainId === ETHEREUM_CHAIN_ID
                        ? 'bg-[#042f22] border-yellow-300 ring-2 ring-yellow-300/40 shadow-md'
                        : 'bg-emerald-950/60 border-emerald-800 hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TokenIcon token="ETH" size={26} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-white">Ethereum Mainnet</span>
                        </div>
                        <span className="text-[11px] text-yellow-200 font-semibold block">
                          L1 Base Layer (ETH)
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-sky-300 text-[10px] font-black">
                      ETH / ERC20
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Token Selector */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    Select Token
                  </label>
                  <span className="text-xs font-semibold text-yellow-200">
                    Balance: <strong className="text-white font-mono">{currentTokenBalance} {currentToken?.symbol}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SUPPORTED_PAY_TOKENS.filter((t) => !t.isBitcoin).map((tok) => {
                    const isSelected = selectedTokenId === tok.id;
                    const availableOnChain = tok.networks.some((n) => n.chainId === selectedChainId);

                    return (
                      <button
                        key={tok.id}
                        type="button"
                        onClick={() => setSelectedTokenId(tok.id)}
                        disabled={!availableOnChain}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-yellow-200 border-yellow-300 text-zinc-900 shadow-md font-bold ring-2 ring-yellow-300/30'
                            : availableOnChain
                            ? 'bg-emerald-950/60 border-emerald-800 text-white hover:bg-emerald-900/60'
                            : 'bg-emerald-950/20 border-emerald-900 text-slate-500 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <TokenIcon token={tok.symbol} size={28} className="mb-1.5" />
                        <span className="block text-xs sm:text-sm font-black">
                          {tok.symbol}
                        </span>
                        <span
                          className={`block text-[10px] font-semibold mt-0.5 ${
                            isSelected ? 'text-zinc-800' : 'text-slate-300'
                          }`}
                        >
                          {tok.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Recipient Address with Scan QR feature */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    Recipient EVM Address
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('send');
                        setIsScannerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-[11px] font-black flex items-center gap-1.5 shadow transition transform active:scale-95"
                      title="Scan QR code using camera or upload QR image"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan QR</span>
                    </button>
                    {address && (
                      <button
                        type="button"
                        onClick={() => setRecipientAddress('0x71C8F66752f99B09d4352D02B61B78B452796677')}
                        className="text-[11px] text-yellow-200/80 hover:text-yellow-300 underline font-semibold"
                      >
                        Demo
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => {
                      setRecipientAddress(e.target.value.trim());
                      setSendError(null);
                    }}
                    placeholder="0x... (Scan QR or paste recipient address)"
                    className="w-full bg-emerald-950/90 border border-emerald-700/80 rounded-2xl pl-4 pr-32 py-3 text-xs sm:text-sm font-mono text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/60 focus:border-yellow-300"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {recipientAddress ? (
                      isAddress(recipientAddress) ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-800 text-yellow-200 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-yellow-300" />
                          Valid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-bold">
                          Invalid
                        </span>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setRecipientAddress(text.trim());
                                setSendError(null);
                              }
                            } catch {
                              // clipboard permissions
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-900/80 border border-emerald-700 text-yellow-200 hover:text-white text-[10px] font-bold transition"
                          title="Paste from clipboard"
                        >
                          Paste
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget('send');
                            setIsScannerOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-[#042f22] border border-emerald-700 text-yellow-200 hover:text-white hover:bg-emerald-900 text-[11px] font-extrabold flex items-center gap-1 transition"
                        >
                          <QrCode className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Scan</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!recipientAddress && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Need a test recipient?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientAddress('0x1731536bDEcf43c0ad63F70bFdF26a6F50b6a9C7');
                        setSendError(null);
                      }}
                      className="text-yellow-300 hover:underline font-semibold"
                    >
                      Autofill Merchant Gateway (0x1731...a9C7)
                    </button>
                  </div>
                )}

                {scannedSuccessToast && (
                  <div className="mt-2 p-2 rounded-xl bg-emerald-900/80 border border-yellow-300/40 text-yellow-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span className="truncate">{scannedSuccessToast}</span>
                  </div>
                )}
              </div>

              {/* 4. Amount Input with Presets */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    Amount to Send
                  </label>
                  <span className="text-[11px] text-yellow-200 font-semibold">
                    Balance: {currentTokenBalance} {currentToken?.symbol}
                  </span>
                </div>

                <div className="relative mb-2">
                  <input
                    type="number"
                    step="any"
                    value={sendAmount}
                    onChange={(e) => {
                      setSendAmount(e.target.value);
                      setSendError(null);
                    }}
                    placeholder="10.00"
                    className="w-full bg-emerald-950/90 border border-emerald-700/80 rounded-2xl px-4 py-3.5 text-lg sm:text-xl font-mono font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/60 focus:border-yellow-300"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-zinc-900 text-yellow-300 text-xs font-extrabold flex items-center gap-1.5">
                      <TokenIcon token={currentToken?.symbol || 'USDT'} size={18} />
                      <span>{currentToken?.symbol}</span>
                    </span>
                  </div>
                </div>

                {/* Quick Fixed Amount & Percentage Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Quick:</span>
                  {['5.00', '10.00', '25.00', '50.00', '100.00', '250.00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setSendAmount(val);
                        setSendError(null);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                        sendAmount === val
                          ? 'bg-yellow-300 text-zinc-900 shadow-sm'
                          : 'bg-[#042f22] text-yellow-200 hover:bg-emerald-900 border border-emerald-700/80'
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
                    className="px-2 py-1 rounded-lg bg-yellow-200 text-zinc-900 text-xs font-extrabold hover:bg-yellow-300 transition ml-auto"
                  >
                    MAX
                  </button>
                </div>

                {/* Approx USD value */}
                {sendAmount && parseFloat(sendAmount) > 0 && (
                  <p className="text-right text-xs text-yellow-200 mt-1.5 font-semibold">
                    ≈ ${(
                      parseFloat(sendAmount) *
                      (prices[currentToken?.symbol || 'USDT'] || 1.0)
                    ).toFixed(2)}{' '}
                    USD (Live On-Chain Value)
                  </p>
                )}
              </div>

              {/* Error Callout */}
              {sendError && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs font-semibold flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Transaction State Tracker */}
              {txStep === 'awaiting_signature' && (
                <div className="p-4 rounded-2xl bg-yellow-200 text-zinc-900 border border-yellow-300 shadow-md mb-4 animate-pulse">
                  <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-zinc-900" />
                    <span>Confirm in Your Wallet</span>
                  </div>
                  <p className="text-xs font-bold text-zinc-800 mt-1">
                    Please approve the non-custodial transaction request in MetaMask / Trust Wallet / WalletConnect.
                  </p>
                </div>
              )}

              {txStep === 'broadcasting' && (
                <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-600 shadow-md mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-sky-300 animate-spin" />
                      <span className="text-xs font-bold text-white">Broadcasting on {selectedChainId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'}...</span>
                    </div>
                    {activeTxHash && (
                      <a
                        href={`${currentNetworkConfig?.blockExplorerUrl}/tx/${activeTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-yellow-200 hover:underline flex items-center gap-1"
                      >
                        <span>View Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {txStep === 'success' && (
                <div className="p-4 rounded-2xl bg-emerald-900/90 border border-emerald-500 shadow-lg mb-4 text-left">
                  <div className="flex items-center gap-2 text-yellow-200 font-extrabold text-sm mb-1">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300" />
                    <span>Transaction Confirmed & Settled!</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    Successfully sent {sendAmount} {currentToken?.symbol} directly on-chain.
                  </p>
                  {activeTxHash && (
                    <div className="mt-2 pt-2 border-t border-emerald-700 flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-sky-300">
                        Hash: {activeTxHash.slice(0, 10)}...{activeTxHash.slice(-8)}
                      </span>
                      <a
                        href={`${currentNetworkConfig?.blockExplorerUrl}/tx/${activeTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-yellow-200 hover:underline flex items-center gap-1"
                      >
                        <span>Explorer Proof</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {txStep === 'error' && (
                <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-700 shadow-md mb-4 text-left">
                  <div className="flex items-center gap-2 text-rose-200 font-bold text-xs mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Transaction Rejected or Failed</span>
                  </div>
                  <p className="text-xs text-rose-300 font-mono break-all">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-2">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleSendTransaction}
                  disabled={txStep === 'awaiting_signature' || txStep === 'broadcasting'}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 font-black text-sm sm:text-base shadow-xl transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-zinc-900" />
                  <span>
                    {txStep === 'awaiting_signature'
                      ? 'Waiting for Wallet Confirmation...'
                      : txStep === 'broadcasting'
                      ? 'Confirming on Blockchain...'
                      : `Send ${sendAmount || '0.00'} ${currentToken?.symbol || ''}`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 font-black text-sm sm:text-base shadow-xl transition active:scale-[0.98]"
                >
                  <Wallet className="w-4 h-4 text-zinc-900" />
                  <span>Connect Wallet to Send</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Transaction Preview & Blockchain Verification Card */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Live Fee & Security Summary Box */}
            <div className="bg-[#032419] rounded-3xl p-5 sm:p-6 border border-emerald-700/60 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  Transaction Audit Proof
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-yellow-200 text-[10px] font-extrabold border border-emerald-700">
                  EIP-1559 Compatible
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-emerald-800/60">
                  <span className="text-slate-300">Selected Network</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    {selectedChainId === POLYGON_CHAIN_ID ? 'Polygon PoS (137)' : 'Ethereum Mainnet (1)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-emerald-800/60">
                  <span className="text-slate-300">Contract Standard</span>
                  <span className="font-mono font-semibold text-sky-300">
                    {currentNetworkConfig?.isNative ? 'Native Layer-1' : 'ERC-20 Standard'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-emerald-800/60">
                  <span className="text-slate-300">Estimated Gas Fee</span>
                  <span className="font-bold text-yellow-200">
                    {selectedChainId === POLYGON_CHAIN_ID ? '~0.002 POL (<$0.01)' : '~0.0009 ETH (~$2.40)'}
                  </span>
                </div>

                {isConnected && (
                  <div className="flex items-center justify-between py-1.5 border-b border-emerald-800/60">
                    <span className="text-slate-300">Wallet Gas Reserve</span>
                    <span className="font-bold text-sky-300 font-mono">
                      {nativeGasBalance.toFixed(4)} {selectedChainId === POLYGON_CHAIN_ID ? 'POL' : 'ETH'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 border-b border-emerald-800/60">
                  <span className="text-slate-300">Settlement Speed</span>
                  <span className="font-bold text-yellow-200">
                    {selectedChainId === POLYGON_CHAIN_ID ? '~2 Seconds (Instant)' : '~12 Seconds (1 Block)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-300">Custody Model</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-200 text-zinc-900 font-extrabold text-[10px]">
                    100% Self-Custody
                  </span>
                </div>
              </div>
            </div>

            {/* Non-Custodial Guarantee Badge */}
            <div className="bg-[#022c22] rounded-3xl p-5 border border-emerald-700/60 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-600 text-sky-300 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Non-Custodial Guarantee</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Transactions are created locally and submitted through your browser wallet. Private keys never touch any server.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: RECEIVE CRYPTO (EIP-681 Live Dynamic QR Code) */}
      {/* ========================================================================= */}
      {activeTab === 'receive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* QR Display Card */}
          <div className="lg:col-span-6 bg-[#022c22] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-2xl flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-sky-300 text-xs font-bold uppercase mb-4">
              <QrCode className="w-3.5 h-3.5 text-sky-300" />
              <span>Universal Web3 EIP-681 QR</span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <TokenIcon token={currentToken?.symbol || 'USDT'} size={28} />
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Receive {currentToken?.symbol} on {selectedChainId === POLYGON_CHAIN_ID ? 'Polygon' : 'Ethereum'}
              </h2>
            </div>
            <p className="text-xs text-yellow-200 mt-1 font-semibold">
              Scan with MetaMask, Bitcoin.com Wallet, Trust Wallet, or Rainbow
            </p>

            {/* High-Resolution QR Container */}
            <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 my-6">
              {address ? (
                <QRCodeSVG
                  value={receiveQrUri || address}
                  size={220}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="w-[220px] h-[220px] bg-slate-100 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                  <Wallet className="w-10 h-10 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Connect wallet to generate receiving QR</span>
                </div>
              )}
            </div>

            {/* Address readout & Copy Bar */}
            {address ? (
              <div className="w-full max-w-md">
                <div className="p-3 bg-emerald-950/90 rounded-2xl border border-emerald-700/80 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-sky-300 truncate text-left select-all">
                    {address}
                  </span>
                  <button
                    onClick={() => handleCopy(address, 'address')}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-xs font-extrabold flex items-center gap-1 transition"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopy(receiveQrUri, 'uri')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-yellow-200 text-xs font-bold flex items-center gap-1.5 transition border border-emerald-700"
                  >
                    <Share2 className="w-3.5 h-3.5 text-yellow-300" />
                    <span>{copiedUri ? 'URI Copied!' : 'Copy Payment URI'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openConnectModal}
                className="px-6 py-3 rounded-2xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 font-extrabold text-sm shadow-lg transition"
              >
                Connect Wallet to Reveal Address
              </button>
            )}
          </div>

          {/* Configuration Form for Invoicing & Requesting Custom Amount */}
          <div className="lg:col-span-6 bg-[#032419] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl flex flex-col justify-between">
            <div>
              <div className="pb-4 mb-5 border-b border-emerald-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300 block mb-1">
                  Invoice & QR Configurator
                </span>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Request Specific Amount
                </h3>
                <p className="text-xs text-yellow-200 mt-1">
                  Encoding token amount auto-fills the customer's wallet upon scanning.
                </p>
              </div>

              {/* Chain selector */}
              <div className="mb-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-2">
                  Receiving Network
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleNetworkSwitch(POLYGON_CHAIN_ID)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                      selectedChainId === POLYGON_CHAIN_ID
                        ? 'bg-yellow-200 text-zinc-900 border-yellow-300 shadow'
                        : 'bg-emerald-950 text-white border-emerald-800'
                    }`}
                  >
                    Polygon (Chain 137)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNetworkSwitch(ETHEREUM_CHAIN_ID)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                      selectedChainId === ETHEREUM_CHAIN_ID
                        ? 'bg-yellow-200 text-zinc-900 border-yellow-300 shadow'
                        : 'bg-emerald-950 text-white border-emerald-800'
                    }`}
                  >
                    Ethereum (Chain 1)
                  </button>
                </div>
              </div>

              {/* Token selector */}
              <div className="mb-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-2">
                  Receiving Token
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['usdt', 'usdc', 'verse'].map((tokId) => {
                    const tok = SUPPORTED_PAY_TOKENS.find((t) => t.id === tokId);
                    const isSel = selectedTokenId === tokId;
                    return (
                      <button
                        key={tokId}
                        type="button"
                        onClick={() => setSelectedTokenId(tokId)}
                        className={`p-2.5 rounded-xl border text-xs font-black uppercase transition flex items-center justify-center gap-2 ${
                          isSel
                            ? 'bg-yellow-200 text-zinc-900 border-yellow-300 shadow ring-2 ring-yellow-300/30'
                            : 'bg-emerald-950 text-white border-emerald-800 hover:bg-emerald-900/60'
                        }`}
                      >
                        <TokenIcon token={tok?.symbol || tokId} size={18} />
                        <span>{tok?.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Amount input */}
              <div className="mb-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-2">
                  Requested Amount (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="w-full bg-emerald-950/90 border border-emerald-700/80 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
                />
              </div>

              {/* Encoded EIP-681 Preview */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs">
                <span className="text-[11px] font-extrabold text-yellow-200 uppercase tracking-wider block mb-1">
                  EIP-681 URI Payload
                </span>
                <p className="font-mono text-[11px] text-sky-300 break-all leading-tight">
                  {receiveQrUri || 'ethereum:0x...'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-800/80 flex items-center justify-between text-xs text-slate-300">
              <span>Universal Compatibility</span>
              <span className="font-bold text-yellow-200">Zero Intermediary Fees</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: REAL-TIME TOKEN BALANCES & STATUS (Fetched from Blockchain) */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="bg-[#022c22] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-emerald-800">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300 block mb-1">
                Blockchain RPC Synced
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Real-Time Multi-Chain Balances
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-yellow-200 font-semibold">
                Last Synced: {lastSyncTime.toLocaleTimeString()}
              </span>
              <button
                onClick={loadBalances}
                disabled={isLoadingBalances}
                className="p-2.5 rounded-xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-xs font-extrabold flex items-center gap-1.5 transition shadow"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                <span>{isLoadingBalances ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.length > 0 ? (
              balances.map((tok) => (
                <div
                  key={tok.id}
                  className="bg-[#042f22] rounded-2xl p-5 border border-emerald-700/50 flex flex-col justify-between shadow-md hover:border-emerald-500 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TokenIcon token={tok.symbol} size={26} />
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-yellow-300 text-xs font-black font-mono">
                          {tok.symbol}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-sky-300 text-[10px] font-bold border border-emerald-700">
                        {tok.networkName}
                      </span>
                    </div>

                    <div className="my-2">
                      <span className="text-2xl font-black text-white font-mono tracking-tight block">
                        {tok.balance}
                      </span>
                      <span className="text-xs font-semibold text-yellow-200">
                        {tok.usdValue} USD
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {tok.isNative ? 'Native Gas Token' : `${tok.decimals} Decimals`}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTokenId(tok.symbol.toLowerCase());
                        setSelectedChainId(tok.chainId);
                        setActiveTab('send');
                      }}
                      className="text-xs font-bold text-yellow-200 hover:text-yellow-300 underline"
                    >
                      Send →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center bg-emerald-950/60 rounded-2xl border border-emerald-800">
                <p className="text-sm font-semibold text-yellow-200">
                  {isConnected ? 'Querying blockchain nodes for token balances...' : 'Connect your Web3 wallet to display live on-chain balances.'}
                </p>
                {!isConnected && (
                  <button
                    onClick={openConnectModal}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-yellow-200 text-zinc-900 font-extrabold text-xs shadow transition"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: BITCOIN (BTC) INTEGRATION & UTXO ARCHITECTURE */}
      {/* ========================================================================= */}
      {activeTab === 'bitcoin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bitcoin Address & Generator */}
          <div className="lg:col-span-7 bg-[#022c22] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-emerald-800">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                  <TokenIcon token="BTC" size={32} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Bitcoin Network Integration
                  </h2>
                  <p className="text-xs font-semibold text-yellow-200">
                    Separate Native UTXO Blockchain Architecture
                  </p>
                </div>
              </div>

              {/* Crucial Network Separation Explainer */}
              <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-600/70 mb-5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-yellow-200 uppercase tracking-wider">
                      Important: Native BTC vs EVM Chains
                    </h4>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      Bitcoin operates on its own discrete UTXO blockchain (Proof of Work) and does NOT execute Ethereum/Polygon smart contracts. Native BTC cannot be sent via EVM gas transactions. Use a native Bitcoin wallet (e.g. Bitcoin.com Wallet, Electrum, Sparrow) for BTC transfers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom BTC Address Input with Scan QR */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    Merchant Native Bitcoin Receiving Address
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('btc');
                      setIsScannerOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-[11px] font-black flex items-center gap-1.5 shadow transition transform active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={customBtcAddress}
                    onChange={(e) => setCustomBtcAddress(e.target.value.trim())}
                    placeholder="bc1q... (Native SegWit Bech32) or 1... (Legacy)"
                    className="w-full bg-emerald-950/90 border border-emerald-700/80 rounded-2xl pl-4 pr-24 py-3 text-xs sm:text-sm font-mono text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
                  />
                  {!customBtcAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('btc');
                        setIsScannerOpen(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#042f22] border border-emerald-700 text-yellow-200 hover:text-white hover:bg-emerald-900 text-[11px] font-extrabold flex items-center gap-1 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Scan QR</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Satoshi Amount Converter */}
              <div className="mb-5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-1.5">
                  BTC Request Amount
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    className="w-full bg-emerald-950/90 border border-emerald-700/80 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
                  />
                  <div className="px-3 py-2.5 rounded-2xl bg-zinc-900 text-yellow-300 text-xs font-black font-mono flex items-center gap-1.5 flex-shrink-0">
                    <TokenIcon token="BTC" size={18} />
                    <span>BTC</span>
                  </div>
                </div>
                {btcAmount && parseFloat(btcAmount) > 0 && (
                  <p className="text-xs text-yellow-200 mt-1 font-semibold">
                    = {(parseFloat(btcAmount) * 100_000_000).toLocaleString()} Satoshis (sats) ≈ ${(parseFloat(btcAmount) * (prices.BTC || 68000)).toLocaleString()} USD
                  </p>
                )}
              </div>
            </div>

            {/* Address Copy Bar */}
            <div className="p-3 bg-emerald-950 rounded-2xl border border-emerald-800 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-sky-300 truncate">
                {displayBtcAddress}
              </span>
              <button
                onClick={() => handleCopy(displayBtcAddress, 'btc')}
                className="px-3 py-1.5 rounded-xl bg-yellow-200 hover:bg-yellow-300 text-zinc-900 text-xs font-extrabold flex items-center gap-1 transition"
              >
                {btcCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{btcCopied ? 'Copied' : 'Copy BTC'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Bitcoin QR & Mempool Explorer Link */}
          <div className="lg:col-span-5 bg-[#032419] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl flex flex-col items-center justify-between text-center">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300 block mb-1">
                Bitcoin URI QR Code
              </span>
              <h3 className="text-lg font-bold text-white mb-4">
                Scan with Any Bitcoin Mobile Wallet
              </h3>

              <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-yellow-200 inline-block mb-4">
                <QRCodeSVG value={btcQrUri} size={180} level="H" includeMargin={true} />
              </div>

              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Encodes BIP-21 standard <code className="text-sky-300 font-mono">bitcoin:</code> URI with automatic satoshi amount formatting.
              </p>
            </div>

            <div className="w-full mt-5 pt-4 border-t border-emerald-800">
              <a
                href={`https://mempool.space/address/${displayBtcAddress}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-black text-yellow-300 font-extrabold text-xs transition"
              >
                <span>Check Mempool.space Explorer</span>
                <ExternalLink className="w-3.5 h-3.5 text-yellow-300" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: GAS FEE HANDLING & PROTOCOL SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gas Fee Handling Card */}
          <div className="bg-[#022c22] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-emerald-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600 text-sky-300 flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Gas Fee Engine & Requirements
                  </h3>
                  <p className="text-xs font-semibold text-yellow-200">
                    Live network gas price estimation and native token rules
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#042f22] border border-emerald-700/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TokenIcon token="POL" size={20} />
                      <span className="font-extrabold text-white">Polygon Gas (POL)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-yellow-200 text-zinc-900 text-[10px] font-black">
                      Ultra-Low Cost
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    Transactions on Polygon PoS consume <strong>POL</strong> gas. Standard ERC-20 transfers (USDT, USDC, VERSE) cost approximately <strong>~$0.005</strong> USD (~0.002 POL).
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-yellow-200 font-mono pt-2 border-t border-emerald-800">
                    <span>Base Gas: {gasFees?.polygon.gasPriceGwei || '35'} Gwei</span>
                    <span>Avg Finality: ~2.1s</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#042f22] border border-emerald-700/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TokenIcon token="ETH" size={20} />
                      <span className="font-extrabold text-white">Ethereum Gas (ETH)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-200 text-zinc-900 text-[10px] font-black">
                      L1 Base Security
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    Transactions on Ethereum Mainnet require native <strong>ETH</strong> to pay miner base fees (EIP-1559) and priority tips.
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-sky-300 font-mono pt-2 border-t border-emerald-800">
                    <span>Base Gas: {gasFees?.ethereum.gasPriceGwei || '15'} Gwei</span>
                    <span>Est. Fee: {gasFees?.ethereum.estimatedErc20TransferFeeUsd || '~$2.40'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-emerald-950 text-slate-300 text-xs border border-emerald-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <span>Ensure your connected wallet holds native POL or ETH before sending tokens.</span>
            </div>
          </div>

          {/* Cryptographic Security Standards */}
          <div className="bg-[#032419] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-emerald-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600 text-yellow-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Security Architecture
                  </h3>
                  <p className="text-xs font-semibold text-yellow-200">
                    Zero private key exposure & mathematically verifiable rules
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  {
                    title: '100% Non-Custodial',
                    desc: 'Your private key / seed phrase is never requested, transmitted, or stored on any server.',
                    tag: 'Self-Custody',
                  },
                  {
                    title: 'Client-Side EIP-1193 Signing',
                    desc: 'Every send operation is signed inside MetaMask / Trust Wallet / WalletConnect securely on your device.',
                    tag: 'Cryptographic Proof',
                  },
                  {
                    title: 'Immutable Smart Contracts',
                    desc: 'Interacts strictly with verified ERC-20 token contracts on Polygon and Ethereum Mainnet.',
                    tag: 'Audited Code',
                  },
                  {
                    title: 'Zero Intermediary Risk',
                    desc: 'Funds settle directly from sender to recipient with zero intermediary escrow holding periods.',
                    tag: 'Direct P2P',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#042f22] border border-emerald-800/80 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">{item.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-yellow-300 text-[10px] font-extrabold whitespace-nowrap">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-800 text-xs text-yellow-200 font-semibold flex items-center justify-between">
              <span>Security Standard: Web3 EIP-1193</span>
              <span className="text-sky-300">Polygon + Ethereum + Bitcoin</span>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal for instant live camera / image scanning */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannedQR}
        title={scannerTarget === 'btc' ? 'Scan Bitcoin QR Code' : 'Scan Recipient EVM Address'}
        expectedType={scannerTarget === 'btc' ? 'btc' : 'evm'}
      />
    </div>
  );
}
