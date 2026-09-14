import { NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";

// IMPORTANT:
// route.ts is here:
// src/app/api/portal/admin/route.ts
//
// firebase-admins.ts is here:
// src/lib/firebase-admins.ts
//
// Therefore this relative path is intentional.
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIMARY_ADMIN_EMAIL = "chandankkumar156@gmail.com";
const PAGE_SIZE = 20;

type DecodedAdmin = {
  uid: string;
  email: string;
};

type UserRow = {
  uid: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string | null;
  emailVerified: boolean;
  disabled: boolean;
  active?: {
    id: string;
    planName: string;
    startsAt: string;
    expiresAt: string;
    used: number;
    limit: number;
  };
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isPrimaryAdmin(email: unknown): boolean {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}

function timestampToMillis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  const date = new Date(String(value));
  const time = date.getTime();

  return Number.isFinite(time) ? time : 0;
}

/* -------------------------------------------------------------------------- */
/* ADMIN VERIFICATION                                                         */
/* -------------------------------------------------------------------------- */

async function verifyAdmin(
  request: Request,
): Promise<DecodedAdmin> {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error(
      "Unauthorized access. Token missing.",
    );
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    throw new Error(
      "Authentication token is empty.",
    );
  }

  const decoded =
    await adminAuth.verifyIdToken(token);

  const email =
    normalizeEmail(decoded.email);

  if (!email) {
    throw new Error(
      "Invalid Firebase token.",
    );
  }

  /*
   * Primary administrator.
   */
  if (email === PRIMARY_ADMIN_EMAIL) {
    return {
      uid: decoded.uid,
      email,
    };
  }

  /*
   * Other administrators are stored
   * inside Firestore /admins.
   */
  const adminSnapshot =
    await adminDb
      .collection("admins")
      .limit(100)
      .get();

  const isAdmin =
    adminSnapshot.docs.some((doc) => {
      const data = doc.data();

      const storedEmail =
        normalizeEmail(data.email);

      const storedUid = String(
        data.uid ||
          data.firebaseUid ||
          doc.id ||
          "",
      ).trim();

      return (
        storedEmail === email ||
        storedUid === decoded.uid ||
        doc.id === decoded.uid ||
        normalizeEmail(doc.id) === email
      );
    });

  if (!isAdmin) {
    throw new Error(
      "Forbidden. Admin access only.",
    );
  }

  return {
    uid: decoded.uid,
    email,
  };
}

/* -------------------------------------------------------------------------- */
/* GET ALL FIREBASE AUTH USERS                                                */
/* -------------------------------------------------------------------------- */

