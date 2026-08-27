import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

  useEffect(() => {
    // Start exit transition shortly before duration completes
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(1200, durationMs - 400));

    const completeTimer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B1220] text-white select-none overflow-hidden"
          onClick={() => {
            setIsExiting(true);
            setTimeout(onComplete, 250);
          }}
        >
          {/* Subtle Ambient Background Glows */}
          <div className="absolute w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none -top-10 -left-10" />
          <div className="absolute w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -bottom-10 -right-10" />

          <div className="relative flex flex-col items-center px-6 text-center z-10">
            {/* Animated Logo Container */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative mb-5"
            >
              {/* Outer Pulsing Aura */}
              <motion.div
                animate={{
                  scale: [1, 1.12, 1],
                  opacity: [0.35, 0.7, 0.35],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -inset-2 rounded-3xl bg-blue-500/20 blur-md pointer-events-none"
              />

              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 border border-blue-500/30 shadow-2xl shadow-blue-950/60 flex items-center justify-center p-0.5">
                <img
                  src={imgSrc}
                  alt="CryptoPay"
                  className="w-full h-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                  onError={() => setImgSrc(FALLBACK_LOGO_SRC)}
                />
              </div>
            </motion.div>

            {/* Brand Title */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                  CryptoPay
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Polygon
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide mt-1.5">
                Non-Custodial EVM Settlement
              </p>
            </motion.div>

            {/* 2-Second Animated Progress Bar */}
            <div className="w-40 sm:w-48 h-1 bg-slate-800 rounded-full mt-7 overflow-hidden relative border border-slate-700/50">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashIntro;
