import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DecodedAdmin = {
  uid: string;
  email?: string;
};

async function verifyAdmin(
  request: Request,
): Promise<DecodedAdmin> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Unauthorized access. Token missing.");
  }

  const token = header
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    throw new Error("Authentication token is empty.");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  const email = String(decoded.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw new Error("Invalid token payload.");
  }

  const adminSnapshot = await adminDb
    .collection("admins")
    .limit(100)
    .get();

  const isAdmin = adminSnapshot.docs.some((doc) => {
    const data = doc.data();

    const storedEmail = String(data.email || "")
      .trim()
      .toLowerCase();

    const storedUid = String(
      data.uid || data.firebaseUid || "",
    ).trim();

    return (
      storedEmail === email ||
      storedUid === decoded.uid ||
      doc.id === decoded.uid ||
      doc.id.trim().toLowerCase() === email
    );
  });

  if (!isAdmin) {
    throw new Error("Forbidden. Admin access only.");
  }

  return {
    uid: decoded.uid,
    email,
  };
}

async function deleteQueryMatches(
  collectionName: string,
  fieldName: string,
  uid: string,
): Promise<number> {
  const snapshot = await adminDb
    .collection(collectionName)
    .where(fieldName, "==", uid)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = adminDb.batch();

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();

  return snapshot.size;
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin(request);

    const { searchParams } = new URL(request.url);

    const uid = String(
      searchParams.get("uid") || "",
    ).trim();

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message: "User UID is required.",
        },
        { status: 400 },
      );
    }

    /*
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
        { status: 403 },
      );
    }

    /*
     * Get the Firebase Authentication user first.
     */
    let targetUser;

    try {
      targetUser = await adminAuth.getUser(uid);
    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
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

    const targetEmail = String(
      targetUser.email || "",
    )
      .trim()
      .toLowerCase();

    /*
     * Never allow an account that exists in the
     * admins collection to be deleted as a user.
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

        return (
          storedEmail === targetEmail ||
          storedUid === uid ||
          doc.id === uid ||
          doc.id.trim().toLowerCase() ===
            targetEmail
        );
      });

    if (targetIsAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator accounts cannot be deleted from customer management.",
        },
        { status: 403 },
      );
    }

    /*
     * Delete portal user profile.
     */
    const userRef = adminDb
      .collection("users")
      .doc(uid);

    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.delete();
    }

    /*
     * Delete subscription records.
     *
     * Some projects use userId while others use uid,
     * so both fields are cleaned.
     */
    const cleanupTargets = [
      ["subscriptions", "userId"],
      ["subscriptions", "uid"],
    ] as const;

    for (const [
      collectionName,
      fieldName,
    ] of cleanupTargets) {
      try {
        await deleteQueryMatches(
          collectionName,
          fieldName,
          uid,
        );
      } catch (error) {
        console.warn(
          `Could not clean ${collectionName}.${fieldName}:`,
          error,
        );
      }
    }

    /*
     * Finally delete the Firebase Authentication user.
     */
    await adminAuth.deleteUser(uid);

    const response = NextResponse.json({
      success: true,
      message: "User permanently deleted.",
      uid,
      email: targetEmail,
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

    const firebaseError = error as {
      message?: string;
    };

    const message = String(
      firebaseError?.message ||
        "Failed to permanently delete user.",
    );

    const lowerMessage =
      message.toLowerCase();

    const status = lowerMessage.includes(
      "unauthorized",
    )
      ? 401
      : lowerMessage.includes("forbidden")
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
          "Cache-Control": "no-store",
        },
      },
    );
  }
}