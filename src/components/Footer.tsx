import { ExternalLink } from 'lucide-react';
import { TokenIcon } from '@/components/TokenIcon';
import { BrandLogo } from '@/components/BrandLogo';

export default function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="support" className="bg-[#0B1220] text-slate-400 border-t border-[#1E293B] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#1E293B]">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo size={32} showText={true} />
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional non-custodial crypto payment infrastructure engineered for direct Polygon Mainnet settlement.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => scrollToSection('merchant-dashboard')}
                  className="hover:text-white transition-colors"
                >
                  Create Payment Request
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('support')}
                  className="hover:text-white transition-colors"
                >
                  Network & Supported Assets
                </button>
              </li>
            </ul>
          </div>

          {/* Supported Assets */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Supported Assets
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <TokenIcon token="USDT" size={16} />
                <span>USDT (Polygon Mainnet)</span>
              </li>
              <li className="flex items-center gap-2">
                <TokenIcon token="USDC" size={16} />
                <span>USDC Native (Polygon PoS)</span>
              </li>
              <li className="flex items-center gap-2">
                <TokenIcon token="VERSE" size={16} />
                <span>VERSE (Polygon Mainnet)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">
                  #
                </span>
                <span>Chain ID 137</span>
              </li>
            </ul>
          </div>

          {/* Network & Protocol Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Network Status
            </h4>
            <div className="bg-[#131E35] border border-[#1E293B] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Polygon RPC</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Settlement Chain</span>
                <span className="text-emerald-400 font-semibold">Polygon PoS (137)</span>
              </div>
              <a
                href="https://polygonscan.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition pt-1"
              >
                Polygon Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Network summary banner & Disclaimer */}
        <div className="pt-6 pb-2 text-center text-xs font-medium text-slate-400 border-b border-[#1E293B]/60 mb-4">
          Polygon Mainnet — USDT, USDC & VERSE
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} CryptoPay Protocol. All rights reserved. Non-custodial direct peer-to-peer settlement.
          </p>
          <p className="text-center sm:text-right max-w-md">
            CryptoPay does not custody funds or hold private keys. Transactions are executed directly on the Polygon blockchain.
          </p>
        </div>
      </div>
    </footer>
  );
}
