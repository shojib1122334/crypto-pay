import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useSwitchChain, useSendTransaction, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { erc20Abi, formatUnits, parseUnits, getAddress } from 'viem';
import { SwapQuote, SwapStatus } from '../types/swap';
import { POLYGON_CHAIN_ID, SWAP_TOKENS, SwapTokenInfo } from '../components/exchange/tokenData';
import { fetchDirectDEXQuote, prepareDirectSwapTransaction } from '../services/clientSwapService';
import { polygonPublicClient, ethereumPublicClient, fetchCryptoPrices } from '../lib/rpcService';

export function useSwapEngine() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  // Selected tokens (Defaults to VERSE -> USDT)
  const defaultInput = SWAP_TOKENS.find((t) => t.symbol === 'VERSE') || SWAP_TOKENS[3];
  const defaultOutput = SWAP_TOKENS.find((t) => t.symbol === 'USDT') || SWAP_TOKENS[1];
  const [inputToken, setInputToken] = useState<SwapTokenInfo>(defaultInput);
  const [outputToken, setOutputToken] = useState<SwapTokenInfo>(defaultOutput);
  const [inputAmount, setInputAmount] = useState<string>('');

  // Settings
  const [slippage, setSlippage] = useState<number>(0.5);
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(20);

  // Quote State
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);

  // Balances
  const [balances, setBalances] = useState<Record<string, string>>({
    MATIC: '0.00',
    POL: '0.00',
    USDT: '0.00',
    USDC: '0.00',
    VERSE: '0.00',
  });
  const [polBalance, setPolBalance] = useState<string>('0.00');
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [ethereumBalances, setEthereumBalances] = useState<Record<string, string>>({
    ETH: '0.00',
    VERSE: '0.00',
    USDT: '0.00',
    USDC: '0.00',
  });

  // Live Token USD Prices for real-time market value estimation
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({
    USDT: 1.0,
    USDC: 1.0,
    MATIC: 0.095,
    POL: 0.095,
    VERSE: 0.0000212,
    ETH: 2450.0,
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

  // Refresh token balances from Polygon Mainnet
  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected) {
      setBalances({
        MATIC: '0.00',
        POL: '0.00',
        USDT: '0.00',
        USDC: '0.00',
        VERSE: '0.00',
      });
      setPolBalance('0.00');
      return;
    }

    setIsBalanceLoading(true);
    try {
      const normalizedAddress = getAddress(address);

      // 1. Fetch live Polygon balances in parallel
      const [
        polBalResult,
        usdtBalResult,
        usdcNativeResult,
        usdcBridgedResult,
        verseBalResult,
      ] = await Promise.allSettled([
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

      // Native POL/MATIC
      let formattedPol = '0.00';
      if (polBalResult.status === 'fulfilled') {
        formattedPol = formatUnits(polBalResult.value, 18);
        setPolBalance(formattedPol);
      }

      // USDT (6 decimals)
      let formattedUsdt = '0.00';
      if (usdtBalResult.status === 'fulfilled') {
        formattedUsdt = formatUnits(usdtBalResult.value, 6);
      }

      // USDC (Native 6 decimals + Bridged USDC.e 6 decimals)
      let formattedUsdc = '0.00';
      const nativeUsdc = usdcNativeResult.status === 'fulfilled' ? formatUnits(usdcNativeResult.value, 6) : '0';
      const bridgedUsdc = usdcBridgedResult.status === 'fulfilled' ? formatUnits(usdcBridgedResult.value, 6) : '0';
      const totalUsdc = parseFloat(nativeUsdc) + parseFloat(bridgedUsdc);
      if (totalUsdc > 0) {
        formattedUsdc = totalUsdc.toFixed(6).replace(/\.?0+$/, '');
        if (formattedUsdc === '' || formattedUsdc === '0') formattedUsdc = '0.00';
      }

      // VERSE (18 decimals)
      let formattedVerse = '0.00';
      if (verseBalResult.status === 'fulfilled') {
        formattedVerse = formatUnits(verseBalResult.value, 18);
      }

      setBalances({
        MATIC: formattedPol,
        POL: formattedPol,
        USDT: formattedUsdt,
        USDC: formattedUsdc,
        VERSE: formattedVerse,
      });

      // 2. If connected to Ethereum, fetch Ethereum balances to provide user clarity
      if (chainId === 1) {
        try {
          const [ethBal, ethVerse, ethUsdt, ethUsdc] = await Promise.allSettled([
            ethereumPublicClient.getBalance({ address: normalizedAddress }),
            ethereumPublicClient.readContract({
              address: '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18',
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [normalizedAddress],
            }),
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
          ]);

          setEthereumBalances({
            ETH: ethBal.status === 'fulfilled' ? formatUnits(ethBal.value, 18) : '0.00',
            VERSE: ethVerse.status === 'fulfilled' ? formatUnits(ethVerse.value, 18) : '0.00',
            USDT: ethUsdt.status === 'fulfilled' ? formatUnits(ethUsdt.value, 6) : '0.00',
            USDC: ethUsdc.status === 'fulfilled' ? formatUnits(ethUsdc.value, 6) : '0.00',
          });
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.warn('On-chain balance fetch error:', err);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [address, isConnected, chainId]);

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

  // Check token allowance for router
  const checkAllowance = useCallback(async (currentQuote: SwapQuote) => {
    if (!address || !isConnected) return;

    // Native MATIC/POL is gas asset, no ERC-20 approval needed
    if (currentQuote.inputToken.symbol === 'MATIC' || currentQuote.inputToken.symbol === 'POL') {
      setAllowance(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      setStatus('APPROVED');
      setIsCheckingAllowance(false);
      return;
    }

    setIsCheckingAllowance(true);
    try {
      const normalizedAddress = getAddress(address);
      const currentAllowance = await polygonPublicClient.readContract({
        address: currentQuote.inputToken.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [normalizedAddress, currentQuote.route.routerAddress],
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
  }, [address, isConnected]);

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
      let fetchedQuote: SwapQuote | null = null;

      // 1. Attempt via server endpoint /api/swap/quote
      try {
        const query = new URLSearchParams({
          chainId: POLYGON_CHAIN_ID.toString(),
          walletAddress: address || '0x0000000000000000000000000000000000000000',
          inputToken: inputToken.symbol,
          outputToken: outputToken.symbol,
          inputAmount,
          slippage: slippage.toString(),
        });

        const res = await fetch(`/api/swap/quote?${query.toString()}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          const text = await res.text();
          // Check if response is valid JSON rather than HTML (e.g. proxy cookie redirect or 502 page)
          if (!text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (res.ok && data?.success && data?.quote) {
              fetchedQuote = data.quote;
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        // If server call fails (e.g. cookie check, iframe sandbox, or network issue), proceed to direct DEX fallback
      }

      if (controller.signal.aborted) return;

      // 2. Direct client-side DEX quotation fallback (KyberSwap Aggregator + on-chain Polygon RPC)
      if (!fetchedQuote) {
        fetchedQuote = await fetchDirectDEXQuote({
          inputSymbol: inputToken.symbol,
          outputSymbol: outputToken.symbol,
          inputAmount,
          slippage,
          walletAddress: address,
        });
      }

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
        setQuoteError('No active Polygon liquidity route found for this pair.');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      setQuote(null);
      const msg = err instanceof Error && err.message ? err.message : 'Unable to retrieve live quote from Polygon.';
      setQuoteError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setIsQuoteLoading(false);
      }
    }
  }, [inputAmount, inputToken.symbol, outputToken.symbol, slippage, address, checkAllowance]);

  // Invalidate quote when user types
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
    }, 400);

    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, [inputAmount, inputToken.symbol, outputToken.symbol, slippage, fetchQuote]);

  // Quote expiration countdown
  useEffect(() => {
    if (!quote) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        // Auto refresh quote
        fetchQuote();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quote, fetchQuote]);

  // Switch input and output tokens
  const handleSwitchDirection = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount('');
    setQuote(null);
  };

  // Switch to Polygon Mainnet
  const handleSwitchToPolygon = () => {
    if (switchChain) {
      switchChain({ chainId: POLYGON_CHAIN_ID });
    }
  };

  // Execute ERC-20 token approval
  const handleApprove = async () => {
    if (!quote || !address) return;
    setIsStatusModalOpen(true);
    setStatus('APPROVAL_PENDING');
    setExecutionError(null);
    setApprovalTxHash(undefined);

    try {
      const hash = await writeContractAsync({
        address: quote.inputToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.route.routerAddress, parseUnits(inputAmount, quote.inputToken.decimals)],
        chainId: POLYGON_CHAIN_ID,
      });

      setApprovalTxHash(hash);

      // Wait for blockchain confirmation on Polygon
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: POLYGON_CHAIN_ID,
      });

      if (receipt.status === 'success') {
        setStatus('APPROVED');
        // Refresh allowance
        await checkAllowance(quote);
      } else {
        setStatus('TRANSACTION_REVERTED');
        setExecutionError('Approval transaction reverted on Polygon.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      if (msg.includes('rejected') || msg.includes('denied')) {
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

    // Check gas balance
    const estGasPol = parseFloat(quote.estimatedGasFeePol);
    const userPol = parseFloat(polBalance);
    const isNativeIn = quote.inputToken.symbol === 'MATIC' || quote.inputToken.symbol === 'POL';
    const requiredPol = isNativeIn ? (parseFloat(inputAmount) + estGasPol) : estGasPol;
    if (userPol < requiredPol) {
      setStatus('INSUFFICIENT_GAS');
      setExecutionError(
        isNativeIn
          ? `Insufficient POL/MATIC balance for swap amount (${inputAmount} ${quote.inputToken.symbol}) + network gas fee (~${estGasPol.toFixed(2)} POL).`
          : `You need at least ${estGasPol.toFixed(2)} POL for network gas fee.`
      );
      setIsStatusModalOpen(true);
      return;
    }

    setIsStatusModalOpen(true);
    setStatus('SWAP_PENDING');
    setExecutionError(null);
    setTxHash(undefined);

    try {
      // 1. Prepare transaction calldata (attempt server first, fallback to client)
      let tx: { to: `0x${string}`; data: `0x${string}`; value?: `0x${string}`; gasLimit?: string } | null = null;
      try {
        const prepRes = await fetch('/api/swap/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: quote.quoteId,
            walletAddress: address,
            chainId: POLYGON_CHAIN_ID,
          }),
        });

        const text = await prepRes.text();
        if (!text.trim().startsWith('<')) {
          const prepData = JSON.parse(text);
          if (prepRes.ok && prepData.success && prepData.transaction) {
            tx = prepData.transaction;
          }
        }
      } catch {
        // Fallback to client preparation below
      }

      if (!tx) {
        tx = await prepareDirectSwapTransaction({
          quote,
          walletAddress: address,
        });
      }

      const txValue = tx.value && tx.value !== '0x0' && tx.value !== '0'
        ? BigInt(tx.value)
        : (quote.inputToken.symbol === 'MATIC' || quote.inputToken.symbol === 'POL')
        ? BigInt(quote.inputAmountRaw)
        : 0n;

      // 2. Prompt user to sign and send on Polygon directly inside their connected wallet
      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: txValue,
        gas: BigInt(tx.gasLimit || '250000'),
        chainId: POLYGON_CHAIN_ID,
      });

      setTxHash(hash);
      setStatus('CONFIRMING');

      // 3. Wait for Polygon block confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: POLYGON_CHAIN_ID,
      });

      if (receipt.status === 'success') {
        setStatus('COMPLETED');
        fetchBalances();

        // 4. Optional background verification log
        try {
          fetch('/api/swap/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: hash,
              walletAddress: address,
              quoteId: quote.quoteId,
            }),
          }).catch(() => {});
        } catch {
          // Fire and forget
        }
      } else {
        setStatus('TRANSACTION_REVERTED');
        setExecutionError('Swap transaction reverted on Polygon.');
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
    // Account & Network
    address,
    isConnected,
    chainId,
    isPolygon,
    handleSwitchToPolygon,

    // Balances & Prices
    balances,
    polBalance,
    ethereumBalances,
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
