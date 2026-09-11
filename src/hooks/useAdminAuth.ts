import { useState, useEffect, useCallback } from 'react';
import { isAdminUnlocked, unlockAdminAccess, lockAdminAccess } from '@/lib/subscription';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminUnlocked());

  useEffect(() => {
    const handleUpdate = () => {
      setIsAdmin(isAdminUnlocked());
    };

    window.addEventListener('cryptopay_admin_updated', handleUpdate);
    window.addEventListener('cryptopay_subscription_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('cryptopay_admin_updated', handleUpdate);
      window.removeEventListener('cryptopay_subscription_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const unlock = useCallback((password: string) => {
    return unlockAdminAccess(password);
  }, []);

  const lock = useCallback(() => {
    lockAdminAccess();
  }, []);

  return {
    isAdmin,
    unlock,
    lock,
  };
}
