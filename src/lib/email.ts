import { Resend } from "resend";

interface InvoiceEmailData {
  to: string;
  invoiceNumber: string;
  orderNumber: string;
  planName: string;
  amount: number;
  currency: string;
  pdfBuffer: Buffer;
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendInvoiceEmail(data: InvoiceEmailData) {
  const resend = getResend();

  const from =
    process.env.INVOICE_FROM_EMAIL?.trim() ||
    "onboarding@resend.dev";

  const result = await resend.emails.send({
    from: `BusiServe <${from}>`,

    to: [data.to],

    subject: `Payment Successful – Invoice ${data.invoiceNumber}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h1 style="color:#001b40;">
          BusiServe
        </h1>

        <h2>
          Payment Successful
        </h2>

        <p>
          Thank you for your payment.
          Your order has been successfully processed.
        </p>

        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px;">
              Invoice Number
            </td>
            <td style="padding:8px;">
              <strong>${escapeHtml(data.invoiceNumber)}</strong>
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Order Number
            </td>
            <td style="padding:8px;">
              ${escapeHtml(data.orderNumber)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Plan
            </td>
            <td style="padding:8px;">
              ${escapeHtml(data.planName)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Amount
            </td>
            <td style="padding:8px;">
              ${escapeHtml(data.currency)} ${data.amount.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Status
            </td>
            <td style="padding:8px; color:green;">
              <strong>PAID</strong>
            </td>
          </tr>
        </table>

        <p style="margin-top:30px;">
          Your invoice PDF is attached to this email.
        </p>

        <p>
          Regards,<br/>
          <strong>BusiServe Team</strong>
        </p>
      </div>
    `,

    attachments: [
      {
        filename: `${data.invoiceNumber}.pdf`,
        content: data.pdfBuffer.toString("base64"),
      },
    ],
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}