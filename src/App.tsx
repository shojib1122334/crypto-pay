import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { config } from '@/lib/wallet';
import Header from '@/components/Header';
import MerchantDashboard from '@/components/MerchantDashboard';
import PaySystemTerminal from '@/components/PaySystemTerminal';
import CustomerPaymentView from '@/components/CustomerPaymentView';
import BottomNavBar from '@/components/BottomNavBar';
import ComingSoonPage from '@/components/ComingSoonPage';
import TransactionHistoryView from '@/components/TransactionHistoryView';
import { CreateInvoiceSection } from '@/components/CreateInvoiceSection';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/context/ThemeContext';
import { SavedReceiversProvider } from '@/context/SavedReceiversContext';

import { usePWA } from '@/hooks/usePWA';
import { WifiOff } from 'lucide-react';
import { getCurrentPaymentParams } from '@/lib/payments';
import type { NavTab } from '@/types/navigation';


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

function parseTabFromHash(hashStr: string): NavTab {
  const clean = hashStr.replace('#', '').toLowerCase();
  if (clean === 'pay-system' || clean === 'pay' || clean === 'how-it-works') {
    return 'pay-system';
  }
  if (clean === 'create-invoice' || clean === 'invoice' || clean === 'credit-invoice') {
    return 'create-invoice';
  }
  if (clean === 'activity' || clean === 'transactions' || clean === 'history') {
    return 'activity';
  }
  if (clean === 'settings') {
    return 'settings';
  }
  return 'dashboard';
}

function getInitialTab(): NavTab {
  if (typeof window !== 'undefined') {
    return parseTabFromHash(window.location.hash);
  }
  return 'dashboard';
}

function AppContent() {
  const [params, setParams] = useState(() => getCurrentPaymentParams());
  const [activeTab, setActiveTab] = useState<NavTab>(() => getInitialTab());
  const { isOnline } = usePWA();

  useEffect(() => {
    const onPop = () => {
      setParams(getCurrentPaymentParams());
      setActiveTab(parseTabFromHash(window.location.hash));
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'dashboard') {
        if (window.location.hash && window.location.hash !== '') {
          window.history.pushState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        window.history.pushState(null, '', `#${tab}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isCustomerView = !!params && activeTab === 'dashboard';

  return (
    <>
      {/* PWA App Install Banner & Prompt */}
      <PWAInstallPrompt />

      {/* Non-intrusive Offline Banner */}
      {!isOnline && (
        <div className="bg-[#EF4444] text-white text-xs font-bold py-1.5 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode: Blockchain RPC queries paused. Reconnecting automatically...</span>
        </div>
      )}

      <div
        className="min-h-screen relative flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white"
      >
        {/* Subtle Ambient Background Mesh */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-200/40 via-emerald-100/30 to-transparent blur-[120px] rounded-full" />
          <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-100/40 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-100/40 blur-[100px] rounded-full" />
        </div>

        {/* Crisp Header */}
        <Header
          activeTab={activeTab}
          onNavigateTab={handleTabChange}
        />

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 pb-20 sm:pb-24">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {isCustomerView ? (
                <CustomerPaymentView params={params!} />
              ) : (
                <MerchantDashboard onNavigateTab={handleTabChange} />
              )}
            </>
          )}

          {/* Pay System Tab (Web3 Terminal: Send Crypto, Receive Crypto QR, Token Balance) */}
          {activeTab === 'pay-system' && (
            <div id="pay-system-page">
              <PaySystemTerminal onNavigateTab={handleTabChange} />
            </div>
          )}

          {/* Create Invoice Tab */}
          {activeTab === 'create-invoice' && (
            <div id="create-invoice-page">
              <CreateInvoiceSection onNavigateTab={handleTabChange} />
            </div>
          )}

          {/* Activity Tab (Real Transaction History & Verification Ledger) */}
          {activeTab === 'activity' && <TransactionHistoryView />}

          {/* Settings Tab (Coming Soon) */}
          {activeTab === 'settings' && <ComingSoonPage />}
        </main>

        {/* Persistent Native Mobile Bottom Navigation Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </>
  );
}

function AppWithTheme() {
  return (
    <RainbowKitProvider
      theme={lightTheme({
        accentColor: '#1D4ED8',
        accentColorForeground: '#FFFFFF',
        borderRadius: 'large',
        fontStack: 'system',
        overlayBlur: 'small',
      })}
      modalSize="compact"
    >
      <AppContent />
    </RainbowKitProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="CryptoPay Application Recovery">
      <ThemeProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <SavedReceiversProvider>
              <AppWithTheme />
            </SavedReceiversProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}


