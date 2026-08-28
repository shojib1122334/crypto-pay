import React from 'react';
import { KeyRound, FileSpreadsheet, Sliders } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';

interface MorePageProps {
  onNavigateHome: () => void;
}

export const MorePage: React.FC<MorePageProps> = ({ onNavigateHome }) => {
  const toolsSections = [
    {
      title: 'Merchant Developer APIs & Webhooks',
      desc: 'Connect your custom checkout backend or e-commerce store with real-time webhooks (IPN) and RPC listeners.',
      icon: KeyRound,
      badge: 'Coming Soon',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      title: 'Accounting & Tax Export',
      desc: 'Download consolidated CSV & PDF reports with Polygon transaction hashes, USD valuations, and timestamps.',
      icon: FileSpreadsheet,
      badge: 'Coming Soon',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      title: 'Multi-Wallet Address Book',
      desc: 'Configure automated payout routing, cold-storage splitters, and separate merchant receiving addresses.',
      icon: Sliders,
      badge: 'Coming Soon',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
  ];

  const contractDetails = [
    { name: 'Polygon Chain ID', value: '137 (Mainnet)' },
    { name: 'USDT (PoS Contract)', value: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    { name: 'USDC (Native Contract)', value: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
    { name: 'VERSE (ERC-20 Contract)', value: '0xc708D6F2153933DAA50B2D0758955Be0A93A8FEc' },
  ];

  return (
    <div id="more-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-semibold uppercase tracking-wider"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Settings & Protocol Tools
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display"
        >
          Protocol Tools & Documentation
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Manage developer integrations, view verified Polygon token contracts, access merchant documentation, and configure protocol preferences.
        </motion.p>
      </div>

      {/* Tools & Modules Coming Soon */}
      <div className="space-y-4 mb-10">
        <h2 className="text-lg font-bold text-slate-900 px-1">
          Advanced Merchant Features
        </h2>

        {toolsSections.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {item.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Verified Polygon Contracts Information */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm mb-10"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Verified Polygon Token Contracts
            </h3>
            <p className="text-xs text-slate-500">
              All payments settle directly to your non-custodial address through standard ERC-20 contract calls.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
            EIP-55 Verified
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs font-mono">
          {contractDetails.map((c) => (
            <div key={c.name} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-700 font-sans">{c.name}:</span>
              <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 select-all overflow-x-auto">
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Brand & Support Links */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0B1220] rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          <BrandLogo size={40} />
          <div>
            <h3 className="font-bold text-white text-base">CryptoPay Protocol</h3>
            <p className="text-xs text-slate-400">Non-custodial, direct peer-to-peer EVM settlement.</p>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shadow-md shadow-blue-900/40 transition-colors"
        >
          Return to Payments
        </button>
      </motion.div>
    </div>
  );
};

export default MorePage;
