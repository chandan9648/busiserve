"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (
      options: RazorpayOptions
    ) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;

  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };

  theme?: {
    color?: string;
  };

  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
}

interface RazorpayInstance {
  open: () => void;
}

interface Props {
  planName: string;
}

export default function RazorpayCheckout({
  planName,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function loadRazorpay() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  async function handlePayment() {
    try {
      setLoading(true);

      const loaded = await loadRazorpay();

      if (!loaded) {
        alert(
          "Unable to load Razorpay. Please try again."
        );

        return;
      }

      const response = await fetch(
        "/api/razorpay/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            planName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create order."
        );
      }

      const options: RazorpayOptions = {
        key: data.razorpayKeyId,

        amount:
          Math.round(
            data.order.amount * 100
          ),

        currency: data.order.currency,

        name: "BusiServe",

        description:
          `${data.order.planName} Plan`,

        order_id:
          data.order.razorpayOrderId,

        theme: {
          color: "#ff8927",
        },

        handler: async (payment) => {
          try {
            const verifyResponse =
              await fetch(
                "/api/razorpay/verify-payment",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify(
                    payment
                  ),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.error ||
                  "Payment verification failed."
              );
            }

            router.push(
              `/payment/success?order=${encodeURIComponent(
                data.order.orderNumber
              )}`
            );
          } catch (error) {
            console.error(error);

            alert(
              "Payment received, but verification is still processing. Please check your dashboard."
            );
          }
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to start payment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={loading}
      className="w-full rounded-md bg-[#ff8927] px-5 py-3 font-semibold text-white transition hover:bg-[#964900] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading
        ? "Processing..."
        : `Pay for ${planName}`}
    </button>
  );
}