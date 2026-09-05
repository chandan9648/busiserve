import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { razorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/order";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in before making a payment.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const planName = String(body.planName ?? "").trim();

    if (!planName) {
      return NextResponse.json(
        {
          error: "Plan is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    const { data: plan, error: planError } = await admin
      .from("pricing_plans")
      .select("*")
      .eq("name", planName)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        {
          error: "Selected plan was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const amount = Number(plan.monthly_price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Invalid plan amount.",
        },
        {
          status: 400,
        }
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
        user_id: user.id,
      },
    });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        plan_id: plan.id,
        plan_name: plan.name,
        amount,
        currency: "INR",
        razorpay_order_id: razorpayOrder.id,
        status: "created",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Supabase order error:", orderError);

      return NextResponse.json(
        {
          error: "Unable to create order.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: razorpayOrder.id,
        amount,
        currency: "INR",
        planName: plan.name,
      },

      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    return NextResponse.json(
      {
        error: "Unable to create payment order.",
      },
      {
        status: 500,
      }
    );
  }
}