import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220] border-b border-[#1E293B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <BrandLogo size={36} showText={true} badgeText="Polygon" />
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => scrollToSection('merchant-dashboard')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Payments
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('security')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Security
          </button>
          <button
            onClick={() => scrollToSection('trust-section')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('support')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Support
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
            onClick={() => scrollToSection('merchant-dashboard')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Payments Dashboard
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            How It Works
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => scrollToSection('security')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Security & Non-Custodial
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => scrollToSection('trust-section')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Built for Modern Payments
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => scrollToSection('support')}
            className="w-full flex items-center justify-between text-left py-2 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          >
            Merchant Support
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
}
