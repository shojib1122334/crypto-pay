import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface BrandLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  badgeText?: string;
}

const PRIMARY_LOGO_SRC = '/brand/cryptopay-logo.jpg';
const FALLBACK_LOGO_SRC = 'https://i.ibb.co.com/TMYhH61Y/IMG-20260828-001221-766.jpg';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  textClassName = '',
  badgeText,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(PRIMARY_LOGO_SRC);
  const [hasError, setHasError] = useState(false);

  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 36;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: dimension, height: dimension }}
        className="relative flex-shrink-0 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-slate-900 border border-slate-700/60 select-none"
      >
        {!hasError ? (
          <img
            src={imgSrc}
            alt="CryptoPay Logo"
            width={numSize}
            height={numSize}
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
            onError={() => {
              if (imgSrc !== FALLBACK_LOGO_SRC) {
                setImgSrc(FALLBACK_LOGO_SRC);
              } else {
                setHasError(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] flex items-center justify-center text-white">
            <ShieldCheck className="w-1/2 h-1/2" />
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight text-lg leading-tight flex items-center gap-1.5 ${textClassName || ''}`}>
            <span className="text-white">
              Crypto<span className="text-[#3B82F6]">Pay</span>
            </span>
            {badgeText && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-[#00E676] rounded-md border border-[#00E676]/30">
                {badgeText}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
