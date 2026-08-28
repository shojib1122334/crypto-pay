import React, { useState } from 'react';
import { Search, Store, MapPin, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface ExplorePageProps {
  onNavigateHome: () => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onNavigateHome }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'E-Commerce', 'SaaS & Dev', 'Retail & Food', 'Web3 & Gaming', 'Travel'];

  const previewMerchants = [
    {
      name: 'CyberStore Global',
      category: 'E-Commerce',
      tokens: ['USDT', 'USDC', 'VERSE'],
      location: 'Online • Worldwide',
      verified: true,
      desc: 'Hardware tech, electronics, and global digital gift cards.',
    },
    {
      name: 'Decentral Coffee Co.',
      category: 'Retail & Food',
      tokens: ['USDC', 'VERSE'],
      location: 'Berlin, DE • POS Enabled',
      verified: true,
      desc: 'Artisanal specialty coffee & beans settled via instant QR codes.',
    },
    {
      name: 'CloudNode Infrastructure',
      category: 'SaaS & Dev',
      tokens: ['USDT', 'USDC'],
      location: 'Online • Worldwide',
      verified: true,
      desc: 'High-performance VPS, VPN, and decentralized storage subscriptions.',
    },
    {
      name: 'MetaRealm Gaming',
      category: 'Web3 & Gaming',
      tokens: ['VERSE', 'USDT'],
      location: 'Polygon Ecosystem',
      verified: true,
      desc: 'In-game digital assets, skin passes, and community tournament rewards.',
    },
  ];

  return (
    <div id="explore-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-semibold uppercase tracking-wider"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Explore Ecosystem • Directory Preview
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display"
        >
          Discover Verified CryptoPay Merchants
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Explore businesses, service providers, and decentralized stores that accept direct, non-custodial crypto payments on Polygon.
        </motion.p>
      </div>

      {/* Interactive Search Bar Preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm mb-8 space-y-4"
      >
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchants, services, or categories (e.g. coffee, cloud, VPN)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Merchant Cards Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {previewMerchants.map((m, idx) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + idx * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-300 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-base">
                    {m.name}
                    {m.verified && (
                      <span title="Verified Merchant" className="text-blue-500">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {m.location}
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {m.category}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {m.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {m.tokens.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                Directory Launching Soon
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Merchant Submission Promo Box */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0B1220] rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Store className="w-4 h-4" />
            Merchant Listing Application
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Are you a merchant accepting crypto?
          </h2>
          <p className="text-sm text-slate-300 max-w-md">
            Get your store featured in the CryptoPay global merchant directory and reach thousands of Polygon Web3 consumers.
          </p>
        </div>

        <button
          onClick={onNavigateHome}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold whitespace-nowrap shadow-md shadow-blue-900/40 transition-colors"
        >
          Create First Payment Link
        </button>
      </motion.div>
    </div>
  );
};

export default ExplorePage;
