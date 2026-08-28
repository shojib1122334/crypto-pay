export type NavTab = 'home' | 'pay' | 'explore' | 'more';

export interface NavItemConfig {
  id: NavTab;
  label: string;
  emoji: string;
  description: string;
}
