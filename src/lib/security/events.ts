import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

/**
 * =============================================================
 * SECURITY EVENT LOG
 * =============================================================
 *
 * Records genuine intrusion signals produced by the application's
 * own guards — a brute-forced sign-in, a forged payment signature, a
 * non-administrator reaching for an admin route, a scanner walking
 * known exploit paths.
 *
 * Nothing here is inferred or synthesised. An event exists only
 * because a real guard refused a real request.
 *
 * Writes are aggregated per minute, per type, per source. An attack
 * is by nature high volume, and one document per request would turn
 * a scan into thousands of Firestore writes — which would make the
 * logging itself the denial of service. Instead the first request in
 * a minute creates a row and the rest increment its counter, so a
 * sustained attack costs one write per minute per source and still
 * reports its true attempt count.
 *
 * Addresses are masked before storage: an operator sees the source
 * network, which is what identifies a campaign, without the log
 * becoming a permanent store of visitors' full IP addresses. The
 * exact address stays available in the hosting platform's own logs
 * for the short window a block decision needs it.
 */

const COLLECTION = "securityEvents";

export type ThreatType =
  | "brute-force"
  | "unauthorized-admin"
  | "forged-webhook"
  | "forged-payment"
  | "path-probe"
  | "invalid-token";

export type ThreatSeverity = "critical" | "high" | "medium";

/** Severity is a property of the signal, not of who reported it. */
const SEVERITY: Record<ThreatType, ThreatSeverity> = {
  "forged-webhook": "critical",
  "forged-payment": "critical",
  "unauthorized-admin": "critical",
  "brute-force": "high",
  "path-probe": "medium",
  "invalid-token": "medium",
};

const LABEL: Record<ThreatType, string> = {
  "brute-force": "Sign-in brute force",
  "unauthorized-admin": "Unauthorised admin access attempt",
  "forged-webhook": "Forged payment webhook",
  "forged-payment": "Forged payment signature",
  "path-probe": "Exploit path scanning",
  "invalid-token": "Invalid session token",
};

/** What the operator should understand and do about each signal. */
const GUIDANCE: Record<ThreatType, { why: string; action: string }> = {
  "brute-force": {
    why: "Repeated sign-in attempts exhausted the token bucket for one account and address, which is what a password-guessing run looks like.",
    action:
      "The attempts are already blocked for fifteen minutes by the existing rate limit. If they continue across many addresses, block the source network at your CDN and tell the account owner to change their password.",
  },
  "unauthorized-admin": {
    why: "A request reached an administrator-only route without administrator authorisation. Either a signed-in customer is probing, or someone is testing a stolen session.",
    action:
      "The request was refused and no data was returned. Confirm PORTAL_ADMIN_UIDS is correct, and if the source is a signed-in account, revoke its refresh tokens in the Firebase console.",
  },
  "forged-webhook": {
    why: "A payment webhook arrived with a signature that does not match RAZORPAY_WEBHOOK_SECRET. Someone is attempting to mark an unpaid order as paid.",
    action:
      "The webhook was rejected and no order changed. Rotate RAZORPAY_WEBHOOK_SECRET if this repeats, and verify no order moved to paid without a matching Razorpay payment.",
  },
  "forged-payment": {
    why: "A payment verification request carried a signature that does not match the order. This is an attempt to activate a subscription without paying.",
    action:
      "The verification was refused. Check the orders collection for any subscription activated without a captured Razorpay payment.",
  },
  "path-probe": {
    why: "A request targeted a path associated with a known exploit, such as an exposed .env file, a git directory or a WordPress admin panel. This is automated scanning rather than a human visitor.",
    action:
      "None of these paths exist in this application, so nothing was exposed. Scanning is constant background noise on the public internet; act only if one source sustains a high rate.",
  },
  "invalid-token": {
    why: "A request presented a malformed or expired authentication token.",
    action:
      "Usually a stale browser session rather than an attack. Investigate only if the volume from one source is high.",
  },
};

