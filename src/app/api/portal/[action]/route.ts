import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { PLANS } from "@/lib/portal/plans";
import type {
  Profile,
  Subscription,
} from "@/lib/portal/types";

import { getAdminAuth } from "@/lib/firebase-admin";

import {
  activatePayment,
  authenticate,
  db,
  ensureProfile,
  isAdmin,
  PortalError,
  razorpay,
  requireAdmin,
  requiredEnv,
  signatureMatches,
  safeErrorCode,
  serverDiagnostic,
  userSubscriptions,
} from "@/lib/portal/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ action: string }>;
};

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .max(25)
    .regex(/^[0-9+()\-\s]*$/, "Enter a valid phone number."),
});

const orderSchema = z.object({
  planId: z.enum(["starter", "growth", "scale"]),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

const usageSchema = z.object({
  subscriptionId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  used: z.number().int().min(0),
});

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function body(request: Request) {
  const text = await request.text();

  if (text.length > 12000) {
    throw new PortalError("Request is too large.", 413);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new PortalError("Invalid JSON request.");
  }
}

async function webhook(request: Request) {
  const raw = await request.text();

  if (raw.length > 1000000) {
    throw new PortalError("Webhook is too large.", 413);
  }

  const signature =
    request.headers.get("x-razorpay-signature") || "";

  if (
    !signatureMatches(
      raw,
      signature,
      requiredEnv("RAZORPAY_WEBHOOK_SECRET"),
    )
  ) {
    throw new PortalError("Invalid webhook signature.", 401);
  }

  const event = JSON.parse(raw);

  if (event.event !== "payment.captured") {
    return json({ received: true });
  }

  const payment = event.payload?.payment?.entity;

  if (
    typeof payment?.order_id !== "string" ||
    typeof payment?.id !== "string" ||
    !/^order_[A-Za-z0-9]+$/.test(payment.order_id)
  ) {
    throw new PortalError("Invalid webhook payload.");
  }

  const order = await db()
    .collection("portalOrders")
    .doc(payment.order_id)
    .get();

  // Ignore payments belonging to the website's older checkout.
  if (!order.exists) {
    return json({ received: true, ignored: true });
  }

  await activatePayment(payment.order_id, payment.id);

  return json({ received: true });
}

async function handle(request: Request, context: Context) {
  const requestId = randomUUID();
  let stage = "params";
  let actionName = "unknown";

  try {
    const { action } = await context.params;
    actionName = ["me", "profile", "order", "verify", "usage", "admin", "webhook"].includes(action)
      ? action
      : "unknown";
    if (action === "me") {
      console.info("Portal request started", { requestId, action: actionName });
    }

    if (action === "webhook" && request.method === "POST") {
      stage = "webhook";
      return await webhook(request);
    }

    stage = "authenticate";
    const token = await authenticate(request);
    stage = "action-handler";

    if (action === "me" && request.method === "GET") {
      stage = "ensureProfile";
      const profile = await ensureProfile(token);
      stage = "userSubscriptions";
      const subscriptions = await userSubscriptions(token.uid);
      stage = "me-response";

      return json({
        profile,
        subscriptions,
        role: isAdmin(token.uid) ? "admin" : "user",
        emailVerified: Boolean(token.email_verified),
        serverNow: Date.now(),
      });
    }

    if (action === "profile" && request.method === "PUT") {
      const values = profileSchema.parse(await body(request));

      await ensureProfile(token);

      await db()
        .collection("portalUsers")
        .doc(token.uid)
        .update(values);

      // Keep the Firebase Authentication record in step with the profile.
      // The email is never touched here: it identifies the account.
      const authUpdate: {
        displayName: string;
        phoneNumber?: string | null;
      } = { displayName: values.name };

      // Authentication stores a phone number only in E.164 form, and only
      // once per project. Anything else is kept in the profile alone.
      const compact = values.phone.replace(/[^0-9+]/g, "");
      if (!values.phone) {
        authUpdate.phoneNumber = null;
      } else if (/^\+[1-9][0-9]{7,14}$/.test(compact)) {
        authUpdate.phoneNumber = compact;
      }

      let warning: string | null =
        authUpdate.phoneNumber === undefined
          ? "Saved. Add the country code (for example +91) to store the number on your sign-in record too."
          : null;

      try {
        await getAdminAuth().updateUser(token.uid, authUpdate);
      } catch (error) {
        if (authUpdate.phoneNumber === undefined) throw error;

        // A rejected or already-used phone number must never block the save.
        await getAdminAuth().updateUser(token.uid, {
          displayName: values.name,
        });

        warning =
          "Saved. This phone number could not be stored on your sign-in record, so only your profile was updated.";
      }

      return json({ success: true, warning });
    }

    if (action === "order" && request.method === "POST") {
      if (!token.email_verified) {
        throw new PortalError(
          "Verify your email before purchasing a plan.",
          403,
        );
      }

      const { planId } = orderSchema.parse(await body(request));
      const plan = PLANS[planId];

      await ensureProfile(token);

      const userRef = db().collection("portalUsers").doc(token.uid);

      // A persistent throttle prevents rapid order creation.
      await db().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        const previous = Number(snapshot.data()?.lastOrderAt || 0);

        if (Date.now() - previous < 3000) {
          throw new PortalError(
            "Please wait a few seconds before creating another checkout.",
            429,
          );
        }

        transaction.update(userRef, { lastOrderAt: Date.now() });
      });

      const order = await razorpay<{
        id: string;
        amount: number;
        currency: string;
      }>("orders", "POST", {
        amount: plan.amount,
        currency: "INR",
        receipt: randomUUID(),
        notes: {
          portal: "busiserve",
          uid: token.uid,
          planId,
        },
      });

      await db().collection("portalOrders").doc(order.id).create({
        uid: token.uid,
        planId,
        planName: plan.name,
        amount: plan.amount,
        allowance: plan.changes,
        status: "created",
        createdAt: Date.now(),
      });

      return json({
        orderId: order.id,
        amount: plan.amount,
        currency: "INR",
        key: requiredEnv("RAZORPAY_KEY_ID"),
        planName: plan.name,
      });
    }

    if (action === "verify" && request.method === "POST") {
      const values = verifySchema.parse(await body(request));

      const order = await db()
        .collection("portalOrders")
        .doc(values.razorpay_order_id)
        .get();

      if (!order.exists || order.data()?.uid !== token.uid) {
        throw new PortalError("Order not found.", 404);
      }

      if (
        !signatureMatches(
          `${order.id}|${values.razorpay_payment_id}`,
          values.razorpay_signature,
          requiredEnv("RAZORPAY_KEY_SECRET"),
        )
      ) {
        throw new PortalError("Payment verification failed.", 400);
      }

      const subscription = await activatePayment(
        order.id,
        values.razorpay_payment_id,
        token.uid,
      );

      return json({ success: true, subscription });
    }

    if (action === "usage" && request.method === "PUT") {
      requireAdmin(token);

      const values = usageSchema.parse(await body(request));

      const ref = db()
        .collection("portalSubscriptions")
        .doc(values.subscriptionId);

      await db().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);

        if (!snapshot.exists) {
          throw new PortalError("Subscription not found.", 404);
        }

        const subscription = snapshot.data() as Subscription;
        const now = Date.now();

        if (
          now < subscription.startsAt ||
          now >= subscription.expiresAt
        ) {
          throw new PortalError(
            "Only an active subscription can be updated.",
            409,
          );
        }

        if (values.used > subscription.allowance) {
          throw new PortalError("Usage exceeds this plan's allowance.");
        }

        transaction.update(ref, {
          used: values.used,
          usageUpdatedBy: token.uid,
          usageUpdatedAt: now,
        });
      });

      return json({ success: true });
    }

    if (action === "admin" && request.method === "GET") {
      requireAdmin(token);

      const requestedPage = Number(
        new URL(request.url).searchParams.get("page") || 1,
      );

      if (!Number.isInteger(requestedPage) || requestedPage < 1) {
        throw new PortalError("Invalid page.");
      }

      const [userSnapshot, subscriptionSnapshot] = await Promise.all([
        db().collection("portalUsers").get(),
        db().collection("portalSubscriptions").get(),
      ]);

      const now = Date.now();

      const subscriptions = subscriptionSnapshot.docs.map(
        (document) =>
          ({
            ...document.data(),
            id: document.id,
          }) as Subscription,
      );

      const active = subscriptions.filter(
        (item) => item.startsAt <= now && item.expiresAt > now,
      );

      const activeByUser = new Map(
        active.map((item) => [item.uid, item]),
      );

      const expiredUserIds = new Set(
        subscriptions
          .filter(
            (item) =>
              item.expiresAt <= now && !activeByUser.has(item.uid),
          )
          .map((item) => item.uid),
      );

      const users = userSnapshot.docs
        .map((document) => {
          const data = document.data();

          const profile: Profile = {
            uid: document.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            createdAt: data.createdAt || 0,
          };

          return {
            ...profile,
            active: activeByUser.get(document.id) || null,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
        const current = new Date(now);

        const start = Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth() - 5 + index,
          1,
        );

        const endDate = new Date(start);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);

        return {
          label: new Intl.DateTimeFormat("en-IN", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          }).format(start),
          amount: subscriptions
            .filter(
              (item) =>
                item.createdAt >= start &&
                item.createdAt < endDate.getTime(),
            )
            .reduce((sum, item) => sum + item.amount, 0),
        };
      });

      const pageSize = 20;
      const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
      const page = Math.min(requestedPage, totalPages);

      return json({
        totalUsers: users.length,
        activeUsers: activeByUser.size,
        expiredUsers: expiredUserIds.size,
        totalRevenue: subscriptions.reduce(
          (sum, item) => sum + item.amount,
          0,
        ),
        planCounts: Object.keys(PLANS).map(
          (id) => active.filter((item) => item.planId === id).length,
        ),
        monthlyRevenue,
        users: users.slice((page - 1) * pageSize, page * pageSize),
        page,
        totalPages,
        serverNow: now,
      });
    }

    return json({ error: "Endpoint not found." }, 404);
  } catch (error) {
    // Log only controlled metadata, never tokens, credentials or profile data.
    const code = safeErrorCode(error);

    console.error("Portal request failed", {
      requestId,
      action: actionName,
      stage,
      code,
      diagnostic: serverDiagnostic(error),
      status: error instanceof PortalError ? error.status : error instanceof z.ZodError ? 400 : 500,
    });

    if (error instanceof z.ZodError) {
      return json(
        { error: error.issues[0]?.message || "Invalid input.", requestId },
        400,
      );
    }

    if (error instanceof PortalError) {
      return json({ error: error.message, requestId }, error.status);
    }

    return json(
      { error: "The server could not complete the request.", requestId },
      500,
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;