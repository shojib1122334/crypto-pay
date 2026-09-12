import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Download, Layers, CreditCard, FileText, ArrowLeftRight, Activity, Settings, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { usePWA } from '@/hooks/usePWA';
import { useConnectWallet } from '@/hooks/useConnectWallet';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  accentColor: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'pay-system', label: 'Pay system', icon: Layers, accentColor: 'text-blue-600' },
  { id: 'top-up', label: 'Top Up', icon: CreditCard, accentColor: 'text-cyan-600' },
  { id: 'create-invoice', label: 'Create Invoice', icon: FileText, accentColor: 'text-purple-600' },
  { id: 'exchange', label: 'Exchange', icon: ArrowLeftRight, accentColor: 'text-indigo-600' },
  { id: 'activity', label: 'Activity', icon: Activity, accentColor: 'text-emerald-600' },
  { id: 'settings', label: 'Settings', icon: Settings, accentColor: 'text-violet-600' },
];

export default function Header({ activeTab = 'pay-system', onNavigateTab }: HeaderProps) {
  const { isInstalled, isInstallable, installApp } = usePWA();
  const { openWalletConnect } = useConnectWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-cyan-600 via-purple-600 to-pink-500 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-purple-500/20 transition-all duration-200 relative">
        {/* Subtle Top & Bottom Luminescent Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-white/20 pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 relative z-10 min-h-[4.25rem]">
          {/* Left Side: Brand Logo (100% UNTOUCHED) + "Crypto pay" + Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            <button
              onClick={() => handleNav('pay-system')}
              className="flex items-center gap-2.5 sm:gap-3 group text-left focus:outline-none cursor-pointer"
              aria-label="CryptoPay Home"
            >
              {/* App Icon (Preserved with authentic original styling & colors) */}
              <div className="relative flex-shrink-0 p-0.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/30 shadow-xs group-hover:scale-105 transition-transform duration-200">
                <BrandLogo size={40} showText={false} />
              </div>

              {/* Title & Tagline */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-baseline gap-1 leading-tight">
                  <span className="font-black text-base sm:text-xl lg:text-2xl tracking-tight text-white drop-shadow-sm select-none whitespace-nowrap">
                    𝑪𝑹𝒀𝑷𝑻𝑶 𝑷𝑨𝒀
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] lg:text-[11px] text-sky-100 font-medium tracking-normal leading-tight truncate select-none">
                  Pay with Crypto. Get Paid in Your Way.
                </p>
              </div>
            </button>
          </div>

          {/* Center: Full Desktop Navigation Bar (Light Glass Container + Gradient Active Pill) */}
          <nav className="hidden md:flex items-center p-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg shadow-purple-950/15 relative">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative text-xs lg:text-sm font-semibold cursor-pointer py-2 px-3 lg:px-3.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap select-none ${
                    isActive ? 'text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {/* Active Static Gradient Pill - No Animation */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-md shadow-purple-500/30"
                    />
                  )}

                  <Icon
                    className={`w-4 h-4 relative z-10 ${
                      isActive ? 'text-white stroke-[2.2]' : item.accentColor
                    }`}
                  />
                  <span className="relative z-10 font-bold">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side: Network Badge + PWA Install + Connect Wallet + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Polygon Network Active Badge */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider bg-white/15 backdrop-blur-md text-white border border-white/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE] animate-pulse" />
              <span>POLYGON</span>
            </div>

            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                onClick={() => installApp()}
                type="button"
                className="hidden lg:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md text-xs font-bold transition shadow-xs cursor-pointer"
                title="Install CryptoPay Progressive Web App"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Install</span>
              </button>
            )}

            {/* RainbowKit Connect Wallet Button with Blue → Purple → Pink Gradient */}
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
                              onClick={() => openWalletConnect(openConnectModal)}
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-purple-700 shadow-md shadow-black/10 text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer border border-white/60"
                            >
                              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 stroke-[2.2]" />
                              <span>Connect Wallet</span>
                            </button>
                          );
                        }
                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
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
                              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/95 backdrop-blur-md border border-white/40 text-slate-900 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition whitespace-nowrap cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981] animate-pulse" />
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
              className="md:hidden p-2 rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 shadow-xs flex items-center justify-center text-white transition active:scale-95 cursor-pointer flex-shrink-0"
              aria-label="Toggle navigation menu"
              title="Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white stroke-[2.2]" />
              ) : (
                <Menu className="w-5 h-5 text-white stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-white/98 backdrop-blur-xl px-4 py-3 space-y-2 animate-fadeIn shadow-2xl max-w-7xl mx-auto rounded-b-2xl">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span>Navigation</span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>POLYGON</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white stroke-[2.2]' : item.accentColor}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PWA Install Button if available */}
            {isInstallable && !isInstalled && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => installApp()}
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-purple-600" />
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




