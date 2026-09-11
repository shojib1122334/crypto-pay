// Card Payout Provider Interface & Contract

export interface RecipientValidationParams {
  token: string;
  cardholderName: string;
  currency: string;
}

export interface RecipientValidationResult {
  eligible: boolean;
  brand: string;
  last4: string;
  providerReference?: string;
  message?: string;
}

export interface CreatePayoutParams {
  payoutId: string;
  beneficiaryToken: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  description: string;
}

export interface CreatePayoutResult {
  providerTransactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
}

export interface PayoutStatusResult {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  providerTransactionId: string;
  failureReason?: string;
}

export interface ReversalResult {
  reversalId: string;
  status: 'REVERSAL_PENDING' | 'REVERSED' | 'FAILED';
  message?: string;
}

export interface WebhookResult {
  eventId: string;
  eventType: string;
  payoutId?: string;
  providerTransactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'REVERSED' | 'UNKNOWN';
  failureReason?: string;
}

export interface CardPayoutProvider {
  name: string;
  isConfigured(): boolean;
  getConfigDetails(): { configured: boolean; provider: string; baseUrl: string; missingVars: string[] };
  validateRecipient(params: RecipientValidationParams): Promise<RecipientValidationResult>;
  createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult>;
  getPayoutStatus(providerTransactionId: string): Promise<PayoutStatusResult>;
  reversePayout(providerTransactionId: string, reason?: string): Promise<ReversalResult>;
  handleWebhook(payload: any, rawBody: string, signature: string): Promise<WebhookResult>;
}
