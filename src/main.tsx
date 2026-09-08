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
    const anyErr = err as Record<string, unknown>;
    let text = `${anyErr.message || ''} ${anyErr.shortMessage || ''} ${anyErr.details || ''} ${anyErr.name || ''}`;
    if (anyErr.cause) {
      text += ` ${getErrorText(anyErr.cause)}`;
    }
    try {
      text += ` ${String(err)}`;
    } catch {
      return text;
    }
    return text;
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
      lower.includes('missing or invalid')
    );
  };

  // Prevent transient wallet dismissals/resets from triggering fatal console error logs
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isIgnorable = args.some((arg) => isIgnorableWalletNotice(arg));
    if (isIgnorable) {
      console.warn('Wallet interaction notice (suppressed console.error):', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      if (isIgnorableWalletNotice(reason)) {
        console.warn('Wallet interaction notice (suppressed unhandled rejection):', getErrorText(reason).slice(0, 150));
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
        console.warn('Wallet interaction notice (suppressed window error):', getErrorText(target).slice(0, 150));
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

