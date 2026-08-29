import {
  Wallet,
  PlusCircle,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Coins,
  ArrowRight,
  Lock,
  FileCheck2,
  Cpu,
  Layers,
} from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Wallet,
    title: 'Connect Web3 Wallet',
    badge: 'Merchant Setup',
    description:
      'Link your business wallet (MetaMask, Coinbase Wallet, Bitcoin.com Wallet, or WalletConnect) to establish your receiving address on Polygon Mainnet.',
    highlight: 'Non-custodial & Private',
    charcoalTag: 'Self-Custody',
  },
  {
    number: '02',
    icon: PlusCircle,
    title: 'Generate Payment Invoice',
    badge: 'Instant Creation',
    description:
      'Input the exact payment amount and select USDT, USDC, or VERSE. The system creates a standardized payment URI with automated decimals formatting.',
    highlight: 'Zero Platform Margin',
    charcoalTag: '0% Intermediary Fee',
  },
  {
    number: '03',
    icon: QrCode,
    title: 'Customer Scans EIP-681 QR',
    badge: 'Universal Compatibility',
    description:
      'Present the high-density QR code or share the payment link. Any Web3 mobile wallet instantly autofills the contract address, merchant recipient, and exact amount.',
    highlight: 'EIP-681 Native Standard',
    charcoalTag: 'Zero Typing Errors',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Instant On-Chain Settlement',
    badge: 'Live Finality',
    description:
      'Customer signs with biometric confirmation. Funds settle directly into your wallet within ~2 seconds, with cryptographic verification and downloadable PDF receipt.',
    highlight: 'Finalized in ~2 Seconds',
    charcoalTag: 'Zero Chargebacks',
  },
];

const PROTOCOL_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Direct Peer-to-Peer Settlement',
    subtitle: 'No middleman holding funds',
    charcoalPill: '100% Non-Custodial',
    description:
      'Payments flow directly from customer to merchant without custodial escrow or third-party holding accounts.',
    techLabel: 'ERC-20 transfer(to, amount)',
  },
  {
    icon: Zap,
    title: 'Polygon Layer 2 Gas Efficiency',
    subtitle: 'Sub-penny network fees',
    charcoalPill: 'Average Gas ~$0.005',
    description:
      'Enjoy near-instant confirmation with negligible gas fees, making microtransactions and retail payments viable.',
    techLabel: 'Polygon Mainnet (Chain ID 137)',
  },
  {
    icon: FileCheck2,
    title: 'Cryptographic PDF Receipts',
    subtitle: 'Automated on-chain audit proof',
    charcoalPill: 'Verifiable Proof',
    description:
      'Every settled transaction decodes logs via public RPC nodes to generate tamper-proof PDF payment receipts.',
    techLabel: 'On-Chain Receipt Engine',
  },
  {
    icon: Lock,
    title: 'Eliminate Chargeback Fraud',
    subtitle: 'Mathematical transaction finality',
    charcoalPill: 'Zero Fraud Clawbacks',
    description:
      'Unlike traditional credit cards with 90-day dispute windows, blockchain transactions are irreversible once mined.',
    techLabel: 'Finality & Proof of State',
  },
];

