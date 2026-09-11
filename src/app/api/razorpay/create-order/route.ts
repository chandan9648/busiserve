import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { razorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/order";
import { pricingPlans } from "@/lib/site-data";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "You must be logged in before making a payment." },
        { status: 401 }
      );
    }

    const user = await getAdminAuth().verifyIdToken(token);
    const body = await request.json();
    const planName = String(body.planName ?? "").trim();

    if (!planName) {
      return NextResponse.json(
        { error: "Plan is required." },
        { status: 400 }
      );
    }

    const plan = pricingPlans.find((item) => item.name === planName);

    if (!plan) {
      return NextResponse.json(
        { error: "Selected plan was not found." },
        { status: 404 }
      );
    }

    const amount = Number(plan.monthly);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid plan amount." },
        { status: 400 }
      );
    }

    const orderNumber = generateOrderNumber();

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: orderNumber,
      notes: {
        order_number: orderNumber,
        plan_name: plan.name,
        user_id: user.uid,
      },
    });

    const orderDocument = await getAdminDb().collection("orders").add({
      user_id: user.uid,
      order_number: orderNumber,
      plan_id: plan.name,
      plan_name: plan.name,
      amount,
      currency: "INR",
      razorpay_order_id: razorpayOrder.id,
      status: "created",
      customer_email: user.email ?? null,
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      order: {
        id: orderDocument.id,
        orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount,
        currency: "INR",
        planName: plan.name,
      },
      razorpayKeyId:
        process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    return NextResponse.json(
      { error: "Unable to create payment order." },
      { status: 500 }
    );
  }
}