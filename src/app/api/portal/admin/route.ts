import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { PLANS, type PlanId } from "@/lib/portal/plans";
import type { Subscription, AdminUser } from "@/lib/portal/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type AdminRecord = { id: string; data: Record<string, unknown> };

function configuredAdmin(uid: string, email: string): boolean {
  const uids = [process.env.PORTAL_ADMIN_UID || "", ...(process.env.PORTAL_ADMIN_UIDS || "").split(",")];
  const primaryEmail = (process.env.YOUR_PRIMARY_ADMIN_EMAIL || "").trim().toLowerCase();
  return uids.some((value) => value.trim() === uid) || Boolean(email && primaryEmail === email.toLowerCase());
}

function matchesAdmin(record: AdminRecord, uid: string, email: string): boolean {
  const storedUid = String(record.data.uid || record.data.firebaseUid || "").trim();
  // An explicitly bound UID must match; email alone must not override it.
  if (storedUid) return storedUid === uid;
  return record.id === uid || Boolean(email && (
    String(record.data.email || "").trim().toLowerCase() === email.toLowerCase() ||
    record.id.toLowerCase() === email.toLowerCase()
  ));
}

async function verifyAdmin(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ") || !header.slice(7).trim()) {
    throw new Error("Unauthorized. Sign in again.");
  }
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim(), true);
  } catch {
    throw new Error("Unauthorized. Invalid or expired session.");
  }
  const uid = decoded.uid;
  const email = String(decoded.email || "").trim().toLowerCase();
  const snapshot = await getAdminDb().collection("admins").get();
  const records: AdminRecord[] = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  const matching = records.filter((record) => matchesAdmin(record, uid, decoded.email_verified ? email : ""));
  const disabled = matching.some(({ data }) => data.active === false || data.enabled === false || data.disabled === true);
  const allowed = matching.some(({ data }) => String(data.role || "admin").toLowerCase() === "admin");
  if (disabled || !(configuredAdmin(uid, decoded.email_verified ? email : "") || allowed)) {
    throw new Error("Forbidden. Admin access only.");
  }
  return { uid, email, records };
}

