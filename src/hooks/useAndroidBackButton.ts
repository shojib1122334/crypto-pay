import { useEffect } from 'react';

/**
 * Custom hook to support Android hardware back button and swipe-back gestures
 * for closing modals without navigating away from the app.
 */
export function useAndroidBackButtonModal(isOpen: boolean, onClose: () => void, modalId: string = 'modal') {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    // Push a dummy history state for the modal
    const stateKey = `crypto_modal_${modalId}_${Date.now()}`;
    window.history.pushState({ modalState: stateKey }, '');

    const handlePopState = () => {
      // User pressed back button or gestured back
      if (isOpen) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up if closed via UI click instead of back button
      if (window.history.state && window.history.state.modalState === stateKey) {
        window.history.back();
      }
    };
  }, [isOpen, onClose, modalId]);
}
