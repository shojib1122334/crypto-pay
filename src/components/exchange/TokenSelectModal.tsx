import React, { useState } from 'react';
import { X, Search, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { SWAP_TOKENS, SwapTokenInfo, formatTokenAmount } from './tokenData';
import { TokenIcon } from '../TokenIcon';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: SwapTokenInfo) => void;
  selectedSymbol: string;
  otherSelectedSymbol?: string;
  balances?: Record<string, string>;
}

export const TokenSelectModal: React.FC<TokenSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedSymbol,
  otherSelectedSymbol,
  balances = {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Search filter strictly restricted to whitelisted tokens (MATIC, USDT, USDC, VERSE)
  const filteredTokens = SWAP_TOKENS.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Select a Token</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Whitelisted Polygon Mainnet assets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search strictly within the assets */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or symbol (MATIC, USDT, USDC, VERSE)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Token List */}
        <div className="p-2 overflow-y-auto space-y-1">
          {filteredTokens.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No matching asset found. Supported tokens on Polygon Swap are MATIC, USDT, USDC, and VERSE.
              </p>
            </div>
          ) : (
            filteredTokens.map((token) => {
              const isSelected = token.symbol === selectedSymbol;
              const isOther = token.symbol === otherSelectedSymbol;
              const balance = balances[token.symbol] || '0.00';

              return (
                <button
                  key={token.symbol}
                  disabled={isOther}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60'
                      : isOther
                      ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon token={token.symbol} size={36} className="rounded-full shadow-xs shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {token.symbol}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Polygon
                        </span>
                        {isOther && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Selected in counter)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {token.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatTokenAmount(balance)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Balance
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Official Polygon Contract Addresses</span>
          <a
            href="https://polygonscan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Polygonscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
