import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { razorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/order";
import { PLANS } from "@/lib/portal/plans";

/*
 * The plans are resolved from PLANS, the same record the pricing
 * page and the dashboard price from.
 *
 * This route used to price from `pricingPlans` in site-data, a
 * second and older list. The two had drifted: a plan named "Scale"
 * existed in both, advertised at one price on /pricing and charged
 * at another here. A website that can charge an amount it does not
 * advertise is a transparency problem before it is a bug, so there
 * is now one source of truth for what a plan costs.
 */
const findPlan = (name: string) =>
  Object.values(PLANS).find(
    (plan) =>
      plan.name.toLowerCase() === name.toLowerCase() ||
      plan.id === name.toLowerCase(),
  );

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

    const plan = findPlan(planName);

    if (!plan) {
      return NextResponse.json(
        { error: "Selected plan was not found." },
        { status: 404 }
      );
    }

    // PLANS holds the price in the currency's smallest unit (cents).
    // The gateway is charged that figure directly; the order record
    // and the invoice keep the major-unit amount they already used.
    const amount = plan.amount / 100;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid plan amount." },
        { status: 400 }
      );
    }

    const orderNumber = generateOrderNumber();

    const razorpayOrder = await razorpay.orders.create({
      amount: plan.amount,
      currency: "USD",
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
      plan_id: plan.id,
      plan_name: plan.name,
      amount,
      currency: "USD",
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
        currency: "USD",
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