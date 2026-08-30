import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab, onNavigateTab }: HeaderProps) {
  const isActivity = activeTab === 'activity';
  const isDark = isActivity;

  const handleNav = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        isActivity
          ? 'bg-black border-b border-zinc-800 shadow-lg text-white'
          : 'bg-white border-b border-slate-200/90 shadow-xs text-slate-900'
      }`}
    >
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
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider transition-colors ${
              isActivity
                ? 'bg-zinc-900 text-yellow-400 border border-zinc-800 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-yellow-400' : 'bg-teal-500'} animate-pulse`} />
            <span>POLYGON</span>
          </div>
        </div>

        {/* Desktop Center Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <button
            onClick={() => handleNav('dashboard')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? isDark
                  ? 'text-yellow-400 font-bold'
                  : 'text-blue-600 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'pay-system'
                ? isDark
                  ? 'text-yellow-400 font-bold'
                  : 'text-blue-600 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pay system
          </button>
          <button
            onClick={() => handleNav('activity')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'activity'
                ? isDark
                  ? 'text-yellow-400 font-bold'
                  : 'text-blue-600 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? isDark
                  ? 'text-yellow-400 font-bold'
                  : 'text-blue-600 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Side: Connect Wallet Button */}
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
                            className={`inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl ${
                              isActivity
                                ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-xs shadow-yellow-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20'
                            } text-xs sm:text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap`}
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
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap"
                          >
                            Wrong Network
                          </button>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={openChainModal}
                            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              isActivity
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                            }`}
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
                            className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl ${
                              isActivity
                                ? 'bg-zinc-900 border border-zinc-800 text-yellow-400 hover:bg-zinc-850'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            } text-xs sm:text-sm font-bold shadow-xs transition whitespace-nowrap`}
                          >
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
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
