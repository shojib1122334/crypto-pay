import { useCallback } from 'react';
import { useConnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

/**
 * Custom hook to trigger the WalletConnect wallet selection modal directly.
 * Bypasses any intermediate screens or "Get Started" guide pages so that
 * clicking "Connect Wallet" immediately displays the WalletConnect wallet selection
 * and QR code options.
 */
export function useConnectWallet() {
  const { connectors, connect, isPending } = useConnect();
  const { openConnectModal } = useConnectModal();

  const openWalletConnect = useCallback(() => {
    // Locate the WalletConnect connector to open the WalletConnect modal directly
    const wcConnector = connectors.find(
      (c) =>
        c.id === 'walletConnect' ||
        c.type === 'walletConnect' ||
        c.name.toLowerCase().includes('walletconnect')
    );

    if (wcConnector) {
      connect(
        { connector: wcConnector },
        {
          onError: (err) => {
            const msg = (err?.message || '').toLowerCase();
            // User closing modal or cancelling is expected behavior
            if (
              !msg.includes('user rejected') &&
              !msg.includes('user cancelled') &&
              !msg.includes('modal closed')
            ) {
              console.warn('WalletConnect notice:', err.message);
            }
          },
        }
      );
    } else if (openConnectModal) {
      openConnectModal();
    }
  }, [connectors, connect, openConnectModal]);

  return {
    openWalletConnect,
    isPending,
  };
}

export default useConnectWallet;
