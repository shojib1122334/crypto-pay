// Provider Router for Transak & Ramp Networks (Spec 6)

import { PaymentProvider } from './PaymentProvider.js';
import { RampProvider } from './RampProvider.js';
import { TransakProvider } from './TransakProvider.js';

export class ProviderRouter {
  private static providers: Map<string, PaymentProvider> = new Map();

  public static getProvider(name: 'transak' | 'ramp'): PaymentProvider {
    if (!this.providers.has('transak')) {
      this.providers.set('transak', new TransakProvider());
    }
    if (!this.providers.has('ramp')) {
      this.providers.set('ramp', new RampProvider());
    }

    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider ${name} not found`);
    }
    return provider;
  }

  public static getBestProvider(): PaymentProvider {
    // Selects configured provider, defaulting to Transak
    const transak = this.getProvider('transak');
    if (transak.isConfigured()) return transak;

    const ramp = this.getProvider('ramp');
    if (ramp.isConfigured()) return ramp;

    return transak;
  }
}
