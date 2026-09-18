import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check, ArrowLeft, Wallet, Sparkles } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useConnectWallet } from '../../hooks/useConnectWallet';
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

const POPULAR_SYMBOLS: string[] = [
  'BTC',
  'ETH',
  'USDT',
  'USDC',
  'BNB',
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
  const { isConnected } = useAccount();
  const { openWalletConnect } = useConnectWallet();

  const [searchQuery, setSearchQuery] = useState('');
  // Step 2 active token for multi-network network selection screen
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

  // Compute tokens with non-zero balance for the "Wallet assets" section
  const walletAssets = useMemo(() => {
    if (!balances) return [];

    const list: {
      token: SwapTokenInfo;
      balance: string;
      numericBalance: number;
      distinctItem: DistinctTokenItem;
      networkName: string;
      networkSymbol: string;
    }[] = [];

    for (const item of distinctTokens) {
      for (const net of item.networks) {
        const key = `${net.networkId}:${item.symbol}`;
        const rawBal =
          balances[key] || (net.networkId === activeNetwork ? balances[item.symbol] : undefined);
        const num = rawBal ? parseFloat(rawBal) : 0;
        if (!isNaN(num) && num > 0) {
          list.push({
            token: net.token,
            balance: rawBal!,
            numericBalance: num,
            distinctItem: item,
            networkName: net.networkName,
            networkSymbol: net.networkSymbol,
          });
        }
      }
    }

    return list.sort((a, b) => b.numericBalance - a.numericBalance);
  }, [balances, distinctTokens, activeNetwork]);

  if (!isOpen) return null;

  // Handle click on a token row
  const handleTokenClick = (item: DistinctTokenItem) => {
    if (item.networks.length <= 1) {
      // Single-network token: immediately select its network & token and return to swap
      onSelect(item.networks[0].token);
      onClose();
    } else {
      // Multi-network token: transition to network selection view
      setActiveMultiToken(item);
    }
  };

  // =========================================================================
  // VIEW B: NETWORK SELECTION SCREEN (Full Screen for multi-network tokens)
  // =========================================================================
  if (activeMultiToken) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col w-screen h-screen min-h-screen overflow-hidden animate-in fade-in duration-150">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setActiveMultiToken(null)}
            className="p-1.5 -ml-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors focus:outline-none cursor-pointer inline-flex items-center gap-1.5"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-orange-500 hidden xs:inline">Back</span>
          </button>

          <div className="text-center">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Select network
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Networks supported for {activeMultiToken.symbol}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="max-w-xl mx-auto w-full space-y-4">
            {/* Selected Token Overview */}
            <div className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <TokenIcon
                token={activeMultiToken.symbol}
                size={40}
                className="rounded-full shadow-2xs shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight block">
                  {activeMultiToken.symbol}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                  {activeMultiToken.name} • Available on {activeMultiToken.networks.length} networks
                </span>
              </div>
            </div>

            <div className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Choose Blockchain Network
            </div>

            {/* List of Networks in Original Clean Style */}
            <div className="space-y-1">
              {activeMultiToken.networks.map((net) => {
                const isNetworkSelected =
                  selectedToken &&
                  selectedToken.symbol === activeMultiToken.symbol &&
                  selectedToken.networkId === net.networkId;

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
                      onSelect(net.token);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-colors text-left group cursor-pointer ${
                      isNetworkSelected
                        ? 'bg-orange-50/70 dark:bg-orange-950/25 ring-1 ring-orange-400/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800'
                    }`}
                  >
                    {/* Left: Network logo + Name */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-700/80 flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
                        <TokenIcon token={net.networkSymbol} size={28} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white block leading-tight truncate">
                          {net.networkName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                          {net.networkId === 'ethereum' ||
                          net.networkId === 'bsc' ||
                          net.networkId === 'polygon'
                            ? 'EVM Network'
                            : 'Native Network'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Balance + Checkmark */}
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {hasBalance && (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {formatTokenAmount(rawBal!)}
                        </span>
                      )}
                      {isNetworkSelected && (
                        <div className="p-1 rounded-full text-orange-500 shrink-0">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: FULL-SCREEN "SELECT ASSET" WITH ORIGINAL TOKEN ROW STYLING
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col w-screen h-screen min-h-screen overflow-hidden animate-in fade-in duration-150">
      {/* Top Header: Orange Close X on left, Centered title */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -ml-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors focus:outline-none z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
        </button>

        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Select asset
        </h2>

        <div className="w-8 -mr-1" aria-hidden="true" />
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-xl mx-auto w-full space-y-4">

          {/* 1. Search Bar with CoinGecko placeholder & original rounded-full pill design */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
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

          {/* 2. Wallet Assets Section (Displayed when not searching) */}
          {!searchQuery && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-orange-500" />
                  <span>Wallet assets</span>
                  {walletAssets.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                      {walletAssets.length}
                    </span>
                  )}
                </h3>
              </div>

              {!isConnected ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        Connect wallet to view your balances
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openWalletConnect}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0 ml-2"
                  >
                    Connect
                  </button>
                </div>
              ) : walletAssets.length === 0 ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active balances found in this connected wallet.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {walletAssets.map((asset) => (
                    <button
                      key={`${asset.token.networkId}:${asset.token.symbol}`}
                      type="button"
                      onClick={() => {
                        onSelect(asset.token);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <TokenIcon
                          token={asset.token.symbol}
                          size={40}
                          className="rounded-full shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                              {asset.token.symbol}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {asset.networkName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight truncate">
                            {asset.token.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                          {formatTokenAmount(asset.balance)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Popular Assets Section (Displayed when not searching) */}
          {!searchQuery && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Popular assets</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SYMBOLS.map((sym) => {
                  const tokenItem = distinctTokens.find((t) => t.symbol === sym);
                  if (!tokenItem) return null;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleTokenClick(tokenItem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-slate-200/60 dark:border-slate-700/60 hover:border-orange-300 dark:hover:border-orange-500/50 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <TokenIcon token={sym} size={18} className="rounded-full shrink-0" />
                      <span>{sym}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. All Tokens Section with Original Clean Token Row Style */}
          <div className="space-y-2 pt-1">
            <div className="px-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 select-none tracking-tight">
              <span>⚡</span>
              <span>{searchQuery ? `Search results (${filteredTokens.length})` : 'All tokens'}</span>
            </div>

            {filteredTokens.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No tokens found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map((item) => {
                  const isSelected =
                    (selectedToken && selectedToken.symbol === item.symbol) ||
                    (!selectedToken && item.symbol === selectedSymbol);

                  // Calculate aggregate or direct balance
                  let displayBalance: string | null = null;
                  if (balances) {
                    const activeKey = activeNetwork ? `${activeNetwork}:${item.symbol}` : null;
                    const directBal = activeKey ? balances[activeKey] : balances[item.symbol];

                    if (directBal && parseFloat(directBal) > 0) {
                      displayBalance = formatTokenAmount(directBal);
                    } else {
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
                            {isMultiNetwork && (
                              <div
                                className="flex items-center gap-1 ml-1"
                                title={`Supported on ${item.networks.map((n) => n.networkName).join(', ')}`}
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
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