export interface ThreatEvent {
  id: string;
  type: ThreatType;
  label: string;
  severity: ThreatSeverity;
  /** Attempts aggregated into this minute bucket. */
  count: number;
  firstAt: number;
  lastAt: number;
  /** Masked source, for example `203.0.113.x`. Never a full address. */
  source: string;
  /** Request path, with any query string removed. */
  path: string;
  why: string;
  action: string;
}

/** Keep the log bounded; the dashboard shows the most recent window. */
const READ_LIMIT = 60;

/**
 * Mask an address to its network.
 *
 * IPv4 keeps three octets, IPv6 keeps the routing prefix. Enough to
 * recognise one campaign across many requests, not enough to be a
 * durable record of an individual.
 */
function maskAddress(ip: string): string {
  const value = ip.trim();

  if (!value || value === "unknown") return "unknown";

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return `${value.split(".").slice(0, 3).join(".")}.x`;
  }

  if (value.includes(":")) {
    return `${value.split(":").slice(0, 3).join(":")}::/48`;
  }

  return "unknown";
}

function sourceDigest(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

/** Minute bucket key, UTC. */
function minuteKey(date = new Date()): string {
  return date.toISOString().slice(0, 16).replace(/[:T-]/g, "");
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
 * Record one intrusion signal.
 *
 * Never throws and never blocks: every caller is a guard that has
 * already refused the request, and logging must not be able to turn
 * that refusal into a server error.
 */
export async function recordThreat(
  type: ThreatType,
  request: Request,
  path?: string,
): Promise<void> {
  try {
    const ip = callerAddress(request);
    const minute = minuteKey();
    const now = Date.now();

    const requestPath =
      path ??
      (() => {
        try {
          return new URL(request.url).pathname;
        } catch {
          return "unknown";
        }
      })();

    const reference = getAdminDb()
      .collection(COLLECTION)
      .doc(`${minute}_${type}_${sourceDigest(ip)}`);

    await reference.set(
      {
        type,
        severity: SEVERITY[type],
        source: maskAddress(ip),
        // Bounded: a path is attacker-controlled input.
        path: requestPath.slice(0, 200),
        count: FieldValue.increment(1),
        lastAt: now,
        firstAt: FieldValue.serverTimestamp(),
        minute,
      },
      { merge: true },
    );
  } catch (error) {
    /**
     * A logging failure must never surface to the caller or change
     * the response a guard already decided on — but it must not be
     * invisible either. A silently broken intrusion log is worse than
     * no log, because the console would show "no attacks" with full
     * confidence while detection was dead.
     */
    console.error("Security event write failed", {
      type,
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code).slice(0, 60)
          : "unknown",
    });
  }
}

/**
 * Read the most recent events for the console.
 */
export async function readThreats(sinceMs?: number): Promise<ThreatEvent[]> {
  let query = getAdminDb()
    .collection(COLLECTION)
    .orderBy("lastAt", "desc")
    .limit(READ_LIMIT);

  if (typeof sinceMs === "number" && Number.isFinite(sinceMs)) {
    query = getAdminDb()
      .collection(COLLECTION)
      .where("lastAt", ">", sinceMs)
      .orderBy("lastAt", "desc")
      .limit(READ_LIMIT);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    const type = (
      Object.keys(SEVERITY).includes(String(data.type))
        ? data.type
        : "invalid-token"
    ) as ThreatType;

    const firstAt =
      data.firstAt && typeof data.firstAt.toMillis === "function"
        ? data.firstAt.toMillis()
        : Number(data.lastAt) || 0;

    return {
      id: document.id,
      type,
      label: LABEL[type],
      severity: SEVERITY[type],
      count: Number(data.count) || 1,
      firstAt,
      lastAt: Number(data.lastAt) || 0,
      source: String(data.source || "unknown"),
      path: String(data.path || "unknown"),
      why: GUIDANCE[type].why,
      action: GUIDANCE[type].action,
    };
  });
}
