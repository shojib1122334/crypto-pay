import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Download } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { usePWA } from '@/hooks/usePWA';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab, onNavigateTab }: HeaderProps) {
  const { isInstalled, isInstallable, installApp } = usePWA();

  const handleNav = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-200 bg-black/90 backdrop-blur-md border-b border-zinc-800/90 shadow-lg text-white"
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between gap-2">
        {/* Left Side: Brand Logo, Name, and Polygon Network Badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 group text-left focus:outline-none cursor-pointer"
            aria-label="CryptoPay Home"
          >
            <BrandLogo size={32} showText={false} />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none bg-gradient-to-r from-[#FFFFFF] via-[#3B82F6] to-[#00E676] bg-clip-text text-transparent select-none">
              CryptoPay
            </span>
          </button>

          {/* Polygon Network Badge (Green / Active Status) */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-zinc-950 text-[#00E676] border border-[#00E676]/30 shadow-[0_0_10px_rgba(0,230,118,0.15)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-zinc-300">POLYGON</span>
          </div>
        </div>

        {/* Desktop Center Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <button
            onClick={() => handleNav('dashboard')}
            className={`text-sm font-semibold transition-all cursor-pointer py-1 px-2.5 rounded-lg ${
              activeTab === 'dashboard'
                ? 'text-[#FFFFFF] bg-zinc-900 border border-zinc-700/60 shadow-sm font-bold'
                : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className={`text-sm font-semibold transition-all cursor-pointer py-1 px-2.5 rounded-lg ${
              activeTab === 'pay-system'
                ? 'text-[#3B82F6] bg-blue-950/40 border border-[#3B82F6]/40 shadow-[0_0_12px_rgba(59,130,246,0.2)] font-bold'
                : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/50'
            }`}
          >
            Pay system
          </button>
          <button
            onClick={() => handleNav('activity')}
            className={`text-sm font-semibold transition-all cursor-pointer py-1 px-2.5 rounded-lg ${
              activeTab === 'activity'
                ? 'text-[#FACC15] bg-yellow-950/40 border border-[#FACC15]/40 shadow-[0_0_12px_rgba(250,204,21,0.2)] font-bold'
                : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/50'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`text-sm font-semibold transition-all cursor-pointer py-1 px-2.5 rounded-lg ${
              activeTab === 'settings'
                ? 'text-[#FFFFFF] bg-zinc-900 border border-zinc-700/60 font-bold'
                : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/50'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Side: Install Button & Connect Wallet Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* PWA Install Button (shown when installable & not in standalone mode) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={() => installApp()}
              type="button"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-[#3B82F6] hover:text-white border border-[#3B82F6]/40 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Install CryptoPay Progressive Web App"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          <div className="header-connect-wrapper">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;
                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#3B82F6] hover:bg-blue-600 text-[#FFFFFF] shadow-[0_0_15px_rgba(59,130,246,0.3)] text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                          >
                            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Connect Wallet</span>
                          </button>
                        );
                      }
                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl sm:rounded-2xl bg-[#EF4444] hover:bg-red-600 text-[#FFFFFF] text-xs sm:text-sm font-bold shadow-[0_0_12px_rgba(239,68,68,0.3)] transition whitespace-nowrap cursor-pointer"
                          >
                            Wrong Network
                          </button>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={openChainModal}
                            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 hover:bg-zinc-900 text-[#FFFFFF] border border-zinc-800 transition cursor-pointer"
                            type="button"
                          >
                            {chain.hasIcon && (
                              <div className="w-3.5 h-3.5 overflow-hidden rounded-full">
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    className="w-3.5 h-3.5"
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </button>
                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-[#FFFFFF] hover:border-[#3B82F6]/60 hover:text-[#3B82F6] text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676] animate-pulse" />
                            {account.displayName}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}

