// Card Payout Provider Factory
// Selects appropriate payment adapter (Stripe / Visa Direct)

import { CardPayoutProvider } from '../../services/card-payout/CardPayoutProvider.js';
import { StripeCardPayoutAdapter } from './StripeCardPayoutAdapter.js';
import { VisaDirectAdapter } from './VisaDirectAdapter.js';

export class ProviderFactory {
  private static providers: Map<string, CardPayoutProvider> = new Map();

  public static getProvider(name?: string): CardPayoutProvider {
    const selected = (name || process.env.CARD_PAYOUT_PROVIDER || 'stripe').toLowerCase();

    if (!this.providers.has('stripe')) {
      this.providers.set('stripe', new StripeCardPayoutAdapter());
    }
    if (!this.providers.has('visa_direct')) {
      this.providers.set('visa_direct', new VisaDirectAdapter());
    }

    const provider = this.providers.get(selected);
    if (!provider) {
      return this.providers.get('stripe')!;
    }
    return provider;
  }

  public static getAllProviders(): CardPayoutProvider[] {
    return [this.getProvider('stripe'), this.getProvider('visa_direct')];
  }
}
