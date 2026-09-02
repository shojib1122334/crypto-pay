import jsPDF from 'jspdf';

export interface CryptoPayInvoiceData {
  id: string;
  storeName: string;
  productName: string;
  productImage: string | null;
  network: 'Polygon' | 'Ethereum';
  networkChainId: number;
  paymentMethod: 'USDT' | 'USDC' | 'VERSE';
  amount: string;
  status: 'Pending' | 'Paid';
  receiverAddress: string;
  tokenContractAddress: string;
  tokenDecimals: number;
  createdAt: number;
  txHash?: string;
  paidAt?: string;
  verifiedBlock?: number;
}

export const INVOICES_STORAGE_KEY = 'cryptopay_created_invoices';

/**
 * Retrieve all saved credit invoices.
 */
export function getSavedInvoices(): CryptoPayInvoiceData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load invoices:', err);
    return [];
  }
}

/**
 * Save or update an invoice in the persistent store and dispatch reactive event.
 */
export function saveInvoiceRecord(invoice: CryptoPayInvoiceData): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedInvoices();
    const filtered = existing.filter((item) => item.id !== invoice.id);
    const updated = [invoice, ...filtered];
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch global event for live component sync
    window.dispatchEvent(
      new CustomEvent('cryptopay_invoices_update', { detail: invoice })
    );
  } catch (err) {
    console.warn('Failed to save invoice record:', err);
  }
}

/**
 * Mark an invoice as Paid/Verified and link its transaction hash.
 */
export function markInvoiceAsPaid(
  invoiceId: string,
  txHash: string,
  verifiedBlock?: number
): CryptoPayInvoiceData | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getSavedInvoices();
    const target = existing.find((item) => item.id === invoiceId);
    if (!target) return null;

    const updatedInvoice: CryptoPayInvoiceData = {
      ...target,
      status: 'Paid',
      txHash,
      paidAt: new Date().toISOString(),
      verifiedBlock: verifiedBlock || target.verifiedBlock,
    };

    saveInvoiceRecord(updatedInvoice);
    return updatedInvoice;
  } catch (err) {
    console.warn('Failed to mark invoice as paid:', err);
    return null;
  }
}

/**
 * Generates an official, high-resolution downloadable PDF Invoice for the merchant and customer.
 */
