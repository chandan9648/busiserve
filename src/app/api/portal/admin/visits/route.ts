import { NextResponse } from "next/server";

import { resolveAdminAccess } from "@/lib/portal/admin-access";
import { authenticate, PortalError } from "@/lib/portal/server";
import { readVisitStats } from "@/lib/portal/visits";

/**
 * GET /api/portal/admin/visits
 *
 * Returns the site visit counters for the admin dashboard.
 *
 * A separate route rather than extra fields on /api/portal/admin, so
 * the existing admin response contract is left exactly as it is and
 * a counter failure cannot take the user table down with it.
 *
 * Authorisation reuses the project's shared administrator
 * definition, the same one /admin and the health console answer to.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function GET(request: Request) {
  try {
    const token = await authenticate(request);
    const access = await resolveAdminAccess(token);

    if (!access.allowed) {
      return json({ error: "Administrator access required." }, 403);
    }

    return json(await readVisitStats());
  } catch (error) {
    if (error instanceof PortalError) {
      return json({ error: error.message }, error.status);
    }

    console.error("Visit statistics failed", {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code).slice(0, 60)
          : "unknown",
    });

    return json({ error: "Visit statistics are unavailable." }, 500);
  }
}
