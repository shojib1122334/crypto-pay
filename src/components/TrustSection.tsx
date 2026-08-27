import { ShieldCheck, Wallet, Zap, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: Wallet,
    title: 'Non-Custodial',
    description: 'Your funds stay in your wallet. CryptoPay never touches, freezes, or holds your crypto assets.',
    tag: 'Sovereign',
  },
  {
    icon: Zap,
    title: 'Direct Settlement',
    description: 'Payments go directly to your connected wallet with zero intermediary delay or payout fees.',
    tag: 'Direct P2P',
  },
  {
    icon: Layers,
    title: 'Fast & Transparent',
    description: 'Payments settle on Polygon with predictable low gas fees and sub-second block finality.',
    tag: 'Polygon Mainnet',
  },
  {
    icon: ShieldCheck,
    title: 'On-Chain Verification',
    description: 'Transactions are verified on the blockchain with cryptographic receipts and public block explorer auditability.',
    tag: 'Auditable',
  },
];

export default function TrustSection() {
  return (
    <section id="trust-section" className="py-16 sm:py-20 bg-[#EEF2F7] border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#1D4ED8] text-xs font-semibold uppercase tracking-wider mb-3">
            Institutional Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B1220] tracking-tight">
            Built for Modern Payments
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#64748B] leading-relaxed">
            Engineered for high-volume merchants and modern enterprises requiring direct blockchain settlement without centralized intermediary risks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1D4ED8]">
                      <Icon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1220] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#1D4ED8]">
                  Verified Protocol
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