async function getAllFirebaseUsers() {
  const users: Awaited<
    ReturnType<typeof adminAuth.listUsers>
  >["users"] = [];

  let pageToken: string | undefined;

  do {
    const result =
      await adminAuth.listUsers(
        1000,
        pageToken,
      );

    users.push(...result.users);

    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

/* -------------------------------------------------------------------------- */
/* GET ADMIN IDENTIFIERS                                                      */
/* -------------------------------------------------------------------------- */

async function getAdminIdentifiers() {
  const adminSnapshot =
    await adminDb
      .collection("admins")
      .limit(100)
      .get();

  const adminUids =
    new Set<string>();

  const adminEmails =
    new Set<string>();

  /*
   * Always hide the primary admin.
   */
  adminEmails.add(
    PRIMARY_ADMIN_EMAIL,
  );

  for (const doc of adminSnapshot.docs) {
    const data = doc.data();

    const uid = String(
      data.uid ||
        data.firebaseUid ||
        doc.id ||
        "",
    ).trim();

    const email =
      normalizeEmail(data.email);

    if (uid) {
      adminUids.add(uid);
    }

    if (email) {
      adminEmails.add(email);
    }

    /*
     * If document ID itself is an email.
     */
    const docIdEmail =
      normalizeEmail(doc.id);

    if (docIdEmail.includes("@")) {
      adminEmails.add(docIdEmail);
    }
  }

  return {
    adminUids,
    adminEmails,
  };
}

/* -------------------------------------------------------------------------- */
/* DELETE FIRESTORE QUERY MATCHES                                             */
/* -------------------------------------------------------------------------- */

async function deleteQueryMatches(
  collectionName: string,
  fieldName: string,
  uid: string,
) {
  const snapshot =
    await adminDb
      .collection(collectionName)
      .where(fieldName, "==", uid)
      .get();

  if (snapshot.empty) {
    return 0;
  }

  /*
   * Firestore batch limit is 500.
   * Delete in chunks to safely handle many records.
   */
  const docs = snapshot.docs;

  let deleted = 0;

  for (
    let i = 0;
    i < docs.length;
    i += 500
  ) {
    const batch =
      adminDb.batch();

    const chunk =
      docs.slice(i, i + 500);

    for (const doc of chunk) {
      batch.delete(doc.ref);
    }

    await batch.commit();

    deleted += chunk.length;
  }

  return deleted;
}

/* -------------------------------------------------------------------------- */
/* GET ADMIN DASHBOARD                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: Request,
) {
  try {
    await verifyAdmin(request);

    const { searchParams } =
      new URL(request.url);

    const requestedPage = Math.max(
      1,
      Number(
        searchParams.get("page") || "1",
      ),
    );

    /*
     * IMPORTANT:
     *
     * Firebase Authentication is the
     * source of truth for registered users.
     *
     * This means the count is based on
     * actual Firebase Authentication users,
     * NOT stale Firestore user documents.
     */
    const firebaseUsers =
      await getAllFirebaseUsers();

    /* ---------------------------------------------------------------------- */
    /* ADMIN IDENTIFIERS                                                      */
    /* ---------------------------------------------------------------------- */

    const {
      adminUids,
      adminEmails,
    } =
      await getAdminIdentifiers();

    /* ---------------------------------------------------------------------- */
    /* ONLY REAL CUSTOMER USERS                                               */
    /* ---------------------------------------------------------------------- */

    const customerUsers =
      firebaseUsers.filter(
        (firebaseUser) => {
          const email =
            normalizeEmail(
              firebaseUser.email,
            );

          /*
           * Admin accounts are completely
           * excluded from the customer list.
           */
          return (
            !isPrimaryAdmin(email) &&
            !adminUids.has(
              firebaseUser.uid,
            ) &&
            !adminEmails.has(email)
          );
        },
      );

    /* ---------------------------------------------------------------------- */
    /* FIRESTORE USER PROFILES                                                */
    /* ---------------------------------------------------------------------- */

    const profileSnapshot =
      await adminDb
        .collection("users")
        .get();

    const profileMap =
      new Map<
        string,
        DocumentData
      >();

    for (
      const doc of profileSnapshot.docs
    ) {
      profileMap.set(
        doc.id,
        doc.data(),
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SUBSCRIPTIONS                                                          */
    /* ---------------------------------------------------------------------- */

    const subscriptionSnapshot =
      await adminDb
        .collection("subscriptions")
        .get();

    const subscriptionsByUser =
      new Map<
        string,
        Array<
          DocumentData & {
            id: string;
          }
        >
      >();

    for (
      const doc of
        subscriptionSnapshot.docs
    ) {
      const data = doc.data();

      const uid = String(
        data.userId ||
          data.uid ||
          data.userUid ||
          "",
      ).trim();

      if (!uid) {
        continue;
      }

      const existing =
        subscriptionsByUser.get(uid) ||
        [];

      existing.push({
        id: doc.id,
        ...data,
      });

      subscriptionsByUser.set(
        uid,
        existing,
      );
    }

    const now = Date.now();

    /* ---------------------------------------------------------------------- */
    /* BUILD CUSTOMER ROWS                                                    */
    /* ---------------------------------------------------------------------- */

    const users: UserRow[] =
      customerUsers.map(
        (firebaseUser) => {
          const profile =
            profileMap.get(
              firebaseUser.uid,
            ) || {};

          const subscriptions =
            subscriptionsByUser.get(
              firebaseUser.uid,
            ) || [];

          /*
           * Find currently active subscription.
           */
          const activeSubscription =
            subscriptions.find(
              (subscription) => {
                const startsAt =
                  timestampToMillis(
                    subscription.startsAt ||
                      subscription.startDate,
                  );

                const expiresAt =
                  timestampToMillis(
                    subscription.expiresAt ||
                      subscription.endDate,
                  );

                return (
                  startsAt <= now &&
                  expiresAt > now
                );
              },
            );

          let active:
            | UserRow["active"]
            | undefined;

          if (activeSubscription) {
            const startsAt =
              timestampToMillis(
                activeSubscription.startsAt ||
                  activeSubscription.startDate,
              );

            const expiresAt =
              timestampToMillis(
                activeSubscription.expiresAt ||
                  activeSubscription.endDate,
              );

            active = {
              id: String(
                activeSubscription.id,
              ),

              planName: String(
                activeSubscription.planName ||
                  activeSubscription.plan ||
                  activeSubscription.planId ||
                  "Active plan",
              ),

              startsAt:
                new Date(
                  startsAt,
                ).toISOString(),

              expiresAt:
                new Date(
                  expiresAt,
                ).toISOString(),

              used: Number(
                activeSubscription.used ??
                  activeSubscription.changesUsed ??
                  0,
              ),

              limit: Number(
                activeSubscription.limit ??
                  activeSubscription.changesLimit ??
                  activeSubscription.allowance ??
                  0,
              ),
            };
          }

          const name =
            String(
              profile.name ||
                firebaseUser.displayName ||
                "",
            ).trim() ||
            "Unnamed user";

          const phone =
            String(
              profile.phone ||
                profile.phoneNumber ||
                firebaseUser.phoneNumber ||
                "",
            ).trim();

          return {
            uid: firebaseUser.uid,

            email:
              firebaseUser.email || "",

            name,

            phone,

            createdAt:
              firebaseUser.metadata
                .creationTime
                ? new Date(
                    firebaseUser.metadata
                      .creationTime,
                  ).toISOString()
                : null,

            emailVerified:
              firebaseUser.emailVerified,

            disabled:
              firebaseUser.disabled,

            ...(active
              ? { active }
              : {}),
          };
        },
      );

    /* ---------------------------------------------------------------------- */
    /* NEWEST USERS FIRST                                                     */
    /* ---------------------------------------------------------------------- */

    users.sort(
      (a, b) => {
        const timeA =
          a.createdAt
            ? new Date(
                a.createdAt,
              ).getTime()
            : 0;

        const timeB =
          b.createdAt
            ? new Date(
                b.createdAt,
              ).getTime()
            : 0;

        return timeB - timeA;
      },
    );

    /* ---------------------------------------------------------------------- */
    /* REAL CUSTOMER COUNTS                                                   */
    /* ---------------------------------------------------------------------- */

    /*
     * IMPORTANT:
     *
     * Admin accounts have already been removed
     * from "users".
     *
     * Therefore this is the exact customer count.
     */
    const totalUsers =
      users.length;

    const activeUsers =
      users.filter(
        (user) =>
          Boolean(user.active),
      ).length;

    const expiredUsers =
      users.filter(
        (user) => {
          const subscriptions =
            subscriptionsByUser.get(
              user.uid,
            ) || [];

          return subscriptions.some(
            (subscription) => {
              const expiresAt =
                timestampToMillis(
                  subscription.expiresAt ||
                    subscription.endDate,
                );

              return (
                expiresAt > 0 &&
                expiresAt <= now
              );
            },
          );
        },
      ).length;

    /* ---------------------------------------------------------------------- */
    /* PAYMENTS                                                                */
    /* ---------------------------------------------------------------------- */

    let totalRevenue = 0;

    try {
      const paymentSnapshot =
        await adminDb
          .collection("payments")
          .get();

      for (
        const doc of
          paymentSnapshot.docs
      ) {
        const payment =
          doc.data();

        const status =
          String(
            payment.status || "",
          )
            .trim()
            .toLowerCase();

        const captured =
          payment.captured === true ||
          status === "captured" ||
          status === "paid" ||
          status === "success";

        if (!captured) {
          continue;
        }

        const amount =
          Number(
            payment.amount ||
              payment.amountPaid ||
              0,
          );

        /*
         * Razorpay normally stores
         * amount in paise.
         */
        totalRevenue +=
          amount > 1000
            ? amount / 100
            : amount;
      }
    } catch (error) {
      console.warn(
        "Could not read payments:",
        error,
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PAGINATION                                                              */
    /* ---------------------------------------------------------------------- */

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalUsers /
            PAGE_SIZE,
        ),
      );

    const safePage =
      Math.min(
        requestedPage,
        totalPages,
      );

    const start =
      (safePage - 1) *
      PAGE_SIZE;

    const paginatedUsers =
      users.slice(
        start,
        start + PAGE_SIZE,
      );

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                                */
    /* ---------------------------------------------------------------------- */

    const response =
      NextResponse.json({
        success: true,

        /*
         * These values are generated
         * directly from current Firebase
         * Authentication + Firestore data.
         */
        totalUsers,

        activeUsers,

        expiredUsers,

        totalRevenue,

        users:
          paginatedUsers,

        page:
          safePage,

        pageSize:
          PAGE_SIZE,

        totalPages,

        generatedAt:
          new Date().toISOString(),
      });

    /*
     * Prevent browser/CDN caching.
     */
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );

    response.headers.set(
      "Pragma",
      "no-cache",
    );

    response.headers.set(
      "Expires",
      "0",
    );

    return response;
  } catch (error: unknown) {
    console.error(
      "Admin dashboard GET failed:",
      error,
    );

    const err =
      error as {
        message?: string;
      };

    const message =
      err.message ||
      "Failed to load admin dashboard.";

    const normalized =
      message.toLowerCase();

    const status =
      normalized.includes(
        "unauthorized",
      )
        ? 401
        : normalized.includes(
              "forbidden",
            )
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PERMANENT USER DELETE                                                      */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request,
) {
  try {
    const admin =
      await verifyAdmin(request);

    const { searchParams } =
      new URL(request.url);

    const uid =
      String(
        searchParams.get("uid") || "",
      ).trim();

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User UID is required.",
        },
        { status: 400 },
      );
    }

    /*
     * Never delete the currently
     * logged-in administrator.
     */
    if (uid === admin.uid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot delete the currently logged-in administrator.",
        },
        { status: 403 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* GET TARGET FIREBASE USER                                               */
    /* ---------------------------------------------------------------------- */

    let targetUser;

    try {
      targetUser =
        await adminAuth.getUser(uid);
    } catch (error: unknown) {
      const firebaseError =
        error as {
          code?: string;
          message?: string;
        };

      if (
        firebaseError.code ===
        "auth/user-not-found"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "User not found in Firebase Authentication.",
          },
          { status: 404 },
        );
      }

      throw error;
    }

    const targetEmail =
      normalizeEmail(
        targetUser.email,
      );

    /* ---------------------------------------------------------------------- */
    /* NEVER DELETE PRIMARY ADMIN                                             */
    /* ---------------------------------------------------------------------- */

    if (
      targetEmail ===
      PRIMARY_ADMIN_EMAIL
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator account cannot be deleted.",
        },
        { status: 403 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* NEVER DELETE OTHER ADMINS                                               */
    /* ---------------------------------------------------------------------- */

    const {
      adminUids,
      adminEmails,
    } =
      await getAdminIdentifiers();

    if (
      adminUids.has(uid) ||
      adminEmails.has(
        targetEmail,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator accounts cannot be deleted from customer management.",
        },
        { status: 403 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DELETE FIRESTORE USER PROFILE                                          */
    /* ---------------------------------------------------------------------- */

    const userRef =
      adminDb
        .collection("users")
        .doc(uid);

    const userDoc =
      await userRef.get();

    if (userDoc.exists) {
      await userRef.delete();
    }

    /* ---------------------------------------------------------------------- */
    /* DELETE SUBSCRIPTIONS                                                   */
    /* ---------------------------------------------------------------------- */

    const cleanupTargets = [
      [
        "subscriptions",
        "userId",
      ],
      [
        "subscriptions",
        "uid",
      ],
      [
        "subscriptions",
        "userUid",
      ],
    ] as const;

    for (
      const [
        collectionName,
        fieldName,
      ] of cleanupTargets
    ) {
      try {
        await deleteQueryMatches(
          collectionName,
          fieldName,
          uid,
        );
      } catch (error) {
        /*
         * Do not stop the main Firebase Auth
         * deletion because one optional
         * cleanup query failed.
         */
        console.warn(
          `Could not clean ${collectionName}.${fieldName}:`,
          error,
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* DELETE FIREBASE AUTH ACCOUNT                                            */
    /* ---------------------------------------------------------------------- */

    await adminAuth.deleteUser(
      uid,
    );

    const response =
      NextResponse.json({
        success: true,

        message:
          "User permanently deleted.",

        uid,

        email:
          targetEmail,
      });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );

    return response;
  } catch (error: unknown) {
    console.error(
      "Admin permanent user deletion failed:",
      error,
    );

    const err =
      error as {
        message?: string;
      };

    const message =
      err.message ||
      "Failed to permanently delete user.";

    const normalized =
      message.toLowerCase();

    const status =
      normalized.includes(
        "unauthorized",
      )
        ? 401
        : normalized.includes(
              "forbidden",
            )
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}