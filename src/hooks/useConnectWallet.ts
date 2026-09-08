import { useCallback } from 'react';
import { useConnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface ExtendedConnector {
  id?: string;
  type?: string;
  name?: string;
  isWalletConnectModalConnector?: boolean;
  rkDetails?: {
    id?: string;
    name?: string;
    isWalletConnectModalConnector?: boolean;
    showQrModal?: boolean;
  };
}

/**
 * Custom hook to trigger the WalletConnect wallet selection modal directly.
 * When called, it immediately opens the official WalletConnect modal (with QR code and 300+ wallet choices)
 * without intermediate guide screens ("Get Started", "What is a Wallet?"), extra popups, or stalls.
 */
export function useConnectWallet() {
  const { connectors, connectAsync, reset, isPending } = useConnect();
  const { openConnectModal, connectModalOpen } = useConnectModal();

  const openWalletConnect = useCallback(
    async (fallbackFn?: () => void) => {
      // 1. Reset any pending or erroneous connection mutations
      if (typeof reset === 'function') {
        try {
          reset();
        } catch {
          // ignore
        }
      }

      // 2. Identify the WalletConnect connector that opens the official modal
      const typedConnectors = connectors as unknown as ExtendedConnector[];
      const wcModalConnector =
        typedConnectors.find(
          (c) =>
            c.isWalletConnectModalConnector ||
            c.rkDetails?.isWalletConnectModalConnector ||
            (c.rkDetails?.id === 'walletConnect' && c.rkDetails?.showQrModal)
        ) ||
        typedConnectors.find(
          (c) =>
            c.id === 'walletConnect' ||
            c.type === 'walletConnect' ||
            c.rkDetails?.id === 'walletConnect' ||
            c.name?.toLowerCase().includes('walletconnect')
        );

      if (wcModalConnector) {
        try {
          await connectAsync({
            connector: wcModalConnector as unknown as (typeof connectors)[number],
          });
          return;
        } catch (err: unknown) {
          const anyErr = err as Record<string, unknown>;
          const text = `${anyErr?.message || ''} ${anyErr?.shortMessage || ''} ${anyErr?.name || ''} ${String(err)}`.toLowerCase();

          // Normal dismiss / close of WalletConnect modal by user - exit silently
          if (
            text.includes('connection request reset') ||
            text.includes('user rejected') ||
            text.includes('user cancelled') ||
            text.includes('user denied') ||
            text.includes('modal closed') ||
            text.includes('user closed modal') ||
            text.includes('proposal expired') ||
            text.includes('session proposal expired') ||
            text.includes('pairing proposal expired')
          ) {
            return;
          }

          console.warn('WalletConnect connection notice:', anyErr?.message || err);
          // If the connector failed unexpectedly, attempt fallback
          if (typeof fallbackFn === 'function') {
            fallbackFn();
          } else if (openConnectModal) {
            openConnectModal();
          }
          return;
        }
      }

      // 3. Fallback to connect modal if no WalletConnect connector instance was identified
      if (typeof fallbackFn === 'function') {
        fallbackFn();
      } else if (openConnectModal) {
        openConnectModal();
      }
    },
    [connectors, connectAsync, reset, openConnectModal]
  );

  return {
    openWalletConnect,
    openConnectModal,
    connectModalOpen,
    isPending,
    connectors,
  };
}

export default useConnectWallet;


