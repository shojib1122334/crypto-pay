import React from 'react';
import { LayoutDashboard, Layers, Activity, Settings } from 'lucide-react';
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
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'pay-system',
    label: 'Pay system',
    icon: Layers,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const isActivity = activeTab === 'activity';
  const isPaySystem = activeTab === 'pay-system';
  const isDark = isActivity || isPaySystem;

  return (
    <nav
      id="cryptopay-bottom-nav"
      aria-label="Main Navigation"
      className={`fixed bottom-0 left-0 right-0 w-full z-50 transition-colors duration-200 ${
        isActivity
          ? 'bg-black/95 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_25px_rgba(0,0,0,0.9)]'
          : isPaySystem
          ? 'bg-[#022c22]/95 backdrop-blur-md border-t border-emerald-800 shadow-[0_-4px_25px_rgba(0,0,0,0.8)]'
          : 'bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
      }`}
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="max-w-md md:max-w-xl mx-auto px-3 sm:px-6 pt-2 pb-1 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[72px] sm:min-w-[88px] py-1.5 px-3 rounded-xl transition-colors duration-150 group select-none ${
                isActive
                  ? isDark
                    ? 'text-yellow-400'
                    : 'text-blue-600'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Active Indicator Backdrop */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-bar-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className={`absolute inset-0 rounded-xl ${
                    isActivity
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : isPaySystem
                      ? 'bg-yellow-400/15 border border-yellow-400/40'
                      : 'bg-blue-50 border border-blue-200/60'
                  }`}
                />
              )}

              {/* Active top indicator dot */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -top-1 w-1.5 h-1.5 rounded-full ${
                    isDark ? 'bg-yellow-400' : 'bg-blue-600'
                  }`}
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive
                      ? isDark
                        ? 'text-yellow-400 scale-110'
                        : 'text-blue-600 scale-110'
                      : isDark
                      ? 'text-slate-400 group-hover:scale-105'
                      : 'text-slate-500 group-hover:scale-105'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`relative text-[11px] sm:text-xs font-semibold tracking-tight mt-1 transition-colors ${
                  isActive
                    ? isDark
                      ? 'text-yellow-400 font-bold'
                      : 'text-blue-600 font-bold'
                    : isDark
                    ? 'text-slate-400 group-hover:text-white'
                    : 'text-slate-500 group-hover:text-slate-800'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
