import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import type { SavedReceiver, SavedReceiversContextType } from '@/types/receivers';
import { SavedReceiversContext } from './savedReceiversDef';

const MAX_RECEIVERS_LIMIT = 50;

export const SavedReceiversProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address: merchantWalletAddress } = useAccount();

  // Storage key per merchant wallet or default global
  const storageKey = useMemo(() => {
    return merchantWalletAddress
      ? `cryptopay_saved_receivers_${merchantWalletAddress.toLowerCase()}`
      : 'cryptopay_saved_receivers_default';
  }, [merchantWalletAddress]);

  const activeIdStorageKey = useMemo(() => {
    return merchantWalletAddress
      ? `cryptopay_active_receiver_id_${merchantWalletAddress.toLowerCase()}`
      : 'cryptopay_active_receiver_id_default';
  }, [merchantWalletAddress]);

  // Load receivers from localStorage
  const [receivers, setReceivers] = useState<SavedReceiver[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.slice(0, MAX_RECEIVERS_LIMIT);
          }
        }
      } catch {
        // Fall back to empty
      }
    }
    return [];
  });

  // Load active receiver ID
  const [activeReceiverId, setActiveReceiverIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedId = localStorage.getItem(activeIdStorageKey);
        if (storedId) return storedId;
      } catch {
        // Fall back
      }
    }
    return null;
  });

  // Re-load when merchant wallet address switches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReceivers(parsed.slice(0, MAX_RECEIVERS_LIMIT));
        } else {
          setReceivers([]);
        }
      } else {
        setReceivers([]);
      }

      const storedActiveId = localStorage.getItem(activeIdStorageKey);
      if (storedActiveId) {
        setActiveReceiverIdState(storedActiveId);
      } else {
        setActiveReceiverIdState(null);
      }
    } catch {
      // Ignore storage read errors
    }
  }, [storageKey, activeIdStorageKey]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(receivers));
    } catch {
      // Ignore storage write errors
    }
  }, [receivers, storageKey]);

  useEffect(() => {
    try {
      if (activeReceiverId) {
        localStorage.setItem(activeIdStorageKey, activeReceiverId);
      } else {
        localStorage.removeItem(activeIdStorageKey);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [activeReceiverId, activeIdStorageKey]);

  // Derived Active Receiver object
  const activeReceiver = useMemo(() => {
    if (!activeReceiverId) return null;
    return receivers.find((r) => r.id === activeReceiverId) || null;
  }, [receivers, activeReceiverId]);

  // Helper to normalize Telegram Username
  const formatTelegram = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  };

  // Add Receiver
  const addReceiver = useCallback(
    (address: string, telegramUsername: string) => {
      const trimmedAddress = address.trim();
      const formattedTg = formatTelegram(telegramUsername);

      if (!trimmedAddress) {
        return { success: false, error: 'Wallet Address is required.' };
      }

      if (!isAddress(trimmedAddress)) {
        return {
          success: false,
          error: 'Invalid Wallet Address. Must be a valid 42-character 0x EVM hex address.',
        };
      }

      if (!formattedTg || formattedTg === '@') {
        return { success: false, error: 'Telegram Username is required.' };
      }

      if (receivers.length >= MAX_RECEIVERS_LIMIT) {
        return {
          success: false,
          error: `Maximum limit reached (50/50 Receivers Saved). Please delete a receiver before adding a new one.`,
        };
      }

      // Check if address is already registered
      const existing = receivers.find(
        (r) => r.address.toLowerCase() === trimmedAddress.toLowerCase()
      );
      if (existing) {
        return {
          success: false,
          error: `This Wallet Address is already saved (${existing.telegramUsername}).`,
        };
      }

      const newReceiver: SavedReceiver = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        address: trimmedAddress,
        telegramUsername: formattedTg,
        isFavorite: false,
        createdAt: Date.now(),
      };

      setReceivers((prev) => [newReceiver, ...prev].slice(0, MAX_RECEIVERS_LIMIT));

      // If there was no active receiver, make this new one active
      if (!activeReceiverId) {
        setActiveReceiverIdState(newReceiver.id);
      }

      return { success: true };
    },
    [receivers, activeReceiverId]
  );

  // Update Receiver
  const updateReceiver = useCallback(
    (id: string, address: string, telegramUsername: string) => {
      const trimmedAddress = address.trim();
      const formattedTg = formatTelegram(telegramUsername);

      if (!trimmedAddress) {
        return { success: false, error: 'Wallet Address is required.' };
      }

      if (!isAddress(trimmedAddress)) {
        return {
          success: false,
          error: 'Invalid Wallet Address. Must be a valid 42-character 0x EVM hex address.',
        };
      }

      if (!formattedTg || formattedTg === '@') {
        return { success: false, error: 'Telegram Username is required.' };
      }

      // Check if another receiver has this address
      const duplicate = receivers.find(
        (r) => r.id !== id && r.address.toLowerCase() === trimmedAddress.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `Another receiver (${duplicate.telegramUsername}) already uses this Wallet Address.`,
        };
      }

      setReceivers((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, address: trimmedAddress, telegramUsername: formattedTg }
            : r
        )
      );

      return { success: true };
    },
    [receivers]
  );

  // Delete Receiver
  const deleteReceiver = useCallback(
    (id: string) => {
      setReceivers((prev) => prev.filter((r) => r.id !== id));

      // If active receiver is deleted, clear it automatically
      if (activeReceiverId === id) {
        setActiveReceiverIdState(null);
      }
    },
    [activeReceiverId]
  );

  // Toggle Favorite
  const toggleFavorite = useCallback((id: string) => {
    setReceivers((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  }, []);

  // Set Active Receiver ID
  const setActiveReceiverId = useCallback((id: string | null) => {
    setActiveReceiverIdState(id);
  }, []);

  const value = useMemo<SavedReceiversContextType>(
    () => ({
      receivers,
      activeReceiverId,
      activeReceiver,
      addReceiver,
      updateReceiver,
      deleteReceiver,
      toggleFavorite,
      setActiveReceiverId,
      maxLimit: MAX_RECEIVERS_LIMIT,
    }),
    [
      receivers,
      activeReceiverId,
      activeReceiver,
      addReceiver,
      updateReceiver,
      deleteReceiver,
      toggleFavorite,
      setActiveReceiverId,
    ]
  );

  return (
    <SavedReceiversContext.Provider value={value}>
      {children}
    </SavedReceiversContext.Provider>
  );
};
