import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwa.ts';

// Register PWA service worker for offline caching and standalone execution
registerServiceWorker();

// Handle user cancellation, timeout, expired proposal, and connection reset events gracefully
if (typeof window !== 'undefined') {
  const isIgnorableWalletNotice = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('connection request reset') ||
      lower.includes('proposal expired') ||
      lower.includes('session proposal expired') ||
      lower.includes('pairing proposal expired') ||
      lower.includes('user rejected') ||
      lower.includes('user cancelled') ||
      lower.includes('modal closed') ||
      lower.includes('already pending') ||
      lower.includes('no matching key') ||
      lower.includes('pairing already exists') ||
      lower.includes('missing or invalid')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : reason?.message || reason?.shortMessage || reason?.details || '';
    if (isIgnorableWalletNotice(msg)) {
      console.warn('Wallet interaction notice (suppressed unhandled rejection):', msg);
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message || '';
    if (isIgnorableWalletNotice(msg)) {
      console.warn('Wallet interaction notice (suppressed window error):', msg);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

