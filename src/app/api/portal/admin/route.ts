import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { PLANS, type PlanId } from "@/lib/portal/plans";
import type { Subscription, AdminUser } from "@/lib/portal/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DecodedAdmin = {
  uid: string;
  email: string;
};

async function verifyAdmin(request: Request): Promise<DecodedAdmin> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  // ---------------------------------------------------------
  // 1. Get Firebase ID token from Authorization header
  // ---------------------------------------------------------
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error(
      "Unauthorized access. Firebase ID token is missing.",
    );
  }

  const token = authorization
    .substring("Bearer ".length)
    .trim();

  if (!token) {
    throw new Error("Authentication token is empty.");
  }

  // ---------------------------------------------------------
  // 2. Verify Firebase ID token
  // ---------------------------------------------------------
  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "Firebase ID token verification failed:",
      error,
    );

    throw new Error(
      "Unauthorized. Invalid or expired Firebase token.",
    );
  }

  const uid = String(decodedToken.uid || "").trim();

  const email = String(decodedToken.email || "")
    .trim()
    .toLowerCase();

  if (!uid) {
    throw new Error(
      "Invalid Firebase token: UID missing.",
    );
  }

  if (!email) {
    throw new Error(
      "Invalid Firebase token: email missing.",
    );
  }

  // ---------------------------------------------------------
  // 3. Environment variables
  // ---------------------------------------------------------
  const primaryAdminUid = String(
    process.env.PORTAL_ADMIN_UID || "",
  ).trim();

  const primaryAdminEmail = String(
    process.env.YOUR_PRIMARY_ADMIN_EMAIL || "",
  )
    .trim()
    .toLowerCase();

  // ---------------------------------------------------------
  // 4. Primary admin check
  //
  // PORTAL_ADMIN_UID has highest priority.
  // Email is also supported as a fallback.
  // ---------------------------------------------------------
  const isPrimaryAdminByUid =
    Boolean(primaryAdminUid) &&
    uid === primaryAdminUid;

  const isPrimaryAdminByEmail =
    Boolean(primaryAdminEmail) &&
    email === primaryAdminEmail;

  if (isPrimaryAdminByUid || isPrimaryAdminByEmail) {
    console.log("Admin authorized via environment:", {
      uid,
      email,
      matchedBy: isPrimaryAdminByUid
        ? "PORTAL_ADMIN_UID"
        : "YOUR_PRIMARY_ADMIN_EMAIL",
    });

    return {
      uid,
      email,
    };
  }

  // ---------------------------------------------------------
  // 5. Firestore admins/{uid} check
  //
  // This allows additional admins to be stored in Firestore.
  // ---------------------------------------------------------
  try {
    const adminByUidRef = adminDb
      .collection("admins")
      .doc(uid);

    const adminByUid = await adminByUidRef.get();

    if (adminByUid.exists) {
      const data = adminByUid.data() || {};

      const active = data.active !== false;

      const role = String(
        data.role || "admin",
      )
        .trim()
        .toLowerCase();

      if (active && role === "admin") {
        console.log(
          "Admin authorized via Firestore UID:",
          {
            uid,
            email,
          },
        );

        return {
          uid,
          email,
        };
      }
    }

    // -------------------------------------------------------
    // 6. Firestore admins collection email check
    // -------------------------------------------------------
    const emailSnapshot = await adminDb
      .collection("admins")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!emailSnapshot.empty) {
      const adminDoc = emailSnapshot.docs[0];
      const data = adminDoc.data() || {};

      const storedUid = String(
        data.uid || adminDoc.id || "",
      ).trim();

      const active = data.active !== false;

      const role = String(
        data.role || "admin",
      )
        .trim()
        .toLowerCase();

      if (
        active &&
        role === "admin" &&
        storedUid === uid
      ) {
        console.log(
          "Admin authorized via Firestore email:",
          {
            uid,
            email,
          },
        );

        return {
          uid,
          email,
        };
      }
    }
  } catch (error) {
    console.error(
      "Firestore admin lookup failed:",
      error,
    );

    throw new Error(
      "Unable to verify admin permissions.",
    );
  }

  // ---------------------------------------------------------
  // 7. Admin not found
  // ---------------------------------------------------------
  console.error(
    "Admin authorization failed:",
    {
      uid,
      email,
      primaryAdminUidConfigured:
        Boolean(primaryAdminUid),
      primaryAdminEmailConfigured:
        Boolean(primaryAdminEmail),
    },
  );

  throw new Error(
    "Forbidden. Admin access only.",
  );
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

    const requestedPage = Math.max(
      1,
      Number(searchParams.get("page") || "1"),
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || "20")),
    );

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
    const adminUidsEnv = String(process.env.PORTAL_ADMIN_UIDS || "").trim();
    const adminUidSet = new Set(
      adminUidsEnv
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
    // Always include the currently logged-in admin's UID
    adminUidSet.add(admin.uid);

    const primaryAdminEmail = String(
      process.env.YOUR_PRIMARY_ADMIN_EMAIL || "",
    )
      .trim()
      .toLowerCase();

    const isUserAdmin = (uid: string, email: string) => {
      const lowerEmail = email.toLowerCase();
      return (
        adminUidSet.has(uid) ||
        (Boolean(primaryAdminEmail) && lowerEmail === primaryAdminEmail) ||
        lowerEmail === admin.email
      );
    };

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
          existing ?? {
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
      count: activeSubscriptions.filter((item) => item.planId === plan.id).length,
    }));

    const planCounts = Object.keys(PLANS).map(
      (id) => activeSubscriptions.filter((item) => item.planId === id).length,
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
        message,
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