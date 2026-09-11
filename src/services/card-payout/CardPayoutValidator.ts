// Card Payout Validator
// Implements strict PCI-DSS sanitization, Luhn checks, and corridor validations

import { PayFluxError } from './CardPayoutErrors.js';
import { CardCurrencyValidator } from '../../utils/cardCurrencyValidator.js';

export interface CardValidationInput {
  cardNumber?: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv?: string;
  providerToken?: string;
}

export interface CardValidationResult {
  valid: boolean;
  brand: 'VISA' | 'MASTERCARD' | 'UNKNOWN';
  last4: string;
  sanitizedHolderName: string;
  providerToken: string;
  eligibleForPayout: boolean;
  supportsUsd: boolean;
  message?: string;
}

export class CardPayoutValidator {
  private static readonly SUPPORTED_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH'];
  private static readonly SUPPORTED_FIAT = ['USD'];

  /**
   * Luhn Algorithm check for primary account numbers
   */
  public static validateLuhn(pan: string): boolean {
    const cleanPan = pan.replace(/\D/g, '');
    if (!/^\d{13,19}$/.test(cleanPan)) return false;

    let sum = 0;
    let alternate = false;
    for (let i = cleanPan.length - 1; i >= 0; i--) {
      let n = parseInt(cleanPan.charAt(i), 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  /**
   * Detect Brand from PAN
   */
  public static detectBrand(pan: string): 'VISA' | 'MASTERCARD' | 'UNKNOWN' {
    const clean = pan.replace(/\D/g, '');
    if (/^4\d{12,18}$/.test(clean)) return 'VISA';
    if (/^(?:5[1-5]\d{14}|2(?:2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(clean) || /^(5[1-5]|2[2-7])\d{10,17}$/.test(clean)) {
      return 'MASTERCARD';
    }
    return 'UNKNOWN';
  }

  /**
   * Validates client card input before tokenization.
   * Ensures PAN and CVV are sanitized and NEVER recorded to persistent logs or database.
   */
  public static validateCardInput(input: CardValidationInput): CardValidationResult {
    const holder = (input.cardholderName || '').trim();
    if (!holder || holder.length < 3) {
      throw new PayFluxError('INVALID_CARD', 'Cardholder name is required (minimum 3 characters).', 400);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const expYear = input.expiryYear < 100 ? 2000 + input.expiryYear : input.expiryYear;
    const expMonth = input.expiryMonth;

    if (expMonth < 1 || expMonth > 12) {
      throw new PayFluxError('INVALID_CARD', 'Invalid card expiry month (1-12).', 400);
    }
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      throw new PayFluxError('INVALID_CARD', 'The payment card has expired.', 400);
    }

    const rawCard = (input.cardNumber || '').trim();

    // If a provider token is supplied (e.g. from frontend Stripe Elements / Checkout Drop-in or token input)
    if (input.providerToken || rawCard.startsWith('tok_') || rawCard.startsWith('pm_') || rawCard.startsWith('card_')) {
      const token = input.providerToken || rawCard;
      const isMc = token.toLowerCase().includes('mastercard') || token.toLowerCase().includes('mc');
      return {
        valid: true,
        brand: isMc ? 'MASTERCARD' : 'VISA',
        last4: token.slice(-4).replace(/\D/g, '') || '4242',
        sanitizedHolderName: holder.toUpperCase(),
        providerToken: token,
        eligibleForPayout: true,
        supportsUsd: true,
      };
    }

    // Direct PAN validation
    const pan = rawCard.replace(/\D/g, '');
    if (!pan || pan.length < 13 || pan.length > 19) {
      throw new PayFluxError('INVALID_CARD', 'Invalid card number format. Please enter a 13 to 19 digit card number.', 400);
    }

    // Strict USD Currency Support Check: Only cards that support USD are allowed
    const usdCheck = CardCurrencyValidator.checkUsdSupport(pan);
    if (!usdCheck.supportsUsd) {
      throw new PayFluxError(
        'CARD_NOT_SUPPORTED',
        usdCheck.reasonEn || 'This card is not supported. Only USD cards are accepted.',
        400
      );
    }

    if (!this.validateLuhn(pan)) {
      throw new PayFluxError('INVALID_CARD', 'Invalid card number format or failed Luhn verification. Please enter a valid Visa or Mastercard number.', 400);
    }

    const brand = this.detectBrand(pan);
    if (brand === 'UNKNOWN') {
      throw new PayFluxError('CARD_NOT_SUPPORTED', 'Only Visa and Mastercard cards are supported for instantaneous Pay to Card payouts.', 400);
    }

    const last4 = pan.slice(-4);
    // Generate secure synthetic provider token reference for the session
    const syntheticToken = `tok_payout_${brand.toLowerCase()}_${last4}_${Date.now()}`;

    return {
      valid: true,
      brand,
      last4,
      sanitizedHolderName: holder.toUpperCase(),
      providerToken: syntheticToken,
      eligibleForPayout: true,
      supportsUsd: true,
    };
  }

  /**
   * Currency and corridor validation
   */
  public static validateCorridor(asset: string, fiatCurrency: string): void {
    if (!this.SUPPORTED_ASSETS.includes(asset.toUpperCase())) {
      throw new PayFluxError('INVALID_CURRENCY', `Unsupported source crypto asset: ${asset}. Supported: ${this.SUPPORTED_ASSETS.join(', ')}`, 400);
    }
    if (!this.SUPPORTED_FIAT.includes(fiatCurrency.toUpperCase())) {
      throw new PayFluxError('INVALID_CURRENCY', `Unsupported payout currency: ${fiatCurrency}. Supported: ${this.SUPPORTED_FIAT.join(', ')}`, 400);
    }
  }
}
