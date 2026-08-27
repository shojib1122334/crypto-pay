import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';
import { ConnectButton, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wallet';
import MerchantDashboard from '@/components/MerchantDashboard';
import CustomerPaymentView from '@/components/CustomerPaymentView';
import { getCurrentPaymentParams } from '@/lib/payments';

const queryClient = new QueryClient();

function AppContent() {
  const [params, setParams] = useState(() => getCurrentPaymentParams());

  useEffect(() => {
    const onPop = () => setParams(getCurrentPaymentParams());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const isCustomerView = !!params;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">
              CryptoPay
            </span>
          </div>
          <ConnectButton
            showBalance={false}
            chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-[calc(100vh-3.5rem)]">
        {isCustomerView ? (
          <CustomerPaymentView params={params!} />
        ) : (
          <MerchantDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-400">
          Sepolia testnet (USDT, USDC) & Polygon Mainnet (VERSE)
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#0f172a',
            accentColorForeground: '#ffffff',
            borderRadius: 'medium',
          })}
          modalSize="compact"
        >
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
