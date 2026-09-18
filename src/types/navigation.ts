export type NavTab = 'dashboard' | 'exchange' | 'top-up' | 'activity' | 'settings';

export interface NavItemConfig {
  id: NavTab;
  label: string;
}
