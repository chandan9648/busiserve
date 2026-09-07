import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { generateInvoiceNumber } from "@/lib/order";
import { generateInvoicePdf } from "@/lib/invoice";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const user = await getAdminAuth().verifyIdToken(token);
    const body = await request.json();

    const paymentId = String(body.razorpay_payment_id ?? "").trim();
    const razorpayOrderId = String(body.razorpay_order_id ?? "").trim();
    const signature = String(body.razorpay_signature ?? "").trim();

    if (!paymentId || !razorpayOrderId || !signature) {
      return NextResponse.json(
        { error: "Incomplete Razorpay payment data." },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is not configured.");

      return NextResponse.json(
        { error: "Payment verification is not configured." },
        { status: 500 }
      );
    }

    const snapshot = await getAdminDb()
      .collection("orders")
      .where("razorpay_order_id", "==", razorpayOrderId)
      .limit(1)
      .get();

    const orderDocument = snapshot.docs[0];

    if (!orderDocument) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const order = orderDocument.data();

    if (order.user_id !== user.uid) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${order.razorpay_order_id}|${paymentId}`)
      .digest("hex");

    if (
      !/^[a-f0-9]{64}$/i.test(signature) ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(signature, "hex")
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment signature." },
        { status: 400 }
      );
    }

    const invoiceNumber =
      order.invoice_number ?? generateInvoiceNumber();

    await orderDocument.ref.update({
      status: "paid",
      payment_status: "paid",
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      invoice_number: invoiceNumber,
      paid_at: new Date(),
    });

    if (
      order.customer_email &&
      process.env.RESEND_API_KEY &&
      !order.invoice_sent
    ) {
      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber,
        orderNumber: order.order_number,
        planName: order.plan_name,
        amount: order.amount,
        currency: order.currency,
        paymentId,
        customerEmail: order.customer_email,
      });

      await sendInvoiceEmail({
        to: order.customer_email,
        invoiceNumber,
        orderNumber: order.order_number,
        planName: order.plan_name,
        amount: order.amount,
        currency: order.currency,
        pdfBuffer,
      });

      await orderDocument.ref.update({
        invoice_sent: true,
      });
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 500 }
    );
  }
}