import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

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

function authCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error, message: error }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request: Request) {
  let deletionStarted = false;
  try {
    const admin = await verifyAdmin(request);
    const uid = new URL(request.url).searchParams.get("uid") || "";
    if (!uid || uid.length > 128 || uid.includes("/") || uid === "." || uid === "..") {
      return failure("A valid user UID is required.", 400);
    }
    if (uid === admin.uid) return failure("You cannot delete your own administrator account.", 403);

    const auth = getAdminAuth();
    const db = getAdminDb();
    let target;
    try {
      target = await auth.getUser(uid);
    } catch (error) {
      if (authCode(error) !== "auth/user-not-found") throw error;
      // Auth may already have been removed by a prior attempt: finish cleanup.
    }
    const profile = await db.collection("portalUsers").doc(uid).get();
    const email = String(target?.email || profile.data()?.email || "").trim().toLowerCase();
    if (configuredAdmin(uid, email) || admin.records.some((record) => matchesAdmin(record, uid, email)) ||
        email === "chandankkumar156@gmail.com") {
      return failure("Administrator accounts cannot be deleted from customer management.", 403);
    }

    // Auth and Firestore cannot share a transaction. Keep a disabled Auth account
    // until cleanup succeeds so partial failures remain visible and retryable.
    deletionStarted = true;
    if (target) {
      try {
        await auth.updateUser(uid, { disabled: true });
        await auth.revokeRefreshTokens(uid);
      } catch (error) {
        if (authCode(error) !== "auth/user-not-found") throw error;
      }
    }

    const cleanup: Record<string, number> = {};
    for (const collection of ["portalUsers", "users"]) {
      await db.recursiveDelete(db.collection(collection).doc(uid));
    }
    for (const collection of ["portalSubscriptions", "subscriptions"]) {
      for (const field of ["uid", "userId"]) {
        let count = 0;
        // Bounded pages avoid reading an unlimited collection into memory.
        while (true) {
          const snapshot = await db.collection(collection).where(field, "==", uid).limit(100).get();
          if (snapshot.empty) break;
          for (const doc of snapshot.docs) {
            await db.recursiveDelete(doc.ref);
            count++;
          }
        }
        cleanup[`${collection}.${field}`] = count;
      }
    }
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (authCode(error) !== "auth/user-not-found") throw error;
    }
    return NextResponse.json({ success: true, uid, cleanup, message: "User permanently deleted." }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Admin user deletion failed", { code: authCode(error), deletionStarted });
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Unauthorized.")) return failure(message, 401);
    if (message.startsWith("Forbidden.")) return failure(message, 403);
    return failure(deletionStarted
      ? "Deletion did not finish. Refresh the list and retry Delete for this user; some data may already be removed."
      : "Could not delete this user. Please retry.", 500);
  }
}
