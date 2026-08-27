import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#0D182E] to-[#0B1220] text-white pt-14 pb-16 lg:pt-20 lg:pb-24 border-b border-[#1E293B]">
      {/* Subtle institutional grid backdrop */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-semibold tracking-wide mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          NON-CUSTODIAL EVM SETTLEMENT
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight max-w-4xl mx-auto">
          Crypto Payments.<br />
          <span className="text-blue-400">Simple.</span> Secure. Direct.
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed font-normal">
          Accept USDT, USDC and VERSE payments directly to your connected wallet on Polygon with instant on-chain verification and zero intermediary custody.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-8">
          <button
            onClick={() => scrollToSection('merchant-dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-7 py-3.5 text-sm font-semibold shadow-lg shadow-blue-900/40 transition active:scale-[0.99]"
          >
            Create Payment Request
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800 text-slate-200 px-7 py-3.5 text-sm font-semibold transition"
          >
            How It Works
          </button>
        </div>

        {/* Micro Trust Proofs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 mt-10 border-t border-slate-800/80 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-lg sm:text-xl font-bold text-white">0% Custody</div>
            <div className="text-xs text-slate-400 mt-0.5">Direct to wallet</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-white">Polygon</div>
            <div className="text-xs text-slate-400 mt-0.5">Low-fee network</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-white">EIP-681</div>
            <div className="text-xs text-slate-400 mt-0.5">Universal QR spec</div>
          </div>
        </div>
      </div>
    </section>
  );
}
