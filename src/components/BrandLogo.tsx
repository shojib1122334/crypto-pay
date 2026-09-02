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
const SECONDARY_LOGO_SRC = '/brand/app-logo.png';
const FALLBACK_LOGO_SRC = 'https://i.ibb.co.com/VY6vMjDK/file-0000000069dc82099b4c34f926555b74-2.jpg';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  className = '',
  showText = false,
  textClassName = '',
  badgeText,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(PRIMARY_LOGO_SRC);
  const [hasError, setHasError] = useState(false);

  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 40;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: dimension, height: dimension }}
        className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center bg-slate-900 border border-slate-700/60 select-none ring-1 ring-black/5"
      >
        {!hasError ? (
          <img
            src={imgSrc}
            alt="CryptoPay Logo"
            width={numSize}
            height={numSize}
            className="w-full h-full object-cover rounded-2xl"
            referrerPolicy="no-referrer"
            onError={() => {
              if (imgSrc === PRIMARY_LOGO_SRC) {
                setImgSrc(SECONDARY_LOGO_SRC);
              } else if (imgSrc === SECONDARY_LOGO_SRC) {
                setImgSrc(FALLBACK_LOGO_SRC);
              } else {
                setHasError(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm">
            <ShieldCheck className="w-1/2 h-1/2 text-white" />
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight text-lg leading-tight flex items-center gap-1.5 ${textClassName || ''}`}>
            <span className="text-slate-900">
              Crypto<span className="bg-gradient-to-r from-[#8B5CF6] to-[#2563EB] bg-clip-text text-transparent">Pay</span>
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
