import React, { useState } from 'react';

export type SupportedToken =
  | 'USDT'
  | 'USDC'
  | 'VERSE'
  | 'POL'
  | 'MATIC'
  | 'ETH'
  | 'usdt'
  | 'usdc'
  | 'verse'
  | 'pol'
  | 'matic'
  | 'eth'
  | string;

interface TokenIconProps {
  token: SupportedToken;
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
  const norm = (token || '').toUpperCase().trim();
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 24;
  const [verseImgError, setVerseImgError] = useState(false);

  // 1. Official Tether USD (USDT) Logo
  if (norm === 'USDT' || norm === 'TETHER' || norm === 'USDT-ETH') {
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

  // 2. Official Circle USD Coin (USDC) Logo
  if (norm === 'USDC' || norm === 'USD COIN' || norm === 'USDC-ETH') {
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

  // 3. Official Bitcoin.com VERSE Logo
  if (norm === 'VERSE' || norm === 'VERSE-ETH') {
    if (!verseImgError) {
      return (
        <div
          style={{ width: dimension, height: dimension }}
          className={`inline-flex items-center justify-center flex-shrink-0 select-none overflow-hidden rounded-full ${className}`}
          title="Bitcoin.com Verse (VERSE)"
        >
          <img
            src={VERSE_ASSET_PRIMARY}
            alt="Official Bitcoin.com VERSE logo"
            width={numSize}
            height={numSize}
            className="w-full h-full object-cover rounded-full select-none"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== VERSE_ASSET_FALLBACK) {
                target.src = VERSE_ASSET_FALLBACK;
              } else {
                setVerseImgError(true);
              }
            }}
          />
        </div>
      );
    }

