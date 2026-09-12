import React, { useEffect, useState } from 'react';

interface SplashIntroProps {
  onComplete: () => void;
  durationMs?: number;
}

const LOGO_SRC = '/brand/cryptopay-logo.jpg';
const FALLBACK_LOGO_SRC = 'https://i.ibb.co.com/JRNF0tQR/IMG-20260828-001221-766.jpg';

export const SplashIntro: React.FC<SplashIntroProps> = ({
  onComplete,
  durationMs = 2000,
}) => {
  const [imgSrc, setImgSrc] = useState(LOGO_SRC);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Start exit transition shortly before duration completes
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(1200, durationMs - 400));

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      key="splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000000] text-[#FFFFFF] select-none overflow-hidden transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 250);
      }}
    >
      {/* Subtle Ambient Background Glows */}
      <div className="absolute w-96 h-96 rounded-full bg-[#3B82F6]/15 blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 rounded-full bg-[#00E676]/10 blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="relative flex flex-col items-center px-6 text-center z-10">
        {/* Animated Logo Container */}
        <div className="relative mb-5 transition-transform duration-500 transform scale-100">
          {/* Outer Pulsing Aura */}
          <div className="absolute -inset-2 rounded-3xl bg-[#3B82F6]/20 blur-md pointer-events-none animate-pulse" />

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-[0_0_25px_rgba(59,130,246,0.3)] flex items-center justify-center p-0.5">
            <img
              src={imgSrc}
              alt="CryptoPay"
              className="w-full h-full object-cover rounded-[14px]"
              referrerPolicy="no-referrer"
              onError={() => setImgSrc(FALLBACK_LOGO_SRC)}
            />
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FFFFFF] via-[#3B82F6] to-[#00E676] bg-clip-text text-transparent font-display">
              CryptoPay
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-[#00E676] border border-[#00E676]/30 shadow-[0_0_8px_rgba(0,230,118,0.2)]">
              Polygon
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
            Non-Custodial Real-Time EVM Settlement
          </p>
        </div>

        {/* 2-Second Animated Progress Bar */}
        <div className="w-40 sm:w-48 h-1 bg-zinc-900 rounded-full mt-7 overflow-hidden relative border border-zinc-800">
          <div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#00E676] rounded-full shadow-[0_0_8px_#3B82F6] transition-all duration-[1800ms] w-full" />
        </div>
      </div>
    </div>
  );
};

export default SplashIntro;
