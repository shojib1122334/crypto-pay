import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import type { NavTab } from '@/types/navigation';

interface HeaderProps {
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
}

export default function Header({ onNavigateTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: NavTab, sectionId?: string) => {
    setMobileMenuOpen(false);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220] border-b border-[#1E293B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <BrandLogo size={36} showText={true} badgeText="Polygon" />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => handleNav('home', 'merchant-dashboard')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Create Request
          </button>
          <button
            onClick={() => handleNav('pay')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Pay
          </button>
          <button
            onClick={() => handleNav('explore')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Explore
          </button>
          <button
            onClick={() => handleNav('home', 'how-it-works')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => handleNav('more')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            More
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
        <div className="md:hidden bg-[#0F172A] border-b border-[#1E293B] px-4 py-4 space-y-3">
          <button
            onClick={() => handleNav('home', 'merchant-dashboard')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Home / Create Request
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('pay')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Pay (POS & Checkout)
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('explore')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Explore Ecosystem
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => handleNav('more')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            More & Settings
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
}
