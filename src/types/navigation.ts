export type NavTab = 'dashboard' | 'pay-system' | 'top-up' | 'create-invoice' | 'exchange' | 'activity' | 'settings';

export interface NavItemConfig {
  id: NavTab;
  label: string;
}
