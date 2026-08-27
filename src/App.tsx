import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { config } from '@/lib/wallet';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import MerchantDashboard from '@/components/MerchantDashboard';
import TrustSection from '@/components/TrustSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import SecuritySection from '@/components/SecuritySection';
import Footer from '@/components/Footer';
import CustomerPaymentView from '@/components/CustomerPaymentView';
import { getCurrentPaymentParams } from '@/lib/payments';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.warn('React Query cache warning:', error?.message || error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.warn('React Query mutation warning:', error?.message || error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function AppContent() {
  const [params, setParams] = useState(() => getCurrentPaymentParams());

  useEffect(() => {
    const onPop = () => setParams(getCurrentPaymentParams());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const isCustomerView = !!params;

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Institutional Deep Navy Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">
        {isCustomerView ? (
          <CustomerPaymentView params={params!} />
        ) : (
          <>
            <HeroSection />
            <MerchantDashboard />
            <TrustSection />
            <HowItWorksSection />
            <SecuritySection />
          </>
        )}
      </main>

      {/* Institutional Deep Navy Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#1D4ED8', // Royal Blue
            accentColorForeground: '#ffffff',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

