// Standardized Error Definitions for PayFlux Pay to Card

export type PayFluxErrorCode =
  | 'INVALID_CARD'
  | 'CARD_NOT_SUPPORTED'
  | 'INVALID_AMOUNT'
  | 'INVALID_CURRENCY'
  | 'QUOTE_EXPIRED'
  | 'INSUFFICIENT_BALANCE'
  | 'KYC_REQUIRED'
  | 'AML_REVIEW'
  | 'LIMIT_EXCEEDED'
  | 'RISK_REVIEW'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PAYOUT_FAILED'
  | 'PAYOUT_REVERSED'
  | 'DUPLICATE_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TWO_FACTOR_REQUIRED'
  | 'INVALID_2FA_CODE'
  | 'STATE_TRANSITION_INVALID';

export class PayFluxError extends Error {
  public readonly code: PayFluxErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(code: PayFluxErrorCode, message: string, statusCode = 400, details?: Record<string, any>) {
    super(message);
    this.name = 'PayFluxError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, PayFluxError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}
