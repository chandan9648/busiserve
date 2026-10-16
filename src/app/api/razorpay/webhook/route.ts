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
      updated_at: new Date(),
    };

    /*
     * A paid order is never downgraded by a later event.
     *
     * Webhooks are retried and are not guaranteed to arrive in
     * order, so `payment.authorized` can land after
     * `payment.captured`. The previous version wrote the status for
     * whichever event arrived last, which turned a paid order into
     * "updated" — a customer who had paid, and whose verification
     * had already succeeded, would show as unpaid in their own
     * records. Replaying the same event is now also a no-op rather
     * than a rewrite.
     */
    const alreadyPaid =
      orderDocument.get("status") === "paid" ||
      orderDocument.get("payment_status") === "paid";

    if (isSuccessful) {
      update.status = "paid";
      update.payment_status = "paid";
    } else if (!alreadyPaid) {
      const state = event.event === "payment.failed" ? "failed" : "updated";

      update.status = state;
      update.payment_status = state;
    }

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