import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

interface InvoiceEmailData {
  to: string;
  invoiceNumber: string;
  orderNumber: string;
  planName: string;
  amount: number;
  currency: string;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(
  data: InvoiceEmailData
) {
  const from =
    process.env.INVOICE_FROM_EMAIL ||
    "onboarding@resend.dev";

  const result = await resend.emails.send({
    from: `BusiServe <${from}>`,

    to: [data.to],

    subject:
      `Payment Successful – Invoice ${data.invoiceNumber}`,

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
              <strong>
                ${data.invoiceNumber}
              </strong>
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Order Number
            </td>

            <td style="padding:8px;">
              ${data.orderNumber}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Plan
            </td>

            <td style="padding:8px;">
              ${data.planName}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;">
              Amount
            </td>

            <td style="padding:8px;">
              ${data.currency} ${data.amount.toFixed(2)}
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
        filename:
          `${data.invoiceNumber}.pdf`,

        content:
          data.pdfBuffer.toString("base64"),
      },
    ],
  });

  if (result.error) {
    throw new Error(
      result.error.message
    );
  }

  return result;
}