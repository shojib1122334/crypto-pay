import React, { useState } from 'react';
import { Download, CheckCircle2, Wifi, WifiOff, Globe, Layers, Loader2 } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { SavedReceiversSection } from '@/components/SavedReceiversSection';
import { AdminPasswordSection } from '@/components/AdminPasswordSection';

export const ComingSoonPage: React.FC = () => {
  const { isInstalled, isIOS, isOnline, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);
  const [browserNotice, setBrowserNotice] = useState<string | null>(null);

  const handleTriggerInstallation = async () => {
    if (isInstalled) {
      setInstallSuccessToast(true);
      setTimeout(() => setInstallSuccessToast(false), 3000);
      return;
    }

    setIsInstalling(true);
    setBrowserNotice(null);
    try {
      const outcome = await installApp();
      if (outcome === 'accepted') {
        setInstallSuccessToast(true);
        setTimeout(() => setInstallSuccessToast(false), 3500);
      } else if (outcome === 'unsupported') {
        if (isIOS) {
          setBrowserNotice('To install on iOS Safari: Tap Share (⎋) in the toolbar, then select "Add to Home Screen".');
        } else {
          setBrowserNotice('To install: Click the Install icon (⊕) in your browser address bar.');
        }
      }
    } catch (err) {
      console.warn('Install trigger error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      id="settings-page"
      className="w-full sm:max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 font-sans"
    >
      {/* 1. Main Saved Receivers Management Section (Top) */}
      <SavedReceiversSection />

      {/* App & Terminal Settings Header */}
      <div className="web3-glass-card border border-white/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl shadow-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F0F4FF] border border-blue-200 flex items-center justify-center font-black shadow-xs flex-shrink-0">
            <img
              src="/icons/icon-192x192.png"
              alt="CryptoPay Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#101B5C]">CryptoPay Terminal App</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700">
                PWA / TWA v1.0.0
              </span>
            </div>
            <p className="text-xs text-[#5367A5] font-medium mt-1">
              Enterprise Web3 Point of Sale • Polygon Mainnet • Standalone Mobile Mode
            </p>
          </div>
        </div>

        {/* Setting Option: Direct Install Button / Success Indicator */}
        <div className="flex flex-col sm:items-end gap-2">
          {isInstalled ? (
            <div
              id="pwa-installed-success-indicator"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold shadow-xs"
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
              <span>App Installed Successfully</span>
            </div>
          ) : (
            <button
              id="pwa-install-button"
              type="button"
              onClick={handleTriggerInstallation}
              disabled={isInstalling}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 border border-white/20 transition-all cursor-pointer disabled:opacity-60"
              title="Install CryptoPay App"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Install App</span>
                </>
              )}
            </button>
          )}

          {browserNotice && !isInstalled && (
            <p className="text-[11px] text-[#5367A5] font-medium text-left sm:text-right max-w-xs leading-tight">
              {browserNotice}
            </p>
          )}
        </div>
      </div>

      {/* Success Notification if triggered */}
      {installSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>CryptoPay has been installed successfully on your device!</span>
        </div>
      )}

      {/* Grid: App Capabilities & Diagnostic Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network & Offline Status */}
        <div className="web3-glass-card border border-white/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl shadow-blue-500/5 space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#101B5C] flex items-center gap-2">
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

          <div className="text-xs space-y-2.5 text-[#5367A5] bg-[#F8FAFF] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#D6E0F5]">
            <div className="flex justify-between items-center">
              <span>Target Chain:</span>
              <span className="text-[#101B5C] font-mono font-bold">Polygon Mainnet (137)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Service Worker:</span>
              <span className="text-emerald-700 font-bold">Active & Caching</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Offline Fallback:</span>
              <span className="text-[#101B5C] font-semibold">Enabled (/offline.html)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Safe-Area Viewport:</span>
              <span className="text-[#101B5C] font-semibold">Enabled (viewport-fit=cover)</span>
            </div>
          </div>
        </div>

        {/* Android TWA / APK Readiness */}
        <div className="web3-glass-card border border-white/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl shadow-purple-500/5 space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#101B5C] flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Android TWA / APK Package</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              APK Ready
            </span>
          </div>

          <div className="text-xs space-y-2.5 text-[#5367A5] bg-[#F8FAFF] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#D6E0F5]">
            <div className="flex justify-between items-center">
              <span>Package ID:</span>
              <span className="text-[#101B5C] font-mono font-bold">app.cryptopay.pos</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tooling:</span>
              <span className="text-[#101B5C] font-semibold">Google Bubblewrap / TWA</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Asset Links:</span>
              <span className="text-emerald-700 font-bold">/.well-known/assetlinks.json</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Android Back-Button:</span>
              <span className="text-[#101B5C] font-semibold">Hardware Intercepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Roadmap & Under Development Notice */}
      <div className="web3-glass-card border border-white/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center space-y-4 shadow-xl shadow-purple-500/5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Advanced Merchant Features</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#101B5C]">
          MERCHANT SETTLEMENTS & API KEYS
        </h2>

        <p className="text-xs sm:text-sm text-[#5367A5] max-w-lg mx-auto leading-relaxed">
          Merchant webhooks, auto-conversion to fiat stables, multi-account terminal management, and custom invoice prefixes are scheduled for the next major release.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <span className="w-3 h-3 rounded-full bg-slate-300 animate-pulse" />
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse delay-100" />
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse delay-200" />
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse delay-300" />
          <span className="w-3 h-3 rounded-full bg-pink-500 animate-pulse delay-500" />
        </div>
      </div>

      {/* Admin Password Access Section (Bottom of Settings) */}
      <AdminPasswordSection />
    </div>
  );
};

export default ComingSoonPage;
