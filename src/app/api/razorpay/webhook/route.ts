import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { recordThreat } from "@/lib/security/events";

// Note: This webhook requires database setup to process payments
// Currently stubbed to accept and log events

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        {
          error: "Missing Razorpay signature.",
        },
        {
          status: 400,
        }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (
      expectedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      )
    ) {
      // A webhook whose HMAC does not match the shared secret is an
      // attempt to mark an unpaid order as paid. Logged for the
      // security console; the rejection below is unchanged.
      void recordThreat("forged-webhook", request);

      return NextResponse.json(
        {
          error: "Invalid webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    const event = JSON.parse(rawBody);

    const payment = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const razorpayOrderId = payment?.order_id ?? orderEntity?.id;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true });
    }

    const snapshot = await getAdminDb()
      .collection("orders")
      .where("razorpay_order_id", "==", razorpayOrderId)
      .limit(1)
      .get();
    const orderDocument = snapshot.docs[0];

    if (!orderDocument) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const isSuccessful = ["payment.captured", "order.paid"].includes(event.event);
    const update: Record<string, unknown> = {
      status: isSuccessful ? "paid" : event.event === "payment.failed" ? "failed" : "updated",
      payment_status: isSuccessful ? "paid" : event.event === "payment.failed" ? "failed" : "updated",
      updated_at: new Date(),
    };

    if (payment?.id) update.razorpay_payment_id = payment.id;
    if (payment?.error_description) update.payment_error = payment.error_description;
    await orderDocument.ref.update(update);

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}