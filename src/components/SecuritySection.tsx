import { Shield, KeyRound, Lock, ServerOff, CheckCircle2 } from 'lucide-react';

export default function SecuritySection() {
  return (
    <section id="security" className="py-16 sm:py-20 bg-[#F5F7FB] border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0B1220] rounded-3xl text-white p-8 sm:p-12 lg:p-16 border border-[#1E293B] shadow-xl overflow-hidden relative">
          
          {/* Subtle background glow accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            
            {/* Left Header */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Security & Sovereignty
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Your Wallet. Your Funds. Your Control.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                CryptoPay operates on a pure client-side, non-custodial protocol model. We never store, process, or have access to your private keys, seed phrases, or wallet credentials.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">
                    <strong>Zero Intermediary Custody:</strong> Payments transfer directly from the customer’s wallet to the merchant’s wallet on Polygon.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">
                    <strong>Smart Contract Transparency:</strong> Standard ERC-20 token contract calls with publicly verifiable transaction hashes.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">
                    <strong>No Withdrawal Bottlenecks:</strong> Because funds settle directly in your wallet, there are no batch payouts or pending withdrawal holds.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#131E35] border border-[#1E293B] rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 border border-blue-700/40 flex items-center justify-center text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">No Private Key Access</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Only your browser and personal wallet extension manage transaction signatures.
                </p>
              </div>

              <div className="bg-[#131E35] border border-[#1E293B] rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 border border-blue-700/40 flex items-center justify-center text-blue-400">
                  <ServerOff className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Direct On-Chain</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No centralized database or clearinghouse can hold or freeze your incoming payments.
                </p>
              </div>

              <div className="bg-[#131E35] border border-[#1E293B] rounded-2xl p-5 space-y-3 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Standard EIP-681 Compliant</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Compatible with Bitcoin.com Wallet, MetaMask, Rainbow, Coinbase Wallet, and other EVM standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
