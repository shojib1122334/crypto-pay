import { useEffect, useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { sepolia, polygon } from '@/lib/wallet';

const SEPOLIA_CHAIN_ID = sepolia.id;
const POLYGON_CHAIN_ID = polygon.id;

export function useEnsureNetwork(targetChainId: number = SEPOLIA_CHAIN_ID) {
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [requested, setRequested] = useState(false);

  const isCorrect = chainId === targetChainId;

  useEffect(() => {
    if (isCorrect) setRequested(false);
  }, [isCorrect]);

  const requestSwitch = async () => {
    setRequested(true);
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch {
      setRequested(false);
    }
  };

  return { isCorrect, requestSwitch, switching, requested, currentChainId: chainId };
}

export function useEnsureSepolia() {
  return useEnsureNetwork(SEPOLIA_CHAIN_ID);
}

export { SEPOLIA_CHAIN_ID, POLYGON_CHAIN_ID };

