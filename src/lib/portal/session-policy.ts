/**
 * =============================================================
 * SESSION LIFETIME POLICY
 * =============================================================
 *
 * How long a sign-in stays valid before the account must
 * authenticate again.
 *
 *   administrator   30 minutes
 *   customer         6 hours
 *
 * An administrator session can read every customer record, delete
 * accounts and open the diagnostics console, so an unattended
 * browser is worth far more to someone who finds it. The customer
 * session sees only that customer's own data, and forcing a
 * re-login every half hour on a self-service portal would push
 * people toward saved passwords, which is a worse trade.
 *
 * Measured from `auth_time` — the moment the user actually proved
 * their identity — not from the token's own expiry. A Firebase ID
 * token lasts an hour and the SDK silently refreshes it forever, so
 * `exp` says nothing about how long someone has been signed in.
 * `auth_time` survives every refresh, which makes it the only claim
 * that can express an absolute session age.
 *
 * Deliberately free of imports so both the server guard and the
 * browser countdown can share one definition. Two copies of a
 * timeout drift, and the drift is always in the unsafe direction.
 */

export const ADMIN_SESSION_MS = 30 * 60 * 1000;
export const USER_SESSION_MS = 6 * 60 * 60 * 1000;

/**
 * Warn the user this long before the session ends, so a logout is
 * never a surprise mid-task.
 */
export const SESSION_WARNING_MS = 2 * 60 * 1000;

/**
 * Tolerance for clock skew between this server and Google's token
 * issuer. Without it, a client a few seconds fast would be logged
 * out slightly early and, worse, inconsistently.
 */
const CLOCK_SKEW_MS = 30 * 1000;

export type SessionScope = "admin" | "user";

export function sessionLimitMs(scope: SessionScope): number {
  return scope === "admin" ? ADMIN_SESSION_MS : USER_SESSION_MS;
}

export interface SessionAge {
  scope: SessionScope;
  limitMs: number;
  /** Milliseconds since the account actually authenticated. */
  ageMs: number;
  /** Milliseconds left before the session must end; 0 once expired. */
  remainingMs: number;
  expired: boolean;
}

/**
 * Evaluate a session from its authentication time.
 *
 * `authTimeMs` is the `auth_time` claim in milliseconds. A missing or
 * nonsensical value is treated as expired: a session whose age cannot
 * be established must not be trusted to be young.
 */
export function evaluateSession(
  authTimeMs: number | undefined,
  scope: SessionScope,
  now = Date.now(),
): SessionAge {
  const limitMs = sessionLimitMs(scope);

  if (
    typeof authTimeMs !== "number" ||
    !Number.isFinite(authTimeMs) ||
    authTimeMs <= 0
  ) {
    return { scope, limitMs, ageMs: limitMs, remainingMs: 0, expired: true };
  }

  // A token issued slightly in the future is skew, not a 0 age.
  const ageMs = Math.max(0, now - authTimeMs);
  const remainingMs = Math.max(0, limitMs - ageMs);

  return {
    scope,
    limitMs,
    ageMs,
    remainingMs,
    expired: ageMs > limitMs + CLOCK_SKEW_MS,
  };
}

/** Short human label, for a toast or a countdown. */
export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.floor(totalSeconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours}h ${rest}m`;
}
