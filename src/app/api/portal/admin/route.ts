import { NextResponse } from "next/server";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DecodedAdmin = {
  uid: string;
  email: string;
};

async function verifyAdmin(
  request: Request,
): Promise<DecodedAdmin> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    throw new Error(
      "Unauthorized access. Firebase ID token is missing.",
    );
  }

  const token = authorization
    .substring("Bearer ".length)
    .trim();

  if (!token) {
    throw new Error(
      "Authentication token is empty.",
    );
  }

  let decodedToken;

  try {
    decodedToken =
      await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "Firebase ID token verification failed:",
      error,
    );

    throw new Error(
      "Unauthorized. Invalid or expired Firebase token.",
    );
  }

  const uid = String(
    decodedToken.uid || "",
  ).trim();

  const email = String(
    decodedToken.email || "",
  )
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

  /*
   * =========================================================
   * 1. FIRST CHECK:
   * admins/{uid}
   * =========================================================
   */

  const adminByUidRef = adminDb
    .collection("admins")
    .doc(uid);

  const adminByUid =
    await adminByUidRef.get();

  if (adminByUid.exists) {
    const data = adminByUid.data() || {};

    const active =
      data.active !== false;

    const role = String(
      data.role || "admin",
    )
      .trim()
      .toLowerCase();

    if (active && role === "admin") {
      return {
        uid,
        email,
      };
    }
  }

  /*
   * =========================================================
   * 2. SECOND CHECK:
   * admins collection by email
   * =========================================================
   */

  const emailSnapshot = await adminDb
    .collection("admins")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!emailSnapshot.empty) {
    const adminDoc =
      emailSnapshot.docs[0];

    const data = adminDoc.data() || {};

    const storedUid = String(
      data.uid || adminDoc.id || "",
    ).trim();

    const active =
      data.active !== false;

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
      return {
        uid,
        email,
      };
    }
  }

  /*
   * =========================================================
   * ADMIN NOT FOUND
   * =========================================================
   */

  console.error(
    "Admin authorization failed:",
    {
      uid,
      email,
      adminByUidExists:
        adminByUid.exists,
      emailMatchCount:
        emailSnapshot.size,
    },
  );

  throw new Error(
    "Forbidden. Admin access only.",
  );
}

/*
 * =========================================================
 * GET ADMIN USERS
 * =========================================================
 */

export async function GET(
  request: Request,
) {
  try {
    await verifyAdmin(request);

    const adminDb = getAdminDb();

    const { searchParams } =
      new URL(request.url);

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || "1",
      ),
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("pageSize") ||
            "20",
        ),
      ),
    );

    /*
     * Fetch portal users.
     *
     * Change "portalUsers" to "users"
     * only if your actual Firestore collection
     * is named users.
     */
    const snapshot = await adminDb
      .collection("portalUsers")
      .get();

    const users = snapshot.docs.map(
      (doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          uid: String(
            data.uid || doc.id,
          ),
          email:
            data.email || "",
          fullName:
            data.fullName ||
            data.name ||
            "",
          phone:
            data.phone ||
            data.phoneNumber ||
            "",
          role:
            data.role ||
            "user",
          createdAt:
            data.createdAt || null,
          ...data,
        };
      },
    );

    const total = users.length;

    const start =
      (page - 1) * pageSize;

    const paginatedUsers =
      users.slice(
        start,
        start + pageSize,
      );

    const response =
      NextResponse.json({
        success: true,
        users: paginatedUsers,
        data: paginatedUsers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages:
            Math.ceil(
              total / pageSize,
            ),
        },
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