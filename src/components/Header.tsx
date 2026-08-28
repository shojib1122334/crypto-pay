import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, ArrowUpRight, Wallet } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab, onNavigateTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    setMobileMenuOpen(false);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-xs">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between gap-2">
        {/* Left Side: Brand Logo, Name, and Polygon Network Badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 group text-left focus:outline-none"
            aria-label="CryptoPay Home"
          >
            <BrandLogo size={32} showText={false} />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent select-none">
              CryptoPay
            </span>
          </button>

          {/* Polygon Network Badge */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span>POLYGON</span>
          </div>
        </div>

        {/* Desktop Center Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <button
            onClick={() => handleNav('dashboard')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'pay-system'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pay system
          </button>
          <button
            onClick={() => handleNav('activity')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'activity'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Side: Connect Wallet Button & Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs shadow-blue-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
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
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap"
                          >
                            Wrong Network
                          </button>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={openChainModal}
                            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition"
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
                            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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

          {/* Hamburger Menu Toggle Button (Always visible on mobile/tablet, and accessible) */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 sm:p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200 active:scale-95"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-1.5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center justify-between text-left py-2.5 px-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>Dashboard</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className={`w-full flex items-center justify-between text-left py-2.5 px-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'pay-system'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>Pay system</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('activity')}
            className={`w-full flex items-center justify-between text-left py-2.5 px-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'activity'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>Activity</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center justify-between text-left py-2.5 px-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>Settings</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
}

