export type NavTab = 'dashboard' | 'pay-system' | 'create-invoice' | 'exchange' | 'activity' | 'settings';

export interface NavItemConfig {
  id: NavTab;
  label: string;
}
