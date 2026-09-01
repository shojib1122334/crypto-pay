import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Download, LayoutDashboard, Layers, Activity, Settings, Menu, X, Sun, Moon } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { usePWA } from '@/hooks/usePWA';
import { useTheme } from '@/context/useTheme';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab = 'dashboard', onNavigateTab }: HeaderProps) {
  const { isInstalled, isInstallable, installApp } = usePWA();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-colors duration-200 bg-black/95 backdrop-blur-md border-b border-zinc-800 shadow-xl text-white"
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
              className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-zinc-950 text-[#00E676] border border-[#00E676]/30 shadow-[0_0_10px_rgba(0,230,118,0.15)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
              <span className="text-zinc-300">POLYGON</span>
            </div>
          </div>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <button
              onClick={() => handleNav('dashboard')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'text-[#FFFFFF] bg-zinc-900 border border-zinc-700/80 shadow-xs font-bold'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('pay-system')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'pay-system'
                  ? 'text-[#3B82F6] bg-blue-950/60 border border-[#3B82F6]/50 shadow-[0_0_12px_rgba(59,130,246,0.25)] font-bold'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Pay system</span>
            </button>

            <button
              onClick={() => handleNav('activity')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'text-[#FACC15] bg-yellow-950/60 border border-[#FACC15]/50 shadow-[0_0_12px_rgba(250,204,21,0.2)] font-bold'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Activity</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'text-[#FFFFFF] bg-zinc-900 border border-zinc-700/80 font-bold'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-zinc-900/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Settings</span>
            </button>

            {/* Navigation Bar Settings Option: Light / Dark Theme Selector */}
            <div className="ml-1 pl-2 border-l border-zinc-800 flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-850">
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Select Light Mode (White background, high contrast text)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-zinc-950 shadow-[0_0_10px_rgba(255,255,255,0.4)] ring-1 ring-zinc-300'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Select Dark Mode (Current dark Web3 appearance)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-850 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)] border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Dark</span>
              </button>
            </div>
          </nav>

          {/* Right Side: Install + Connect Wallet */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* PWA Install Button (shown when installable) */}
            {isInstallable && !isInstalled && (
              <button
                onClick={() => installApp()}
                type="button"
                className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-[#3B82F6] hover:text-white border border-[#3B82F6]/40 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Install CryptoPay Progressive Web App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
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
                              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-[#FFFFFF] shadow-[0_0_15px_rgba(59,130,246,0.3)] text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Connect</span>
                            </button>
                          );
                        }
                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-[#FFFFFF] text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.3)] transition whitespace-nowrap cursor-pointer"
                            >
                              Wrong Network
                            </button>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={openAccountModal}
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[#FFFFFF] hover:border-[#3B82F6]/60 hover:text-[#3B82F6] text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
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

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with all items and Theme Choice */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg px-4 py-3 space-y-2 animate-fadeIn">
            <button
              onClick={() => handleNav('dashboard')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
              <span>1. Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('pay-system')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'pay-system'
                  ? 'bg-blue-950/60 text-[#3B82F6] border border-[#3B82F6]/50'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-[#3B82F6]" />
              <span>2. Pay system</span>
            </button>

            <button
              onClick={() => handleNav('activity')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-yellow-950/60 text-[#FACC15] border border-[#FACC15]/50'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-[#FACC15]" />
              <span>3. Activity</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>4. Settings</span>
            </button>

            {/* Mobile Settings Theme Choice Option */}
            <div className="pt-2 mt-2 border-t border-zinc-850">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                Theme / Appearance
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white text-zinc-950 shadow-md ring-2 ring-zinc-300'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-zinc-800 text-white border border-zinc-600 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  <Moon className="w-4 h-4 text-[#3B82F6]" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}