export function generateInvoicePdf(invoice: CryptoPayInvoiceData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Palette
  const primaryNavy = [15, 23, 42]; // #0f172a
  const accentBlue = [37, 99, 235]; // #2563eb
  const successGreen = [16, 185, 129]; // #10b981
  const pendingAmber = [245, 158, 11]; // #f59e0b
  const slateDark = [51, 65, 85]; // #334155
  const slateLight = [241, 245, 249]; // #f1f5f9
  const borderGray = [226, 232, 240]; // #e2e8f0

  const isPaid = invoice.status === 'Paid';

  // 1. Header Banner
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // App & Store Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(invoice.storeName || 'CryptoPay Merchant', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Web3 Credit Invoice & Settlement', 20, 30);

  // Status Badge on Header Right
  if (isPaid) {
    doc.setFillColor(successGreen[0], successGreen[1], successGreen[2]);
    doc.roundedRect(pageWidth - 70, 16, 50, 13, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAID / VERIFIED', pageWidth - 65, 24.5);
  } else {
    doc.setFillColor(pendingAmber[0], pendingAmber[1], pendingAmber[2]);
    doc.roundedRect(pageWidth - 70, 16, 50, 13, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENT PENDING', pageWidth - 65, 24.5);
  }

  // 2. Invoice Meta Details
  let y = 60;
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TAX / CREDIT INVOICE', 20, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice ID: #${invoice.id}`, pageWidth - 20, y, { align: 'right' });

  y += 7;
  const dateStr = new Date(invoice.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 20, y, { align: 'right' });

  // 3. Amount & Product Highlight Card
  y += 10;
  doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(20, y, pageWidth - 40, 32, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Invoice Amount', 28, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.text(`${invoice.amount} ${invoice.paymentMethod}`, 28, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(
    `Network: ${invoice.network} (Chain ID: ${invoice.networkChainId})`,
    pageWidth - 28,
    y + 15,
    { align: 'right' }
  );
  doc.text(
    `Status: ${isPaid ? 'Paid & Verified On-Chain' : 'Pending Settlement'}`,
    pageWidth - 28,
    y + 23,
    { align: 'right' }
  );

  // 4. Line Items / Product Breakdown
  y += 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Line Item Specifications', 20, y);

  const renderRow = (label: string, value: string, isMono = false) => {
    y += 10;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(20, y - 4, pageWidth - 20, y - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, y + 2);

    doc.setFont(isMono ? 'courier' : 'helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    if (value.length > 44) {
      const part1 = value.slice(0, 40) + '...';
      doc.text(part1, pageWidth - 20, y + 2, { align: 'right' });
    } else {
      doc.text(value, pageWidth - 20, y + 2, { align: 'right' });
    }
  };

  renderRow('Store / Merchant Name', invoice.storeName);
  renderRow('Product / Service Name', invoice.productName);
  renderRow('Payment Token', `${invoice.paymentMethod} (Decimals: ${invoice.tokenDecimals})`);
  renderRow('Settlement Network', invoice.network);
  renderRow('Merchant Receiver Wallet', invoice.receiverAddress, true);
  renderRow('Token Contract Address', invoice.tokenContractAddress, true);

  if (invoice.txHash) {
    renderRow('Verified Transaction Hash', invoice.txHash, true);
  }
  if (invoice.paidAt) {
    const paidDate = new Date(invoice.paidAt).toLocaleString('en-US');
    renderRow('Paid & Verified Date', paidDate);
  }
  if (invoice.verifiedBlock) {
    renderRow('Block Confirmation Height', `#${invoice.verifiedBlock}`);
  }

  // 5. Web3 Settlement Audit & Security Notice
  y += 20;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(20, y, pageWidth - 40, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Cryptographic Settlement & Verification Guarantee', 26, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This credit invoice is issued via CryptoPay decentralized point-of-sale infrastructure.',
    26,
    y + 16
  );
  if (invoice.txHash) {
    const explorer =
      invoice.network === 'Polygon'
        ? `https://polygonscan.com/tx/${invoice.txHash}`
        : `https://etherscan.io/tx/${invoice.txHash}`;
    doc.text(`On-Chain Verification Explorer: ${explorer}`, 26, y + 23);
  } else {
    doc.text(
      'Scan the generated QR code with any Web3 wallet to settle the exact amount.',
      26,
      y + 23
    );
  }
  doc.text(
    `Security Protocol: Non-custodial direct peer-to-peer settlement with zero intermediaries.`,
    26,
    y + 30
  );

  // 6. Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CryptoPay POS • Empowering Decentralized Commerce', pageWidth / 2, 282, {
    align: 'center',
  });

  // Trigger download
  const filename = `CryptoPay-Invoice-${invoice.id}-${invoice.paymentMethod}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official PDF for a Recurring Subscription Invoice
 */
export function generateSubscriptionInvoicePdf(subInvoice: {
  id: string;
  storeName: string;
  subscriberName: string;
  subscriberEmail?: string;
  serviceName: string;
  billingFrequency: 'Weekly' | 'Monthly' | 'Yearly';
  amount: string;
  paymentToken: 'USDT' | 'USDC' | 'VERSE';
  receiverAddress: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  startDate: string;
  nextPaymentDate: string;
  totalPaidCount?: number;
}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryNavy = [15, 23, 42]; // #0F172A
  const slateDark = [30, 41, 59]; // #1E293B
  const blueAccent = [29, 78, 216]; // #1D4ED8
  const emeraldAccent = [5, 150, 105]; // #059669
  const borderGray = [226, 232, 240]; // #E2E8F0

  // 1. Header Banner
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('CRYPTOPAY SUBSCRIPTION INVOICE', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Recurring Web3 Billing Schedule • Polygon Mainnet', 20, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153);
  doc.text(`PLAN STATUS: ${subInvoice.status.toUpperCase()}`, pageWidth - 20, 22, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`ID: #${subInvoice.id}`, pageWidth - 20, 30, { align: 'right' });

  // 2. Summary Cards
  let y = 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(20, y, 80, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('RECURRING AMOUNT', 26, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.text(`${subInvoice.amount} ${subInvoice.paymentToken} / ${subInvoice.billingFrequency}`, 26, y + 22);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, y, pageWidth - 130, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('NEXT PAYMENT DATE', 116, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.text(subInvoice.nextPaymentDate, 116, y + 22);

  // 3. Line Item Details
  y += 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Subscription Billing Specifications', 20, y);

  const renderRow = (label: string, value: string, isMono = false) => {
    y += 10;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(20, y - 4, pageWidth - 20, y - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, y + 2);

    doc.setFont(isMono ? 'courier' : 'helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    if (value.length > 44) {
      const part1 = value.slice(0, 40) + '...';
      doc.text(part1, pageWidth - 20, y + 2, { align: 'right' });
    } else {
      doc.text(value, pageWidth - 20, y + 2, { align: 'right' });
    }
  };

  renderRow('Merchant / Store Name', subInvoice.storeName);
  renderRow('Subscriber / Customer', subInvoice.subscriberName);
  if (subInvoice.subscriberEmail) {
    renderRow('Subscriber Contact', subInvoice.subscriberEmail);
  }
  renderRow('Service Plan', subInvoice.serviceName);
  renderRow('Billing Frequency', `${subInvoice.billingFrequency} Recurring Cycle`);
  renderRow('Payment Token', `${subInvoice.paymentToken} (Polygon Mainnet)`);
  renderRow('Merchant Receiver Wallet', subInvoice.receiverAddress, true);
  renderRow('Subscription Start Date', subInvoice.startDate);
  renderRow('Next Scheduled Payment', subInvoice.nextPaymentDate);

  // 4. Security & Protocol
  y += 20;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(20, y, pageWidth - 40, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Decentralized Subscription Verification Guarantee', 26, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This subscription invoice is registered on CryptoPay Web3 infrastructure.',
    26,
    y + 16
  );
  doc.text(
    `Settlement: Direct peer-to-peer token transfers to the merchant receiver wallet.`,
    26,
    y + 23
  );
  doc.text(
    `Security Protocol: Non-custodial, verified on Polygon blockchain (Chain ID 137).`,
    26,
    y + 30
  );

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CryptoPay POS • Decentralized Subscription Invoicing', pageWidth / 2, 282, {
    align: 'center',
  });

  doc.save(`CryptoPay-Subscription-${subInvoice.id}.pdf`);
}

