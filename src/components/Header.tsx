import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ShieldCheck, Menu, X, ArrowUpRight } from 'lucide-react';

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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] flex items-center justify-center shadow-md shadow-blue-900/30 ring-1 ring-blue-400/20">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight text-lg leading-tight flex items-center gap-1.5">
                CryptoPay
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                  Polygon
                </span>
              </span>
            </div>
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
