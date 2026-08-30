import React, { useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const {
    isInstalled,
    isInstallable,
    isIOS,
    installApp,
    dismissPrompt,
    showInstallBanner,
  } = usePWA();

  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (isInstalled || !isInstallable || !showInstallBanner) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setInstalling(true);
    const result = await installApp();
    setInstalling(false);
    if (result === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => {
        setInstalledSuccess(false);
      }, 3000);
    }
  };

  return (
    <>
      {/* Discreet, Elegant Mobile/Desktop Install Floating Banner */}
      <div
        id="pwa-install-banner"
        className="fixed top-18 sm:top-20 right-3 sm:right-6 z-40 max-w-sm w-[calc(100%-1.5rem)] bg-zinc-950/95 backdrop-blur-md border border-[#3B82F6]/40 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-3.5 text-white animate-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] flex-shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#FFFFFF]">Install CryptoPay App</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-zinc-900 border border-[#00E676]/30 text-[#00E676]">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
                Standalone mobile POS terminal with instant launch & offline support.
              </p>
            </div>
          </div>

          <button
            onClick={dismissPrompt}
            aria-label="Close install prompt"
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-900 transition flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-[#FFFFFF] text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {installedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Installed!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-white" />
                <span>{isIOS ? 'How to Install on iOS' : 'Install App'}</span>
              </>
            )}
          </button>

          <button
            onClick={dismissPrompt}
            className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white text-xs font-semibold border border-zinc-800 transition cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>

      {/* iOS Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 text-white text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Smartphone className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-[#FFFFFF]">Install on iPhone / iPad</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5">
              Add CryptoPay to your Home Screen for full-screen standalone POS experience.
            </p>

            <div className="space-y-3 text-left text-xs bg-zinc-900 rounded-2xl p-4 border border-zinc-800 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[#3B82F6] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </div>
                <div className="text-zinc-300">
                  Tap the <strong className="text-white inline-flex items-center gap-1 font-semibold"><Share className="w-3.5 h-3.5 text-[#3B82F6] inline" /> Share</strong> button in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[#00E676] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </div>
                <div className="text-zinc-300">
                  Scroll down and tap <strong className="text-white inline-flex items-center gap-1 font-semibold"><PlusSquare className="w-3.5 h-3.5 text-[#00E676] inline" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[#FACC15] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </div>
                <div className="text-zinc-300">
                  Tap <strong className="text-white font-semibold">Add</strong> at the top right to launch directly from your Home Screen.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
