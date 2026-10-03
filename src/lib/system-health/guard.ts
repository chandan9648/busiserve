import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { resolveAdminAccess } from "@/lib/portal/admin-access";
import { authenticate, PortalError } from "@/lib/portal/server";
import { recordThreat } from "@/lib/security/events";

/**
 * =============================================================
 * DIAGNOSTIC ENDPOINT GUARD
 * =============================================================
 *
 * This endpoint returns a map of the application's weak points, so
 * it is more sensitive than the data it describes. It must never
 * answer anyone but an administrator.
 *
 * Authentication reuses the portal's own `authenticate()`, which
 * verifies the Firebase ID token with the revocation check enabled.
 *
 * Authorisation reuses `resolveAdminAccess()`, the same definition
 * the /admin dashboard answers to. That shared definition matters:
 * an earlier version of this guard consulted only PORTAL_ADMIN_UIDS
 * and therefore refused administrators that the rest of the
 * application accepts, locking the real operator out of their own
 * diagnostics. A console that is stricter than the thing it monitors
 * is not more secure, just unusable.
 */

export class SystemHealthAccessError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 | 500,
    /** Safe, non-identifying detail for an authenticated caller. */
    public reason?: string,
  ) {
    super(message);
    this.name = "SystemHealthAccessError";
  }
}

export async function requireSystemHealthAdmin(
  request: Request,
): Promise<DecodedIdToken> {
  let token: DecodedIdToken;

  /* ---- Authentication ----------------------------------------- */
  try {
    token = await authenticate(request);
  } catch (error) {
    if (error instanceof PortalError) {
      /**
       * An anonymous caller gets one fixed message, so the endpoint
       * cannot be probed to learn whether an account exists.
       */
      throw new SystemHealthAccessError(
        "Authentication required.",
        error.status === 403 ? 403 : 401,
      );
    }

    /**
     * A configuration failure is not an authentication failure and
     * must not be reported as one, or a broken Firebase credential
     * looks like a bad password.
     */
    throw new SystemHealthAccessError("Diagnostics are unavailable.", 500);
  }

  /* ---- Authorisation ------------------------------------------ */
  const access = await resolveAdminAccess(token);

  if (access.allowed) return token;

  /**
   * An authenticated caller who is not an administrator just reached
   * for the diagnostics console. That is either a signed-in customer
   * probing, or a stolen session being tested — both worth an alarm.
   *
   * Two refusals are not intrusions and must not raise an alarm:
   * a directory outage means the check could not run, and an expired
   * session means a legitimate administrator simply stayed signed in
   * too long. Logging either would train the operator to ignore the
   * feed that matters.
   */
  if (
    access.reason !== "directory-unavailable" &&
    access.reason !== "session-expired"
  ) {
    void recordThreat("unauthorized-admin", request);
  }

  /**
   * The caller has already proven their identity, so naming the
   * failed gate discloses nothing to a stranger and saves an
   * operator from guessing why their own console refused them.
   */
  if (access.reason === "directory-unavailable") {
    throw new SystemHealthAccessError(
      "Administrator access could not be confirmed: the admin directory is unreachable. If you are listed in PORTAL_ADMIN_UIDS this check does not depend on Firestore, so verify that your UID is listed there.",
      403,
      "directory-unavailable",
    );
  }

  if (access.reason === "session-expired") {
    throw new SystemHealthAccessError(
      "Administrator sessions end after 30 minutes. Please sign in again.",
      403,
      "session-expired",
    );
  }

  if (access.reason === "record-disabled") {
    throw new SystemHealthAccessError(
      "This administrator record is disabled.",
      403,
      "record-disabled",
    );
  }

  throw new SystemHealthAccessError(
    "Administrator access required. This account is not in PORTAL_ADMIN_UIDS, does not match YOUR_PRIMARY_ADMIN_EMAIL with a verified address, and has no enabled record in the admins collection.",
    403,
    "not-an-admin",
  );
}
