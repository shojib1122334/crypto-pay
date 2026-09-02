import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Download, LayoutDashboard, Layers, FileText, Activity, Settings, Menu, X } from 'lucide-react';
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
      <header
        className="sticky top-0 z-50 transition-colors duration-200 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm text-slate-900"
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
              <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none bg-gradient-to-r from-slate-900 via-[#1D4ED8] to-[#047857] bg-clip-text text-transparent select-none">
                CryptoPay
              </span>
            </button>

            {/* Polygon Network Badge (Green / Active Status) */}
            <div
              className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-emerald-800">POLYGON</span>
            </div>
          </div>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <button
              onClick={() => handleNav('dashboard')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'text-slate-900 bg-slate-100 border border-slate-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('pay-system')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'pay-system'
                  ? 'text-blue-700 bg-blue-50 border border-blue-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Pay system</span>
            </button>

            <button
              onClick={() => handleNav('create-invoice')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'create-invoice'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Create Invoice</span>
            </button>

            <button
              onClick={() => handleNav('activity')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'text-amber-800 bg-amber-50 border border-amber-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Activity</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`text-xs lg:text-sm font-semibold transition-all cursor-pointer py-2 px-3 rounded-xl flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'text-slate-900 bg-slate-100 border border-slate-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Side: Install + Connect Wallet */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* PWA Install Button (shown when installable) */}
            {isInstallable && !isInstalled && (
              <button
                onClick={() => installApp()}
                type="button"
                className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-700 hover:text-blue-800 border border-blue-200 text-xs font-bold transition shadow-xs cursor-pointer"
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
                              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-[#FFFFFF] shadow-sm text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5 text-white" />
                              <span>Connect</span>
                            </button>
                          );
                        }
                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#DC2626] hover:bg-red-700 text-[#FFFFFF] text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
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
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 hover:border-blue-400 hover:text-blue-700 text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
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
              className="md:hidden p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg px-4 py-3 space-y-2 animate-fadeIn shadow-lg">
            <button
              onClick={() => handleNav('dashboard')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>1. Dashboard</span>
            </button>

            <button
              onClick={() => handleNav('pay-system')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'pay-system'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>2. Pay system</span>
            </button>

            <button
              onClick={() => handleNav('create-invoice')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'create-invoice'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>3. Create Invoice</span>
            </button>

            <button
              onClick={() => handleNav('activity')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-600" />
              <span>4. Activity</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>5. Settings</span>
            </button>
          </div>
        )}
      </header>
    </>
  );
}


