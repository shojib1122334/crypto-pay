import React from 'react';
import { Download, CheckCircle2, ShieldCheck, Wifi, WifiOff, Globe, Layers } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { SavedReceiversSection } from '@/components/SavedReceiversSection';
import { SubscriptionManagementCard } from '@/components/SubscriptionManagementCard';

export const ComingSoonPage: React.FC = () => {
  const { isInstalled, isInstallable, isOnline, installApp } = usePWA();

  return (
    <div
      id="settings-page"
      className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans"
    >
      {/* 1. Subscription Management Section (Settings -> Subscription) */}
      <SubscriptionManagementCard />

      {/* 2. Main Saved Receivers Management Section */}
      <SavedReceiversSection />

      {/* App & Terminal Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-blue-200 flex items-center justify-center font-black shadow-xs flex-shrink-0">
            <img
              src="/icons/icon-192x192.png"
              alt="CryptoPay Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">CryptoPay Terminal App</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700">
                PWA / TWA v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Enterprise Web3 Point of Sale • Polygon Mainnet • Standalone Mobile Mode
            </p>
          </div>
        </div>

        {/* Install / Status Button */}
        <div className="flex items-center gap-3">
          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Installed (Standalone)</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={() => installApp()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install PWA App</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>PWA Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: App Capabilities & Diagnostic Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network & Offline Status */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Connectivity & Node Status</span>
            </h3>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3" /> Offline (Cached)
              </span>
            )}
          </div>

          <div className="text-xs space-y-2.5 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <span>Target Chain:</span>
              <span className="text-slate-900 font-mono font-bold">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Service Worker:</span>
              <span className="text-emerald-700 font-semibold">Active & Caching</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Offline Fallback:</span>
              <span className="text-slate-900 font-semibold">Enabled (/offline.html)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Safe-Area Viewport:</span>
              <span className="text-slate-900 font-semibold">Enabled (viewport-fit=cover)</span>
            </div>
          </div>
        </div>

        {/* Android TWA / APK Readiness */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Android TWA / APK Package</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              APK Ready
            </span>
          </div>

          <div className="text-xs space-y-2.5 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <span>Package ID:</span>
              <span className="text-slate-900 font-mono font-bold">app.cryptopay.pos</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tooling:</span>
              <span className="text-slate-900 font-semibold">Google Bubblewrap / TWA</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Asset Links:</span>
              <span className="text-emerald-700 font-semibold">/.well-known/assetlinks.json</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Android Back-Button:</span>
              <span className="text-slate-900 font-semibold">Hardware Intercepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Roadmap & Under Development Notice */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-pulse" />
          <span>Advanced Merchant Features</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          MERCHANT SETTLEMENTS & API KEYS
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Merchant webhooks, auto-conversion to fiat stables, multi-account terminal management, and custom invoice prefixes are scheduled for the next major release.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <span className="w-3 h-3 rounded-full bg-slate-400 animate-pulse" />
          <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse delay-100" />
          <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse delay-200" />
          <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse delay-300" />
          <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
