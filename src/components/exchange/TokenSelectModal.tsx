import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import {
  MULTI_CHAIN_TOKENS,
  BlockchainNetworkId,
  SwapTokenInfo,
  NETWORK_SYMBOL_MAP,
  formatTokenAmount,
} from './tokenData';
import { TokenIcon } from '../TokenIcon';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: SwapTokenInfo) => void;
  selectedToken?: SwapTokenInfo;
  selectedSymbol: string;
  otherSelectedSymbol?: string;
  otherSelectedToken?: SwapTokenInfo;
  balances?: Record<string, string>;
  activeNetwork?: BlockchainNetworkId;
}

export interface DistinctNetworkOption {
  networkId: BlockchainNetworkId;
  networkName: string;
  networkSymbol: string;
  token: SwapTokenInfo;
}

export interface DistinctTokenItem {
  symbol: string;
  name: string;
  logo: string;
  color: string;
  networks: DistinctNetworkOption[];
}

// Preferred ordering of primary supported tokens
const ORDERED_PRIMARY_SYMBOLS: string[] = [
  'BTC',
  'ETH',
  'USDT',
  'BNB',
  'USDC',
  'SOL',
  'POL',
  'VERSE',
];

export const TokenSelectModal: React.FC<TokenSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  selectedSymbol,
  balances,
  activeNetwork,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Step 2 active token for multi-network bottom sheet selection
  const [activeMultiToken, setActiveMultiToken] = useState<DistinctTokenItem | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setActiveMultiToken(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Group all MULTI_CHAIN_TOKENS into distinct tokens (1 row per distinct token symbol)
  const distinctTokens = useMemo<DistinctTokenItem[]>(() => {
    const symbolMap = new Map<string, DistinctTokenItem>();

    for (const t of MULTI_CHAIN_TOKENS) {
      const netSymbol = NETWORK_SYMBOL_MAP[t.networkId] || t.symbol;
      const netOption: DistinctNetworkOption = {
        networkId: t.networkId,
        networkName: t.networkName,
        networkSymbol: netSymbol,
        token: t,
      };

      if (!symbolMap.has(t.symbol)) {
        symbolMap.set(t.symbol, {
          symbol: t.symbol,
          name: t.name,
          logo: t.logo,
          color: t.color,
          networks: [netOption],
        });
      } else {
        const existing = symbolMap.get(t.symbol)!;
        // Avoid duplicate network entries
        if (!existing.networks.some((n) => n.networkId === t.networkId)) {
          existing.networks.push(netOption);
        }
      }
    }

    // Build the ordered distinct list
    const orderedList: DistinctTokenItem[] = [];

    for (const sym of ORDERED_PRIMARY_SYMBOLS) {
      const item = symbolMap.get(sym);
      if (item) {
        orderedList.push(item);
        symbolMap.delete(sym);
      }
    }

    // Append any remaining tokens
    for (const remaining of symbolMap.values()) {
      orderedList.push(remaining);
    }

    return orderedList;
  }, []);

  // Filtered tokens when user searches
  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return distinctTokens;

    return distinctTokens.filter((item) => {
      const sym = item.symbol.toLowerCase();
      const name = item.name.toLowerCase();

      // Direct symbol/name match
      if (sym.includes(q) || name.includes(q)) return true;

      // Common aliases
      if (sym === 'pol' && (q.includes('matic') || q.includes('polygon'))) return true;
      if (sym === 'bnb' && (q.includes('binance') || q.includes('bsc'))) return true;
      if (sym === 'btc' && q.includes('bitcoin')) return true;
      if (sym === 'eth' && q.includes('ether')) return true;
      if (sym === 'usdt' && q.includes('tether')) return true;

      // Supported network names
      return item.networks.some(
        (n) => n.networkName.toLowerCase().includes(q) || n.networkId.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, distinctTokens]);

  if (!isOpen) return null;

  // Handle click on a token row in Step 1
  const handleTokenClick = (item: DistinctTokenItem) => {
    if (item.networks.length <= 1) {
      // Single-network token: immediately select its network & token and return to swap
      onSelect(item.networks[0].token);
      onClose();
    } else {
      // Multi-network token: open mobile bottom sheet for network selection
      setActiveMultiToken(item);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= STEP 1: SELECT ASSET ================= */}

        {/* Top Header: Orange X on top-left, centered "Select asset" */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors focus:outline-none z-10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white absolute inset-x-0 text-center pointer-events-none select-none">
            Select asset
          </h2>
          <div className="w-8" aria-hidden="true" />
        </div>

        {/* Search Bar: Large rounded input "Search by CoinGecko" */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by CoinGecko"
              className="w-full pl-11 pr-10 py-3 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 rounded-full text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Section Header: "⚡ All tokens" */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 select-none tracking-tight">
            {searchQuery ? (
              <span>Search results ({filteredTokens.length})</span>
            ) : (
              <>
                <span>⚡</span>
                <span>All tokens</span>
              </>
            )}
          </h3>
        </div>

        {/* Token List: One row per token */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-1">
          {filteredTokens.length === 0 ? (
            <div className="py-12 text-center px-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No tokens found for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for BTC, ETH, USDT, BNB, USDC, SOL, POL, or VERSE.
              </p>
            </div>
          ) : (
            filteredTokens.map((item) => {
              // Check if this token is currently selected
              const isSelected =
                (selectedToken && selectedToken.symbol === item.symbol) ||
                (!selectedToken && item.symbol === selectedSymbol);

              // Aggregate or current network balance for this token
              let displayBalance: string | null = null;
              if (balances) {
                // If token is on active network, show that balance
                const activeKey = activeNetwork ? `${activeNetwork}:${item.symbol}` : null;
                const directBal = activeKey ? balances[activeKey] : balances[item.symbol];

                if (directBal && parseFloat(directBal) > 0) {
                  displayBalance = formatTokenAmount(directBal);
                } else {
                  // Check any network with balance
                  for (const net of item.networks) {
                    const b = balances[`${net.networkId}:${item.symbol}`];
                    if (b && parseFloat(b) > 0) {
                      displayBalance = formatTokenAmount(b);
                      break;
                    }
                  }
                }
              }

              const isMultiNetwork = item.networks.length > 1;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleTokenClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-colors text-left group cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 ring-1 ring-orange-400/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800'
                  }`}
                >
                  {/* Left: Token Logo + Symbol with Network Icons beside it + Token name underneath */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <TokenIcon
                      token={item.symbol}
                      size={40}
                      className="rounded-full shadow-2xs shrink-0"
                    />

                    <div className="min-w-0">
                      {/* Top line: Bold token symbol + small network icons beside it */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                          {item.symbol}
                        </span>

                        {/* Small network icons displayed strictly BESIDE the token symbol */}
                        {isMultiNetwork && (
                          <div
                            className="flex items-center gap-1 ml-1"
                            title={`Supported on: ${item.networks.map((n) => n.networkName).join(', ')}`}
                          >
                            {item.networks.map((net) => (
                              <div
                                key={net.networkId}
                                className="w-4 h-4 rounded-full bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center overflow-hidden shadow-2xs"
                                title={net.networkName}
                              >
                                <TokenIcon token={net.networkSymbol} size={13} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom line: Token name underneath (No network name) */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight truncate">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Balance if available + Selection checkmark */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {displayBalance && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {displayBalance}
                      </span>
                    )}
                    {isSelected && (
                      <div className="p-1 rounded-full text-orange-500 shrink-0">
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ================= STEP 2: NETWORK SELECTION BOTTOM SHEET ================= */}

        {/* Dimmed backdrop when bottom sheet is open */}
        {activeMultiToken && (
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs z-20 animate-in fade-in duration-200"
            onClick={() => setActiveMultiToken(null)}
          />
        )}

        {/* Bottom sheet panel */}
        {activeMultiToken && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 sm:p-5 flex flex-col max-h-[82%] animate-in slide-in-from-bottom duration-250 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3.5 shrink-0" />

            {/* Bottom Sheet Header */}
            <div className="flex items-center justify-between px-1 pb-3 mb-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <TokenIcon
                  token={activeMultiToken.symbol}
                  size={26}
                  className="rounded-full shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                    Select network
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-none truncate">
                    Available networks for {activeMultiToken.symbol}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMultiToken(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Back"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical list of available networks */}
            <div className="flex-1 overflow-y-auto py-2 space-y-1.5">
              {activeMultiToken.networks.map((net) => {
                // Is this exact network and token currently selected?
                const isNetworkSelected =
                  selectedToken &&
                  selectedToken.symbol === activeMultiToken.symbol &&
                  selectedToken.networkId === net.networkId;

                // Live balance for this network and token
                const balanceKey = `${net.networkId}:${activeMultiToken.symbol}`;
                const rawBal =
                  balances?.[balanceKey] ||
                  (net.networkId === activeNetwork ? balances?.[activeMultiToken.symbol] : undefined);
                const numBal = rawBal ? parseFloat(rawBal) : 0;
                const hasBalance = !isNaN(numBal) && numBal > 0;

                return (
                  <button
                    key={net.networkId}
                    type="button"
                    onClick={() => {
                      // 1. Close the bottom sheet
                      setActiveMultiToken(null);
                      // 2. Select BOTH the token and the selected network
                      onSelect(net.token);
                      // 3. Return to the existing Swap screen
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors text-left cursor-pointer group ${
                      isNetworkSelected
                        ? 'bg-orange-50/80 dark:bg-orange-950/30 ring-1 ring-orange-400/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800'
                    }`}
                  >
                    {/* Left: Network logo + Network name */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-700/80 flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
                        <TokenIcon token={net.networkSymbol} size={30} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white block leading-tight truncate">
                          {net.networkName}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                          {net.networkId === 'ethereum' ||
                          net.networkId === 'bsc' ||
                          net.networkId === 'polygon'
                            ? 'EVM Network'
                            : 'Native Network'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Balance + Checkmark */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      {hasBalance && (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {formatTokenAmount(rawBal!)}
                        </span>
                      )}
                      {isNetworkSelected && (
                        <div className="p-1 rounded-full text-orange-500 shrink-0">
                          <Check className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
