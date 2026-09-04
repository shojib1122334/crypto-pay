import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useSwitchChain, useSendTransaction, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { erc20Abi, formatUnits, parseUnits } from 'viem';
import { SwapQuote, SwapStatus } from '../types/swap';
import { POLYGON_CHAIN_ID, SWAP_TOKENS, SwapTokenInfo } from '../components/exchange/tokenData';

export function useSwapEngine() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  // Selected tokens (Defaults to 10,000 VERSE -> USDT as specified)
  const defaultInput = SWAP_TOKENS.find((t) => t.symbol === 'VERSE') || SWAP_TOKENS[3];
  const defaultOutput = SWAP_TOKENS.find((t) => t.symbol === 'USDT') || SWAP_TOKENS[1];
  const [inputToken, setInputToken] = useState<SwapTokenInfo>(defaultInput);
  const [outputToken, setOutputToken] = useState<SwapTokenInfo>(defaultOutput);
  const [inputAmount, setInputAmount] = useState<string>('10000');

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
    USDT: '0.00',
    USDC: '0.00',
    VERSE: '0.00',
  });
  const [polBalance, setPolBalance] = useState<string>('0.00');

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

  // Refresh token balances from Polygon
  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected) return;
    try {
      const client = wagmiConfig.getClient({ chainId: POLYGON_CHAIN_ID });
      if (!client) return;

      // Native POL balance
      const polBal = await client.getBalance({ address });
      const formattedPol = formatUnits(polBal, 18);
      setPolBalance(formattedPol);

      // Whitelisted token balances
      const newBalances: Record<string, string> = {
        MATIC: formattedPol,
      };
      for (const token of SWAP_TOKENS) {
        if (token.symbol === 'MATIC') {
          newBalances.MATIC = formattedPol;
          continue;
        }
        try {
          const bal = await client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          });
          newBalances[token.symbol] = formatUnits(bal, token.decimals);
        } catch {
          newBalances[token.symbol] = '0.00';
        }
      }
      setBalances(newBalances);
    } catch {
      // Ignore network hiccup
    }
  }, [address, isConnected, wagmiConfig]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
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
      const client = wagmiConfig.getClient({ chainId: POLYGON_CHAIN_ID });
      if (!client) return;

      const currentAllowance = await client.readContract({
        address: currentQuote.inputToken.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, currentQuote.route.routerAddress],
      });

      setAllowance(currentAllowance);
      const reqAmount = BigInt(currentQuote.inputAmountRaw);

      if (currentAllowance >= reqAmount) {
        setStatus('APPROVED');
      } else {
        setStatus('APPROVAL_REQUIRED');
      }
    } catch {
      setStatus('APPROVAL_REQUIRED');
    } finally {
      setIsCheckingAllowance(false);
    }
  }, [address, isConnected, wagmiConfig]);

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

    if ((inputToken.symbol === 'MATIC' || inputToken.symbol === 'POL') && num < 3) {
      setQuote(null);
      setQuoteError('Minimum Swap amount for Polygon (POL/MATIC) is 3 MATIC.');
      return;
    }

    if (inputToken.symbol === 'VERSE' && num < 10000) {
      setQuote(null);
      setQuoteError('Minimum Swap amount for Verse is 10,000 VERSE.');
      return;
    }

    if ((inputToken.symbol === 'USDT' || inputToken.symbol === 'USDC') && num < 1.0) {
      setQuote(null);
      setQuoteError(`Minimum Swap amount for ${inputToken.symbol} is $1.00.`);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoteLoading(true);
    setQuoteError(null);

    const executeFetch = async (attempt: number): Promise<void> => {
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

        if (controller.signal.aborted) return;

        const text = await res.text();
        if (controller.signal.aborted) return;

        let data: { success?: boolean; quote?: SwapQuote; error?: string; message?: string } | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          // Response was not JSON (e.g. 502 Bad Gateway during server reload or network glitch)
          if (attempt < 2 && !controller.signal.aborted) {
            await new Promise((r) => setTimeout(r, 600));
            if (controller.signal.aborted) return;
            return executeFetch(attempt + 1);
          }
          if (controller.signal.aborted) return;
          setQuote(null);
          setQuoteError('Polygon swap quote service is momentarily unavailable. Click Retry to re-fetch.');
          return;
        }

        if (controller.signal.aborted) return;

        if (!res.ok || !data || !data.success) {
          // If it's a 500/502/503 temporary error, retry up to 2 times
          if (res.status >= 500 && attempt < 2 && !controller.signal.aborted) {
            await new Promise((r) => setTimeout(r, 600));
            if (controller.signal.aborted) return;
            return executeFetch(attempt + 1);
          }
          setQuote(null);
          setQuoteError(data?.error || data?.message || 'Failed to get live quote from Polygon.');
        } else {
          setQuote(data.quote);
          setQuoteError(null);
          setSecondsRemaining(45);
          if (address) {
            checkAllowance(data.quote);
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (attempt < 2 && !controller.signal.aborted) {
          await new Promise((r) => setTimeout(r, 600));
          if (controller.signal.aborted) return;
          return executeFetch(attempt + 1);
        }
        if (controller.signal.aborted) return;
        setQuote(null);
        const msg = err instanceof Error && err.message ? err.message : 'Polygon swap quote service is momentarily unavailable.';
        setQuoteError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setIsQuoteLoading(false);
        }
      }
    };

    await executeFetch(0);
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
      // 1. Prepare transaction calldata from backend
      const prepRes = await fetch('/api/swap/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          walletAddress: address,
          chainId: POLYGON_CHAIN_ID,
        }),
      });

      const prepData = await prepRes.json();
      if (!prepRes.ok || !prepData.success) {
        throw new Error(prepData.error || 'Failed to prepare swap transaction.');
      }

      const tx = prepData.transaction;
      const txValue = tx.value && tx.value !== '0x0' && tx.value !== '0'
        ? BigInt(tx.value)
        : (quote.inputToken.symbol === 'MATIC' || quote.inputToken.symbol === 'POL')
        ? BigInt(quote.inputAmountRaw)
        : 0n;

      // 2. Prompt user to sign and send on Polygon
      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: txValue,
        gas: BigInt(tx.gasLimit),
        chainId: POLYGON_CHAIN_ID,
      });

      setTxHash(hash);
      setStatus('CONFIRMING');

      // 3. Wait for Polygon block confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: POLYGON_CHAIN_ID,
      });

      // 4. Verify transaction on backend
      const verifyRes = await fetch('/api/swap/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          walletAddress: address,
          quoteId: quote.quoteId,
        }),
      });

      const verifyData = await verifyRes.json();

      if (receipt.status === 'success' && verifyData.status === 'COMPLETED') {
        setStatus('COMPLETED');
        fetchBalances();
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

    // Balances
    balances,
    polBalance,
    fetchBalances,

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
