import { POLYGON_CHAIN_ID } from './tokens';

export interface ParsedRpcError {
  title: string;
  message: string;
  technicalDetails?: string;
  actionHint?: string;
  category: 'network' | 'balance' | 'gas' | 'revert' | 'user' | 'rpc';
  rawCode?: number | string;
}

export interface ErrorContext {
  tokenSymbol?: string;
  networkName?: string;
  amount?: string;
  chainId?: number;
  userBalance?: string;
  nativeBalance?: string;
  walletAddress?: string;
}

/**
 * Deeply inspects an unknown RPC/Wallet/Viem/Ethers error and produces human-readable,
 * actionable blockchain diagnostics instead of generic "unknown RPC error".
 */
export function parseRpcError(err: unknown, context?: ErrorContext): ParsedRpcError {
  if (!err) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected issue occurred while processing the transaction.',
      category: 'rpc',
    };
  }

  // Dig deep into error objects, causes, details, and inner viem BaseError properties
  const anyErr = err as Record<string, unknown>;
  const shortMessage = typeof anyErr.shortMessage === 'string' ? anyErr.shortMessage.trim() : '';
  const fullMessage = typeof anyErr.message === 'string' ? anyErr.message.trim() : String(err);
  const details = typeof anyErr.details === 'string' ? anyErr.details.trim() : '';

  // Extract nested cause details
  let causeMessage = '';
  let causeDetails = '';
  let causeCode: number | string | undefined = undefined;

  if (anyErr.cause && typeof anyErr.cause === 'object') {
    const causeObj = anyErr.cause as Record<string, unknown>;
    if (typeof causeObj.message === 'string') causeMessage = causeObj.message;
    if (typeof causeObj.details === 'string') causeDetails = causeObj.details;
    if (typeof causeObj.code === 'number' || typeof causeObj.code === 'string') causeCode = causeObj.code;

    // Further nest inspection if cause has data
    if (causeObj.data && typeof causeObj.data === 'object') {
      const dataObj = causeObj.data as Record<string, unknown>;
      if (typeof dataObj.message === 'string') causeDetails += ` | ${dataObj.message}`;
    }
  }

  // Combine diagnostic texts for pattern matching
  const combinedText = [
    shortMessage,
    fullMessage,
    details,
    causeMessage,
    causeDetails,
    typeof anyErr.name === 'string' ? anyErr.name : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Extract raw technical summary for debugging (excluding the useless "unknown RPC error" prefix)
  let cleanTechDetail = [details, causeDetails, causeMessage, fullMessage]
    .filter(Boolean)
    .find((s) => !s.toLowerCase().includes('an unknown rpc error occurred') && s.length > 5) || fullMessage;

  if (cleanTechDetail.length > 300) {
    cleanTechDetail = cleanTechDetail.slice(0, 300) + '...';
  }

  // 1. User Rejected / Cancelled Signature
  if (
    causeCode === 4001 ||
    combinedText.includes('user rejected') ||
    combinedText.includes('user denied') ||
    combinedText.includes('user cancelled') ||
    combinedText.includes('user closed') ||
    combinedText.includes('action_rejected') ||
    combinedText.includes('rejected the request')
  ) {
    return {
      title: 'Signature Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      actionHint: 'No funds were moved. You can retry whenever you are ready.',
      technicalDetails: 'User rejected signature request (Code: 4001)',
      category: 'user',
      rawCode: 4001,
    };
  }

  // 2. Network / Chain Mismatch
  if (
    combinedText.includes('chain mismatch') ||
    combinedText.includes('chainmismatcherror') ||
    combinedText.includes('wrong network') ||
    combinedText.includes('network mismatch') ||
    combinedText.includes('switchchainerror') ||
    combinedText.includes('unsupported chain')
  ) {
    const targetChainName = context?.chainId === POLYGON_CHAIN_ID || !context?.chainId ? 'Polygon Mainnet' : 'Ethereum';
    return {
      title: 'Network Mismatch',
      message: `Your wallet is not connected to ${targetChainName}. Blockchain transactions must be signed on the matching network.`,
      actionHint: `Please switch your wallet network to ${targetChainName} (Chain ID: ${context?.chainId || 137}).`,
      technicalDetails: cleanTechDetail,
      category: 'network',
    };
  }

  // 3. Insufficient Native POL/ETH for Gas Fees
  if (
    combinedText.includes('insufficient funds for gas') ||
    combinedText.includes('insufficientfundserror') ||
    combinedText.includes('gas * price + value') ||
    combinedText.includes('out of gas') ||
    combinedText.includes('gas required exceeds allowance') ||
    combinedText.includes('cannot estimate gas') && combinedText.includes('funds')
  ) {
    const nativeSymbol = context?.chainId === POLYGON_CHAIN_ID || !context?.chainId ? 'POL' : 'ETH';
    return {
      title: `Insufficient ${nativeSymbol} for Network Gas`,
      message: `Your wallet does not have enough native ${nativeSymbol} to pay for the Polygon blockchain gas fee.`,
      actionHint: `Ensure you hold at least ~0.01 - 0.05 ${nativeSymbol} in your wallet to cover network transaction fees.`,
      technicalDetails: cleanTechDetail,
      category: 'gas',
    };
  }

  // 4. Token Transfer Exceeds Balance
  if (
    combinedText.includes('transfer amount exceeds balance') ||
    combinedText.includes('exceeds balance') ||
    combinedText.includes('insufficient balance') ||
    combinedText.includes('erc20: transfer amount exceeds balance')
  ) {
    const token = context?.tokenSymbol || 'token';
    const amountStr = context?.amount ? ` (${context.amount} ${token})` : '';
    const balanceStr = context?.userBalance ? ` (Available: ${context.userBalance} ${token})` : '';

    return {
      title: `Insufficient ${token} Balance`,
      message: `The requested transfer amount${amountStr} exceeds your available ${token} balance${balanceStr}.`,
      actionHint: 'Please lower the transfer amount or add more tokens to your wallet on Polygon Mainnet.',
      technicalDetails: cleanTechDetail,
      category: 'balance',
    };
  }

  // 5. Smart Contract Execution Revert
  if (
    combinedText.includes('execution reverted') ||
    combinedText.includes('contractfunctionrevertederror') ||
    combinedText.includes('reverted with reason') ||
    combinedText.includes('transaction reverted')
  ) {
    // Attempt to extract specific revert string
    let revertReason = '';
    const match = fullMessage.match(/execution reverted:? ?([^\n\r"']+)/i) ||
                  details.match(/execution reverted:? ?([^\n\r"']+)/i);
    if (match && match[1]) {
      revertReason = match[1].trim();
    }

    if (revertReason) {
      return {
        title: 'Contract Execution Reverted',
        message: `The token smart contract rejected the transaction with reason: "${revertReason}".`,
        actionHint: 'Please check the recipient address, your token balance, and allowance.',
        technicalDetails: `Revert Reason: ${revertReason} | ${cleanTechDetail}`,
        category: 'revert',
      };
    }

    return {
      title: 'Smart Contract Reverted',
      message: `The Polygon contract rejected the transfer. This typically occurs when token balance is insufficient, POL gas funds are missing, or recipient contract cannot receive ERC-20 tokens.`,
      actionHint: 'Verify your wallet has sufficient token balance, POL for gas, and is connected to Polygon Mainnet.',
      technicalDetails: cleanTechDetail,
      category: 'revert',
    };
  }

  // 6. Nonce Too Low / Transaction Underpriced
  if (
    combinedText.includes('nonce too low') ||
    combinedText.includes('replacement transaction underpriced') ||
    combinedText.includes('already known')
  ) {
    return {
      title: 'Transaction Sequence Conflict',
      message: 'A previous transaction with the same sequence number (nonce) is still pending in your wallet.',
      actionHint: 'Wait for pending transactions in your wallet to confirm or speed them up.',
      technicalDetails: cleanTechDetail,
      category: 'rpc',
    };
  }

  // 7. Generic "An unknown RPC error occurred" / RPC Code -32603 handling
  if (
    combinedText.includes('unknown rpc error') ||
    causeCode === -32603 ||
    combinedText.includes('-32603') ||
    combinedText.includes('internal json-rpc error')
  ) {
    // Check if details contains actionable node feedback
    let specificCause = '';
    if (details && !details.toLowerCase().includes('unknown rpc error')) {
      specificCause = details;
    } else if (causeDetails && !causeDetails.toLowerCase().includes('unknown rpc error')) {
      specificCause = causeDetails;
    } else if (causeMessage && !causeMessage.toLowerCase().includes('unknown rpc error')) {
      specificCause = causeMessage;
    }

    return {
      title: 'Polygon RPC Transaction Error',
      message: specificCause
        ? `The Polygon RPC node returned: "${specificCause}".`
        : 'The Polygon node rejected transaction gas estimation or execution. This usually happens when the connected wallet is on a different chain, has insufficient token balance, or lacks POL for network fees.',
      actionHint: 'Verify your wallet is on Polygon Mainnet (Chain ID 137), check your token balance, and make sure you have POL for gas.',
      technicalDetails: specificCause || cleanTechDetail || 'RPC internal code -32603',
      category: 'rpc',
      rawCode: causeCode || -32603,
    };
  }

  // 8. Public RPC Connectivity / Timeout / 429 / 403 / 502 / Network Failure
  if (
    combinedText.includes('failed to fetch') ||
    combinedText.includes('network request failed') ||
    combinedText.includes('timeout') ||
    combinedText.includes('429') ||
    combinedText.includes('403') ||
    combinedText.includes('502') ||
    combinedText.includes('503') ||
    combinedText.includes('httprequesterror')
  ) {
    return {
      title: 'RPC Provider Connection Issue',
      message: 'The Polygon RPC provider is experiencing temporary latency or rate limits. Our fallback providers are taking over.',
      actionHint: 'Please wait a moment and try submitting the payment again.',
      technicalDetails: cleanTechDetail,
      category: 'rpc',
    };
  }

  // 9. Fallback with honest blockchain details
  return {
    title: 'Transaction Error',
    message: shortMessage && !shortMessage.toLowerCase().includes('unknown rpc error')
      ? shortMessage
      : fullMessage && !fullMessage.toLowerCase().includes('unknown rpc error')
      ? fullMessage
      : 'The blockchain network rejected the transaction. Please review your balance and wallet settings.',
    actionHint: 'Ensure your wallet is connected to Polygon Mainnet (137) and has sufficient POL for gas.',
    technicalDetails: cleanTechDetail,
    category: 'rpc',
  };
}
