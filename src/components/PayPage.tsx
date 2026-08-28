import React, { useState } from 'react';
import { CreditCard, Zap, QrCode, Smartphone, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PayPageProps {
  onNavigateHome: () => void;
}

export const PayPage: React.FC<PayPageProps> = ({ onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div id="pay-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-semibold uppercase tracking-wider"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Pay Module • Coming Soon
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display"
        >
          Direct In-Store & Point-of-Sale Checkout
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          We are building the next generation of non-custodial POS hardware terminals, instant tap-to-pay web widgets, and gas-free customer checkouts for USDT, USDC, and VERSE on Polygon.
        </motion.p>
      </div>

      {/* Main Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Dynamic POS Terminal
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generate real-time animated payment screens with automated currency conversion and receipt generation for retail cashier desks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600">
            <span>Integrated EIP-681 Protocol</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              NFC & Tap-To-Pay
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tap any mobile device to trigger wallet deep-links via WalletConnect v2, Metamask, Coinbase, or Trust Wallet seamlessly.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600">
            <span>Instant Deep Linking</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Gasless Pay Relayers
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Allow customers with zero POL to execute token transfers through ERC-4337 meta-transactions and paymaster sponsorships.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-amber-600">
            <span>Zero Friction Checkout</span>
          </div>
        </motion.div>
      </div>

      {/* Early Access Notice & Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[#0B1220] rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-lg">
            <div className="flex items-center justify-center md:justify-start gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Direct Polygon Integration
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Need to accept crypto payments right now?
            </h2>
            <p className="text-sm text-slate-300">
              Use our core <strong>Create Payment Request</strong> dashboard to generate instant QR links settled directly to your wallet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-900/40 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Go to Payment Generator
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Early Access Notify */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          {!subscribed ? (
            <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email for early POS terminal access"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
              >
                Notify Me
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Thank you! You will be notified as soon as the POS Pay module launches.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PayPage;
