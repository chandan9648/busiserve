import "server-only";

import { type DecodedIdToken } from "firebase-admin/auth";
import {
  FirebaseConfigurationError,
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  evaluateSession,
  type SessionScope,
} from "./session-policy";

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
    throw new Error(
      `Missing environment variable: ${name}`,
    );
  }

  return value;
}

export function db() {
  return getAdminDb();
}

/**
 * =========================================================
 * ADMIN UID CHECK
 * =========================================================
 *
 * Add admin Firebase UID in .env.local:
 *
 * PORTAL_ADMIN_UIDS=77yGo1PlL2UVDxmANDCGIlgwWQO2
 *
 * Multiple admins:
 *
 * PORTAL_ADMIN_UIDS=UID1,UID2,UID3
 */
export function isAdmin(uid: string) {
  const configuredAdmins =
    process.env.PORTAL_ADMIN_UIDS ?? "";

  const adminUids = configuredAdmins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return adminUids.includes(uid);
}

/**
 * Administrator status from environment variables alone.
 *
 * No I/O, so it is safe to call on every authenticated request and it
 * still answers when Firestore is unreachable. It covers the UID
 * allow-list, the legacy singular name and the primary administrator
 * email; the `admins` collection is resolved separately, where a
 * Firestore read is already being made.
 *
 * An email grants administrator status only when the token says the
 * address is verified: an unverified address proves nothing about who
 * controls it.
 */
export function isConfiguredAdminByEnv(token: {
  uid: string;
  email?: string;
  email_verified?: boolean;
}): boolean {
  if (isAdmin(token.uid)) return true;

  const legacy = (process.env.PORTAL_ADMIN_UID ?? "").trim();
  if (legacy && legacy === token.uid) return true;

  const primaryEmail = (process.env.YOUR_PRIMARY_ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();

  if (!primaryEmail || !token.email_verified) return false;

  return primaryEmail === String(token.email ?? "").trim().toLowerCase();
}

export async function authenticate(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    throw new PortalError("Authentication required.", 401);
  }

  // Configuration failures must remain server errors, not "session expired".
  const auth = getAdminAuth();
  try {
    const token = await auth.verifyIdToken(match[1], true);

    /**
     * Absolute session lifetime: 30 minutes for an administrator, 6
     * hours for a customer, measured from `auth_time`.
     *
     * Enforced here rather than only in the browser, because a timer
     * in the browser is a courtesy — it can be paused, the tab can be
     * cloned, and the ID token keeps refreshing regardless. This is
     * the check that actually ends the session.
     *
     * Administrator status is read from the environment allow-list
     * only, which costs no I/O. An account that is an administrator
     * solely through the `admins` collection is additionally held to
     * the 30 minute limit by resolveAdminAccess at the admin
     * endpoints themselves, where that lookup already happens.
     */
    const scope: SessionScope = isConfiguredAdminByEnv(token)
      ? "admin"
      : "user";

    const session = evaluateSession(
      typeof token.auth_time === "number"
        ? token.auth_time * 1000
        : undefined,
      scope,
    );

    if (session.expired) {
      throw new PortalError(
        scope === "admin"
          ? "Administrator sessions end after 30 minutes. Please sign in again."
          : "Your session has ended after 6 hours. Please sign in again.",
        401,
      );
    }

    return token;
  } catch (error) {
    // A policy rejection is already the right answer; do not let the
    // Firebase error mapping below rewrite it.
    if (error instanceof PortalError) throw error;

    const code = safeErrorCode(error);
    if (code === "auth/user-disabled") {
      throw new PortalError("This account is disabled. Please contact support.", 403);
    }
    if (
      [
        "auth/id-token-expired",
        "auth/id-token-revoked",
        "auth/invalid-id-token",
        "auth/argument-error",
        "auth/user-not-found",
      ].includes(String(code))
    ) {
      throw new PortalError("Session expired or invalid. Please sign in again.", 401);
    }
    throw error;
  }
}

export function safeErrorCode(error: unknown): string | number {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "unknown";
  }
  const code = error.code;
  if (typeof code === "number" && Number.isFinite(code)) return code;
  return typeof code === "string" && /^[a-zA-Z0-9/_-]{1,80}$/.test(code)
    ? code
    : "unknown";
}

// All text returned here is controlled; raw SDK errors and credentials stay private.
export function serverDiagnostic(error: unknown): string {
  if (error instanceof FirebaseConfigurationError) return error.message;
  switch (safeErrorCode(error)) {
    case 7:
    case "permission-denied":
    case "PERMISSION_DENIED":
      return "Check the service account's Firestore IAM permissions and whether the Firestore API is enabled for the configured project.";
    case 5:
    case "not-found":
    case "NOT_FOUND":
      return "Check FIREBASE_PROJECT_ID and FIREBASE_DATABASE_ID against the existing Firestore database.";
    case 9:
    case "failed-precondition":
    case "FAILED_PRECONDITION":
      return "Check Firestore database state and required indexes for the failing operation.";
    case 4:
    case 14:
    case "deadline-exceeded":
    case "unavailable":
      return "Firestore timed out or is unavailable. Check service status and function connectivity.";
    case "auth/insufficient-permission":
      return "The service account cannot access Firebase Authentication. Check its IAM permissions.";
    case "app/invalid-credential":
    case "auth/invalid-credential":
      return "Check the active service account key, client email, and project configuration.";
    default:
      return "Inspect this request's stage and the surrounding Vercel function logs.";
  }
}

