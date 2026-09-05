import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/order";

// Note: This route requires Supabase or Firebase Auth and database setup
// Currently stubbed pending backend implementation

export async function POST(request: Request) {
  try {
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

    // TODO: Implement with your authentication provider
    // const supabase = await createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // For now, return a stub response
    return NextResponse.json(
      {
        error: "Payment verification service not yet configured.",
      },
      {
        status: 503,
      }
    );
  } catch (error) {
    console.error("Verify payment error:", error);

    return NextResponse.json(
      {
        error: "Payment verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}
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