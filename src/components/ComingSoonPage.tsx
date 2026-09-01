import React from 'react';
import { Download, CheckCircle2, ShieldCheck, Wifi, WifiOff, Globe, Layers, Sun, Moon, Sparkles } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useTheme } from '@/context/useTheme';
import { SavedReceiversSection } from '@/components/SavedReceiversSection';

export const ComingSoonPage: React.FC = () => {
  const { isInstalled, isInstallable, isOnline, installApp } = usePWA();
  const { theme, setTheme } = useTheme();

  return (
    <div
      id="settings-page"
      className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans"
    >
      {/* 1. Main Saved Receivers Management Section */}
      <SavedReceiversSection />

      {/* App & Terminal Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border border-[#3B82F6]/50 flex items-center justify-center font-black shadow-[0_0_20px_rgba(59,130,246,0.25)] flex-shrink-0">
            <img
              src="/icons/icon-192x192.png"
              alt="CryptoPay Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#FFFFFF]">CryptoPay Terminal App</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-900 border border-[#00E676]/30 text-[#00E676]">
                PWA / TWA v1.0.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Enterprise Web3 Point of Sale • Polygon Mainnet • Standalone Mobile Mode
            </p>
          </div>
        </div>

        {/* Install / Status Button */}
        <div className="flex items-center gap-3">
          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-[#00E676]/40 text-[#00E676] text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Installed (Standalone)</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={() => installApp()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install PWA App</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
              <span>PWA Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Option: Theme / Appearance (Light vs Dark) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Appearance & Theme</h3>
              <p className="text-xs text-zinc-400">
                Choose how CryptoPay appears on your device
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold uppercase bg-zinc-900 border border-zinc-700 text-zinc-300">
            {theme === 'light' ? 'Light Mode Active' : 'Dark Mode Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Choice 1: Light Mode */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
              theme === 'light'
                ? 'bg-white text-zinc-950 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-2 ring-amber-400/60'
                : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-800 text-amber-400'
                }`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${theme === 'light' ? 'text-zinc-950' : 'text-white'}`}>
                    Light
                  </h4>
                  <p className={`text-xs ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Crisp white background with high-contrast text
                  </p>
                </div>
              </div>

              {theme === 'light' ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono">
                  Selected
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-700" />
              )}
            </div>

            {/* Visual Swatch for Light */}
            <div className="w-full h-10 rounded-xl bg-white border border-zinc-200 p-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-[11px] font-bold text-zinc-900">#FFFFFF White Canvas</span>
              </div>
              <span className="text-[10px] font-semibold text-zinc-600">Dark Text</span>
            </div>
          </button>

          {/* Choice 2: Dark Mode */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
              theme === 'dark'
                ? 'bg-zinc-900 text-white border-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-2 ring-[#3B82F6]/60'
                : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-blue-950 text-[#3B82F6] border border-[#3B82F6]/40' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-300'}`}>
                    Dark
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Maintains the current Web3 terminal appearance
                  </p>
                </div>
              </div>

              {theme === 'dark' ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#3B82F6] text-white font-mono">
                  Selected
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-700" />
              )}
            </div>

            {/* Visual Swatch for Dark */}
            <div className="w-full h-10 rounded-xl bg-black border border-zinc-800 p-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                <span className="text-[11px] font-bold text-white">#000000 Pitch Black</span>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400">Neon Accents</span>
            </div>
          </button>
        </div>
      </div>


      {/* Grid: App Capabilities & Diagnostic Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network & Offline Status */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#3B82F6]" />
              <span>Connectivity & Node Status</span>
            </h3>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00E676] bg-zinc-900 border border-[#00E676]/30 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FACC15] bg-zinc-900 border border-[#FACC15]/30 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3" /> Offline (Cached)
              </span>
            )}
          </div>

          <div className="text-xs space-y-2.5 text-zinc-400 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-850">
            <div className="flex justify-between items-center">
              <span>Target Chain:</span>
              <span className="text-white font-mono font-bold">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Service Worker:</span>
              <span className="text-[#00E676] font-semibold">Active & Caching</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Offline Fallback:</span>
              <span className="text-white font-semibold">Enabled (/offline.html)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Safe-Area Viewport:</span>
              <span className="text-white font-semibold">Enabled (viewport-fit=cover)</span>
            </div>
          </div>
        </div>

        {/* Android TWA / APK Readiness */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00E676]" />
              <span>Android TWA / APK Package</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold text-[#3B82F6] bg-zinc-900 border border-[#3B82F6]/30 px-2 py-0.5 rounded-full">
              APK Ready
            </span>
          </div>

          <div className="text-xs space-y-2.5 text-zinc-400 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-850">
            <div className="flex justify-between items-center">
              <span>Package ID:</span>
              <span className="text-white font-mono font-bold">app.cryptopay.pos</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tooling:</span>
              <span className="text-white font-semibold">Google Bubblewrap / TWA</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Asset Links:</span>
              <span className="text-[#00E676] font-semibold">/.well-known/assetlinks.json</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Android Back-Button:</span>
              <span className="text-white font-semibold">Hardware Intercepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Roadmap & Under Development Notice */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <span>Advanced Merchant Features</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white">
          MERCHANT SETTLEMENTS & API KEYS
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Merchant webhooks, auto-conversion to fiat stables, multi-account terminal management, and custom invoice prefixes are scheduled for the next major release.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#FFFFFF] shadow-[0_0_8px_#FFFFFF] animate-pulse" />
          <span className="w-3 h-3 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676] animate-pulse delay-100" />
          <span className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6] animate-pulse delay-200" />
          <span className="w-3 h-3 rounded-full bg-[#FACC15] shadow-[0_0_8px_#FACC15] animate-pulse delay-300" />
          <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444] animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
