import "server-only";

import { loopback } from "../loopback";
import type { SecurityFinding, Severity } from "../types";

/**
 * =============================================================
 * SECURITY HEADERS AUDIT
 * =============================================================
 *
 * The application's own response headers are read from a live
 * request to its root document.
 *
 * Severity is assigned by what the header actually defends against
 * in this application, not by whether it is simply absent. An
 * optional hardening header that is missing is a low or medium
 * finding; it is never reported as a vulnerability.
 */

export type HeaderVerdict = "present" | "missing" | "misconfigured";

export interface HeaderAuditEntry {
  header: string;
  verdict: HeaderVerdict;
  /** Present only when the header's value is safe to display. */
  value?: string;
  severity: Severity;
  risk: string;
  why: string;
  remediation: string;
}

export interface HeaderAuditResult {
  available: boolean;
  unavailableReason?: string;
  statusCode: number;
  entries: HeaderAuditEntry[];
  findings: SecurityFinding[];
}

const AUDITED = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "strict-transport-security",
  "permissions-policy",
  "cross-origin-opener-policy",
  "access-control-allow-origin",
  "x-powered-by",
  "cache-control",
];

export async function runHeaderChecks(
  origin: string,
): Promise<HeaderAuditResult> {
  const result = await loopback(origin, "/", "GET", AUDITED);

  if (result.statusCode === 0) {
    return {
      available: false,
      unavailableReason: `The application's own root document could not be fetched (${
        result.transportError ?? "no response"
      }), so response headers could not be read.`,
      statusCode: 0,
      entries: [],
      findings: [],
    };
  }

  const header = (name: string): string | undefined => result.headers[name];
  const entries: HeaderAuditEntry[] = [];

  /* ---------------------------------------------------------------- */
  /* Content-Security-Policy                                          */
  /* ---------------------------------------------------------------- */

  const csp = header("content-security-policy");

  entries.push(
    csp
      ? {
          header: "Content-Security-Policy",
          verdict: /unsafe-inline|unsafe-eval/.test(csp)
            ? "misconfigured"
            : "present",
          value: truncate(csp),
          severity: /unsafe-inline|unsafe-eval/.test(csp) ? "low" : "info",
          risk: /unsafe-inline|unsafe-eval/.test(csp)
            ? "The policy permits inline or evaluated script, which weakens its protection against injected script."
            : "Covered.",
          why: "A content-security policy is the strongest available control against injected script, and is the one header that limits damage after an injection rather than only preventing one.",
          remediation: /unsafe-inline|unsafe-eval/.test(csp)
            ? "Replace unsafe-inline with a nonce or hash for the inline script that needs it, and drop unsafe-eval if no dependency requires it."
            : "",
        }
      : {
          header: "Content-Security-Policy",
          verdict: "missing",
          severity: "medium",
          risk: "No restriction on where script, style, frames or connections may come from.",
          why: "This application renders user-supplied text in the admin dashboard and loads the Razorpay checkout script from a third-party origin. A policy limits what an injected script could reach, and restricts which origins may frame the payment flow.",
          remediation:
            "Add a Content-Security-Policy through the headers() function in next.config.ts. Start in report-only mode so the Razorpay checkout, Google Fonts and Firebase endpoints can be allow-listed before the policy is enforced.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* Framing control                                                  */
  /* ---------------------------------------------------------------- */

  const xfo = header("x-frame-options");
  const frameAncestors = csp ? /frame-ancestors/i.test(csp) : false;

  entries.push(
    xfo || frameAncestors
      ? {
          header: "X-Frame-Options",
          verdict: "present",
          value: xfo ? truncate(xfo) : "covered by CSP frame-ancestors",
          severity: "info",
          risk: "Covered.",
          why: "Framing control prevents the sign-in and payment pages from being embedded by another site.",
          remediation: "",
        }
      : {
          header: "X-Frame-Options",
          verdict: "missing",
          severity: "medium",
          risk: "The application can be embedded in a frame on any origin.",
          why: "The sign-in form and the Razorpay checkout page can be framed and overlaid, which is the setup for a clickjacking attempt against a payment or a credential entry.",
          remediation:
            "Set X-Frame-Options: SAMEORIGIN, or a CSP frame-ancestors 'self' directive, in next.config.ts. Prefer frame-ancestors when a policy is added, since X-Frame-Options is the older mechanism.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* MIME sniffing                                                    */
  /* ---------------------------------------------------------------- */

  const nosniff = header("x-content-type-options");

  entries.push(
    nosniff?.toLowerCase().includes("nosniff")
      ? {
          header: "X-Content-Type-Options",
          verdict: "present",
          value: truncate(nosniff),
          severity: "info",
          risk: "Covered.",
          why: "Stops a browser treating a response as a different content type than declared.",
          remediation: "",
        }
      : {
          header: "X-Content-Type-Options",
          verdict: nosniff ? "misconfigured" : "missing",
          severity: "low",
          risk: "A browser may infer a content type that differs from the declared one.",
          why: "The practical risk is low here because the application serves no user-uploaded files today. It becomes material the moment an upload path exists, since a file stored with an attacker-chosen content type could then be executed as script.",
          remediation:
            "Add X-Content-Type-Options: nosniff in next.config.ts. It is a single static header with no compatibility cost.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* Referrer policy                                                  */
  /* ---------------------------------------------------------------- */

  const referrer = header("referrer-policy");

  entries.push(
    referrer
      ? {
          header: "Referrer-Policy",
          verdict: /unsafe-url|^origin-when-cross-origin$/i.test(referrer)
            ? "misconfigured"
            : "present",
          value: truncate(referrer),
          severity: /unsafe-url/i.test(referrer) ? "low" : "info",
          risk: /unsafe-url/i.test(referrer)
            ? "Full URLs are sent to third-party origins."
            : "Covered.",
          why: "Controls how much of the current URL is disclosed when a visitor follows a link off-site.",
          remediation: /unsafe-url/i.test(referrer)
            ? "Use strict-origin-when-cross-origin instead of unsafe-url."
            : "",
        }
      : {
          header: "Referrer-Policy",
          verdict: "missing",
          severity: "low",
          risk: "Browser default applies, which varies by browser.",
          why: "Most current browsers already default to strict-origin-when-cross-origin, so the exposure is small. Setting it explicitly removes the dependence on that default, which matters for paths such as /payment/success that can carry an order reference.",
          remediation:
            "Set Referrer-Policy: strict-origin-when-cross-origin in next.config.ts.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* HSTS — only meaningful over HTTPS                                */
  /* ---------------------------------------------------------------- */

  const hsts = header("strict-transport-security");
  const isHttps = origin.startsWith("https://");

  if (!isHttps) {
    entries.push({
      header: "Strict-Transport-Security",
      verdict: "missing",
      severity: "info",
      risk: "Not applicable on this origin.",
      why: "The scan reached this deployment over HTTP, which is expected for local development. The header is ignored by browsers on a non-secure origin, so its absence here says nothing about production.",
      remediation:
        "Verify this header against the production HTTPS origin rather than a local one.",
    });
  } else {
    const maxAge = hsts?.match(/max-age=(\d+)/i)?.[1];
    const weak = maxAge !== undefined && Number(maxAge) < 15552000;

    entries.push(
      hsts
        ? {
            header: "Strict-Transport-Security",
            verdict: weak ? "misconfigured" : "present",
            value: truncate(hsts),
            severity: weak ? "low" : "info",
            risk: weak
              ? `max-age is ${maxAge}s, below the six months generally expected.`
              : "Covered.",
            why: "Forces the browser to use HTTPS for subsequent visits, which closes the downgrade window on the first navigation of a session.",
            remediation: weak
              ? "Raise max-age to at least 15552000 (180 days) once you are confident every subdomain serves HTTPS."
              : "",
          }
        : {
            header: "Strict-Transport-Security",
            verdict: "missing",
            severity: "medium",
            risk: "A first request over HTTP is not upgraded by the browser.",
            why: "Sign-in credentials and payment identifiers travel over this origin. Without HSTS a visitor arriving over HTTP can be intercepted before the redirect to HTTPS completes. Many hosts add this header at the platform edge, so confirm at the CDN before treating it as absent.",
            remediation:
              "Confirm whether the hosting platform already sets this header at its edge. If not, add Strict-Transport-Security: max-age=63072000; includeSubDomains through next.config.ts.",
          },
    );
  }

  /* ---------------------------------------------------------------- */
  /* Permissions-Policy                                               */
  /* ---------------------------------------------------------------- */

  const permissions = header("permissions-policy");

  entries.push(
    permissions
      ? {
          header: "Permissions-Policy",
          verdict: "present",
          value: truncate(permissions),
          severity: "info",
          risk: "Covered.",
          why: "Limits which powerful browser features the page and its frames may use.",
          remediation: "",
        }
      : {
          header: "Permissions-Policy",
          verdict: "missing",
          severity: "low",
          risk: "Embedded frames may request camera, microphone or geolocation access.",
          why: "This is a hardening measure rather than a fix for a present weakness: the application requests none of these features itself. It is worth setting because the payment flow embeds a third-party frame.",
          remediation:
            "Set Permissions-Policy: camera=(), microphone=(), geolocation=() in next.config.ts.",
        },
  );

  /* ---------------------------------------------------------------- */
  /* CORS on the document                                             */
  /* ---------------------------------------------------------------- */

  const cors = header("access-control-allow-origin");

  entries.push(
    cors === "*"
      ? {
          header: "Access-Control-Allow-Origin",
          verdict: "misconfigured",
          severity: "medium",
          value: "*",
          risk: "Any origin may read responses from this application.",
          why: "A wildcard on an application that serves authenticated JSON lets a script on another site read responses, provided it can supply a credential. The portal uses bearer tokens rather than cookies, which narrows this considerably, but the wildcard should still not be set on first-party routes.",
          remediation:
            "Remove the wildcard. The API is called same-origin by the portal, so no CORS header is needed at all.",
        }
      : {
          header: "Access-Control-Allow-Origin",
          verdict: "present",
          value: cors ? truncate(cors) : "not set (same-origin only)",
          severity: "info",
          risk: "Covered.",
          why: "With no permissive CORS header, a browser on another origin cannot read responses from this application.",
          remediation: "",
        },
  );

  /* ---------------------------------------------------------------- */
  /* Framework fingerprint                                            */
  /* ---------------------------------------------------------------- */

  const powered = header("x-powered-by");

  if (powered) {
    entries.push({
      header: "X-Powered-By",
      verdict: "misconfigured",
      value: truncate(powered),
      severity: "info",
      risk: "The response advertises the framework serving it.",
      why: "Fingerprinting is only a convenience for an attacker, not a weakness in itself, so this is informational. Removing it is a one-line change.",
      remediation: "Set poweredByHeader: false in next.config.ts.",
    });
  }

  /* ---------------------------------------------------------------- */
  /* Caching of the document                                          */
  /* ---------------------------------------------------------------- */

  const cache = header("cache-control");

  entries.push({
    header: "Cache-Control",
    verdict: "present",
    value: cache ? truncate(cache) : "not set",
    severity: "info",
    risk: "Informational.",
    why: "The authenticated API routes already set no-store explicitly, which is the part that matters. The value here is for the public home page, where caching is desirable.",
    remediation: "",
  });

  return {
    available: true,
    statusCode: result.statusCode,
    entries,
    findings: entries
      .filter(
        (entry) =>
          entry.verdict !== "present" &&
          entry.severity !== "info" &&
          entry.remediation !== "",
      )
      .map((entry) => ({
        id: `headers.${entry.header.toLowerCase()}`,
        title:
          entry.verdict === "missing"
            ? `Missing security header: ${entry.header}`
            : `Weak security header: ${entry.header}`,
        area: "headers" as const,
        severity: entry.severity,
        status: "warn" as const,
        summary: entry.risk,
        why: entry.why,
        remediation: entry.remediation,
      })),
  };
}

/** Header values are app configuration, not secrets, but stay bounded. */
function truncate(value: string): string {
  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}
