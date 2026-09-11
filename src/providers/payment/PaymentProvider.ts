// Payment Provider Interface for On/Off Ramp Integration (Spec 6)

export interface PaymentQuoteParams {
  walletAddress: string;
  cryptoCurrency: string;
  fiatCurrency: string;
  fiatAmount?: number;
  cryptoAmount?: number;
  paymentMethod: string;
}

export interface PaymentQuoteResult {
  provider: 'transak' | 'ramp';
  cryptoCurrency: string;
  fiatCurrency: string;
  cryptoAmount: number;
  fiatAmount: number;
  networkFee: number;
  providerFee: number;
  conversionRate: number;
  expiresAt: string;
}

export interface CreateOrderParams {
  paymentId: string;
  walletAddress: string;
  cryptoCurrency: string;
  fiatCurrency: string;
  fiatAmount: number;
  cardLast4?: string;
  cardholderName?: string;
}

export interface CreateOrderResult {
  providerOrderId: string;
  redirectUrl?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
}

export interface OrderStatusResult {
  providerOrderId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  txHash?: string;
  blockNumber?: number;
  failureReason?: string;
}

export interface PaymentProvider {
  name: 'transak' | 'ramp';
  isConfigured(): boolean;
  getQuote(params: PaymentQuoteParams): Promise<PaymentQuoteResult>;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;
}
