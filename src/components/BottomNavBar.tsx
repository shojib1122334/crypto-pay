import React from 'react';
import { Layers, CreditCard, FileText, ArrowLeftRight, Activity, Settings, Lock, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { NavTab } from '@/types/navigation';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'pay-system',
    label: 'Pay system',
    icon: Layers,
  },
  {
    id: 'top-up',
    label: 'Top Up',
    icon: CreditCard,
  },
  {
    id: 'create-invoice',
    label: 'Credit Invoice',
    icon: FileText,
  },
  {
    id: 'exchange',
    label: 'Exchange',
    icon: ArrowLeftRight,
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
  const { isAdmin } = useAdminAuth();

  return (
    <nav
      id="cryptopay-bottom-nav"
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-md"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="max-w-lg md:max-w-2xl mx-auto px-1 sm:px-4 pt-2 pb-1 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isTopUpLocked = item.id === 'top-up' && !isAdmin;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-w-0 sm:min-w-[55px] py-1.5 px-0.5 sm:px-1.5 rounded-xl transition-all duration-150 group select-none cursor-pointer ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {/* Active Indicator Backdrop */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-bar-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-blue-50 border border-blue-200 shadow-xs"
                />
              )}

              {/* Active top indicator dot */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-[#1D4ED8]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${
                    isActive
                      ? 'text-blue-700 scale-110'
                      : 'text-slate-500 group-hover:scale-105 group-hover:text-slate-800'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {isTopUpLocked && (
                  <span
                    className="absolute -top-1.5 -right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-xs flex items-center justify-center border border-white"
                    title="Top Up is locked for general users"
                  >
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              <span
                className={`relative text-[10px] sm:text-xs tracking-tight mt-1 transition-colors whitespace-nowrap flex items-center gap-0.5 ${
                  isActive
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-600 font-medium group-hover:text-slate-900'
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

