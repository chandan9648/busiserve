import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getAdminDb } from "@/lib/firebase-admin";
import { isAdmin, isConfiguredAdminByEnv } from "./server";
import { evaluateSession } from "./session-policy";

/**
 * =============================================================
 * ADMINISTRATOR ACCESS
 * =============================================================
 *
 * The application recognises an administrator in three ways, and
 * until this module existed they were spread across two route
 * handlers with a third, narrower definition in `isAdmin()`. That
 * divergence is what let an account hold access to /admin while
 * being refused by the diagnostics console.
 *
 *   1. UID allow-list   PORTAL_ADMIN_UIDS (and legacy PORTAL_ADMIN_UID)
 *   2. Primary email    YOUR_PRIMARY_ADMIN_EMAIL
 *   3. Firestore        a document in the `admins` collection
 *
 * Order matters here. (1) is resolved from environment variables
 * alone, so it still answers when Firestore is unreachable — which
 * is precisely when an operator most needs the health console to
 * open. Only if that fast path misses does the check fall through to
 * a Firestore read.
 *
 * Email is honoured only when the token says the address is
 * verified, because an unverified address proves nothing about who
 * controls it. A UID match never requires verification: the UID is
 * already an immutable identifier placed there by an operator.
 */

export type AdminGrant =
  | "uid-allowlist"
  | "primary-email"
  | "admins-collection";

export interface AdminAccess {
  allowed: boolean;
  /** Which rule granted access, for logging. Absent when refused. */
  via?: AdminGrant;
  /** Short, non-identifying reason for a refusal. */
  reason?:
    | "not-an-admin"
    | "record-disabled"
    | "directory-unavailable"
    | "session-expired";
  /**
   * True when the Firestore lookup could not run. Access may still
   * have been granted by the environment fast path.
   */
  directoryDegraded: boolean;
}

interface AdminRecord {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Environment-only check. No I/O, so it cannot fail.
 *
 * Delegates to the canonical implementation in `./server`, which
 * `authenticate()` also uses to pick the session lifetime. Keeping one
 * definition means a session can never be judged "customer" for its
 * timeout while being judged "administrator" for its permissions.
 */
export function isConfiguredAdmin(uid: string, verifiedEmail: string): boolean {
  return isConfiguredAdminByEnv({
    uid,
    email: verifiedEmail,
    // The caller has already applied the verified-email rule.
    email_verified: Boolean(verifiedEmail),
  });
}

/**
 * An explicitly bound UID must match; an email alone must never
 * override it, or reassigning an address would hand over the record.
 */
function matchesRecord(
  record: AdminRecord,
  uid: string,
  verifiedEmail: string,
): boolean {
  const storedUid = String(
    record.data.uid || record.data.firebaseUid || "",
  ).trim();

  if (storedUid) return storedUid === uid;

  return (
    record.id === uid ||
    Boolean(
      verifiedEmail &&
        (String(record.data.email || "").trim().toLowerCase() ===
          verifiedEmail ||
          record.id.toLowerCase() === verifiedEmail),
    )
  );
}

/**
 * Resolve whether this token holds administrator access.
 *
 * Never throws: a Firestore outage is reported through
 * `directoryDegraded` rather than becoming a 500, so a caller can
 * decide for itself whether to admit an environment-listed admin.
 */
export async function resolveAdminAccess(
  token: DecodedIdToken,
): Promise<AdminAccess> {
  const uid = token.uid;

  // An unverified address is not evidence of ownership.
  const verifiedEmail = token.email_verified
    ? String(token.email || "").trim().toLowerCase()
    : "";

  /* ---- Fast path: environment only, no I/O -------------------- */
  if (isAdmin(uid) || (process.env.PORTAL_ADMIN_UID || "").trim() === uid) {
    return { allowed: true, via: "uid-allowlist", directoryDegraded: false };
  }

  if (isConfiguredAdmin(uid, verifiedEmail)) {
    return { allowed: true, via: "primary-email", directoryDegraded: false };
  }

  /* ---- Firestore directory ------------------------------------ */
  let records: AdminRecord[];

  try {
    const snapshot = await getAdminDb().collection("admins").get();

    records = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  } catch {
    return {
      allowed: false,
      reason: "directory-unavailable",
      directoryDegraded: true,
    };
  }

  const matching = records.filter((record) =>
    matchesRecord(record, uid, verifiedEmail),
  );

  // A disabled record revokes access even if another record grants it.
  const disabled = matching.some(
    ({ data }) =>
      data.active === false || data.enabled === false || data.disabled === true,
  );

  if (disabled) {
    return {
      allowed: false,
      reason: "record-disabled",
      directoryDegraded: false,
    };
  }

  const granted = matching.some(
    ({ data }) => String(data.role || "admin").toLowerCase() === "admin",
  );

  if (!granted) {
    return { allowed: false, reason: "not-an-admin", directoryDegraded: false };
  }

  /**
   * This account is an administrator only through the Firestore
   * directory, so `authenticate()` judged its session against the
   * 6 hour customer limit. Apply the 30 minute administrator limit
   * now that the account's real status is known.
   */
  const session = evaluateSession(
    typeof token.auth_time === "number" ? token.auth_time * 1000 : undefined,
    "admin",
  );

  if (session.expired) {
    return {
      allowed: false,
      reason: "session-expired",
      directoryDegraded: false,
    };
  }

  return { allowed: true, via: "admins-collection", directoryDegraded: false };
}
