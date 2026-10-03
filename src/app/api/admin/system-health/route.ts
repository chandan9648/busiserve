import { NextResponse } from "next/server";

import {
  requireSystemHealthAdmin,
  SystemHealthAccessError,
} from "@/lib/system-health/guard";
import { runScan } from "@/lib/system-health/runner";
import { SCAN_TIMEOUT_MS } from "@/lib/system-health/config";
import type { ScanMode } from "@/lib/system-health/types";

/**
 * =============================================================
 * GET /api/admin/system-health
 * =============================================================
 *
 * Executes server-side diagnostics and returns a normalised report.
 *
 * Access
 *   Administrator only, enforced by requireSystemHealthAdmin, which
 *   reuses the portal's own authenticate() and isAdmin(). An
 *   anonymous or non-administrator caller receives 401 or 403 and no
 *   diagnostic data whatsoever — the scan does not even begin.
 *
 * Disclosure
 *   The report contains no environment values, no secrets, no user
 *   records, no absolute paths and no stack traces. Every field is
 *   produced by a check module that is constrained to presence
 *   metadata, status codes, durations and repository-relative paths.
 *
 * Method
 *   GET only. The scan mutates nothing, so it needs no other verb,
 *   and restricting it keeps the endpoint free of a body to validate.
 *   Any other method receives 405 from the framework, which the scan
 *   itself then verifies.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Keep the handler's own budget above the orchestrator's. */
export const maxDuration = 60;

const MODES: ScanMode[] = ["quick", "full", "security", "infrastructure"];

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      // A diagnostic must never be served from a cache, by the
      // browser or by any proxy in front of this deployment.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      // This response must never be framed or indexed.
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function GET(request: Request) {
  /* --------------------------------------------------------------- */
  /* 1. Authorise before anything else runs                          */
  /* --------------------------------------------------------------- */

  try {
    await requireSystemHealthAdmin(request);
  } catch (error) {
    if (error instanceof SystemHealthAccessError) {
      /**
       * `reason` is present only on a 403, which means the caller
       * already authenticated successfully. Naming the gate that
       * refused them discloses nothing to a stranger and is the
       * difference between a diagnosable refusal and a dead end.
       */
      return json(
        error.reason
          ? { error: error.message, reason: error.reason }
          : { error: error.message },
        error.status,
      );
    }

    return json({ error: "Diagnostics are unavailable." }, 500);
  }

  /* --------------------------------------------------------------- */
  /* 2. Resolve the requested mode                                   */
  /* --------------------------------------------------------------- */

  const requested = new URL(request.url).searchParams.get("mode");

  const mode: ScanMode =
    requested && MODES.includes(requested as ScanMode)
      ? (requested as ScanMode)
      : "quick";

  /* --------------------------------------------------------------- */
  /* 3. Run the scan under a hard ceiling                            */
  /* --------------------------------------------------------------- */

  try {
    const report = await Promise.race([
      runScan(request, mode),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => {
          const timeout = new Error("Scan exceeded its time budget.");
          timeout.name = "ScanTimeout";
          reject(timeout);
        }, SCAN_TIMEOUT_MS.scan),
      ),
    ]);

    return json(report);
  } catch (error) {
    /**
     * runScan already isolates every section, so reaching here means
     * the orchestrator itself failed or the whole scan timed out.
     * Only a category is logged; an SDK error can embed credentials.
     */
    const name = error instanceof Error ? error.name : "unknown";

    console.error("System health scan failed", { mode, name });

    return json(
      {
        error:
          name === "ScanTimeout"
            ? "The diagnostic scan exceeded its time budget. Try a quick scan."
            : "The diagnostic scan could not be completed.",
      },
      name === "ScanTimeout" ? 504 : 500,
    );
  }
}
