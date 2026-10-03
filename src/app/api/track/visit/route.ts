import { NextResponse } from "next/server";

import { recordVisit } from "@/lib/portal/visits";

/**
 * POST /api/track/visit
 *
 * @security:public An anonymous visitor is precisely what this counts, so
 * requiring a credential would make the endpoint measure nothing. Write
 * volume is bounded instead, to one counted visit per visitor per day.
 *
 * Records one site visit. Public by necessity — an anonymous visitor
 * is precisely what it counts.
 *
 * Abuse resistance lives in `recordVisit`, which counts a visitor at
 * most once per day: a repeated call finds the marker document
 * already present and writes nothing, so looping this endpoint
 * cannot inflate the figure or run up write costs.
 *
 * The response is deliberately empty of counts. A public endpoint
 * must not hand out the site's traffic numbers; those are returned
 * only to an administrator by /api/portal/admin/visits.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function callerAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    await recordVisit(
      callerAddress(request),
      // Bounded: a header is attacker-controlled and only ever feeds
      // a hash, but there is no reason to read an unbounded string.
      (request.headers.get("user-agent") || "unknown").slice(0, 300),
    );
  } catch (error) {
    /**
     * Analytics must never degrade the site. A Firestore failure here
     * is logged as a category and swallowed; the visitor's page has
     * already rendered and must not be affected either way.
     */
    console.error("Visit tracking failed", {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code).slice(0, 60)
          : "unknown",
    });
  }

  // Always 204, whether the visit was counted, de-duplicated or
  // failed. The caller learns nothing either way.
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
