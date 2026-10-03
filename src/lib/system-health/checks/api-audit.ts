import "server-only";

import { WEIGHT } from "../config";
import type { SourceTree } from "../source";
import type {
  ApiAuditResult,
  ApiRouteAudit,
  HealthCheckResult,
  SecurityFinding,
} from "../types";

/**
 * =============================================================
 * API SECURITY AUDIT — STATIC
 * =============================================================
 *
 * Each `route.ts` under `src/app/api` is read and tested for the
 * guards it applies. This is pattern recognition over the project's
 * real code, not exploitation: nothing is executed and no request is
 * forged.
 *
 * Because it is pattern based, a route can be marked as lacking a
 * guard it applies through an unrecognised helper. Every finding
 * therefore names the file so a human confirms it, and the panel
 * says so in the UI.
 */

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

/** Guards the project actually uses, recognised by name. */
const AUTH_PATTERNS = [
  /\bauthenticate\s*\(/,
  /\bverifyIdToken\s*\(/,
  /\bverifyAdmin\s*\(/,
  /\brequireSystemHealthAdmin\s*\(/,
];

const ADMIN_PATTERNS = [
  /\brequireAdmin\s*\(/,
  /\bverifyAdmin\s*\(/,
  /\bisAdmin\s*\(/,
  /\bconfiguredAdmin\s*\(/,
  /\brequireSystemHealthAdmin\s*\(/,
];

const VALIDATION_PATTERNS = [
  /\bz\s*\.\s*object\s*\(/,
  /\.safeParse\s*\(/,
  /\.parse\s*\(/,
  /Schema\s*\.\s*(?:safeParse|parse)\s*\(/,
];

const RATE_LIMIT_PATTERNS = [
  /\btakeLoginToken\s*\(/,
  /\brateLimit/i,
  /lastOrderAt/,
];

const SIGNATURE_PATTERNS = [
  /\bsignatureMatches\s*\(/,
  /\btimingSafeEqual\s*\(/,
  /createHmac\s*\(/,
];

const BODY_LIMIT_PATTERNS = [
  /\.length\s*>\s*\d{3,}/,
  /maxDuration/,
  /contentLength/i,
];

/**
 * Returning a caught error's own message can disclose SDK internals.
 */
const ERROR_LEAK_PATTERNS = [
  /error\s*\.\s*stack/,
  /JSON\.stringify\s*\(\s*error\b/,
  /\berror\s*:\s*String\s*\(\s*error\s*\)/,
];

export interface ApiAuditDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  audit: ApiAuditResult;
}

export function runApiAudit(tree: SourceTree): ApiAuditDiagnostics {
  if (!tree.available) {
    return {
      checks: [
        {
          id: "apiAudit.static",
          service: "API route static audit",
          category: "security",
          status: "unknown",
          message: "NOT AVAILABLE — source tree not readable in this runtime.",
          checkedAt: new Date().toISOString(),
          severity: "low",
          weight: WEIGHT.low,
          detail: tree.unavailableReason,
        },
      ],
      findings: [],
      audit: {
        available: false,
        unavailableReason: tree.unavailableReason,
        routes: [],
      },
    };
  }

  const routes: ApiRouteAudit[] = tree.files
    .filter(
      (file) =>
        file.path.startsWith("src/app/api/") &&
        /\/route\.(?:ts|tsx|js)$/.test(file.path),
    )
    .map((file) => auditRoute(file.path, file.lines.join("\n")))
    .sort((a, b) => a.route.localeCompare(b.route));

  const findings: SecurityFinding[] = [];

  for (const route of routes) {
    const mutating = route.methods.some((method) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(method),
    );

    /* A route under /admin that applies no admin check. */
    if (
      /\/admin(?:\/|$)/.test(route.route) &&
      !route.adminGuarded
    ) {
      findings.push({
        id: `apiAudit.admin.${route.route}`,
        title: `Administrative route without a recognised admin check`,
        area: "authorization",
        severity: "critical",
        status: "fail",
        summary: `${route.route} sits under an admin path but no admin authorisation helper was found in its handler.`,
        why: "Authentication proves who is calling; only an authorisation check decides whether that account may act. Without one, any signed-in customer can call an administrative route directly.",
        remediation: `Add requireAdmin(token) after authenticate(request) in ${route.file}, following the pattern in src/app/api/portal/[action]/route.ts.`,
        reference: route.file,
      });
    }

    /* A mutating route with no token verification and no HMAC. */
    if (mutating && !route.authenticated && !route.signatureVerified) {
      const isPublicForm = /\/api\/(?:contact|quote)\b/.test(route.route);

      findings.push({
        id: `apiAudit.auth.${route.route}`,
        title: isPublicForm
          ? `Public write endpoint: ${route.route}`
          : `Mutating route without authentication`,
        area: "api",
        severity: isPublicForm ? "medium" : "critical",
        status: isPublicForm ? "warn" : "fail",
        summary: isPublicForm
          ? `${route.route} accepts writes from anonymous visitors, which a public form requires.`
          : `${route.route} accepts ${route.methods.join(
              "/",
            )} with no token verification and no signature check.`,
        why: isPublicForm
          ? "A public form has to accept anonymous input, so this is expected rather than a defect. It matters because the endpoint writes to Firestore on every request: without a rate limit or a challenge, it can be driven in a loop to inflate document counts and the project's write costs."
          : "An unauthenticated mutating endpoint lets any visitor change stored state.",
        remediation: isPublicForm
          ? `Keep the endpoint public, and add a per-address throttle. The token bucket in src/lib/portal/login-rate-limit.ts already implements this pattern against Firestore and can be reused for ${route.route}.`
          : `Call authenticate(request) at the top of the handler in ${route.file} before any data access.`,
        reference: route.file,
      });
    }

    /* A mutating route with no input validation. */
    if (mutating && !route.validated) {
      findings.push({
        id: `apiAudit.validation.${route.route}`,
        title: `Request body not schema validated`,
        area: "api",
        severity: "medium",
        status: "warn",
        summary: `${route.route} parses a body without a recognised Zod schema.`,
        why: "Hand-written field checks drift from the stored shape over time and tend to miss type coercion, so a request can write an unexpected value into Firestore. The project already depends on Zod and uses it in its newer routes, so the tool is available.",
        remediation: `Define a z.object schema for the body in ${route.file} and parse it before use, as src/app/api/portal/[action]/route.ts does.`,
        reference: route.file,
      });
    }

    /* A webhook with no signature verification. */
    if (/webhook/.test(route.route) && !route.signatureVerified) {
      findings.push({
        id: `apiAudit.signature.${route.route}`,
        title: `Webhook without signature verification`,
        area: "payments",
        severity: "critical",
        status: "fail",
        summary: `${route.route} handles a webhook but no HMAC verification was found.`,
        why: "A payment webhook URL is reachable by anyone. Without verifying the provider's signature over the raw body, a forged request can mark an unpaid order as paid.",
        remediation: `Verify the x-razorpay-signature header against RAZORPAY_WEBHOOK_SECRET over the raw request text before parsing it, using the constant-time signatureMatches() helper in src/lib/portal/server.ts.`,
        reference: route.file,
      });
    }

    /* A handler that can return raw error detail. */
    if (route.leaksErrorDetail) {
      findings.push({
        id: `apiAudit.errorLeak.${route.route}`,
        title: `Handler may return raw error detail`,
        area: "api",
        severity: "medium",
        status: "warn",
        summary: `${route.route} appears to serialise a caught error into its response.`,
        why: "A Firebase or Razorpay SDK error can carry internal identifiers, configuration fragments and absolute paths. Returning it hands an attacker reconnaissance for free.",
        remediation: `Return a fixed message and log the detail server-side instead, as serverDiagnostic() and the requestId pattern in src/lib/portal/server.ts do.`,
        reference: route.file,
      });
    }

    /* A body read with no size bound. */
    if (mutating && !route.bodySizeLimited) {
      findings.push({
        id: `apiAudit.bodySize.${route.route}`,
        title: `Request body read without a size bound`,
        area: "api",
        severity: "low",
        status: "warn",
        summary: `${route.route} reads a request body without checking its length first.`,
        why: "An unbounded body is buffered into the function's memory before parsing. The hosting platform imposes its own ceiling, so this is a resilience nicety rather than a vulnerability, but it is cheap to add.",
        remediation: `Read the body with request.text(), reject it above a fixed length, then JSON.parse it — the pattern already used in src/app/api/portal/[action]/route.ts.`,
        reference: route.file,
      });
    }
  }

  const criticalRoutes = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;

  const checks: HealthCheckResult[] = [
    {
      id: "apiAudit.static",
      service: "API route static audit",
      category: "security",
      status:
        criticalRoutes > 0
          ? "critical"
          : findings.length > 0
            ? "warning"
            : "healthy",
      message:
        findings.length === 0
          ? `${routes.length} API routes audited with no issues found.`
          : `${findings.length} issue(s) across ${routes.length} API routes.`,
      checkedAt: new Date().toISOString(),
      severity:
        criticalRoutes > 0 ? "critical" : findings.length > 0 ? "medium" : "info",
      weight: WEIGHT.high,
      detail:
        "Pattern-based audit of the project's own route handlers. Each finding names a file so the result can be confirmed by reading it.",
    },
  ];

  if (findings.length === 0 && routes.length > 0) {
    findings.push({
      id: "apiAudit.clean",
      title: "API routes apply their expected guards",
      area: "api",
      severity: "info",
      status: "pass",
      summary: `${routes.length} route handlers were audited for authentication, authorisation, validation, signature verification and error disclosure.`,
      why: "Each guard has to be present in the handler itself, because there is no middleware layer applying one globally.",
      remediation: "",
    });
  }

  return { checks, findings, audit: { available: true, routes } };
}

function auditRoute(path: string, source: string): ApiRouteAudit {
  const methods = HTTP_METHODS.filter((method) =>
    new RegExp(
      `export\\s+(?:async\\s+)?(?:function\\s+${method}\\b|const\\s+${method}\\s*[:=])`,
    ).test(source),
  );

  const notes: string[] = [];

  const has = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(source));

  const authenticated = has(AUTH_PATTERNS);
  const adminGuarded = has(ADMIN_PATTERNS);
  const signatureVerified = has(SIGNATURE_PATTERNS);

  if (!authenticated && signatureVerified) {
    notes.push("Authenticated by HMAC signature rather than by a user token.");
  }

  if (methods.length === 0) {
    notes.push(
      "No HTTP method export was recognised; the handler may assign them indirectly.",
    );
  }

  if (/export\s+const\s+runtime\s*=\s*["']nodejs["']/.test(source)) {
    notes.push("Pinned to the Node.js runtime.");
  }

  if (/no-store/.test(source)) {
    notes.push("Sets Cache-Control: no-store.");
  }

  return {
    route: routePathFor(path),
    file: path,
    methods: [...methods],
    authenticated,
    adminGuarded,
    validated: has(VALIDATION_PATTERNS),
    rateLimited: has(RATE_LIMIT_PATTERNS),
    signatureVerified,
    bodySizeLimited: has(BODY_LIMIT_PATTERNS),
    leaksErrorDetail: has(ERROR_LEAK_PATTERNS),
    notes,
  };
}

/**
 * `src/app/api/portal/[action]/route.ts` -> `/api/portal/[action]`
 */
function routePathFor(file: string): string {
  return (
    file
      .replace(/^src\/app/, "")
      .replace(/\/route\.(?:ts|tsx|js)$/, "")
      // Route groups such as (admin) do not appear in the URL.
      .replace(/\/\([^)]+\)/g, "") || "/"
  );
}
