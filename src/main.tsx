import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle user cancellation / connection reset events gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : reason?.message || reason?.shortMessage || '';
    if (
      msg.includes('Connection request reset') ||
      msg.includes('User rejected') ||
      msg.includes('User cancelled') ||
      msg.includes('Modal closed') ||
      msg.includes('already pending')
    ) {
      console.warn('Wallet interaction notice:', msg);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

