import { useEffect, useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { polygon } from '@/lib/wallet';

export const POLYGON_CHAIN_ID = polygon.id; // 137

export function useEnsureNetwork(targetChainId: number = POLYGON_CHAIN_ID) {
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

export function useEnsurePolygon() {
  return useEnsureNetwork(POLYGON_CHAIN_ID);
}
