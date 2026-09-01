export type NavTab = 'dashboard' | 'pay-system' | 'create-invoice' | 'activity' | 'settings';

export interface NavItemConfig {
  id: NavTab;
  label: string;
}
