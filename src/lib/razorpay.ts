import "server-only";

import Razorpay from "razorpay";

let razorpayClient: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (razorpayClient) {
    return razorpayClient;
  }

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and " +
        "RAZORPAY_KEY_SECRET in the deployment environment.",
    );
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

/*
 * Preserve existing imports:
 *
 * import { razorpay } from "@/lib/razorpay";
 *
 * The actual client is created only when its properties
 * or methods are accessed.
 */
export const razorpay: Razorpay = new Proxy(
  {} as Razorpay,
  {
    get(_target, property) {
      const client = getRazorpay();
      const value = Reflect.get(client, property, client);

      return typeof value === "function"
        ? value.bind(client)
        : value;
    },
  },
);