import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

/**
 * =============================================================
 * PUBLIC FORM RATE LIMIT
 * =============================================================
 *
 * The contact and quote endpoints accept anonymous writes, which a
 * public form requires. Without a limit, each is a loop away from
 * filling a Firestore collection and running up the project's write
 * bill — a cost and spam problem rather than a breach, but a real one.
 *
 * A fixed window per address is the right shape here, not the drip
 * bucket used for sign-in. Sign-in needs a slow recovery so a guesser
 * stays throttled; a human filling in a contact form just needs a
 * ceiling that no person would ever reach.
 *
 * The address is hashed before it becomes a document id, so the limit
 * state is not a record of who visited the site.
 *
 * Fails open. If Firestore is unreachable the submission is allowed:
 * a visitor must never be blocked from contacting the business
 * because a counter was unavailable.
 */

const COLLECTION = "formRateLimits";

/** Generous for a person, immediately restrictive for a script. */
export const FORM_LIMIT = 5;
export const FORM_WINDOW_MS = 10 * 60 * 1000;

export interface FormLimit {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function callerAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Consume one submission slot.
 *
 * The read and the increment share a transaction, so two requests
 * arriving together cannot both see the same count and slip past the
 * ceiling.
 */
export async function takeFormSlot(
  form: "contact" | "quote",
  ip: string,
): Promise<FormLimit> {
  const now = Date.now();
  const windowStart = Math.floor(now / FORM_WINDOW_MS) * FORM_WINDOW_MS;

  const reference = getAdminDb()
    .collection(COLLECTION)
    .doc(`${form}_${hash(ip)}_${windowStart}`);

  try {
    return await getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const used = Number(snapshot.data()?.count) || 0;

      const retryAfterMs = windowStart + FORM_WINDOW_MS - now;

      if (used >= FORM_LIMIT) {
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      transaction.set(
        reference,
        {
          form,
          count: FieldValue.increment(1),
          windowStart,
          // Lets a scheduled cleanup or a TTL policy expire old rows.
          expiresAt: windowStart + FORM_WINDOW_MS,
        },
        { merge: true },
      );

      return {
        allowed: true,
        remaining: FORM_LIMIT - used - 1,
        retryAfterMs: 0,
      };
    });
  } catch {
    // Fail open: a broken counter must not silence the contact form.
    return { allowed: true, remaining: FORM_LIMIT, retryAfterMs: 0 };
  }
}
