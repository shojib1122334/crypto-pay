// Stripe Card Payout Adapter
// Implements Card Payouts using Stripe's Payouts API and Instant Payouts

import {
  CardPayoutProvider,
  CreatePayoutParams,
  CreatePayoutResult,
  PayoutStatusResult,
  RecipientValidationParams,
  RecipientValidationResult,
  ReversalResult,
  WebhookResult,
} from '../../services/card-payout/CardPayoutProvider.js';
import { PayFluxError } from '../../services/card-payout/CardPayoutErrors.js';

export class StripeCardPayoutAdapter implements CardPayoutProvider {
  public readonly name = 'stripe';
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.STRIPE_SECRET_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk_'));
  }

  public getConfigDetails() {
    const missing: string[] = [];
    if (!this.apiKey) missing.push('STRIPE_SECRET_KEY');
    return {
      configured: this.isConfigured(),
      provider: this.name,
      baseUrl: 'https://api.stripe.com/v1',
      missingVars: missing,
    };
  }

  public async validateRecipient(params: RecipientValidationParams): Promise<RecipientValidationResult> {
    if (!this.isConfigured()) {
      return {
        eligible: true,
        brand: 'VISA',
        last4: '4242',
        providerReference: `sim_stripe_card_${Date.now()}`,
        message: 'Sandbox: Eligible for instant payout.',
      };
    }

    try {
      const resp = await fetch(`https://api.stripe.com/v1/tokens/${params.token}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!resp.ok) {
        throw new PayFluxError('INVALID_CARD', 'Unable to verify recipient card token with Stripe.', 400);
      }

      const data = await resp.json();
      const card = data.card;

      return {
        eligible: true,
        brand: card.brand ? card.brand.toUpperCase() : 'VISA',
        last4: card.last4 || '4242',
        providerReference: card.id,
      };
    } catch (err: any) {
      if (err instanceof PayFluxError) throw err;
      throw new PayFluxError('PROVIDER_ERROR', `Stripe card token validation failed: ${err.message}`, 502);
    }
  }

  public async createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult> {
    if (!this.isConfigured()) {
      return {
        providerTransactionId: `po_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        status: 'PENDING',
        rawResponse: { mode: 'sandbox_simulation' },
      };
    }

    try {
      const body = new URLSearchParams({
        amount: Math.round(params.amount * 100).toString(),
        currency: params.currency.toLowerCase(),
        method: 'instant',
        description: params.description,
      });

      const resp = await fetch('https://api.stripe.com/v1/payouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': params.idempotencyKey,
        },
        body: body.toString(),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new PayFluxError('PAYOUT_FAILED', data.error?.message || 'Stripe Payout failed', 400, data.error);
      }

      return {
        providerTransactionId: data.id,
        status: data.status === 'paid' ? 'SUCCESS' : 'PENDING',
        rawResponse: data,
      };
    } catch (err: any) {
      if (err instanceof PayFluxError) throw err;
      throw new PayFluxError('PROVIDER_ERROR', `Stripe network error: ${err.message}`, 502);
    }
  }

  public async getPayoutStatus(providerTransactionId: string): Promise<PayoutStatusResult> {
    if (!this.isConfigured()) {
      return {
        status: 'COMPLETED',
        providerTransactionId,
      };
    }

    try {
      const resp = await fetch(`https://api.stripe.com/v1/payouts/${providerTransactionId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new PayFluxError('PROVIDER_ERROR', data.error?.message || 'Failed to fetch payout status', 400);
      }

      let status: PayoutStatusResult['status'] = 'PROCESSING';
      if (data.status === 'paid') status = 'COMPLETED';
      else if (data.status === 'failed') status = 'FAILED';
      else if (data.status === 'canceled') status = 'REVERSED';

      return {
        status,
        providerTransactionId: data.id,
        failureReason: data.failure_message,
      };
    } catch (err: any) {
      if (err instanceof PayFluxError) throw err;
      throw new PayFluxError('PROVIDER_ERROR', `Stripe status query failed: ${err.message}`, 502);
    }
  }

  public async reversePayout(providerTransactionId: string, reason?: string): Promise<ReversalResult> {
    if (!this.isConfigured()) {
      return {
        reversalId: `rev_sim_${Date.now()}`,
        status: 'REVERSED',
        message: 'Sandbox: payout reversed.',
      };
    }

    try {
      const resp = await fetch(`https://api.stripe.com/v1/payouts/${providerTransactionId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      const data = await resp.json();
      return {
        reversalId: data.id || `rev_${Date.now()}`,
        status: data.status === 'canceled' ? 'REVERSED' : 'REVERSAL_PENDING',
        message: data.failure_message || reason,
      };
    } catch (err: any) {
      return {
        reversalId: `rev_err_${Date.now()}`,
        status: 'FAILED',
        message: err.message,
      };
    }
  }

  public async handleWebhook(payload: any): Promise<WebhookResult> {
    const event = payload;
    const eventType = event.type;
    const eventId = event.id;
    const payoutObj = event.data?.object;

    let status: WebhookResult['status'] = 'UNKNOWN';
    if (eventType === 'payout.paid') status = 'COMPLETED';
    else if (eventType === 'payout.failed') status = 'FAILED';
    else if (eventType === 'payout.canceled') status = 'REVERSED';

    return {
      eventId,
      eventType,
      providerTransactionId: payoutObj?.id,
      status,
      failureReason: payoutObj?.failure_message,
    };
  }
}
