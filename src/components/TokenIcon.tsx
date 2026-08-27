import React, { useState } from 'react';

export type SupportedToken = 'USDT' | 'USDC' | 'VERSE' | 'usdt' | 'usdc' | 'verse';

interface TokenIconProps {
  token: SupportedToken | string;
  size?: number | string;
  className?: string;
}

// Official CDN image sources and uploaded assets
const VERSE_ASSET_PRIMARY = '/tokens/verse.png';
const VERSE_ASSET_FALLBACK = 'https://i.ibb.co.com/WvC6x1Bj/file-000000008eec8207a38c3656a345f2b1.png';

export const TokenIcon: React.FC<TokenIconProps> = ({
  token,
  size = 24,
  className = '',
}) => {
  const norm = (token || '').toUpperCase();
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 24;
  const [verseImgSrc, setVerseImgSrc] = useState(VERSE_ASSET_PRIMARY);

  // Official Tether USD (USDT) Logo
  if (norm === 'USDT') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Tether USD (USDT)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Tether USDT logo"
        >
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#FFFFFF"
            d="M17.922 17.383c-.05.004-.326.023-.922.023-.537 0-.826-.017-.9-.023v-.004c-3.74-.167-6.533-.798-6.533-1.54 0-.742 2.793-1.373 6.533-1.54v2.41c.078.006.37.025.922.025.568 0 .848-.02.9-.025v-2.41c3.733.167 6.52.798 6.52 1.54 0 .742-2.787 1.373-6.52 1.54v-.004zm0-3.66v-2.203h4.608V8.125h-13.06v3.395h4.608v2.203c-4.49.206-7.85 1.077-7.85 2.127 0 1.05 3.36 1.92 7.85 2.127v6.023h3.844v-6.023c4.484-.206 7.838-1.077 7.838-2.127 0-1.05-3.354-1.92-7.838-2.127z"
          />
        </svg>
      </div>
    );
  }

  // Official Circle USD Coin (USDC) Logo
  if (norm === 'USDC') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="USD Coin (USDC)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Circle USDC logo"
        >
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <g fill="#FFFFFF">
            <path d="M19.78 18.06c0-2.33-1.4-3.13-4.2-3.47-1.93-.27-2.33-.73-2.33-1.53 0-.87.67-1.4 2-1.4 1.2 0 1.87.47 2.07 1.33h1.93c-.2-1.73-1.4-2.93-3.33-3.13V8h-1.6v1.87c-1.93.27-3.13 1.53-3.13 3.27 0 2.2 1.33 3.07 4.13 3.4 1.93.33 2.4.73 2.4 1.6 0 .93-.8 1.53-2.13 1.53-1.67 0-2.27-.73-2.47-1.73h-2c.2 1.93 1.4 3.13 3.6 3.4V24h1.6v-1.87c2-.33 3.4-1.53 3.4-3.27z" />
            <path d="M9.73 22.27c-3.46-3.47-3.46-9.07 0-12.54l1.13 1.13c-2.87 2.87-2.87 7.47 0 10.27l-1.13 1.14zm12.54-12.54l-1.13 1.13c2.87 2.87 2.87 7.47 0 10.27l1.13 1.14c3.46-3.47 3.46-9.07 0-12.54z" />
          </g>
        </svg>
      </div>
    );
  }

  // Official Bitcoin.com VERSE Logo (Uploaded official asset)
  if (norm === 'VERSE') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none overflow-hidden rounded-full ${className}`}
        title="Bitcoin.com Verse (VERSE)"
      >
        <img
          src={verseImgSrc}
          alt="Official Bitcoin.com VERSE logo"
          width={numSize}
          height={numSize}
          className="w-full h-full object-cover rounded-full select-none"
          referrerPolicy="no-referrer"
          onError={() => {
            if (verseImgSrc !== VERSE_ASSET_FALLBACK) {
              setVerseImgSrc(VERSE_ASSET_FALLBACK);
            }
          }}
        />
      </div>
    );
  }

  // Generic fallback
  return (
    <div
      style={{ width: dimension, height: dimension }}
      className={`rounded-full bg-slate-800 text-white inline-flex items-center justify-center font-bold text-xs ${className}`}
    >
      {norm.slice(0, 1)}
    </div>
  );
};

export default TokenIcon;
