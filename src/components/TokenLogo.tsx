import React from 'react';

interface TokenLogoProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TokenLogo: React.FC<TokenLogoProps> = ({ symbol, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const getStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'USDT':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '₮' };
      case 'USDC':
        return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '$' };
      case 'BTC':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '₿' };
      case 'ETH':
        return { bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', label: 'Ξ' };
      case 'POL':
      case 'MATIC':
        return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '⬡' };
      default:
        return { bg: 'bg-slate-700/50 text-slate-300 border-slate-600', label: s.slice(0, 2) };
    }
  };

  const style = getStyle(symbol);

  return (
    <div
      className={`inline-flex items-center justify-center font-bold rounded-full border ${style.bg} ${sizeClasses[size]} ${className}`}
    >
      <span>{style.label}</span>
    </div>
  );
};
