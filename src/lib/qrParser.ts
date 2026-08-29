import { isAddress } from 'viem';

export interface ScannedQRData {
  raw: string;
  address: string;
  amount?: string;
  tokenSymbol?: string;
  chainId?: number;
}

/**
 * Robust parser for various crypto QR URI standards (EIP-681, BIP-21, raw addresses, etc.)
 */
export function parseCryptoQR(rawText: string): ScannedQRData {
  const text = (rawText || '').trim();

  // 1. Direct EVM address check
  if (isAddress(text)) {
    return { raw: text, address: text };
  }

  // 2. Bitcoin BIP-21 URI (e.g. bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001)
  if (text.toLowerCase().startsWith('bitcoin:') || text.toLowerCase().startsWith('bitcoincash:')) {
    const parts = text.split('?');
    const prefixRemoved = parts[0].replace(/^(bitcoin:|bitcoincash:)/i, '');
    const cleanAddr = prefixRemoved.trim();
    let amount: string | undefined;

    if (parts[1]) {
      const params = new URLSearchParams(parts[1]);
      if (params.get('amount')) {
        amount = params.get('amount') || undefined;
      }
    }
    return {
      raw: text,
      address: cleanAddr,
      amount,
      tokenSymbol: 'BTC',
    };
  }

  // 3. EIP-681 / Ethereum standard URIs
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

  // 4. Check if text contains an EVM address inside any random string/URL
  const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch && isAddress(evmMatch[0])) {
    return {
      raw: text,
      address: evmMatch[0],
    };
  }

  // 5. Check for Bitcoin address pattern (1..., 3..., bc1...)
  const btcMatch = text.match(/(bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})/);
  if (btcMatch) {
    return {
      raw: text,
      address: btcMatch[0],
      tokenSymbol: 'BTC',
    };
  }

  // Fallback raw string
  return {
    raw: text,
    address: text,
  };
}
