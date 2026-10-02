import "server-only";

import { createHash } from "node:crypto";

import { db } from "./server";

/**
 * =========================================================
 * LOGIN RATE LIMIT  (TOKEN BUCKET)
 * =========================================================
 *
 * One bucket implementation serves both sign-in roles,
 * user and administrator, because both use /login:
 *
 *   capacity : 5 tokens  -> 5 attempts
 *   refill   : 1 token every 3 minutes (5 per 15 minutes)
 *   emptied  : locked for 15 minutes
 *
 * When that lock ends the bucket does NOT hand back all five
 * attempts at once. It releases a single token, and the
 * remaining four drip back one every 3 minutes, so a visitor
 * who keeps failing stays limited to one try at a time while
 * an honest visitor recovers fully in 12 quiet minutes.
 *
 * The state lives in Firestore, so the limit holds across
 * serverless instances and cold starts instead of resetting
 * with each new function container.
 */

export const LOGIN_CAPACITY = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** One token per 3 minutes. */
const TOKEN_INTERVAL_MS = LOGIN_WINDOW_MS / LOGIN_CAPACITY;

/** Time the drip needs to carry the bucket from 1 token back to full. */
const DRIP_MS = (LOGIN_CAPACITY - 1) * TOKEN_INTERVAL_MS;

const COLLECTION = "loginRateLimits";

type Bucket = {
  tokens: number;
  updatedAt: number;
  lockedUntil: number;
  /** While the clock is before this, the bucket is still dripping back. */
  dripUntil: number;
};

export type LoginLimit = {
  allowed: boolean;
  remaining: number;
  /** Wait before another attempt is possible, 0 while tokens are left. */
  retryAfterMs: number;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * The email address is never stored in clear text, and pairing it
 * with the caller's address keeps one visitor from locking another
 * person out of their own account.
 */
export function loginRateLimitKey(email: string, ip: string) {
  return `${hash(email.trim().toLowerCase())}_${hash(ip)}`;
}

function fullBucket(now: number): Bucket {
  return {
    tokens: LOGIN_CAPACITY,
    updatedAt: now,
    lockedUntil: 0,
    dripUntil: 0,
  };
}

function storedBucket(
  data: Record<string, unknown> | undefined,
  now: number,
): Bucket {
  const tokens = Number(data?.tokens);
  const updatedAt = Number(data?.updatedAt);
  const lockedUntil = Number(data?.lockedUntil);
  const dripUntil = Number(data?.dripUntil);

  // A missing, corrupt or future-dated document must not grant or
  // deny attempts by accident: start from a full bucket instead.
  if (
    !Number.isFinite(tokens) ||
    !Number.isFinite(updatedAt) ||
    updatedAt > now + 60_000
  ) {
    return fullBucket(now);
  }

  const within = (value: number, limit: number) =>
    Number.isFinite(value) && value > 0 && value <= now + limit
      ? value
      : 0;

  return {
    tokens: Math.min(LOGIN_CAPACITY, Math.max(0, tokens)),
    updatedAt,
    lockedUntil: within(lockedUntil, LOGIN_WINDOW_MS),
    dripUntil: within(dripUntil, LOGIN_WINDOW_MS + DRIP_MS),
  };
}

function refill(bucket: Bucket, now: number): Bucket {
  // A locked bucket does not refill at all.
  if (bucket.lockedUntil > now) {
    return {
      tokens: 0,
      updatedAt: now,
      lockedUntil: bucket.lockedUntil,
      dripUntil: bucket.dripUntil,
    };
  }

  // The 15 minute lock has ended: one token is released now and the
  // rest drip back, instead of all five returning together.
  if (bucket.lockedUntil > 0) {
    const sinceUnlock = now - bucket.lockedUntil;

    return {
      tokens: Math.min(
        LOGIN_CAPACITY,
        1 + sinceUnlock / TOKEN_INTERVAL_MS,
      ),
      updatedAt: now,
      lockedUntil: 0,
      dripUntil: bucket.dripUntil || bucket.lockedUntil + DRIP_MS,
    };
  }

  const gained =
    Math.max(0, now - bucket.updatedAt) / TOKEN_INTERVAL_MS;

  return {
    tokens: Math.min(LOGIN_CAPACITY, bucket.tokens + gained),
    updatedAt: now,
    lockedUntil: 0,
    dripUntil: bucket.dripUntil,
  };
}

function waitFor(bucket: Bucket, now: number) {
  if (bucket.tokens >= 1) return 0;

  if (bucket.lockedUntil > now) {
    return Math.ceil(bucket.lockedUntil - now);
  }

  return Math.ceil((1 - bucket.tokens) * TOKEN_INTERVAL_MS);
}

/**
 * Take one token for a sign-in attempt.
 *
 * `allowed: false` means the attempt must not reach Firebase at all.
 * `remaining` is how many attempts are left after this one, and
 * `retryAfterMs` how long the next one has to wait once none are.
 */
export async function takeLoginToken(key: string): Promise<LoginLimit> {
  const ref = db().collection(COLLECTION).doc(key);

  return db().runTransaction(async (transaction) => {
    const now = Date.now();
    const snapshot = await transaction.get(ref);
    const current = refill(storedBucket(snapshot.data(), now), now);

    if (current.tokens < 1) {
      // Keep the lock in place and record nothing further, so hammering
      // the endpoint cannot extend somebody's lock indefinitely.
      transaction.set(ref, current, { merge: true });

      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: waitFor(current, now),
      };
    }

    const tokens = current.tokens - 1;

    // A bucket emptied while it is still dripping back must not start
    // another 15 minute lock; the 3 minute drip already paces it.
    const recovering = now < current.dripUntil;
    const lockedUntil =
      tokens < 1 && !recovering ? now + LOGIN_WINDOW_MS : 0;

    const next: Bucket = {
      tokens,
      updatedAt: now,
      lockedUntil,
      dripUntil: lockedUntil > 0 ? lockedUntil + DRIP_MS : current.dripUntil,
    };

    transaction.set(ref, next);

    // This attempt holds its token, so it is allowed even when it was
    // the last one: remaining 0 means the bucket is now empty.
    return {
      allowed: true,
      remaining: Math.floor(tokens),
      retryAfterMs: waitFor(next, now),
    };
  });
}

/**
 * A successful sign-in clears the bucket for that email and address.
 */
export async function resetLoginLimit(key: string): Promise<void> {
  await db().collection(COLLECTION).doc(key).delete();
}
