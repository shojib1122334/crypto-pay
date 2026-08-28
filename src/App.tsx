import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { config } from '@/lib/wallet';
import Header from '@/components/Header';
import MerchantDashboard from '@/components/MerchantDashboard';
import HowItWorksSection from '@/components/HowItWorksSection';
import Footer from '@/components/Footer';
import CustomerPaymentView from '@/components/CustomerPaymentView';
import SplashIntro from '@/components/SplashIntro';
import BottomNavBar from '@/components/BottomNavBar';
import PayPage from '@/components/PayPage';
import ExplorePage from '@/components/ExplorePage';
import MorePage from '@/components/MorePage';
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

function getInitialTab(): NavTab {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'pay' || hash === 'explore' || hash === 'more') {
      return hash as NavTab;
    }
  }
  return 'home';
}

function AppContent() {
  const [params, setParams] = useState(() => getCurrentPaymentParams());
  const [activeTab, setActiveTab] = useState<NavTab>(() => getInitialTab());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const onPop = () => {
      setParams(getCurrentPaymentParams());
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'pay' || hash === 'explore' || hash === 'more' || hash === 'home') {
        setActiveTab(hash as NavTab);
      } else if (!hash) {
        setActiveTab('home');
      }
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
      if (tab === 'home') {
        // If switching to home, clear specific section hash or set #home
        if (window.location.hash && window.location.hash !== '') {
          window.history.pushState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        window.history.pushState(null, '', `#${tab}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isCustomerView = !!params && activeTab === 'home';

  return (
    <>
      {showSplash && (
        <SplashIntro
          durationMs={2000}
          onComplete={() => setShowSplash(false)}
        />
      )}

      <div className="min-h-screen bg-[#F5F7FB] flex flex-col selection:bg-blue-600 selection:text-white">
        {/* Institutional Deep Navy Header */}
        <Header activeTab={activeTab} onNavigateTab={handleTabChange} />

        {/* Main Content Area with bottom safe padding for the bottom bar */}
        <main className="flex-1 pb-24 sm:pb-28">
          {activeTab === 'pay' && (
            <PayPage onNavigateHome={() => handleTabChange('home')} />
          )}

          {activeTab === 'explore' && (
            <ExplorePage onNavigateHome={() => handleTabChange('home')} />
          )}

          {activeTab === 'more' && (
            <MorePage onNavigateHome={() => handleTabChange('home')} />
          )}

          {activeTab === 'home' && (
            <>
              {isCustomerView ? (
                <CustomerPaymentView params={params!} />
              ) : (
                <>
                  <MerchantDashboard />
                  <HowItWorksSection />
                </>
              )}
            </>
          )}
        </main>

        {/* Institutional Deep Navy Footer */}
        <Footer onNavigateTab={handleTabChange} />

        {/* Persistent Bottom Navigation Bar across all tabs */}
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

