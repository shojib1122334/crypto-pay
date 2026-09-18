import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwa.ts';

// Register PWA service worker for offline caching and standalone execution
registerServiceWorker();

// Handle user cancellation, timeout, expired proposal, COOP notices, fetch getters, and connection reset events gracefully
if (typeof window !== 'undefined') {
  const getErrorText = (err: unknown): string => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      const anyErr = err as Record<string, unknown>;
      let text = `${anyErr.message || ''} ${anyErr.shortMessage || ''} ${anyErr.details || ''} ${anyErr.name || ''} ${anyErr.msg || ''} ${anyErr.context || ''}`;
      if (anyErr.cause) {
        text += ` ${getErrorText(anyErr.cause)}`;
      }
      try {
        text += ` ${JSON.stringify(err)}`;
      } catch {
        try {
          text += ` ${String(err)}`;
        } catch {
          return text;
        }
      }
      return text;
    }
    try {
      return String(err);
    } catch {
      return '';
    }
  };

  const isIgnorableWalletNotice = (err: unknown): boolean => {
    const lower = getErrorText(err).toLowerCase();
    return (
      lower.includes('cannot set property fetch') ||
      lower.includes('has only a getter') ||
      lower.includes('cross-origin-opener-policy') ||
      lower.includes('connection request reset') ||
      lower.includes('proposal expired') ||
      lower.includes('session proposal expired') ||
      lower.includes('pairing proposal expired') ||
      lower.includes('user rejected') ||
      lower.includes('user cancelled') ||
      lower.includes('user denied') ||
      lower.includes('modal closed') ||
      lower.includes('user closed modal') ||
      lower.includes('already pending') ||
      lower.includes('no matching key') ||
      lower.includes('pairing already exists') ||
      lower.includes('missing or invalid') ||
      lower.includes('restore will override') ||
      lower.includes('core/relayer/subscription') ||
      lower.includes('core/relayer') ||
      lower.includes('relayer/subscription') ||
      lower.includes('resubscribed') ||
      lower.includes('subscription: [') ||
      lower.includes('bf6fbc0931da470b')
    );
  };

  // Prevent transient wallet dismissals/resets and WalletConnect relayer operational logs from triggering fatal console errors
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isIgnorable = args.some((arg) => isIgnorableWalletNotice(arg));
    if (isIgnorable) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      if (isIgnorableWalletNotice(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const target = event?.error || event?.message || event;
      if (isIgnorableWalletNotice(target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return true;
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

