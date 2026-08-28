export type NavTab = 'dashboard' | 'pay-system' | 'activity' | 'settings';

export interface NavItemConfig {
  id: NavTab;
  label: string;
}
