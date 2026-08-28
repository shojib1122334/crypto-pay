import React from 'react';
import { Home, CreditCard, Search, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import type { NavTab } from '@/types/navigation';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
  },
  {
    id: 'pay',
    label: 'Pay',
    icon: CreditCard,
    badge: 'Beta',
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: Search,
  },
  {
    id: 'more',
    label: 'More',
    icon: Menu,
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div
      id="cryptopay-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-3 sm:px-6 pb-2.5 sm:pb-4"
    >
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto w-full max-w-lg bg-[#0B1220]/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.55)] p-1.5 flex items-center justify-between"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-200 group select-none ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {/* Active Tab Highlight Background */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-gradient-to-b from-blue-600/25 to-blue-900/40 border border-blue-500/40 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.25)]"
                />
              )}

              {/* Active Indicator Dot on top */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-blue-400 scale-110'
                      : 'text-slate-400 group-hover:scale-105'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />

                {item.badge && !isActive && (
                  <span className="absolute -top-1 -right-3 text-[9px] font-bold px-1 py-0.2 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`relative text-[11px] sm:text-xs font-semibold tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNavBar;
