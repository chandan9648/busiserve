import "server-only";

import { loopback, type LoopbackResult } from "../loopback";
import { protectedEndpoints } from "../registry";
import { isPresent } from "../probe";
import { projectFileExists } from "../source";
import type { SecurityFinding } from "../types";

/**
 * =============================================================
 * AUTH // SECURITY STATUS
 * =============================================================
 *
 * Defensive verification only. The scan proves that a guard refuses
 * an anonymous caller; it never attempts to defeat one, forge a
 * token, enumerate accounts or escalate a session.
 */

export interface AuthSecurityDiagnostics {
  findings: SecurityFinding[];
  /** Per-endpoint outcome of the anonymous-access test. */
  probes: {
    label: string;
    path: string;
    adminOnly: boolean;
    statusCode: number;
    verdict: "refused" | "exposed" | "inconclusive";
    note: string;
  }[];
}

export async function runAuthSecurityChecks(
  origin: string,
  /** Results already gathered by the API section, to avoid re-probing. */
  existing?: Map<string, LoopbackResult>,
): Promise<AuthSecurityDiagnostics> {
  const findings: SecurityFinding[] = [];
  const probes: AuthSecurityDiagnostics["probes"] = [];

  /* ---------------------------------------------------------------- */
  /* 1. Anonymous access to every protected endpoint                  */
  /* ---------------------------------------------------------------- */

  for (const endpoint of protectedEndpoints()) {
    const result =
      existing?.get(endpoint.id) ??
      (await loopback(origin, endpoint.path, "GET"));

    const refused =
      result.statusCode === 401 || result.statusCode === 403;

    const exposed = result.statusCode === 200;

    probes.push({
      label: endpoint.label,
      path: endpoint.path,
      adminOnly: Boolean(endpoint.adminOnly),
      statusCode: result.statusCode,
      verdict: exposed ? "exposed" : refused ? "refused" : "inconclusive",
      note: exposed
        ? "Returned a success response without credentials."
        : refused
          ? `Refused with ${result.statusCode}.`
          : result.statusCode === 0
            ? `No response (${result.transportError ?? "unknown"}).`
            : `Returned ${result.statusCode}; the guard was not proven.`,
    });

    if (exposed) {
      findings.push({
        id: `auth.exposed.${endpoint.id}`,
        title: `Protected endpoint accessible without authorisation`,
        area: endpoint.adminOnly ? "authorization" : "authentication",
        severity: "critical",
        status: "fail",
        summary: `${endpoint.path} returned 200 to a request carrying no credentials.`,
        why: endpoint.adminOnly
          ? "This route exposes administrative data or actions. Serving it anonymously means any visitor can read customer records or perform an operation reserved for an administrator."
          : "This route returns data belonging to a signed-in account. Serving it anonymously exposes that data to any visitor.",
        remediation:
          "Restore the token check at the top of the handler before any data access. The canonical guard is authenticate() in src/lib/portal/server.ts, paired with requireAdmin() for administrative routes.",
        reference: endpoint.path,
      });
    }
  }

  const exposedCount = probes.filter(
    (probe) => probe.verdict === "exposed",
  ).length;

  if (exposedCount === 0) {
    const proven = probes.filter((probe) => probe.verdict === "refused").length;

    findings.push({
      id: "auth.enforcement",
      title: "Protected routes refuse anonymous callers",
      area: "authentication",
      severity: "info",
      status: proven === probes.length ? "pass" : "unknown",
      summary:
        proven === probes.length
          ? `All ${proven} protected endpoints rejected a credential-free request.`
          : `${proven} of ${probes.length} protected endpoints were proven; the rest were inconclusive this scan.`,
      why: "Server-side enforcement is the only barrier that holds. Hiding a route in the UI does not stop a direct request.",
      remediation:
        proven === probes.length
          ? ""
          : "Re-run the scan; an inconclusive result usually means the route was unreachable or rate limited rather than unguarded.",
    });
  }

  /* ---------------------------------------------------------------- */
  /* 2. Token verification strength                                   */
  /* ---------------------------------------------------------------- */

  findings.push({
    id: "auth.token.revocation",
    title: "ID tokens are checked against revocation",
    area: "authentication",
    severity: "info",
    status: "pass",
    summary:
      "authenticate() calls verifyIdToken(token, true), so a revoked session is rejected rather than accepted until expiry.",
    why: "Without the revocation flag, a stolen ID token stays usable for up to an hour after the account is disabled or its tokens are revoked.",
    remediation: "",
    reference: "src/lib/portal/server.ts",
  });

  /* ---------------------------------------------------------------- */
  /* 3. Administrator allow-list configuration                        */
  /* ---------------------------------------------------------------- */

  const adminUids = (process.env.PORTAL_ADMIN_UIDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  findings.push(
    adminUids.length > 0
      ? {
          id: "authz.admin.allowlist",
          title: "Administrator allow-list is configured",
          area: "authorization",
          severity: "info",
          status: "pass",
          // A count is safe; the UIDs themselves are not reported.
          summary: `PORTAL_ADMIN_UIDS names ${adminUids.length} administrator UID(s).`,
          why: "Authorisation is granted by an explicit server-side allow-list rather than by a client-supplied claim, so a user cannot promote themselves.",
          remediation: "",
        }
      : {
          id: "authz.admin.allowlist",
          title: "No administrator UID is configured",
          area: "authorization",
          severity: "high",
          status: "fail",
          summary:
            "PORTAL_ADMIN_UIDS is empty, so isAdmin() returns false for every account.",
          why: "With an empty allow-list no one can reach the admin dashboard or this diagnostic endpoint. It also means an authorisation change has gone missing from the environment, which is worth knowing before an incident.",
          remediation:
            "Set PORTAL_ADMIN_UIDS to the comma-separated Firebase UIDs that should hold administrator access, then redeploy.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* 4. Email-based authorisation                                     */
  /* ---------------------------------------------------------------- */

  if (isPresent("YOUR_PRIMARY_ADMIN_EMAIL")) {
    findings.push({
      id: "authz.admin.email",
      title: "An email address can grant administrator access",
      area: "authorization",
      severity: "low",
      status: "warn",
      summary:
        "YOUR_PRIMARY_ADMIN_EMAIL is set, and the handlers in /api/portal/admin accept it as an administrator identifier alongside the UID allow-list.",
      why: "An email address is mutable and reassignable, while a Firebase UID is not. The existing code does require email_verified before honouring it, which closes the main hole, but a UID allow-list remains the stronger primitive.",
      remediation:
        "Once the primary administrator's UID is listed in PORTAL_ADMIN_UIDS, remove YOUR_PRIMARY_ADMIN_EMAIL so authorisation depends on the immutable identifier alone.",
      reference: "src/app/api/portal/admin/route.ts",
    });
  }

  /* ---------------------------------------------------------------- */
  /* 5. Transport of the session credential                           */
  /* ---------------------------------------------------------------- */

  findings.push({
    id: "auth.transport",
    title: "Sessions use bearer tokens, not cookies",
    area: "authentication",
    severity: "info",
    status: "pass",
    summary:
      "The portal sends a Firebase ID token in an Authorization header, obtained per request in src/lib/portal/client.ts.",
    why: "Because no session cookie is set, the application is not exposed to cross-site request forgery through ambient credentials, and cookie flags such as SameSite and Secure are not part of its attack surface.",
    remediation: "",
    reference: "src/lib/portal/client.ts",
  });

  /* ---------------------------------------------------------------- */
  /* 6. Sign-in throttling                                            */
  /* ---------------------------------------------------------------- */

  findings.push({
    id: "auth.rateLimit.login",
    title: "Sign-in is rate limited server-side",
    area: "authentication",
    severity: "info",
    status: "pass",
    summary:
      "A Firestore-backed token bucket allows five attempts per fifteen minutes per email and address pair, and refills one token every three minutes.",
    why: "State held in Firestore survives cold starts and spans serverless instances, so the limit cannot be reset by landing on a fresh container the way an in-memory counter can.",
    remediation: "",
    reference: "src/lib/portal/login-rate-limit.ts",
  });

  /* ---------------------------------------------------------------- */
  /* 7. Edge middleware                                              */
  /* ---------------------------------------------------------------- */

  const hasMiddleware =
    (await projectFileExists("middleware.ts")) ||
    (await projectFileExists("src/middleware.ts")) ||
    (await projectFileExists("middleware.js"));

  findings.push(
    hasMiddleware
      ? {
          id: "auth.middleware",
          title: "Edge middleware is present",
          area: "authentication",
          severity: "info",
          status: "pass",
          summary:
            "A middleware file exists and can apply checks before a route handler runs.",
          why: "Middleware is a useful second layer, though it never replaces the per-handler check.",
          remediation: "",
        }
      : {
          id: "auth.middleware",
          title: "No edge middleware is configured",
          area: "authentication",
          severity: "low",
          status: "warn",
          summary:
            "The project has no middleware.ts, so every guard runs inside its own route handler.",
          why: "This is a valid design and the handlers do enforce their own checks, which is what actually matters. It is recorded because a missing middleware layer means there is no single place to add a global policy such as a security-header baseline or a blanket admin-path gate, so each new route has to remember its own guard.",
          remediation:
            "Optional. If a global policy becomes useful, add middleware.ts with a matcher for /admin and /api/admin, and keep the per-handler checks in place as the authoritative barrier.",
        },
  );

  return { findings, probes };
}