    // High fidelity Vector fallback for VERSE
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Bitcoin.com Verse (VERSE)"
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" className="w-full h-full block">
          <circle cx="16" cy="16" r="16" fill="#0D0D12" />
          <path
            d="M8.5 9.5L16 23.5L23.5 9.5H19L16 15.5L13 9.5H8.5Z"
            fill="url(#verse-grad)"
          />
          <defs>
            <linearGradient id="verse-grad" x1="8.5" y1="9.5" x2="23.5" y2="23.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00E676" />
              <stop offset="0.5" stopColor="#00B0FF" />
              <stop offset="1" stopColor="#7C4DFF" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // 4. Official Polygon POL / MATIC Logo
  if (norm === 'POL' || norm === 'MATIC' || norm === 'POLYGON') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Polygon Ecosystem Token (POL)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Polygon POL logo"
        >
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path
            fill="#FFFFFF"
            d="M20.6 13.7c-.5-.3-1.1-.3-1.6 0l-2.4 1.4-1.2.7-2.4 1.4c-.5.3-.8.8-.8 1.4v2.8c0 .6.3 1.1.8 1.4l2.4 1.4c.5.3 1.1.3 1.6 0l2.4-1.4c.5-.3.8-.8.8-1.4v-2.8c0-.6-.3-1.1-.8-1.4l-2.4-1.4 1.2-.7 2.4 1.4c.5.3.8.8.8 1.4v2.8c0 1.2-.6 2.2-1.6 2.8l-2.4 1.4c-1 .6-2.2.6-3.2 0l-2.4-1.4c-1-.6-1.6-1.7-1.6-2.8v-2.8c0-1.2.6-2.2 1.6-2.8l2.4-1.4 1.2-.7 2.4-1.4c.5-.3.8-.8.8-1.4V9.3c0-.6-.3-1.1-.8-1.4l-2.4-1.4c-.5-.3-1.1-.3-1.6 0l-2.4 1.4c-.5.3-.8.8-.8 1.4v2.8c0 .6.3 1.1.8 1.4l2.4 1.4-1.2.7-2.4-1.4c-.5-.3-.8-.8-.8-1.4V9.3c0-1.2.6-2.2 1.6-2.8l2.4-1.4c1-.6 2.2-.6 3.2 0l2.4 1.4c1 .6 1.6 1.7 1.6 2.8v2.8c0 1.2-.6 2.2-1.6 2.8l-2.4 1.4z"
          />
        </svg>
      </div>
    );
  }

  // 5. Official Ethereum (ETH) Logo
  if (norm === 'ETH' || norm === 'ETHEREUM' || norm === 'WETH') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Ethereum (ETH)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Ethereum ETH logo"
        >
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFFFFF" fillRule="nonzero">
            <path fill="#FFFFFF" fillOpacity="0.65" d="M16 4.5v8.85l7.5 3.35z" />
            <path fill="#FFFFFF" d="M16 4.5L8.5 16.7l7.5-3.35z" />
            <path fill="#FFFFFF" fillOpacity="0.65" d="M16 22.15v5.35L23.5 17.8z" />
            <path fill="#FFFFFF" d="M16 27.5v-5.35L8.5 17.8z" />
            <path fill="#FFFFFF" fillOpacity="0.3" d="M16 20.75l7.5-4.05L16 13.35z" />
            <path fill="#FFFFFF" fillOpacity="0.75" d="M8.5 16.7l7.5 4.05v-7.4z" />
          </g>
        </svg>
      </div>
    );
  }

  // 6. Official Bitcoin (BTC) Logo
  if (norm === 'BTC' || norm === 'BITCOIN') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Bitcoin (BTC)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Bitcoin BTC logo"
        >
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#FFFFFF"
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.921-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.214 1.231.319l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.152.986-5.325.694l.95-3.81c1.173.293 4.929.872 4.375 3.116zm.535-5.569c-.488 1.954-3.504.961-4.48.718l.861-3.454c.977.244 4.125.7 3.619 2.736z"
          />
        </svg>
      </div>
    );
  }

  // 7. Official BNB (BNB Smart Chain) Logo
  if (norm === 'BNB' || norm === 'BINANCE' || norm === 'BSC') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="BNB (BNB Smart Chain)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official BNB logo"
        >
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path
            fill="#FFFFFF"
            d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6 9.856 12.144l2.26 2.26zm-6.116 1.596l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.884 2.26 2.26L16 26l-6.144-6.144 2.26-2.26zm9.768-1.596l2.26-2.26L26 16l-2.26 2.26-2.26-2.26zm-3.62 0L16 13.74l-2.26 2.26L16 18.26l2.26-2.26z"
          />
        </svg>
      </div>
    );
  }

  // 8. Official Solana (SOL) Logo
  if (norm === 'SOL' || norm === 'SOLANA') {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
        title="Solana (SOL)"
      >
        <svg
          viewBox="0 0 32 32"
          width="100%"
          height="100%"
          className="w-full h-full block"
          aria-label="Official Solana SOL logo"
        >
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <path
            fill="url(#sol-grad-1)"
            d="M8.5 21.8c.2-.2.5-.3.8-.3h14.2c.5 0 .8.6.5.9l-2.5 2.5c-.2.2-.5.3-.8.3H6.5c-.5 0-.8-.6-.5-.9l2.5-2.5z"
          />
          <path
            fill="url(#sol-grad-2)"
            d="M8.5 6.8c.2-.2.5-.3.8-.3h14.2c.5 0 .8.6.5.9l-2.5 2.5c-.2.2-.5.3-.8.3H6.5c-.5 0-.8-.6-.5-.9l2.5-2.5z"
          />
          <path
            fill="url(#sol-grad-3)"
            d="M23.5 14.3c-.2-.2-.5-.3-.8-.3H8.5c-.5 0-.8.6-.5.9l2.5 2.5c.2.2.5.3.8.3h14.2c.5 0 .8-.6.5-.9l-2.5-2.5z"
          />
          <defs>
            <linearGradient id="sol-grad-1" x1="6.5" y1="23.3" x2="23.5" y2="23.3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="sol-grad-2" x1="6.5" y1="8.3" x2="23.5" y2="8.3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
            <linearGradient id="sol-grad-3" x1="8.5" y1="15.8" x2="25.5" y2="15.8" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DC1FFF" />
              <stop offset="1" stopColor="#00FFA3" />
            </linearGradient>
          </defs>
        </svg>
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

