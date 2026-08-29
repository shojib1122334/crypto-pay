import { isAddress } from 'viem';

export interface ScannedQRData {
  raw: string;
  address: string;
  amount?: string;
  tokenSymbol?: string;
  chainId?: number;
}

/**
 * Robust parser for various crypto QR URI standards (EIP-681, Polygon/Ethereum, raw EVM addresses, etc.)
 */
export function parseCryptoQR(rawText: string): ScannedQRData {
  const text = (rawText || '').trim();

  // 1. Direct EVM address check
  if (isAddress(text)) {
    return { raw: text, address: text };
  }

  // 2. EIP-681 / Ethereum standard URIs
  // Patterns:
  // - ethereum:0x1234...
  // - ethereum:0xContract@137/transfer?address=0xRecipient&uint256=1000000
  // - ethereum:0xRecipient@1?value=1e18
  // - polygon:0xRecipient
  if (text.toLowerCase().startsWith('ethereum:') || text.toLowerCase().startsWith('polygon:')) {
    const withoutScheme = text.replace(/^(ethereum:|polygon:)/i, '');
    const [pathPart, queryPart] = withoutScheme.split('?');
    const [targetWithChain, action] = pathPart.split('/');
    const [targetAddr, chainPart] = targetWithChain.split('@');

    let chainId: number | undefined;
    if (chainPart) {
      const parsedChain = parseInt(chainPart, 10);
      if (!isNaN(parsedChain)) chainId = parsedChain;
    } else if (text.toLowerCase().startsWith('polygon:')) {
      chainId = 137;
    }

    let recipient = targetAddr;
    let amount: string | undefined;
    let tokenSymbol: string | undefined;

    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      if (params.get('address') && isAddress(params.get('address')!)) {
        recipient = params.get('address')!;
      }
      if (params.get('value')) {
        amount = params.get('value')!;
      }
      if (params.get('uint256')) {
        amount = params.get('uint256')!;
      }
    }

    if (action === 'transfer' && queryPart) {
      const params = new URLSearchParams(queryPart);
      if (params.get('address')) {
        recipient = params.get('address')!;
      }
    }

    recipient = recipient.replace(/^pay-/i, '');

    return {
      raw: text,
      address: isAddress(recipient) ? recipient : targetAddr,
      amount,
      tokenSymbol,
      chainId,
    };
  }

  // 3. Check if text contains an EVM address inside any random string/URL
  const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch && isAddress(evmMatch[0])) {
    return {
      raw: text,
      address: evmMatch[0],
    };
  }

  // Fallback raw string
  return {
    raw: text,
    address: text,
  };
}
