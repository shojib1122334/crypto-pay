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
    <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-semibold uppercase tracking-wider mb-3">
            Simple Four-Step Workflow
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B1220] tracking-tight">
            How CryptoPay Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#64748B] leading-relaxed">
            Eliminate complex merchant accounts, settlement waiting periods, and chargeback friction with direct peer-to-peer crypto payments.
          </p>
        </div>

        {/* Desktop Horizontal Timeline / Mobile Vertical Cards */}
        <div className="relative">
          {/* Connecting Line for Desktop */}
          <div className="hidden lg:block absolute top-14 left-12 right-12 h-0.5 bg-[#E2E8F0] z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#F5F7FB] lg:bg-white rounded-2xl p-6 border border-[#E2E8F0] flex flex-col relative"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0B1220] text-white flex items-center justify-center shadow-md">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-2xl font-black text-[#1D4ED8] tracking-tight">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0B1220] mb-2">
                    {step.title}
                  </h3>
                  
                  <p className="text-sm text-[#64748B] leading-relaxed flex-1">
                    {step.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center text-xs font-semibold text-slate-500">
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
