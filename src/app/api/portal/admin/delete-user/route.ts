import { NextResponse } from "next/server";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type DecodedAdmin = {
  uid: string;
  email?: string;
};

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

/**
 * Verify that the request is coming from an authenticated admin.
 */
async function verifyAdmin(
  request: Request,
): Promise<DecodedAdmin> {
  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new Error("Unauthorized access. Token missing.");
  }

  const token = header
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    throw new Error("Authentication token is empty.");
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error: unknown) {
    const firebaseError = error as FirebaseAuthError;

    console.error(
      "Firebase admin token verification failed:",
      firebaseError,
    );

    throw new Error("Unauthorized access. Invalid authentication token.");
  }

  const email = String(decoded.email || "")
    .trim()
    .toLowerCase();

  if (!decoded.uid) {
    throw new Error("Invalid token payload.");
  }

  /**
   * Check the admins collection.
   *
   * Supported admin formats:
   *
   * 1. admins/{uid}
   * 2. admins/{email}
   * 3. { uid: "..." }
   * 4. { firebaseUid: "..." }
   * 5. { email: "..." }
   */
  const adminSnapshot = await adminDb
    .collection("admins")
    .limit(100)
    .get();

  const isAdmin = adminSnapshot.docs.some((doc) => {
    const data = doc.data();

    const storedEmail = String(
      data.email || "",
    )
      .trim()
      .toLowerCase();

    const storedUid = String(
      data.uid ||
        data.firebaseUid ||
        "",
    ).trim();

    const documentId = String(doc.id)
      .trim()
      .toLowerCase();

    return (
      (email && storedEmail === email) ||
      (decoded.uid && storedUid === decoded.uid) ||
      documentId === decoded.uid.toLowerCase() ||
      (email && documentId === email)
    );
  });

  if (!isAdmin) {
    throw new Error("Forbidden. Admin access only.");
  }

  return {
    uid: decoded.uid,
    email: email || undefined,
  };
}

/**
 * Delete all documents matching a UID.
 */
async function deleteQueryMatches(
  collectionName: string,
  fieldName: string,
  uid: string,
): Promise<number> {
  const adminDb = getAdminDb();

  const snapshot = await adminDb
    .collection(collectionName)
    .where(fieldName, "==", uid)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  /**
   * Firestore batches support a maximum of 500 operations.
   * Delete in chunks so this also works for larger datasets.
   */
  const documents = snapshot.docs;

  let deletedCount = 0;

  for (let i = 0; i < documents.length; i += 500) {
    const chunk = documents.slice(i, i + 500);

    const batch = adminDb.batch();

    for (const doc of chunk) {
      batch.delete(doc.ref);
    }

    await batch.commit();

    deletedCount += chunk.length;
  }

  return deletedCount;
}

/**
 * DELETE /api/portal/admin/delete-user?uid=USER_UID
 */
export async function DELETE(
  request: Request,
) {
  try {
    const admin = await verifyAdmin(request);

    const { searchParams } = new URL(
      request.url,
    );

    const uid = String(
      searchParams.get("uid") || "",
    ).trim();

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message: "User UID is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /**
     * Never allow the currently logged-in admin
     * to delete their own account.
     */
    if (uid === admin.uid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot delete the currently logged-in administrator.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    /**
     * First check whether the Firebase Authentication
     * account exists.
     */
    let targetUser;

    try {
      targetUser = await adminAuth.getUser(uid);
    } catch (error: unknown) {
      const firebaseError =
        error as FirebaseAuthError;

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
          {
            status: 404,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      }

      console.error(
        "Failed to get Firebase user:",
        firebaseError,
      );

      throw error;
    }

    const targetEmail = String(
      targetUser.email || "",
    )
      .trim()
      .toLowerCase();

    /**
     * Never allow deletion of an account that
     * belongs to the admins collection.
     */
    const targetAdminSnapshot = await adminDb
      .collection("admins")
      .limit(100)
      .get();

    const targetIsAdmin =
      targetAdminSnapshot.docs.some((doc) => {
        const data = doc.data();

        const storedEmail = String(
          data.email || "",
        )
          .trim()
          .toLowerCase();

        const storedUid = String(
          data.uid ||
            data.firebaseUid ||
            "",
        ).trim();

        const documentId = String(doc.id)
          .trim()
          .toLowerCase();

        return (
          (targetEmail &&
            storedEmail === targetEmail) ||
          storedUid === uid ||
          documentId === uid.toLowerCase() ||
          (targetEmail &&
            documentId === targetEmail)
        );
      });

    if (targetIsAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator accounts cannot be deleted from customer management.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Also block deletion of the primary admin email from env
    const envAdminEmail = String(
      process.env.YOUR_PRIMARY_ADMIN_EMAIL || "",
    ).trim().toLowerCase();

    if (
      (envAdminEmail && targetEmail === envAdminEmail) ||
      targetEmail === "chandankkumar156@gmail.com"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator accounts cannot be deleted from customer management.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /**
     * Delete the user's Firestore portalUsers profile.
     */
    const portalUserRef = adminDb
      .collection("portalUsers")
      .doc(uid);

    const portalUserDoc = await portalUserRef.get();

    if (portalUserDoc.exists) {
      await portalUserRef.delete();
    }

    // Also try legacy "users" collection
    const userRef = adminDb
      .collection("users")
      .doc(uid);

    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.delete();
    }

    /**
     * Delete subscriptions associated with this UID.
     *
     * Different records may use either:
     *
     * userId
     * uid
     */
    const cleanupTargets = [
      ["portalSubscriptions", "uid"],
      ["subscriptions", "userId"],
      ["subscriptions", "uid"],
    ] as const;

    const cleanupResults: Record<
      string,
      number
    > = {};

    for (const [
      collectionName,
      fieldName,
    ] of cleanupTargets) {
      try {
        const deletedCount =
          await deleteQueryMatches(
            collectionName,
            fieldName,
            uid,
          );

        cleanupResults[
          `${collectionName}.${fieldName}`
        ] = deletedCount;
      } catch (error: unknown) {
        console.warn(
          `Could not clean ${collectionName}.${fieldName}:`,
          error,
        );

        cleanupResults[
          `${collectionName}.${fieldName}`
        ] = 0;
      }
    }

    /**
     * Finally delete the Firebase Authentication
     * account.
     *
     * This is intentionally done last.
     */
    try {
      await adminAuth.deleteUser(uid);
    } catch (error: unknown) {
      const firebaseError =
        error as FirebaseAuthError;

      console.error(
        "Firebase Authentication deletion failed:",
        firebaseError,
      );

      /**
       * If Auth deletion fails, return an error.
       * Firestore cleanup may already have happened,
       * so the UI should report the actual failure.
       */
      throw error;
    }

    /**
     * Successful response.
     */
    const response = NextResponse.json(
      {
        success: true,
        message: "User permanently deleted.",
        uid,
        email: targetEmail,
        cleanup: cleanupResults,
      },
      {
        status: 200,
      },
    );

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

    const firebaseError =
      error as FirebaseAuthError;

    const message = String(
      firebaseError?.message ||
        "Failed to permanently delete user.",
    );

    const lowerMessage =
      message.toLowerCase();

    let status = 500;

    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("invalid authentication") ||
      lowerMessage.includes("token")
    ) {
      status = 401;
    } else if (
      lowerMessage.includes("forbidden") ||
      lowerMessage.includes("admin access")
    ) {
      status = 403;
    } else if (
      firebaseError?.code ===
      "auth/user-not-found"
    ) {
      status = 404;
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
          "Pragma": "no-cache",
        },
      },
    );
  }
}