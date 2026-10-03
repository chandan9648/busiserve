import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

/**
 * =============================================================
 * SITE VISIT COUNTER
 * =============================================================
 *
 * Counts unique visitors per day, not raw page hits.
 *
 * Why unique-per-day rather than a hit counter: the recording
 * endpoint is public, because an anonymous visitor is exactly who it
 * has to count. A plain counter on a public endpoint can be driven
 * in a loop, which would inflate the number and run up Firestore
 * write costs. Here the first request from a visitor on a given day
 * creates a marker document, and every later request that day finds
 * it already there and writes nothing — so the figure cannot be
 * inflated past one per visitor per day no matter how often the
 * endpoint is called.
 *
 * Privacy: no IP address or user agent is ever stored. They are
 * combined with the date into a one-way SHA-256 digest that serves
 * only as a document id. The digest changes daily, so it cannot be
 * used to follow a visitor across days, and the raw values are
 * discarded immediately.
 *
 * Collections written here are not listed in firestore.rules, so the
 * default-deny applies and no browser can read or write them. Only
 * the Admin SDK, which bypasses rules, touches them.
 */

const VISITOR_COLLECTION = "siteVisitors";
const COUNTER_COLLECTION = "siteVisits";
const SUMMARY_DOC = "summary";

export interface VisitStats {
  /** Unique visitors counted since tracking began. */
  total: number;
  /** Unique visitors so far today, in UTC. */
  today: number;
  /** Unique visitors yesterday, for comparison. */
  yesterday: number;
  /** UTC date the `today` figure covers, as YYYY-MM-DD. */
  date: string;
  /** When the counter last changed, epoch milliseconds. */
  updatedAt: number | null;
}

/** UTC day key, so the figure does not shift with server timezone. */
function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * One-way visitor digest. Never reversible to an address.
 */
function visitorDigest(ip: string, userAgent: string, day: string): string {
  return createHash("sha256")
    .update(`${day}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 40);
}

/**
 * Record a visit.
 *
 * Returns true only when this visitor had not been seen today, which
 * is the one case that moves the counter.
 *
 * The marker and both counters are written in a single transaction,
 * so the count can never drift from the markers that justify it.
 */
export async function recordVisit(
  ip: string,
  userAgent: string,
): Promise<{ counted: boolean }> {
  const db = getAdminDb();
  const day = dayKey();

  const visitorRef = db
    .collection(VISITOR_COLLECTION)
    .doc(`${day}_${visitorDigest(ip, userAgent, day)}`);

  const summaryRef = db.collection(COUNTER_COLLECTION).doc(SUMMARY_DOC);
  const dayRef = db.collection(COUNTER_COLLECTION).doc(`day_${day}`);

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(visitorRef);

    // Already counted today: write nothing at all.
    if (existing.exists) return { counted: false };

    transaction.create(visitorRef, {
      day,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(
      summaryRef,
      {
        total: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      dayRef,
      {
        date: day,
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { counted: true };
  });
}

/**
 * Read the counters for the admin dashboard.
 *
 * Three small document reads, so this is cheap enough to poll.
 */
export async function readVisitStats(): Promise<VisitStats> {
  const db = getAdminDb();

  const today = dayKey();

  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = dayKey(yesterdayDate);

  const [summarySnapshot, todaySnapshot, yesterdaySnapshot] = await Promise.all(
    [
      db.collection(COUNTER_COLLECTION).doc(SUMMARY_DOC).get(),
      db.collection(COUNTER_COLLECTION).doc(`day_${today}`).get(),
      db.collection(COUNTER_COLLECTION).doc(`day_${yesterday}`).get(),
    ],
  );

  const count = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : 0;

  const updatedAt = summarySnapshot.data()?.updatedAt;

  return {
    total: count(summarySnapshot.data()?.total),
    today: count(todaySnapshot.data()?.count),
    yesterday: count(yesterdaySnapshot.data()?.count),
    date: today,
    updatedAt:
      updatedAt && typeof updatedAt.toMillis === "function"
        ? updatedAt.toMillis()
        : null,
  };
}
