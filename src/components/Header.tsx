import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, ArrowUpRight } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-[#0B1220] border-b border-[#1E293B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <BrandLogo size={36} showText={true} badgeText="Polygon" />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => handleNav('dashboard')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'pay-system'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Pay system
          </button>
          <button
            onClick={() => handleNav('activity')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Action: Connect Wallet & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <div className="header-connect-wrapper">
            <ConnectButton
              showBalance={false}
              chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
            />
          </div>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F172A] border-b border-[#1E293B] px-4 py-4 space-y-2">
          <button
            onClick={() => handleNav('dashboard')}
            className="w-full flex items-center justify-between text-left py-2.5 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Dashboard
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('pay-system')}
            className="w-full flex items-center justify-between text-left py-2.5 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Pay system (How It Works)
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('activity')}
            className="w-full flex items-center justify-between text-left py-2.5 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Activity
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('settings')}
            className="w-full flex items-center justify-between text-left py-2.5 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Settings
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
}
