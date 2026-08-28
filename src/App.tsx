import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { config } from '@/lib/wallet';
import Header from '@/components/Header';
import MerchantDashboard from '@/components/MerchantDashboard';
import HowItWorksSection from '@/components/HowItWorksSection';
import CustomerPaymentView from '@/components/CustomerPaymentView';
import SplashIntro from '@/components/SplashIntro';
import BottomNavBar from '@/components/BottomNavBar';
import ComingSoonPage from '@/components/ComingSoonPage';
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
  if (clean === 'activity') {
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

      <div className="min-h-screen relative flex flex-col selection:bg-blue-600 selection:text-white">
        {/* Full-Screen Immersive Background Image */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <img
            src="https://i.ibb.co.com/LXXRwB5F/Screenshot-20260828-120823-2.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          {/* Subtle dark overlay to ensure maximum legibility for white, blue, and yellow text */}
          <div className="absolute inset-0 bg-[#070D18]/70 backdrop-brightness-95" />
        </div>

        {/* Institutional Deep Navy Header */}
        <Header activeTab={activeTab} onNavigateTab={handleTabChange} />

        {/* Main Content Area with safe bottom spacing for the edge-to-edge bottom bar */}
        <main className="relative z-10 flex-1 pb-32 sm:pb-44">
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

          {/* Pay System Tab (How CryptoPay Works) */}
          {activeTab === 'pay-system' && (
            <div id="pay-system-page">
              <HowItWorksSection />
            </div>
          )}

          {/* Activity Tab (Clean blank page with only the large centered text "COMING SOON") */}
          {activeTab === 'activity' && <ComingSoonPage />}

          {/* Settings Tab (Clean blank page with only the large centered text "COMING SOON") */}
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
