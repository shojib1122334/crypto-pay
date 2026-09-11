// Card Currency & USD Support Validator
// Enforces the strict rule: Only cards that support USD are accepted.
// Domestic-only or non-USD cards (RuPay, Mir, Elo, restricted domestic BINs) are rejected.

export interface CardCurrencyCheckResult {
  cardNumberClean: string;
  bin: string;
  brand: 'VISA' | 'MASTERCARD' | 'RUPAY' | 'MIR' | 'ELO' | 'UNIONPAY' | 'UNKNOWN';
  supportsUsd: boolean;
  cardCurrency: string;
  status: 'SUPPORTED' | 'REJECTED';
  statusTextBn: string;
  statusTextEn: string;
  reasonBn: string;
  reasonEn: string;
}

export class CardCurrencyValidator {
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
        if (n > 9) n = (n % 10) + 1;
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
   * Checks whether a card number supports USD payouts.
   * If the card is domestic-only, non-USD, or unsupported, returns supportsUsd = false.
   */
  public static checkUsdSupport(cardNumber: string): CardCurrencyCheckResult {
    const clean = (cardNumber || '').replace(/\D/g, '');
    const bin = clean.slice(0, 8);
    const bin6 = clean.slice(0, 6);

    // If less than 6 digits, we cannot reliably inspect the BIN yet
    if (clean.length < 6) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'UNKNOWN',
        supportsUsd: false,
        cardCurrency: 'UNKNOWN',
        status: 'REJECTED',
        statusTextBn: 'কমপক্ষে ৬ ডিজিট প্রদান করুন',
        statusTextEn: 'Enter at least 6 digits',
        reasonBn: 'কার্ডের কারেন্সি এবং USD সাপোর্ট যাচাই করতে কার্ডের প্রথম ৬-৮ ডিজিট প্রয়োজন।',
        reasonEn: 'Card BIN check requires at least 6 digits.',
      };
    }

    // 1. RuPay Domestic Cards (India - INR only, does NOT support USD)
    if (/^(508|60|6521|6522)/.test(clean)) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'RUPAY',
        supportsUsd: false,
        cardCurrency: 'INR',
        status: 'REJECTED',
        statusTextBn: 'USD সাপোর্ট করে না (বাতিল)',
        statusTextEn: 'USD Not Supported (Rejected)',
        reasonBn: 'এই কার্ডটি RuPay লোকাল/ডোমেস্টিক (INR) নেটওয়ার্কের এবং USD কারেন্সি সাপোর্ট করে না। এই কার্ডটি বাতিল করা হয়েছে।',
        reasonEn: 'This card is on the domestic RuPay (INR) rail and does not support USD cross-border payouts.',
      };
    }

    // 2. Mir Cards (Russia - RUB only, does NOT support USD)
    if (/^220[0-4]/.test(clean)) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'MIR',
        supportsUsd: false,
        cardCurrency: 'RUB',
        status: 'REJECTED',
        statusTextBn: 'USD সাপোর্ট করে না (বাতিল)',
        statusTextEn: 'USD Not Supported (Rejected)',
        reasonBn: 'এই কার্ডটি Mir নেটওয়ার্কের (RUB) এবং এতে USD সাপোর্ট নেই। এই কার্ডটি বাতিল করা হয়েছে।',
        reasonEn: 'This card is on the Mir (RUB) network and does not support USD transactions.',
      };
    }

    // 3. Elo Domestic Cards (Brazil - BRL only, does NOT support USD)
    if (/^(4011|5067|5090|6363)/.test(clean)) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'ELO',
        supportsUsd: false,
        cardCurrency: 'BRL',
        status: 'REJECTED',
        statusTextBn: 'USD সাপোর্ট করে না (বাতিল)',
        statusTextEn: 'USD Not Supported (Rejected)',
        reasonBn: 'এই কার্ডটি Elo ডোমেস্টিক নেটওয়ার্কের (BRL) এবং USD কারেন্সি সমর্থন করে না। এটি বাতিল করা হয়েছে।',
        reasonEn: 'This card is an Elo domestic rail (BRL) card and does not support USD transactions.',
      };
    }

    // 4. Specific known Non-USD domestic BIN ranges (Local currency only, USD blocked)
    if (['492181', '504181', '490300', '491101'].includes(bin6)) {
      const isVisa = clean.startsWith('4');
      return {
        cardNumberClean: clean,
        bin,
        brand: isVisa ? 'VISA' : 'MASTERCARD',
        supportsUsd: false,
        cardCurrency: 'LOCAL_NON_USD',
        status: 'REJECTED',
        statusTextBn: 'USD সাপোর্ট করে না (বাতিল)',
        statusTextEn: 'USD Not Supported (Rejected)',
        reasonBn: 'এই কার্ডটি একটি ডোমেস্টিক নন-ইউএসডি কার্ড (Local Currency Only)। এতে USD পে-আউট বা ফরেন কারেন্সি সাপোর্ট নেই, তাই এটি বাতিল।',
        reasonEn: 'This card is restricted to domestic local currency only and does not support USD settlement.',
      };
    }

    // 5. Visa Cards (Checking USD eligibility)
    if (clean.startsWith('4')) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'VISA',
        supportsUsd: true,
        cardCurrency: 'USD',
        status: 'SUPPORTED',
        statusTextBn: 'USD সমর্থিত (গৃহীত)',
        statusTextEn: 'USD Supported (Accepted)',
        reasonBn: 'কার্ডটি Visa আন্তর্জাতিক নেটওয়ার্কের অন্তর্ভুক্ত এবং USD কারেন্সি ও Visa Direct পে-আউট সাপোর্ট করে।',
        reasonEn: 'This card is on the international Visa network and fully supports USD payouts via Visa Direct.',
      };
    }

    // 6. Mastercard (Checking USD eligibility)
    if (/^(5[1-5]|2[2-7])/.test(clean)) {
      return {
        cardNumberClean: clean,
        bin,
        brand: 'MASTERCARD',
        supportsUsd: true,
        cardCurrency: 'USD',
        status: 'SUPPORTED',
        statusTextBn: 'USD সমর্থিত (গৃহীত)',
        statusTextEn: 'USD Supported (Accepted)',
        reasonBn: 'কার্ডটি Mastercard আন্তর্জাতিক নেটওয়ার্কের অন্তর্ভুক্ত এবং USD কারেন্সি ও Mastercard Send পে-আউট সাপোর্ট করে।',
        reasonEn: 'This card is on the international Mastercard network and fully supports USD payouts via Mastercard Send.',
      };
    }

    // 7. Any other unknown or unsupported card brands
    return {
      cardNumberClean: clean,
      bin,
      brand: 'UNKNOWN',
      supportsUsd: false,
      cardCurrency: 'UNKNOWN',
      status: 'REJECTED',
      statusTextBn: 'USD সাপোর্ট করে না (বাতিল)',
      statusTextEn: 'USD Not Supported (Rejected)',
      reasonBn: 'শুধুমাত্র USD সমর্থিত Visa অথবা Mastercard গ্রহণযোগ্য। এই কার্ডটি USD সাপোর্ট করে না এবং বাতিল করা হয়েছে।',
      reasonEn: 'Only USD-supported Visa or Mastercard cards are accepted. This card is unsupported and rejected.',
    };
  }
}
