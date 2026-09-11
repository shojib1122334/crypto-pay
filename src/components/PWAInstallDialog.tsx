import React, { useState } from 'react';
import {
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Laptop,
  Check,
  AlertCircle
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallDialog: React.FC<PWAInstallDialogProps> = ({ isOpen, onClose }) => {
  const {
    isInstalled,
    hasNativePrompt,
    isIOS,
    installApp,
  } = usePWA();

  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'chrome' | 'ios'>('auto');
  const [inIframe] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  });

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await installApp();
      setInstalling(false);
      if (outcome === 'accepted') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2500);
      }
    } catch (err) {
      console.error('Install trigger error:', err);
      setInstalling(false);
    }
  };

  const handleOpenStandaloneTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      id="pwa-install-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="pwa-install-dialog"
        className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-slate-900 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-100 border border-blue-200 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/icons/icon-192x192.png"
                alt="CryptoPay App Icon"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Install CryptoPay PWA
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-extrabold uppercase text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Install as a standalone native app for desktop and mobile.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Feedback */}
        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Success! CryptoPay App has been installed on your device.</span>
          </div>
        )}

        {/* Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-medium">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
            <span className="text-slate-500">PWA Status</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Ready to Install
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
            <span className="text-slate-500">Offline Cache</span>
            <span className="font-bold text-blue-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Active Worker
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5 col-span-2 sm:col-span-1">
            <span className="text-slate-500">Mode</span>
            <span className="font-bold text-slate-800">
              {isInstalled ? 'Standalone Active' : 'Browser App'}
            </span>
          </div>
        </div>

        {/* Notice for iframes (e.g. AI Studio Preview) */}
        {inIframe && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Preview Iframe Detected:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Browsers restrict native installation prompts inside embedded iframes. For direct 1-click browser installation, open in a dedicated tab.
              </p>
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="space-y-2">
          {hasNativePrompt ? (
            <button
              type="button"
              onClick={handleNativeInstall}
              disabled={installing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'Triggering Installation...' : 'Install CryptoPay App Now'}</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleNativeInstall}
                disabled={installing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Trigger Install Prompt</span>
              </button>
              {inIframe && (
                <button
                  type="button"
                  onClick={handleOpenStandaloneTab}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Open in Tab to Install</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Platform Guidance Tabs */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Install Guide:
            </span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('auto')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                  activeTab === 'auto'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isIOS ? 'iOS Safari' : 'Chrome / Edge'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                  activeTab === 'ios'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                iOS Instructions
              </button>
            </div>
          </div>

          {/* Guide Steps */}
          {activeTab === 'ios' || (activeTab === 'auto' && isIOS) ? (
            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                  1
                </div>
                <div className="text-slate-700">
                  Open in <strong>Safari</strong> on your iPhone or iPad.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                  2
                </div>
                <div className="text-slate-700">
                  Tap the <strong className="inline-flex items-center gap-1 text-blue-700"><Share className="w-3.5 h-3.5 inline" /> Share</strong> icon in the bottom menu bar.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                  3
                </div>
                <div className="text-slate-700">
                  Scroll down and tap <strong className="inline-flex items-center gap-1 text-emerald-700"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <Laptop className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-slate-700">
                  <strong>Desktop (Chrome, Brave, Edge):</strong> Look for the <strong>Install icon ⊕</strong> on the right side of the address bar, or click the button above.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-slate-700">
                  <strong>Android (Chrome):</strong> Tap the <strong>⋮ (three dots)</strong> menu in the upper right, then choose <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
