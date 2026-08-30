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
  return (
    <nav
      id="cryptopay-bottom-nav"
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 w-full z-50 bg-black/95 backdrop-blur-md border-t border-zinc-800/90 shadow-[0_-4px_25px_rgba(0,0,0,0.9)]"
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
              className={`relative flex flex-col items-center justify-center min-w-[72px] sm:min-w-[88px] py-1.5 px-3 rounded-xl transition-all duration-150 group select-none cursor-pointer ${
                isActive
                  ? 'text-[#FFFFFF]'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {/* Active Indicator Backdrop */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-bar-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-blue-500/10 border border-[#3B82F6]/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                />
              )}

              {/* Active top indicator dot */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive
                      ? 'text-[#3B82F6] scale-110'
                      : 'text-zinc-500 group-hover:scale-105 group-hover:text-zinc-200'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`relative text-[11px] sm:text-xs tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'text-[#FFFFFF] font-bold'
                    : 'text-zinc-500 font-medium group-hover:text-zinc-300'
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

