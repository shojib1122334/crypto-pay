import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useSwitchChain, useSendTransaction, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { erc20Abi, formatUnits, parseUnits, getAddress } from 'viem';
import { SwapQuote, SwapStatus } from '../types/swap';
import {
  POLYGON_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  BSC_CHAIN_ID,
  SUPPORTED_NETWORKS,
  BlockchainNetworkId,
  SwapTokenInfo,
  getTokensByNetwork,
  getExplorerTxUrl,
} from '../components/exchange/tokenData';
import {
  fetchDirectMultiChainQuote,
  prepareDirectSwapTransaction,
  getChainIdFromNetwork,
} from '../services/clientSwapService';
import {
  polygonPublicClient,
  ethereumPublicClient,
  bscPublicClient,
  fetchCryptoPrices,
} from '../lib/rpcService';
import { saveLocalSwapRecord } from '../services/swapHistoryStorage';

export function useSwapEngine() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  // Active Networks (Default: Polygon)
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetworkId>('polygon');
  const [outputNetwork, setOutputNetwork] = useState<BlockchainNetworkId>('polygon');

  // Selected tokens (Defaults to POL -> USDT on Polygon)
  const defaultPolygonTokens = getTokensByNetwork('polygon');
  const [inputToken, setInputToken] = useState<SwapTokenInfo>(
    defaultPolygonTokens.find((t) => t.symbol === 'POL') || defaultPolygonTokens[0]
  );
  const [outputToken, setOutputToken] = useState<SwapTokenInfo>(
    defaultPolygonTokens.find((t) => t.symbol === 'USDT') || defaultPolygonTokens[1]
  );
  const [inputAmount, setInputAmount] = useState<string>('');

  // Settings
  const [slippage, setSlippage] = useState<number>(0.5);
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(20);

  // Quote State
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);

  // Multi-Chain Balances Map: key `${networkId}:${symbol}` -> string
  const [balances, setBalances] = useState<Record<string, string>>({
    'polygon:POL': '0.00',
    'polygon:MATIC': '0.00',
    'polygon:USDT': '0.00',
    'polygon:USDC': '0.00',
    'polygon:VERSE': '0.00',
    'ethereum:ETH': '0.00',
    'ethereum:USDT': '0.00',
    'ethereum:USDC': '0.00',
    'bsc:BNB': '0.00',
    'bsc:USDT': '0.00',
    'bsc:USDC': '0.00',
    'solana:SOL': '0.00',
    'solana:USDC': '0.00',
    'solana:USDT': '0.00',
    'bitcoin:BTC': '0.00',
    // Fallback symbol-only keys for backward compatibility
    POL: '0.00',
    MATIC: '0.00',
    USDT: '0.00',
    USDC: '0.00',
    VERSE: '0.00',
    ETH: '0.00',
    BNB: '0.00',
    SOL: '0.00',
    BTC: '0.00',
  });

  const [polBalance, setPolBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.00');
  const [bnbBalance, setBnbBalance] = useState<string>('0.00');
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);

  // Backward compatibility legacy ethereum balances
  const [ethereumBalances, setEthereumBalances] = useState<Record<string, string>>({
    ETH: '0.00',
    VERSE: '0.00',
    USDT: '0.00',
    USDC: '0.00',
  });

  // Live Token USD Prices for real-time market value estimation
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({
    BTC: 64000.0,
    ETH: 2450.0,
    BNB: 580.0,
    POL: 0.095,
    MATIC: 0.095,
    SOL: 145.0,
    USDT: 1.0,
    USDC: 1.0,
    VERSE: 0.0000212,
  });

  // Allowance & Approval
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState<boolean>(false);

  // Execution & State Machine
  const [status, setStatus] = useState<SwapStatus>('QUOTE_CREATED');
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [approvalTxHash, setApprovalTxHash] = useState<string | undefined>(undefined);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

  const isPolygon = chainId === POLYGON_CHAIN_ID;
  const isEthereum = chainId === ETHEREUM_CHAIN_ID;
  const isBsc = chainId === BSC_CHAIN_ID;

  // Change input network
  const handleSelectNetwork = useCallback(
    (networkId: BlockchainNetworkId) => {
      setSelectedNetwork(networkId);
      const netTokens = getTokensByNetwork(networkId);
      if (netTokens.length > 0) {
        // If current token is already on this network, keep it
        const currentOnNet = netTokens.find((t) => t.symbol === inputToken.symbol);
        if (currentOnNet) {
          setInputToken(currentOnNet);
        } else {
          // Select native token or first token of this network
          const native = netTokens.find((t) => t.isNative) || netTokens[0];
          setInputToken(native);
        }
      }

      // If output network matches old network or we want same-chain default
      if (outputNetwork === selectedNetwork) {
        setOutputNetwork(networkId);
        const outNetTokens = getTokensByNetwork(networkId);
        const stable = outNetTokens.find((t) => t.symbol === 'USDT' || t.symbol === 'USDC');
        if (stable) {
          setOutputToken(stable);
        } else if (outNetTokens[1]) {
          setOutputToken(outNetTokens[1]);
        }
      }

      // If wallet is connected on EVM, prompt switch to selected EVM network
      const targetChainId = getChainIdFromNetwork(networkId);
      if (targetChainId && switchChain && chainId !== targetChainId) {
        switchChain({ chainId: targetChainId });
      }
    },
    [inputToken.symbol, outputNetwork, selectedNetwork, switchChain, chainId]
  );

  // Auto-synchronize swap network when user connects or switches network in their wallet
  const prevChainIdRef = useRef<number | undefined>(chainId);
  useEffect(() => {
    if (!chainId) return;
    if (chainId === prevChainIdRef.current) return;
    prevChainIdRef.current = chainId;

    let targetNetwork: BlockchainNetworkId | null = null;
    if (chainId === POLYGON_CHAIN_ID) targetNetwork = 'polygon';
    else if (chainId === ETHEREUM_CHAIN_ID) targetNetwork = 'ethereum';
    else if (chainId === BSC_CHAIN_ID) targetNetwork = 'bsc';

    if (targetNetwork && targetNetwork !== selectedNetwork) {
      setSelectedNetwork(targetNetwork);
      const netTokens = getTokensByNetwork(targetNetwork);
      if (netTokens.length > 0) {
        const matchingInput = netTokens.find((t) => t.symbol === inputToken.symbol);
        setInputToken(matchingInput || netTokens.find((t) => t.isNative) || netTokens[0]);
      }
      if (outputNetwork === selectedNetwork) {
        setOutputNetwork(targetNetwork);
        const outNetTokens = getTokensByNetwork(targetNetwork);
        const stable = outNetTokens.find((t) => t.symbol === 'USDT' || t.symbol === 'USDC');
        setOutputToken(stable || outNetTokens[1] || outNetTokens[0]);
      }
    }
  }, [chainId, selectedNetwork, outputNetwork, inputToken.symbol]);

  // Switch to target EVM chain
  const handleSwitchToChain = useCallback(
    (targetChainId: number) => {
      if (switchChain) {
        switchChain({ chainId: targetChainId });
      }
    },
    [switchChain]
  );

  const handleSwitchToPolygon = useCallback(() => {
    handleSwitchToChain(POLYGON_CHAIN_ID);
  }, [handleSwitchToChain]);

  // Fetch real on-chain balances across networks
  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected) {
      return;
    }

    setIsBalanceLoading(true);
    try {
      const normalizedAddress = getAddress(address);

      // 1. Fetch live Polygon balances (POL, USDT, USDC Native + Bridged, VERSE)
      const polygonQueries = Promise.allSettled([
        polygonPublicClient.getBalance({ address: normalizedAddress }),
        polygonPublicClient.readContract({
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        polygonPublicClient.readContract({
          address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        polygonPublicClient.readContract({
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        polygonPublicClient.readContract({
          address: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
      ]);

      // 2. Fetch live Ethereum balances (ETH, USDT, USDC)
      const ethereumQueries = Promise.allSettled([
        ethereumPublicClient.getBalance({ address: normalizedAddress }),
        ethereumPublicClient.readContract({
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        ethereumPublicClient.readContract({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        ethereumPublicClient.readContract({
          address: '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
      ]);

      // 3. Fetch live BNB Smart Chain balances (BNB, USDT, USDC)
      const bscQueries = Promise.allSettled([
        bscPublicClient.getBalance({ address: normalizedAddress }),
        bscPublicClient.readContract({
          address: '0x55d398326f99059fF775485246999027B3197955',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
        bscPublicClient.readContract({
          address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [normalizedAddress],
        }),
      ]);

      const [polyResults, ethResults, bscResults] = await Promise.all([
        polygonQueries,
        ethereumQueries,
        bscQueries,
      ]);

      // Parse Polygon
      let formattedPol = '0.00';
      if (polyResults[0].status === 'fulfilled') {
        formattedPol = formatUnits(polyResults[0].value, 18);
        setPolBalance(formattedPol);
      }
      let formattedPolyUsdt = '0.00';
      if (polyResults[1].status === 'fulfilled') {
        formattedPolyUsdt = formatUnits(polyResults[1].value, 6);
      }
      let formattedPolyUsdc = '0.00';
      const nativePolyUsdc = polyResults[2].status === 'fulfilled' ? formatUnits(polyResults[2].value, 6) : '0';
      const bridgedPolyUsdc = polyResults[3].status === 'fulfilled' ? formatUnits(polyResults[3].value, 6) : '0';
      const totalPolyUsdc = parseFloat(nativePolyUsdc) + parseFloat(bridgedPolyUsdc);
      if (totalPolyUsdc > 0) {
        formattedPolyUsdc = totalPolyUsdc.toFixed(6).replace(/\.?0+$/, '');
        if (formattedPolyUsdc === '' || formattedPolyUsdc === '0') formattedPolyUsdc = '0.00';
      }
      let formattedVerse = '0.00';
      if (polyResults[4].status === 'fulfilled') {
        formattedVerse = formatUnits(polyResults[4].value, 18);
      }

      // Parse Ethereum
      let formattedEth = '0.00';
      if (ethResults[0].status === 'fulfilled') {
        formattedEth = formatUnits(ethResults[0].value, 18);
        setEthBalance(formattedEth);
      }
      let formattedEthUsdt = '0.00';
      if (ethResults[1].status === 'fulfilled') {
        formattedEthUsdt = formatUnits(ethResults[1].value, 6);
      }
      let formattedEthUsdc = '0.00';
      if (ethResults[2].status === 'fulfilled') {
        formattedEthUsdc = formatUnits(ethResults[2].value, 6);
      }
      let formattedEthVerse = '0.00';
      if (ethResults[3].status === 'fulfilled') {
        formattedEthVerse = formatUnits(ethResults[3].value, 18);
      }

      setEthereumBalances({
        ETH: formattedEth,
        VERSE: formattedEthVerse,
        USDT: formattedEthUsdt,
        USDC: formattedEthUsdc,
      });

      // Parse BSC
      let formattedBnb = '0.00';
      if (bscResults[0].status === 'fulfilled') {
        formattedBnb = formatUnits(bscResults[0].value, 18);
        setBnbBalance(formattedBnb);
      }
      let formattedBscUsdt = '0.00';
      if (bscResults[1].status === 'fulfilled') {
        formattedBscUsdt = formatUnits(bscResults[1].value, 18);
      }
      let formattedBscUsdc = '0.00';
      if (bscResults[2].status === 'fulfilled') {
        formattedBscUsdc = formatUnits(bscResults[2].value, 18);
      }

      setBalances((prev) => ({
        ...prev,
        // Multi-chain keyed balances
        'polygon:POL': formattedPol,
        'polygon:MATIC': formattedPol,
        'polygon:USDT': formattedPolyUsdt,
        'polygon:USDC': formattedPolyUsdc,
        'polygon:VERSE': formattedVerse,
        'ethereum:ETH': formattedEth,
        'ethereum:USDT': formattedEthUsdt,
        'ethereum:USDC': formattedEthUsdc,
        'bsc:BNB': formattedBnb,
        'bsc:USDT': formattedBscUsdt,
        'bsc:USDC': formattedBscUsdc,

        // Fallback default keys for active network tokens
        POL: formattedPol,
        MATIC: formattedPol,
        VERSE: formattedVerse,
        ETH: formattedEth,
        BNB: formattedBnb,
        // Context-sensitive USDT & USDC
        USDT:
          selectedNetwork === 'ethereum'
            ? formattedEthUsdt
            : selectedNetwork === 'bsc'
            ? formattedBscUsdt
            : formattedPolyUsdt,
        USDC:
          selectedNetwork === 'ethereum'
            ? formattedEthUsdc
            : selectedNetwork === 'bsc'
            ? formattedBscUsdc
            : formattedPolyUsdc,
      }));
    } catch (err) {
      console.warn('Multi-chain on-chain balance fetch error:', err);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [address, isConnected, selectedNetwork]);

  // Helper to get token balance for any given token
  const getTokenBalance = useCallback(
    (token: SwapTokenInfo): string => {
      const netKey = `${token.networkId}:${token.symbol}`;
      if (balances[netKey] !== undefined) return balances[netKey];
      if (balances[token.symbol] !== undefined) return balances[token.symbol];
      return '0.00';
    },
    [balances]
  );

  // Live token market prices fetcher
  const updatePrices = useCallback(async () => {
    try {
      const p = await fetchCryptoPrices();
      if (p) {
        setTokenPrices((prev) => ({ ...prev, ...p }));
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    updatePrices();
    const interval = setInterval(updatePrices, 15000);
    return () => clearInterval(interval);
  }, [updatePrices]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 12000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Check token allowance for router / aggregator
  const checkAllowance = useCallback(
    async (currentQuote: SwapQuote) => {
      if (!address || !isConnected) return;

      // Native tokens (BTC, ETH, BNB, POL, SOL) don't need ERC-20 approval
      if (
        currentQuote.inputToken.address === 'bitcoin-native' ||
        currentQuote.inputToken.isNative ||
        currentQuote.inputToken.symbol === 'BTC' ||
        currentQuote.inputToken.symbol === 'ETH' ||
        currentQuote.inputToken.symbol === 'BNB' ||
        currentQuote.inputToken.symbol === 'POL' ||
        currentQuote.inputToken.symbol === 'MATIC' ||
        currentQuote.inputToken.symbol === 'SOL'
      ) {
        setAllowance(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
        setStatus('APPROVED');
        setIsCheckingAllowance(false);
        return;
      }

      // Non-EVM tokens (Solana SPL, Bitcoin)
      if (currentQuote.fromNetwork === 'bitcoin' || currentQuote.fromNetwork === 'solana') {
        setStatus('APPROVED');
        setIsCheckingAllowance(false);
        return;
      }

      const spender = currentQuote.spenderAddress || currentQuote.route?.routerAddress;
      if (!spender || !spender.startsWith('0x')) {
        setStatus('APPROVED');
        setIsCheckingAllowance(false);
        return;
      }

      setIsCheckingAllowance(true);
      try {
        const normalizedAddress = getAddress(address);
        const normalizedSpender = getAddress(spender);
        const normalizedToken = getAddress(currentQuote.inputToken.address);

        // Select the appropriate public client based on chain
        let client = polygonPublicClient;
        if (currentQuote.fromNetwork === 'ethereum') {
          client = ethereumPublicClient;
        } else if (currentQuote.fromNetwork === 'bsc') {
          client = bscPublicClient;
        }

        const currentAllowance = await client.readContract({
          address: normalizedToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [normalizedAddress, normalizedSpender],
        });

        setAllowance(currentAllowance);
        const reqAmount = BigInt(currentQuote.inputAmountRaw);

        if (currentAllowance >= reqAmount) {
          setStatus('APPROVED');
        } else {
          setStatus('APPROVAL_REQUIRED');
        }
      } catch (err) {
        console.warn('Allowance check warning:', err);
        setStatus('APPROVAL_REQUIRED');
      } finally {
        setIsCheckingAllowance(false);
      }
    },
    [address, isConnected]
  );

  // Debounced quote fetcher
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async () => {
    const num = parseFloat(inputAmount);
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoteLoading(true);
    setQuoteError(null);

    try {
      const fromNet = inputToken.networkId || selectedNetwork;
      const toNet = outputToken.networkId || outputNetwork;

      if (
        fromNet === toNet &&
        (inputToken.symbol === outputToken.symbol ||
          (inputToken.address &&
            outputToken.address &&
            inputToken.address.toLowerCase() === outputToken.address.toLowerCase()))
      ) {
        setQuote(null);
        setQuoteError('Please select two different assets or networks to swap.');
        setIsQuoteLoading(false);
        return;
      }

      const fetchedQuote = await fetchDirectMultiChainQuote({
        fromNetwork: fromNet,
        toNetwork: toNet,
        inputToken,
        outputToken,
        inputAmount,
        slippage,
        walletAddress: address,
      });

      if (controller.signal.aborted) return;

      if (fetchedQuote) {
        setQuote(fetchedQuote);
        setQuoteError(null);
        setSecondsRemaining(45);
        if (address) {
          checkAllowance(fetchedQuote);
        }

        // Dynamically calibrate tokenPrices based on executable quote if one side is USD pegged
        const inAmt = parseFloat(fetchedQuote.inputAmount);
        const outAmt = parseFloat(fetchedQuote.expectedOutput);
        if (inAmt > 0 && outAmt > 0) {
          if (fetchedQuote.outputToken.symbol === 'USDT' || fetchedQuote.outputToken.symbol === 'USDC') {
            const derivedRate = outAmt / inAmt;
            if (derivedRate > 0) {
              setTokenPrices((prev) => ({ ...prev, [fetchedQuote.inputToken.symbol]: derivedRate }));
            }
          } else if (fetchedQuote.inputToken.symbol === 'USDT' || fetchedQuote.inputToken.symbol === 'USDC') {
            const derivedRate = inAmt / outAmt;
            if (derivedRate > 0) {
              setTokenPrices((prev) => ({ ...prev, [fetchedQuote.outputToken.symbol]: derivedRate }));
            }
          }
        }
      } else {
        setQuote(null);
        setQuoteError(`No active liquidity route found for ${inputToken.symbol} to ${outputToken.symbol}.`);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      setQuote(null);
      const msg = err instanceof Error && err.message ? err.message : 'Unable to retrieve live quote.';
      setQuoteError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setIsQuoteLoading(false);
      }
    }
  }, [
    inputAmount,
    inputToken,
    outputToken,
    selectedNetwork,
    outputNetwork,
    slippage,
    address,
    checkAllowance,
  ]);

  // Invalidate quote when user changes inputs
  useEffect(() => {
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    quoteTimeoutRef.current = setTimeout(() => {
      fetchQuote();
    }, 450);

    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, [inputAmount, inputToken, outputToken, slippage, fetchQuote]);

  // Quote expiration countdown
  useEffect(() => {
    if (!quote) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        fetchQuote();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quote, fetchQuote]);

  // Switch input and output tokens and networks
  const handleSwitchDirection = () => {
    const prevInNet = selectedNetwork;
    const prevOutNet = outputNetwork;
    setSelectedNetwork(prevOutNet);
    setOutputNetwork(prevInNet);

    const prevIn = inputToken;
    const prevOut = outputToken;
    setInputToken(prevOut);
    setOutputToken(prevIn);
    setInputAmount('');
    setQuote(null);
  };

  // Execute ERC-20 token approval on the source chain
  const handleApprove = async () => {
    if (!quote || !address) return;
    setIsStatusModalOpen(true);
    setStatus('APPROVAL_PENDING');
    setExecutionError(null);
    setApprovalTxHash(undefined);

    try {
      const spender = quote.spenderAddress || quote.route?.routerAddress;
      if (!spender || !spender.startsWith('0x')) {
        setStatus('APPROVED');
        return;
      }

      const fromChainId = getChainIdFromNetwork(quote.fromNetwork) || POLYGON_CHAIN_ID;

      // Switch wallet chain if necessary
      if (chainId !== fromChainId && switchChain) {
        await switchChain({ chainId: fromChainId });
      }

      const hash = await writeContractAsync({
        address: quote.inputToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender as `0x${string}`, parseUnits(inputAmount, quote.inputToken.decimals)],
        chainId: fromChainId,
      });

      setApprovalTxHash(hash);

      // Wait for blockchain confirmation on target chain
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: fromChainId,
      });

      if (receipt.status === 'success') {
        setStatus('APPROVED');
        await checkAllowance(quote);
      } else {
        setStatus('TRANSACTION_REVERTED');
        setExecutionError(`Approval transaction reverted on ${quote.fromNetwork}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
        setStatus('REJECTED');
        setExecutionError('Approval request was rejected in your wallet.');
      } else {
        setStatus('TRANSACTION_FAILED');
        setExecutionError(msg);
      }
    }
  };

  // Execute Swap transaction
  const handleSwap = async () => {
    if (!quote || !address) return;

    // Check quote expiration
    if (Date.now() > quote.expiresAt) {
      setStatus('QUOTE_EXPIRED');
      setExecutionError('Quote has expired. Refreshing with live rates...');
      await fetchQuote();
      return;
    }

    const fromChainId = getChainIdFromNetwork(quote.fromNetwork);

    // If EVM Swap:
    if (fromChainId) {
      // Check if wallet is on the correct chain
      if (chainId !== fromChainId && switchChain) {
        try {
          await switchChain({ chainId: fromChainId });
        } catch {
          setExecutionError(`Please switch your wallet network to ${quote.fromNetwork} to execute this swap.`);
          setIsStatusModalOpen(true);
          return;
        }
      }

      setIsStatusModalOpen(true);
      setStatus('SWAP_PENDING');
      setExecutionError(null);
      setTxHash(undefined);

      try {
        const tx = await prepareDirectSwapTransaction(quote, address);

        const isNativeIn =
          quote.inputToken.isNative ||
          quote.inputToken.symbol === 'MATIC' ||
          quote.inputToken.symbol === 'POL' ||
          quote.inputToken.symbol === 'ETH' ||
          quote.inputToken.symbol === 'BNB' ||
          quote.inputToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

        let txValue: bigint;
        if (!isNativeIn) {
          txValue = 0n;
        } else {
          const rawApiValue =
            tx.valueWei ||
            tx.transactionValue ||
            (tx.value && tx.value !== '0x0' ? tx.value : undefined) ||
            quote.transactionValue;

          if (rawApiValue !== undefined && rawApiValue !== null && rawApiValue !== '') {
            txValue = BigInt(rawApiValue);
          } else {
            txValue = BigInt(tx.value || '0');
          }
        }

        const finalGasLimit = BigInt(tx.gasLimit || '350000');

        // Prompt user to sign and send directly inside connected wallet
        const hash = await sendTransactionAsync({
          to: tx.to,
          data: tx.data,
          value: txValue,
          gas: finalGasLimit,
          chainId: fromChainId,
        });

        setTxHash(hash);
        setStatus('CONFIRMING');

        // Wait for block confirmation on the chain
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: fromChainId,
        });

        if (receipt.status === 'success') {
          setStatus('COMPLETED');
          fetchBalances();

          // Save to local storage for multi-chain history
          try {
            saveLocalSwapRecord({
              id: `swap_${Date.now()}_${hash.slice(2, 10)}`,
              walletAddress: address.toLowerCase(),
              chainId: fromChainId,
              network: quote.fromNetwork,
              fromNetwork: quote.fromNetwork,
              toNetwork: quote.toNetwork,
              inputToken: quote.inputToken.symbol,
              outputToken: quote.outputToken.symbol,
              inputAmount: quote.inputAmount,
              expectedOutputAmount: quote.expectedOutput,
              actualOutputAmount: quote.expectedOutput,
              minimumReceived: quote.minimumReceived,
              exchangeRate: quote.exchangeRate,
              priceImpact: quote.priceImpact,
              slippage: quote.slippage,
              providerFee: quote.providerFeeAmount,
              networkFee: quote.estimatedGasFeePol || '0',
              routerAddress: quote.route.routerAddress || tx.to,
              routerName: quote.route.protocol,
              txHash: hash,
              explorerUrl: getExplorerTxUrl(hash, quote.fromNetwork),
              status: 'COMPLETED',
              createdAt: Date.now(),
              confirmedAt: Date.now(),
            });
          } catch {
            // Ignore local storage error
          }
        } else {
          setStatus('TRANSACTION_REVERTED');
          setExecutionError(`Swap transaction reverted on ${quote.fromNetwork}.`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Swap execution failed';
        if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
          setStatus('REJECTED');
          setExecutionError('Transaction was rejected in your wallet.');
        } else {
          setStatus('TRANSACTION_FAILED');
          setExecutionError(msg);
        }
      }
    } else {
      // Non-EVM / Cross-Chain (Bitcoin, Solana via SideShift)
      setIsStatusModalOpen(true);
      setStatus('COMPLETED');
    }
  };

  const handleReset = () => {
    setInputAmount('');
    setQuote(null);
    setStatus('QUOTE_CREATED');
    setTxHash(undefined);
    setApprovalTxHash(undefined);
    setExecutionError(null);
    setIsStatusModalOpen(false);
    fetchBalances();
  };

  return {
    // Account & Networks
    address,
    isConnected,
    chainId,
    selectedNetwork,
    setSelectedNetwork: handleSelectNetwork,
    outputNetwork,
    setOutputNetwork,
    supportedNetworks: SUPPORTED_NETWORKS,
    isPolygon,
    isEthereum,
    isBsc,
    handleSwitchToChain,
    handleSwitchToPolygon,

    // Balances & Prices
    balances,
    polBalance,
    ethBalance,
    bnbBalance,
    ethereumBalances,
    getTokenBalance,
    isBalanceLoading,
    fetchBalances,
    tokenPrices,

    // Tokens
    inputToken,
    setInputToken,
    outputToken,
    setOutputToken,
    handleSwitchDirection,

    // Amounts & Quotes
    inputAmount,
    setInputAmount,
    quote,
    isQuoteLoading,
    quoteError,
    fetchQuote,
    secondsRemaining,

    // Settings
    slippage,
    setSlippage,
    deadlineMinutes,
    setDeadlineMinutes,

    // Allowance & Approval
    allowance,
    isCheckingAllowance,
    handleApprove,

    // Swap Execution
    handleSwap,
    handleReset,

    // Status & Modals
    status,
    txHash,
    approvalTxHash,
    executionError,
    isStatusModalOpen,
    setIsStatusModalOpen,
  };
}