function parseTimestamp(val: unknown): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val && typeof val === "object") {
    if (
      "toMillis" in val &&
      typeof (val as { toMillis: () => number }).toMillis === "function"
    ) {
      return (val as { toMillis: () => number }).toMillis();
    }
    if (
      "_seconds" in val &&
      typeof (val as { _seconds: number })._seconds === "number"
    ) {
      return (val as { _seconds: number })._seconds * 1000;
    }
    if (
      "seconds" in val &&
      typeof (val as { seconds: number }).seconds === "number"
    ) {
      return (val as { seconds: number }).seconds * 1000;
    }
    if (val instanceof Date) return val.getTime();
  }
  if (typeof val === "string") {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

// ============================================================
// GET ADMIN USERS & REAL-TIME STATS
// ============================================================

export async function GET(request: Request) {
  try {
    // Verify admin before returning users
    const admin = await verifyAdmin(request);

    const adminDb = getAdminDb();

    const { searchParams } = new URL(request.url);

    const positiveInt = (value: string | null, fallback: number) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    };
    const requestedPage = positiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(100, positiveInt(searchParams.get("pageSize"), 20));

    // ---------------------------------------------------------
    // Fetch portal users & subscriptions concurrently
    // ---------------------------------------------------------
    const [userSnapshot, subscriptionSnapshot] = await Promise.all([
      adminDb.collection("portalUsers").get(),
      adminDb.collection("portalSubscriptions").get(),
    ]);

    const now = Date.now();

    // ---------------------------------------------------------
    // Process subscriptions
    // ---------------------------------------------------------
    const subscriptions: Subscription[] = subscriptionSnapshot.docs.map((doc) => {
      const data = doc.data();
      const planId = (data.planId || "starter") as PlanId;
      return {
        id: doc.id,
        uid: String(data.uid || ""),
        planId,
        planName: String(
          data.planName || (PLANS[planId] ? PLANS[planId].name : "Starter"),
        ),
        amount: Number(data.amount || 0),
        allowance: Number(data.allowance || 0),
        used: Number(data.used || 0),
        startsAt: parseTimestamp(data.startsAt),
        expiresAt: parseTimestamp(data.expiresAt),
        paymentId: String(data.paymentId || ""),
        orderId: String(data.orderId || ""),
        createdAt: parseTimestamp(data.createdAt) || now,
        usageUpdatedAt: parseTimestamp(data.usageUpdatedAt) || null,
      };
    });

    const activeSubscriptions = subscriptions.filter(
      (item) => item.startsAt <= now && item.expiresAt > now,
    );

    const activeByUser = new Map<string, Subscription>(
      activeSubscriptions.map((item) => [item.uid, item]),
    );

    const expiredUserIds = new Set(
      subscriptions
        .filter(
          (item) => item.expiresAt <= now && !activeByUser.has(item.uid),
        )
        .map((item) => item.uid),
    );

    // ---------------------------------------------------------
    // Identify administrator accounts to exclude from customer counts
    // Reads from PORTAL_ADMIN_UIDS (comma-separated list of UIDs)
    // and YOUR_PRIMARY_ADMIN_EMAIL environment variables.
    // ---------------------------------------------------------
    const isUserAdmin = (uid: string, email: string) =>
      uid === admin.uid || configuredAdmin(uid, email) ||
      admin.records.some((record) => matchesAdmin(record, uid, email));

    // ---------------------------------------------------------
    // Build a map from Firestore portalUsers for quick lookup
    // ---------------------------------------------------------
    const firestoreUserMap = new Map<string, AdminUser>();
    for (const doc of userSnapshot.docs) {
      const data = doc.data();
      const uid = String(data.uid || doc.id);
      firestoreUserMap.set(uid, {
        uid,
        name: String(data.name || data.fullName || ""),
        email: String(data.email || ""),
        phone: String(data.phone || data.phoneNumber || ""),
        createdAt: parseTimestamp(data.createdAt) || now,
        active: activeByUser.get(uid) || null,
      });
    }

    // ---------------------------------------------------------
    // Fetch ALL Firebase Auth users so every registered account
    // appears in the dashboard (not just those in portalUsers)
    // ---------------------------------------------------------
    const adminAuth = getAdminAuth();
    const allFirebaseUsers: AdminUser[] = [];
    let pageToken: string | undefined = undefined;

    // Firebase Auth listUsers returns max 1000 per page
    do {
      const listResult = await adminAuth.listUsers(1000, pageToken);
      for (const fbUser of listResult.users) {
        // Prefer Firestore data if available (richer), otherwise use Auth data
        const existing = firestoreUserMap.get(fbUser.uid);
        allFirebaseUsers.push(
          existing ? { ...existing, email: fbUser.email || existing.email } : {
            uid: fbUser.uid,
            name: String(fbUser.displayName || ""),
            email: String(fbUser.email || ""),
            phone: String(fbUser.phoneNumber || ""),
            createdAt: fbUser.metadata.creationTime
              ? new Date(fbUser.metadata.creationTime).getTime()
              : now,
            active: activeByUser.get(fbUser.uid) || null,
          },
        );
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    // Sort users newest first
    allFirebaseUsers.sort((a, b) => b.createdAt - a.createdAt);

    // Exclude administrators so only customer accounts are counted & listed
    const displayUsers = allFirebaseUsers.filter(
      (user) => !isUserAdmin(user.uid, user.email),
    );

    const customerUids = new Set(displayUsers.map((user) => user.uid));
    const customerActiveSubscriptions = activeSubscriptions.filter((item) => customerUids.has(item.uid));
    const totalUsers = displayUsers.length;
    const activeUsers = displayUsers.filter((u) => activeByUser.has(u.uid)).length;
    const expiredUsers = displayUsers.filter((u) => expiredUserIds.has(u.uid)).length;

    const totalRevenue = subscriptions.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );

    // ---------------------------------------------------------
    // Last 6 months monthly metrics
    // ---------------------------------------------------------
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
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      };
    });

    const monthlyUsers = Array.from({ length: 6 }, (_, index) => {
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
        count: displayUsers.filter(
          (user) =>
            user.createdAt >= start &&
            user.createdAt < endDate.getTime(),
        ).length,
      };
    });

    const planDistribution = Object.values(PLANS).map((plan) => ({
      label: plan.name,
      count: customerActiveSubscriptions.filter((item) => item.planId === plan.id).length,
    }));

    const planCounts = Object.keys(PLANS).map(
      (id) => customerActiveSubscriptions.filter((item) => item.planId === id).length,
    );

    // ---------------------------------------------------------
    // Pagination
    // ---------------------------------------------------------
    const totalPages = Math.max(1, Math.ceil(displayUsers.length / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * pageSize;
    const paginatedUsers = displayUsers.slice(start, start + pageSize);

    const response = NextResponse.json({
      success: true,
      totalUsers,
      activeUsers,
      expiredUsers,
      totalRevenue,
      planCounts,
      planDistribution,
      monthlyRevenue,
      monthlyUsers,
      users: paginatedUsers,
      data: paginatedUsers,
      page,
      totalPages,
      pagination: {
        page,
        pageSize,
        total: totalUsers,
        totalPages,
      },
      serverNow: now,
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );

    return response;
  } catch (error: unknown) {
    console.error(
      "Admin users API failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load admin users.";

    const lower =
      message.toLowerCase();

    let status = 500;

    if (
      lower.includes("unauthorized")
    ) {
      status = 401;
    } else if (
      lower.includes("forbidden")
    ) {
      status = 403;
    }

    return NextResponse.json(
      {
        success: false,
        error: status === 500 ? "Failed to load admin users. Please retry." : message,
        message: status === 500 ? "Failed to load admin users. Please retry." : message,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}