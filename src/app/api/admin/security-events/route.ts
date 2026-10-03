import { NextResponse } from "next/server";

import {
  requireSystemHealthAdmin,
  SystemHealthAccessError,
} from "@/lib/system-health/guard";
import { readThreats } from "@/lib/security/events";

/**
 * GET /api/admin/security-events
 *
 * Live intrusion feed for the command centre.
 *
 * Deliberately separate from the diagnostic scan: the scan is heavy
 * and runs every thirty seconds at most, while an alarm needs to
 * fire within seconds of an attack starting. This endpoint reads a
 * handful of small documents, so it is cheap enough to poll.
 *
 * Administrator-only, through the same guard as the scan itself. An
 * attack log tells an attacker exactly which of their probes were
 * detected, so it must never be readable by the person generating it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(request: Request) {
  try {
    await requireSystemHealthAdmin(request);
  } catch (error) {
    if (error instanceof SystemHealthAccessError) {
      return json({ error: error.message }, error.status);
    }

    return json({ error: "Security events are unavailable." }, 500);
  }

  try {
    const events = await readThreats();

    return json({
      events,
      readAt: Date.now(),
      /** Highest severity present, so the client can decide to alarm. */
      worst: events.some((event) => event.severity === "critical")
        ? "critical"
        : events.some((event) => event.severity === "high")
          ? "high"
          : events.length > 0
            ? "medium"
            : null,
    });
  } catch (error) {
    console.error("Security event read failed", {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code).slice(0, 60)
          : "unknown",
    });

    return json({ error: "Security events are unavailable." }, 500);
  }
}
