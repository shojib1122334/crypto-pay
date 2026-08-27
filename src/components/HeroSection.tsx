import { ShieldCheck, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function HeroSection() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sample standard demo URI for visual preview
  const sampleQrPayload = 'ethereum:0xc2132d05d31c914a87c6611c10748aeb04b58e8f@137/transfer?address=0x71C8364437a9094B1B7d5300F74a98440026eED7&uint256=10000000';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#0D182E] to-[#0B1220] text-white pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-[#1E293B]">
      {/* Subtle institutional grid backdrop */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NON-CUSTODIAL EVM SETTLEMENT
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Crypto Payments.<br />
              <span className="text-blue-400">Simple.</span> Secure. Direct.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Accept USDT, USDC and VERSE payments directly to your connected wallet on Polygon with instant on-chain verification and zero intermediary custody.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={() => scrollToSection('merchant-dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-6 py-3.5 text-sm font-semibold shadow-lg shadow-blue-900/40 transition active:scale-[0.99]"
              >
                Create Payment Request
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800 text-slate-200 px-6 py-3.5 text-sm font-semibold transition"
              >
                How It Works
              </button>
            </div>

            {/* Micro Trust Proofs */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0 text-left">
              <div>
                <div className="text-base sm:text-lg font-bold text-white">0% Custody</div>
                <div className="text-xs text-slate-400">Direct to wallet</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-white">Polygon</div>
                <div className="text-xs text-slate-400">Low-fee network</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-white">EIP-681</div>
                <div className="text-xs text-slate-400">Universal QR spec</div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Payment Terminal Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white text-[#111827] rounded-2xl shadow-2xl shadow-black/40 border border-slate-200 overflow-hidden">
              {/* Terminal Header */}
              <div className="bg-[#0B1220] px-5 py-4 flex items-center justify-between text-white border-b border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Payment Request
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Polygon Mainnet
                </span>
              </div>

              {/* Terminal Body */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Amount Due
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight">
                      10.00 <span className="text-blue-700 text-lg sm:text-xl font-bold">USDT</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Network
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      <Zap className="w-3 h-3 text-purple-600" />
                      Polygon (137)
                    </span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-4 flex flex-col items-center justify-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <QRCodeSVG
                      value={sampleQrPayload}
                      size={148}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="mt-3 text-[11px] font-mono text-slate-500 text-center truncate max-w-full">
                    ethereum:0xc213...8e8f@137/transfer
                  </p>
                </div>

                {/* Terminal Status / Merchant Guarantee */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Merchant Address</span>
                    <span className="font-mono font-medium text-slate-700">0x71C...ED7</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-500">Settlement Type</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Instant Peer-to-Peer
                    </span>
                  </div>
                </div>
              </div>

              {/* Terminal Footer Bar */}
              <div className="bg-[#EEF2F7] px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  Standards-Compliant EIP-681
                </span>
                <span className="font-medium text-slate-700">Bitcoin.com / Web3 Compatible</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
