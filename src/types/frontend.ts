// Frontend Client Types

export interface ProviderConfigDetails {
  configured: boolean;
  provider: string;
  baseUrl: string;
  missingVars: string[];
}

export type ActiveTab = 'dashboard' | 'pay-to-card' | 'history' | 'admin' | 'tests';
export type PayToCardStep = 'details' | 'confirm' | 'processing' | 'result';
