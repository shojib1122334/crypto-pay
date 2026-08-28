import { Wallet, PlusCircle, QrCode, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Wallet,
    title: 'Connect Wallet',
    description: 'Link your business wallet (MetaMask, Coinbase, Bitcoin.com Wallet, or WalletConnect) to establish your receiving merchant address.',
  },
  {
    number: '02',
    icon: PlusCircle,
    title: 'Create Payment',
    description: 'Enter the exact transaction amount and select your preferred token (USDT, USDC, or VERSE) on Polygon.',
  },
  {
    number: '03',
    icon: QrCode,
    title: 'Customer Scans QR',
    description: 'Present the standardized EIP-681 payment QR code or share the payment link directly with your customer.',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Payment Confirmed',
    description: 'Customer signs the transaction and funds transfer directly into your wallet with real-time on-chain confirmation.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-[#0F172A]/85 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-700/60 shadow-2xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
            Simple Four-Step Workflow
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            How CryptoPay Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Eliminate complex merchant accounts, settlement waiting periods, and chargeback friction with direct peer-to-peer crypto payments.
          </p>
        </div>

        {/* Desktop Horizontal Timeline / Mobile Vertical Cards */}
        <div className="relative">
          {/* Connecting Line for Desktop */}
          <div className="hidden lg:block absolute top-14 left-12 right-12 h-0.5 bg-slate-700/80 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#1E293B]/80 rounded-2xl p-6 border border-slate-700/80 flex flex-col relative shadow-md hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-white flex items-center justify-center shadow-md">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-2xl font-black text-amber-400 tracking-tight drop-shadow-sm">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  
                  <p className="text-sm text-slate-300 leading-relaxed flex-1">
                    {step.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center text-xs font-semibold text-slate-400">
                    Step {idx + 1} of 4
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