export function requireAdmin(
  token: DecodedIdToken,
) {
  if (!isAdmin(token.uid)) {
    throw new PortalError(
      "Administrator access required.",
      403,
    );
  }
}

export async function ensureProfile(
  token: DecodedIdToken,
) {
  const ref = db()
    .collection("portalUsers")
    .doc(token.uid);

  await db().runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(ref);

      if (!snapshot.exists) {
        transaction.create(ref, {
          uid: token.uid,
          name: token.name || "User",
          email: token.email || "",
          phone: "",
          createdAt: Date.now(),
          nextStartAt: 0,
        });
      } else if (
        snapshot.data()?.email !==
        (token.email || "")
      ) {
        transaction.update(ref, {
          email: token.email || "",
        });
      }
    },
  );

  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!data) {
    throw new PortalError("Profile is unavailable. Please try again.", 409);
  }

  return {
    uid: token.uid,
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    createdAt: data.createdAt,
  } as Profile;
}

export async function userSubscriptions(
  uid: string,
) {
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
    .sort(
      (a, b) => b.startsAt - a.startsAt,
    );
}

export function signatureMatches(
  value: string,
  signature: string,
  secret: string,
) {
  if (
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = createHmac(
    "sha256",
    secret,
  )
    .update(value)
    .digest();

  const supplied = Buffer.from(
    signature,
    "hex",
  );

  return (
    expected.length === supplied.length &&
    timingSafeEqual(
      expected,
      supplied,
    )
  );
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

function addCalendarMonth(
  timestamp: number,
) {
  const date = new Date(timestamp);

  const day = date.getUTCDate();

  date.setUTCDate(1);

  date.setUTCMonth(
    date.getUTCMonth() + 1,
  );

  const lastDay = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  date.setUTCDate(
    Math.min(day, lastDay),
  );

  return date.getTime();
}

export async function razorpay<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const credentials =
    Buffer.from(
      `${requiredEnv(
        "RAZORPAY_KEY_ID",
      )}:${requiredEnv(
        "RAZORPAY_KEY_SECRET",
      )}`,
    ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${path}`,
    {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type":
          "application/json",
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(
        15000,
      ),
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

export async function activatePayment(
  orderId: string,
  paymentId: string,
  expectedUid?: string,
) {
  if (
    !/^order_[A-Za-z0-9]+$/.test(
      orderId,
    ) ||
    !/^pay_[A-Za-z0-9]+$/.test(
      paymentId,
    )
  ) {
    throw new PortalError(
      "Invalid payment reference.",
    );
  }

  const payment =
    await razorpay<GatewayPayment>(
      `payments/${paymentId}`,
    );

  if (
    payment.order_id !== orderId ||
    payment.currency !== "USD" ||
    payment.status !== "captured" ||
    payment.amount_refunded > 0
  ) {
    throw new PortalError(
      "Payment is not ready for activation. If money was debited, refresh your dashboard shortly.",
      409,
    );
  }

  const orderRef = db()
    .collection("portalOrders")
    .doc(orderId);

  const subscriptionRef = db()
    .collection("portalSubscriptions")
    .doc(orderId);

  return db().runTransaction(
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        );

      if (!orderSnapshot.exists) {
        throw new PortalError(
          "Order not found.",
          404,
        );
      }

      const order =
        orderSnapshot.data() as StoredOrder;

      if (
        expectedUid &&
        order.uid !== expectedUid
      ) {
        throw new PortalError(
          "This order belongs to another user.",
          403,
        );
      }

      if (
        payment.amount !== order.amount
      ) {
        throw new PortalError(
          "Payment amount does not match the order.",
        );
      }

      const userRef = db()
        .collection("portalUsers")
        .doc(order.uid);

      const [
        subscriptionSnapshot,
        userSnapshot,
      ] = await Promise.all([
        transaction.get(
          subscriptionRef,
        ),
        transaction.get(userRef),
      ]);

      if (
        subscriptionSnapshot.exists
      ) {
        return {
          ...subscriptionSnapshot.data(),
          id: subscriptionSnapshot.id,
        } as Subscription;
      }

      if (!userSnapshot.exists) {
        throw new PortalError(
          "User profile not found.",
          404,
        );
      }

      const now = Date.now();

      const startsAt = Math.max(
        now,
        Number(
          userSnapshot.data()
            ?.nextStartAt || 0,
        ),
      );

      const expiresAt =
        addCalendarMonth(startsAt);

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

      transaction.create(
        subscriptionRef,
        subscription,
      );

      transaction.update(
        orderRef,
        {
          status: "paid",
          paymentId,
          paidAt: now,
        },
      );

      transaction.update(
        userRef,
        {
          nextStartAt: expiresAt,
        },
      );

      return subscription;
    },
  );
}