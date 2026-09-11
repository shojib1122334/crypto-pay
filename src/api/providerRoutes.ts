// Payment Provider Integration Routes (Transak & Ramp) (Spec 6, 28)

import { Router } from 'express';
import { ProviderRouter } from '../providers/payment/ProviderRouter.js';

export const providerRouter = Router();

// 1. GET /api/provider/quote
// Fetches quote from selected provider (Transak or Ramp)
providerRouter.get('/quote', async (req, res) => {
  try {
    const { provider, cryptoCurrency, fiatCurrency, fiatAmount, cryptoAmount, walletAddress } = req.query;

    const selectedProviderName = (provider as 'transak' | 'ramp') || 'transak';
    const providerInstance = ProviderRouter.getProvider(selectedProviderName);

    const quote = await providerInstance.getQuote({
      walletAddress: (walletAddress as string) || '0x0000000000000000000000000000000000000000',
      cryptoCurrency: (cryptoCurrency as string) || 'USDC',
      fiatCurrency: (fiatCurrency as string) || 'USD',
      fiatAmount: fiatAmount ? parseFloat(fiatAmount as string) : undefined,
      cryptoAmount: cryptoAmount ? parseFloat(cryptoAmount as string) : undefined,
      paymentMethod: 'credit_debit_card',
    });

    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch provider quote' });
  }
});

// 2. POST /api/provider/order
// Generates an order / redirect URL for Transak or Ramp
providerRouter.post('/order', async (req, res) => {
  try {
    const { provider, paymentId, walletAddress, cryptoCurrency, fiatCurrency, fiatAmount, cardLast4, cardholderName } =
      req.body;

    const selectedProviderName = (provider as 'transak' | 'ramp') || 'transak';
    const providerInstance = ProviderRouter.getProvider(selectedProviderName);

    const orderResult = await providerInstance.createOrder({
      paymentId,
      walletAddress,
      cryptoCurrency,
      fiatCurrency,
      fiatAmount: Number(fiatAmount),
      cardLast4,
      cardholderName,
    });

    res.json(orderResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create provider order' });
  }
});

// 3. POST /api/webhooks/:provider
// Handles inbound webhooks from Transak or Ramp
providerRouter.post('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    console.log(`Received webhook from ${provider}:`, req.body);
    // Return 200 OK immediately for provider delivery receipt
    res.status(200).json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
