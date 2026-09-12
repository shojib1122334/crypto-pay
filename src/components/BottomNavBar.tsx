import React from 'react';
import { Layers, CreditCard, FileText, ArrowLeftRight, Activity, Settings, type LucideIcon } from 'lucide-react';
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
    accentColor: 'text-emerald-600',
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
      <div className="max-w-lg md:max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl shadow-purple-950/10 rounded-2xl sm:rounded-3xl p-1.5 flex items-center justify-around pointer-events-auto relative">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-w-0 sm:min-w-[56px] py-1.5 px-1 rounded-xl sm:rounded-2xl group select-none cursor-pointer active:scale-95 transition-all duration-200 ${
                isActive ? 'nav-pill-active !text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {/* Vibrant Two-Color Blend: Royal Purple + Sweet Pink with Animated Pop & Glow */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 shadow-md shadow-pink-500/35 animate-nav-pop animate-nav-glow pointer-events-none"
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                    isActive
                      ? '!text-white text-white stroke-white scale-110 stroke-[2.4]'
                      : `${item.accentColor} group-hover:scale-110`
                  }`}
                  style={isActive ? { color: '#FFFFFF', stroke: '#FFFFFF' } : undefined}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </div>

              <span
                className={`relative z-10 text-[10px] sm:text-xs tracking-tight mt-0.5 whitespace-nowrap font-bold transition-colors ${
                  isActive
                    ? '!text-white text-white drop-shadow-xs font-extrabold'
                    : 'text-slate-600 group-hover:text-slate-900'
                }`}
                style={isActive ? { color: '#FFFFFF' } : undefined}
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

