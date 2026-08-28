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
      className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0B1220] border-t border-[#1E293B] shadow-[0_-4px_20px_rgba(0,0,0,0.35)]"
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
              className={`relative flex flex-col items-center justify-center min-w-[64px] sm:min-w-[76px] py-1.5 px-2 rounded-xl transition-colors duration-150 group select-none ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Indicator Backdrop */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-bar-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                />
              )}

              {/* Active top glow indicator dot */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive
                      ? 'text-blue-400 scale-110'
                      : 'text-slate-400 group-hover:scale-105'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`relative text-[11px] sm:text-xs font-semibold tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'text-blue-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-200'
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
