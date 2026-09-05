// Utility functions for invoice generation and handling
// This file is for utility functions only - route handlers should be in api routes

import { generateInvoiceNumber } from "@/lib/order";
import { sendInvoiceEmail } from "@/lib/email";

/**
 * Generate an invoice PDF buffer
 * @param params Invoice parameters
 * @returns PDF buffer
 */
export async function generateInvoicePdf(params: {
  invoiceNumber: string;
  orderNumber: string;
  planName: string;
  amount: number;
  currency: string;
  paymentId: string;
  customerEmail: string;
}): Promise<Buffer> {
  // Placeholder implementation - integrate with a PDF generation library like pdfkit or puppeteer
  // For now, returning empty buffer
  return Buffer.alloc(0);
}

/**
 * Format invoice details for display
 */
export function formatInvoice(invoice: {
  invoiceNumber: string;
  orderNumber: string;
  amount: number;
  currency: string;
  createdAt: Date;
}) {
  return {
    ...invoice,
    formattedAmount: `${invoice.currency} ${invoice.amount.toFixed(2)}`,
    formattedDate: invoice.createdAt.toLocaleDateString(),
  };
}