const COMPARISON_ITEMS = [
  {
    feature: 'Settlement Time',
    cryptoPay: 'Instant (~2 seconds)',
    traditional: '2 - 3 business days',
  },
  {
    feature: 'Merchant Processing Fee',
    cryptoPay: '0% Platform Fee (~$0.005 gas)',
    traditional: '2.9% + $0.30 per transaction',
  },
  {
    feature: 'Chargeback / Fraud Risk',
    cryptoPay: 'Zero (Irreversible on-chain)',
    traditional: 'High (Dispute fees & clawbacks)',
  },
  {
    feature: 'Custody of Funds',
    cryptoPay: 'Merchant Self-Custody Wallet',
    traditional: 'Third-party processor bank account',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Hero Banner in Deep Green */}
      <div className="bg-[#022c22] rounded-3xl p-6 sm:p-10 border border-emerald-700/60 shadow-2xl relative overflow-hidden mb-8">
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Light Blue Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-600/70 text-sky-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-sky-300" />
            <span>Decentralized Payment Protocol</span>
          </div>

          {/* 30% White Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            How CryptoPay Works
          </h1>

          {/* 20% Light Yellow Subtitle */}
          <p className="mt-3 text-base sm:text-lg font-semibold text-yellow-200 leading-snug">
            Standardized EIP-681 Web3 Point-of-Sale & Direct Merchant Invoicing
          </p>

          {/* 10% Light Gray Helper Text */}
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate costly merchant processors, delayed settlements, and chargeback disputes. Accept USDT, USDC, and VERSE on Polygon with instant wallet-to-wallet transfers.
          </p>

          {/* 20% Dark Charcoal Tags in High-Contrast Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
            <span className="px-3.5 py-1.5 rounded-full bg-yellow-200 text-zinc-900 font-extrabold text-xs shadow-md">
              0% Platform Fee
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-sky-200 text-zinc-900 font-extrabold text-xs shadow-md">
              Fast ~2s Finality
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white text-zinc-900 font-extrabold text-xs shadow-md">
              Zero Chargeback Risk
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-200 text-zinc-900 font-extrabold text-xs shadow-md">
              EIP-681 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Workflow */}
      <div className="bg-[#032419] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-emerald-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300 block mb-1">
              End-to-End Workflow
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              4 Simple Steps to Accept Web3 Payments
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-yellow-200 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-yellow-200" />
            <span>Polygon Mainnet (137)</span>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-[#042f22] hover:bg-[#053828] rounded-2xl p-5 sm:p-6 border border-emerald-700/50 flex flex-col justify-between shadow-lg transition-all duration-200 hover:border-emerald-500"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-600/60 text-sky-300 flex items-center justify-center shadow-inner">
                      <Icon className="w-6 h-6 text-sky-300" />
                    </div>
                    {/* 20% Light Yellow Number */}
                    <span className="text-2xl font-black text-yellow-200 tracking-tight font-mono">
                      {step.number}
                    </span>
                  </div>

                  {/* 20% Dark Charcoal Tag inside high-contrast badge */}
                  <div className="mb-2.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-yellow-200 text-zinc-900 text-[10px] font-extrabold uppercase tracking-wide">
                      {step.charcoalTag}
                    </span>
                  </div>

                  {/* 30% White Step Title */}
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>

                  {/* 10% Light Gray Step Description */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-emerald-800/80 flex items-center justify-between text-xs">
                  {/* 20% Light Yellow Highlight */}
                  <span className="font-bold text-yellow-200 text-[11px]">
                    {step.highlight}
                  </span>
                  {/* 20% Light Blue Step Counter */}
                  <span className="font-semibold text-sky-300 text-[11px]">
                    Step {idx + 1}/4
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol Features & Security Highlights */}
      <div className="bg-[#022c22] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl mb-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-300 block mb-1">
            Technical Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Engineered for Retail & Online Merchants
          </h2>
          <p className="text-xs sm:text-sm text-yellow-200 mt-1 font-medium">
            Robust on-chain reliability without centralized intermediaries
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROTOCOL_FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-[#042f22] rounded-2xl p-5 sm:p-6 border border-emerald-700/60 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/70 text-sky-300 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-sky-300" />
                      </div>
                      <div>
                        {/* 30% White Title */}
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {feature.title}
                        </h3>
                        {/* 20% Light Yellow Subtitle */}
                        <p className="text-xs font-semibold text-yellow-200">
                          {feature.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* 20% Dark Charcoal Pill */}
                    <span className="px-2.5 py-1 rounded-full bg-sky-200 text-zinc-900 text-[10px] font-extrabold whitespace-nowrap shadow-xs">
                      {feature.charcoalPill}
                    </span>
                  </div>

                  {/* 10% Light Gray Body */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs">
                  {/* 20% Light Blue Tech Label */}
                  <span className="font-mono text-[11px] text-sky-300 font-medium">
                    {feature.techLabel}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-yellow-200" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CryptoPay vs Traditional Processing Comparison */}
      <div className="bg-[#032419] rounded-3xl p-6 sm:p-8 border border-emerald-700/60 shadow-xl mb-8">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-200 block mb-1">
            Economic Advantage
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CryptoPay vs. Traditional Credit Cards
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Why modern businesses are upgrading to peer-to-peer Web3 payments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-emerald-800 text-sky-300 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-yellow-200">CryptoPay (Polygon)</th>
                <th className="py-3 px-4 text-slate-300">Traditional Processors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/70">
              {COMPARISON_ITEMS.map((item, idx) => (
                <tr key={idx} className="hover:bg-emerald-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {item.feature}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-yellow-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span>{item.cryptoPay}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {item.traditional}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call to Action Container with High-Contrast Dark Charcoal & Light Yellow */}
      <div className="bg-yellow-200 rounded-3xl p-6 sm:p-8 border border-yellow-300 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 text-yellow-300 text-[10px] font-extrabold uppercase tracking-wider mb-2">
            <Coins className="w-3 h-3 text-yellow-300" />
            <span>Ready in Seconds</span>
          </div>
          {/* 20% Dark Charcoal Heading */}
          <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            Start Accepting Web3 Payments Today
          </h3>
          {/* 20% Dark Charcoal Description */}
          <p className="text-xs sm:text-sm text-zinc-800 mt-1 font-medium max-w-xl">
            Connect your Polygon wallet on the Dashboard tab, generate customized EIP-681 invoices, and receive stablecoin payments instantly.
          </p>
        </div>

        <div className="flex-shrink-0 w-full sm:w-auto">
          <a
            href="#cryptopay-merchant-dashboard"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              // Trigger tab switch to dashboard if parent supports it
              const dashBtn = document.querySelector('[data-nav-tab="dashboard"]') as HTMLButtonElement;
              if (dashBtn) dashBtn.click();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-extrabold text-sm shadow-xl active:scale-95 transition"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4 text-yellow-300" />
          </a>
        </div>
      </div>
    </section>
  );
}
