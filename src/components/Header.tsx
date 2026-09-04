import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Download, LayoutDashboard, Layers, FileText, ArrowLeftRight, Activity, Settings, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { usePWA } from '@/hooks/usePWA';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab = 'dashboard', onNavigateTab }: HeaderProps) {
  const { isInstalled, isInstallable, installApp } = usePWA();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-colors duration-200 relative">
        {/* Subtle Wave Glow Background Accent along the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/30 to-blue-500/20 pointer-events-none opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/40 pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 relative z-10 min-h-[4rem]">
          {/* Left Side: Brand Logo + "Crypto pay" + Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            <button
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2.5 sm:gap-3 group text-left focus:outline-none cursor-pointer"
              aria-label="CryptoPay Home"
            >
              {/* App Icon (Squircle / Rounded Square) */}
              <div className="relative flex-shrink-0">
                <BrandLogo size={40} showText={false} className="shadow-xs group-hover:scale-105 transition-transform duration-200" />
              </div>

              {/* Title & Tagline matching reference picture */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-baseline gap-1 leading-tight">
                  <span className="font-black text-lg sm:text-xl lg:text-2xl tracking-tight text-slate-900 select-none">
                    Crypto
                  </span>
                  <span className="font-black text-lg sm:text-xl lg:text-2xl tracking-tight bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#2563EB] bg-clip-text text-transparent select-none">
                    pay
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] lg:text-[11px] text-slate-500 font-medium tracking-normal leading-tight truncate select-none">
                  Pay with Crypto. Get Paid in Your Way.
                </p>
              </div>
            </button>
          </div>

          {/* Center: Full Desktop & Tablet Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 flex-shrink-1">
            <button
              onClick={() => handleNav('dashboard')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-slate-900 bg-slate-100 border border-slate-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-600" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('pay-system')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pay-system'
                  ? 'text-blue-700 bg-blue-50 border border-blue-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Pay system</span>
            </button>

            <button
              onClick={() => handleNav('create-invoice')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'create-invoice'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Create Invoice</span>
            </button>

            <button
              onClick={() => handleNav('exchange')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'exchange'
                  ? 'text-indigo-700 bg-indigo-50 border border-indigo-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
              <span>Exchange</span>
            </button>

            <button
              onClick={() => handleNav('activity')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'text-amber-800 bg-amber-50 border border-amber-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Activity</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-2.5 lg:px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'text-slate-900 bg-slate-100 border border-slate-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Side: Network Badge + PWA Install + Connect Wallet + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Polygon Network Active Badge */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>POLYGON</span>
            </div>

            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                onClick={() => installApp()}
                type="button"
                className="hidden lg:inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-700 hover:text-blue-800 border border-blue-200 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Install CryptoPay Progressive Web App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}

            {/* RainbowKit Connect Wallet Button */}
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
                              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer border border-blue-400/30"
                            >
                              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.2]" />
                              <span>Connect Wallet</span>
                            </button>
                          );
                        }
                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
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
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-300 text-slate-900 hover:border-blue-400 hover:text-blue-700 text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                              <span className="max-w-[100px] sm:max-w-none truncate">{account.displayName}</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs hover:bg-slate-50 flex items-center justify-center text-slate-800 transition active:scale-95 cursor-pointer flex-shrink-0"
              aria-label="Toggle navigation menu"
              title="Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-800 stroke-[2.2]" />
              ) : (
                <Menu className="w-5 h-5 text-slate-800 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-3 space-y-2 animate-fadeIn shadow-xl max-w-7xl mx-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span>Navigation</span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>POLYGON</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                onClick={() => handleNav('dashboard')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-600" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNav('pay-system')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'pay-system'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Pay system</span>
              </button>

              <button
                onClick={() => handleNav('create-invoice')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'create-invoice'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Create Invoice</span>
              </button>

              <button
                onClick={() => handleNav('exchange')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'exchange'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>Exchange</span>
              </button>

              <button
                onClick={() => handleNav('activity')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Activity className="w-4 h-4 text-amber-600" />
                <span>Activity</span>
              </button>

              <button
                onClick={() => handleNav('settings')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Settings</span>
              </button>
            </div>

            {/* PWA Install Button if available */}
            {isInstallable && !isInstalled && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => installApp()}
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install CryptoPay Web App</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}




