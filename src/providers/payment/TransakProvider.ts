// Transak Payment Provider (Spec 6)

import {
  CreateOrderParams,
  CreateOrderResult,
  OrderStatusResult,
  PaymentProvider,
  PaymentQuoteParams,
  PaymentQuoteResult,
} from './PaymentProvider.js';

export class TransakProvider implements PaymentProvider {
  public readonly name = 'transak' as const;
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.TRANSAK_API_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public async getQuote(params: PaymentQuoteParams): Promise<PaymentQuoteResult> {
    const rate = 1.0;
    const fiatAmount = params.fiatAmount || (params.cryptoAmount ? params.cryptoAmount * rate : 100);
    const cryptoAmount = params.cryptoAmount || fiatAmount / rate;
    const networkFee = 0.02;
    const providerFee = Number((fiatAmount * 0.01).toFixed(2));

    return {
      provider: 'transak',
      cryptoCurrency: params.cryptoCurrency,
      fiatCurrency: params.fiatCurrency,
      cryptoAmount,
      fiatAmount,
      networkFee,
      providerFee,
      conversionRate: rate,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return {
      providerOrderId: `transak_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      redirectUrl: `https://global.transak.com?cryptoCurrencyCode=${params.cryptoCurrency}&network=polygon&walletAddress=${params.walletAddress}`,
      status: 'PENDING',
    };
  }

  public async getOrderStatus(providerOrderId: string): Promise<OrderStatusResult> {
    return {
      providerOrderId,
      status: 'COMPLETED',
      txHash: `0xtransak_${Date.now()}`,
    };
  }
}
