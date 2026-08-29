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
import SplashIntro from '@/components/SplashIntro';
import BottomNavBar from '@/components/BottomNavBar';
import ComingSoonPage from '@/components/ComingSoonPage';
import TransactionHistoryView from '@/components/TransactionHistoryView';
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
  const [showSplash, setShowSplash] = useState(true);

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
      {showSplash && (
        <SplashIntro
          durationMs={2000}
          onComplete={() => setShowSplash(false)}
        />
      )}

      <div
        className={`min-h-screen relative flex flex-col transition-colors duration-200 ${
          activeTab === 'activity'
            ? 'bg-black text-white'
            : activeTab === 'pay-system'
            ? 'bg-[#042f22] text-white'
            : 'bg-[#F8FAFC] text-[#0F172A]'
        } selection:bg-blue-600 selection:text-white`}
      >
        {/* Crisp Header */}
        <Header
          activeTab={activeTab}
          onNavigateTab={handleTabChange}
        />

        {/* Main Content Area with safe bottom spacing for the edge-to-edge bottom bar */}
        <main className="relative z-10 flex-1 pb-20 sm:pb-24">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {isCustomerView ? (
                <CustomerPaymentView params={params!} />
              ) : (
                <MerchantDashboard />
              )}
            </>
          )}

          {/* Pay System Tab (Multi-Chain Web3 Terminal: Send, Receive, Balances, BTC) */}
          {activeTab === 'pay-system' && (
            <div id="pay-system-page">
              <PaySystemTerminal />
            </div>
          )}

          {/* Activity Tab (Real Transaction History & Verification Ledger) */}
          {activeTab === 'activity' && <TransactionHistoryView />}

          {/* Settings Tab (Coming Soon) */}
          {activeTab === 'settings' && <ComingSoonPage />}
        </main>

        {/* Persistent Edge-to-Edge Native Mobile Bottom Navigation Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#2563EB', // Blue 600
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
