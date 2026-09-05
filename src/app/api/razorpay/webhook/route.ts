import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

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

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      )
    ) {
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

    // Log the event for debugging
    console.log("Razorpay webhook event:", event);

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;

      if (!payment) {
        return NextResponse.json({
          received: true,
        });
      }

      // TODO: Process payment with Firebase Admin or your database
      // For now, just acknowledge the webhook
      console.log("Payment captured:", payment.id);
    }

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
      {
        error: "Webhook failed.",
      },
      {
        status: 500,
      }
    );
  }
}