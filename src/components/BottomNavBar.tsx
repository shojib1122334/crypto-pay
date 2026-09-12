import React from 'react';
import { Layers, CreditCard, FileText, ArrowLeftRight, Activity, Settings, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { NavTab } from '@/types/navigation';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: LucideIcon;
  accentColor: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'pay-system',
    label: 'Pay system',
    icon: Layers,
    accentColor: 'text-blue-600',
  },
  {
    id: 'top-up',
    label: 'Top Up',
    icon: CreditCard,
    accentColor: 'text-cyan-600',
  },
  {
    id: 'create-invoice',
    label: 'Invoice',
    icon: FileText,
    accentColor: 'text-purple-600',
  },
  {
    id: 'exchange',
    label: 'Exchange',
    icon: ArrowLeftRight,
    accentColor: 'text-indigo-600',
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    accentColor: 'text-teal-600',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    accentColor: 'text-violet-600',
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
      className="fixed bottom-0 left-0 right-0 w-full z-50 px-2 sm:px-4 pb-2 sm:pb-3 pointer-events-none"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="max-w-lg md:max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl shadow-purple-950/15 rounded-2xl sm:rounded-3xl p-1.5 flex items-center justify-around pointer-events-auto relative">
        {/* Subtle Ambient Gradient Border Accent */}
        <div className="absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50 rounded-full" />

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 min-w-0 sm:min-w-[56px] py-1.5 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 group select-none cursor-pointer"
            >
              {/* Active Animated Gradient Sliding Pill */}
              {isActive && (
                <motion.div
                  layoutId="active-bottom-nav-gradient"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-md shadow-purple-500/30"
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-white scale-110 stroke-[2.4]'
                      : `${item.accentColor} group-hover:scale-105 opacity-85 group-hover:opacity-100`
                  }`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </div>

              <span
                className={`relative z-10 text-[10px] sm:text-xs tracking-tight mt-0.5 transition-colors whitespace-nowrap font-bold ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 group-hover:text-slate-950'
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

