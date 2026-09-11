import "server-only";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "node:crypto";

import type { PlanId } from "./plans";
import type {
  Profile,
  Subscription,
} from "./types";

export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function adminApp() {
  const name = "busiserve-portal-admin";

  return (
    getApps().find((app) => app.name === name) ??
    initializeApp(
      {
        credential: cert({
          projectId: requiredEnv("FIREBASE_PROJECT_ID"),
          clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
          privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(
            /\\n/g,
            "\n",
          ),
        }),
      },
      name,
    )
  );
}

export function db() {
  return getFirestore(adminApp());
}

export function isAdmin(uid: string) {
  return (process.env.PORTAL_ADMIN_UIDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(uid);
}

export async function authenticate(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new PortalError("Authentication required.", 401);
  }

  try {
    return await getAuth(adminApp()).verifyIdToken(
      authorization.slice(7),
      true,
    );
  } catch {
    throw new PortalError("Session expired. Please sign in again.", 401);
  }
}

export function requireAdmin(token: DecodedIdToken) {
  if (!isAdmin(token.uid)) {
    throw new PortalError("Administrator access required.", 403);
  }
}

export async function ensureProfile(token: DecodedIdToken) {
  const ref = db().collection("portalUsers").doc(token.uid);

  await db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.create(ref, {
        uid: token.uid,
        name: token.name || "User",
        email: token.email || "",
        phone: "",
        createdAt: Date.now(),
        nextStartAt: 0,
      });
    } else if (snapshot.data()?.email !== (token.email || "")) {
      transaction.update(ref, {
        email: token.email || "",
      });
    }
  });

  const snapshot = await ref.get();
  const data = snapshot.data()!;

  return {
    uid: token.uid,
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    createdAt: data.createdAt,
  } as Profile;
}

export async function userSubscriptions(uid: string) {
  const snapshot = await db()
    .collection("portalSubscriptions")
    .where("uid", "==", uid)
    .get();

  return snapshot.docs
    .map(
      (document) =>
        ({
          ...document.data(),
          id: document.id,
        }) as Subscription,
    )
    .sort((a, b) => b.startsAt - a.startsAt);
}

export function signatureMatches(
  value: string,
  signature: string,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac("sha256", secret)
    .update(value)
    .digest();

  const supplied = Buffer.from(signature, "hex");

  return (
    expected.length === supplied.length &&
    timingSafeEqual(expected, supplied)
  );
}

export async function razorpay<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const credentials = Buffer.from(
    `${requiredEnv("RAZORPAY_KEY_ID")}:${requiredEnv("RAZORPAY_KEY_SECRET")}`,
  ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${path}`,
    {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) {
    throw new PortalError(
      "The payment provider could not complete this request. Please retry.",
      502,
    );
  }

  return response.json() as Promise<T>;
}

type GatewayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  amount_refunded: number;
};

type StoredOrder = {
  uid: string;
  planId: PlanId;
  planName: string;
  amount: number;
  allowance: number;
  status: string;
};

function addCalendarMonth(timestamp: number) {
  const date = new Date(timestamp);
  const day = date.getUTCDate();

  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);

  const lastDay = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  date.setUTCDate(Math.min(day, lastDay));

  return date.getTime();
}

export async function activatePayment(
  orderId: string,
  paymentId: string,
  expectedUid?: string,
) {
  if (
    !/^order_[A-Za-z0-9]+$/.test(orderId) ||
    !/^pay_[A-Za-z0-9]+$/.test(paymentId)
  ) {
    throw new PortalError("Invalid payment reference.");
  }

  const payment = await razorpay<GatewayPayment>(
    `payments/${paymentId}`,
  );

  if (
    payment.order_id !== orderId ||
    payment.currency !== "INR" ||
    payment.status !== "captured" ||
    payment.amount_refunded > 0
  ) {
    throw new PortalError(
      "Payment is not ready for activation. If money was debited, refresh your dashboard shortly.",
      409,
    );
  }

  const orderRef = db().collection("portalOrders").doc(orderId);
  const subscriptionRef = db()
    .collection("portalSubscriptions")
    .doc(orderId);

  return db().runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);

    if (!orderSnapshot.exists) {
      throw new PortalError("Order not found.", 404);
    }

    const order = orderSnapshot.data() as StoredOrder;

    if (expectedUid && order.uid !== expectedUid) {
      throw new PortalError("This order belongs to another user.", 403);
    }

    if (payment.amount !== order.amount) {
      throw new PortalError("Payment amount does not match the order.");
    }

    const userRef = db().collection("portalUsers").doc(order.uid);

    const [subscriptionSnapshot, userSnapshot] = await Promise.all([
      transaction.get(subscriptionRef),
      transaction.get(userRef),
    ]);

    if (subscriptionSnapshot.exists) {
      return {
        ...subscriptionSnapshot.data(),
        id: subscriptionSnapshot.id,
      } as Subscription;
    }

    if (!userSnapshot.exists) {
      throw new PortalError("User profile not found.", 404);
    }

    const now = Date.now();
    const startsAt = Math.max(
      now,
      Number(userSnapshot.data()?.nextStartAt || 0),
    );
    const expiresAt = addCalendarMonth(startsAt);

    const subscription: Subscription = {
      id: orderId,
      uid: order.uid,
      planId: order.planId,
      planName: order.planName,
      amount: order.amount,
      allowance: order.allowance,
      used: 0,
      startsAt,
      expiresAt,
      paymentId,
      orderId,
      createdAt: now,
    };

    transaction.create(subscriptionRef, subscription);

    transaction.update(orderRef, {
      status: "paid",
      paymentId,
      paidAt: now,
    });

    transaction.update(userRef, {
      nextStartAt: expiresAt,
    });

    return subscription;
  });
}