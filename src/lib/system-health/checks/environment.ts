import "server-only";

import { WEIGHT } from "../config";
import { isPresent } from "../probe";
import type {
  ConfigItem,
  HealthCheckResult,
  RuntimeEnvironment,
  SecurityFinding,
} from "../types";

/**
 * =============================================================
 * ENVIRONMENT // CONFIGURATION
 * =============================================================
 *
 * Presence metadata only.
 *
 * No value from `process.env` is read into any object that leaves
 * this module. `isPresent` returns a boolean and nothing else, and
 * the one place a value is examined — the NEXT_PUBLIC_ heuristic
 * below — tests its shape and discards it without recording it.
 */

interface EnvDefinition {
  name: string;
  scope: "public" | "server";
  required: boolean;
  purpose: string;
}

/**
 * Derived from the variables the code actually reads.
 */
const EXPECTED: EnvDefinition[] = [
  /* Firebase browser configuration, exposed deliberately by next.config.ts */
  {
    name: "FIREBASE_API_KEY",
    scope: "public",
    required: true,
    purpose: "Browser Firebase config. Public by design.",
  },
  {
    name: "FIREBASE_AUTH_DOMAIN",
    scope: "public",
    required: true,
    purpose: "Firebase Authentication domain for the browser SDK.",
  },
  {
    name: "FIREBASE_PROJECT_ID",
    scope: "public",
    required: true,
    purpose: "Firebase project, used by both the browser and Admin SDK.",
  },
  {
    name: "FIREBASE_APP_ID",
    scope: "public",
    required: true,
    purpose: "Firebase web app identifier.",
  },
  {
    name: "FIREBASE_STORAGE_BUCKET",
    scope: "public",
    required: false,
    purpose: "Storage bucket. Needed once an upload path exists.",
  },
  {
    name: "FIREBASE_MESSAGING_SENDER_ID",
    scope: "public",
    required: false,
    purpose: "Cloud Messaging sender. Unused today.",
  },

  /* Server-only credentials */
  {
    name: "FIREBASE_CLIENT_EMAIL",
    scope: "server",
    required: true,
    purpose: "Service-account identity for the Admin SDK.",
  },
  {
    name: "FIREBASE_PRIVATE_KEY",
    scope: "server",
    required: true,
    purpose: "Service-account private key. Server-only.",
  },
  {
    name: "FIREBASE_DATABASE_ID",
    scope: "server",
    required: false,
    purpose: "Non-default Firestore database. Optional.",
  },
  {
    name: "PORTAL_ADMIN_UIDS",
    scope: "server",
    required: true,
    purpose: "Administrator allow-list consumed by isAdmin().",
  },
  {
    name: "YOUR_PRIMARY_ADMIN_EMAIL",
    scope: "server",
    required: false,
    purpose: "Legacy administrator identifier. Optional.",
  },

  /* Payments */
  {
    name: "RAZORPAY_KEY_ID",
    scope: "server",
    required: true,
    purpose: "Razorpay key identifier, sent to the browser per checkout.",
  },
  {
    name: "RAZORPAY_KEY_SECRET",
    scope: "server",
    required: true,
    purpose: "Razorpay API secret and signature key. Server-only.",
  },
  {
    name: "RAZORPAY_WEBHOOK_SECRET",
    scope: "server",
    required: true,
    purpose: "Separate HMAC key for webhook verification. Server-only.",
  },

  /* Email */
  {
    name: "RESEND_API_KEY",
    scope: "server",
    required: false,
    purpose: "Resend API key for invoice email. Server-only.",
  },
  {
    name: "INVOICE_FROM_EMAIL",
    scope: "server",
    required: false,
    purpose: "Invoice sender address. Falls back to a Resend default.",
  },

  /* Site content */
  {
    name: "CONTACT_EMAIL",
    scope: "server",
    required: false,
    purpose: "Published contact address.",
  },
  {
    name: "CONTACT_TO_EMAIL",
    scope: "server",
    required: false,
    purpose: "Destination for contact form notifications.",
  },
];

/**
 * Names that read as a secret. A value under one of these must never
 * carry the NEXT_PUBLIC_ prefix.
 */
const SECRET_NAME_PATTERN =
  /(SECRET|PRIVATE_KEY|PASSWORD|PASSWD|CREDENTIAL|_TOKEN$|^TOKEN|SERVICE_ACCOUNT|WEBHOOK_SECRET|SESSION_KEY|JWT|SIGNING_KEY|ACCESS_KEY|CLIENT_SECRET)/i;

/**
 * Firebase's browser API key is a public identifier, not a secret,
 * so a NEXT_PUBLIC_ copy of it is correct rather than a finding.
 */
const PUBLIC_BY_DESIGN =
  /^NEXT_PUBLIC_(FIREBASE_(API_KEY|AUTH_DOMAIN|PROJECT_ID|APP_ID|STORAGE_BUCKET|MESSAGING_SENDER_ID)|RAZORPAY_KEY_ID|SITE_URL|VERCEL_URL)$/;

/**
 * Value shapes that identify a credential regardless of the variable's
 * name.
 *
 * Each pattern is specific to a known credential format. A generic
 * "long opaque string" rule is deliberately absent: a build id, a
 * commit SHA and an analytics key all match it, and a scanner that
 * cries wolf on those gets ignored.
 */
const SECRET_VALUE_PATTERNS: { kind: string; pattern: RegExp }[] = [
  { kind: "PEM private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: "Resend API key", pattern: /^re_[A-Za-z0-9_-]{20,}$/ },
  { kind: "Google OAuth credential", pattern: /^ya29\./ },
  { kind: "Service-account JSON", pattern: /"private_key"\s*:/ },
  {
    kind: "Bearer-style secret key",
    pattern: /^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/,
  },
  { kind: "AWS secret access key", pattern: /^(?:AKIA|ASIA)[0-9A-Z]{16}$/ },
  { kind: "GitHub token", pattern: /^gh[pousr]_[A-Za-z0-9]{36,}/ },
];

export interface EnvironmentDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  configuration: ConfigItem[];
  environment: RuntimeEnvironment;
}

export function runEnvironmentChecks(origin: string): EnvironmentDiagnostics {
  const configuration: ConfigItem[] = EXPECTED.map((item) => ({
    name: item.name,
    present: isPresent(item.name),
    scope: item.scope,
    required: item.required,
    note: item.purpose,
  }));

  const missingRequired = configuration.filter(
    (item) => item.required && !item.present,
  );

  const checks: HealthCheckResult[] = [
    {
      id: "environment.required",
      service: "Environment configuration",
      category: "configuration",
      status: missingRequired.length === 0 ? "healthy" : "critical",
      message:
        missingRequired.length === 0
          ? `All ${configuration.filter((item) => item.required).length} required variables are present.`
          : `${missingRequired.length} required variable(s) are missing.`,
      checkedAt: new Date().toISOString(),
      severity: missingRequired.length === 0 ? "info" : "critical",
      weight: WEIGHT.critical,
      detail:
        missingRequired.length === 0
          ? "Verified by presence. No value was read."
          : `Missing: ${missingRequired.map((item) => item.name).join(", ")}.`,
    },
  ];

  const findings: SecurityFinding[] = [];

  if (missingRequired.length > 0) {
    findings.push({
      id: "environment.missing",
      title: "Required environment variables are missing",
      area: "secrets",
      severity: "critical",
      status: "fail",
      summary: `${missingRequired
        .map((item) => item.name)
        .join(", ")} are not set in this environment.`,
      why: "Each of these is read at request time by Firebase Admin, the payment flow or the administrator allow-list. A missing value turns into a 500 on the first request that needs it.",
      remediation:
        "Set the listed variables in the deployment environment and redeploy. Compare against .env.example, which lists every name the project reads.",
    });
  }

  /* ---------------------------------------------------------------- */
  /* Secret-shaped values exposed to the browser                      */
  /* ---------------------------------------------------------------- */

  const exposed = findExposedPublicSecrets();

  checks.push({
    id: "environment.public-prefix",
    service: "Client-exposed variables",
    category: "security",
    status: exposed.length === 0 ? "healthy" : "critical",
    message:
      exposed.length === 0
        ? "No secret-shaped value is exposed through NEXT_PUBLIC_."
        : `${exposed.length} NEXT_PUBLIC_ variable(s) look like credentials.`,
    checkedAt: new Date().toISOString(),
    severity: exposed.length === 0 ? "info" : "critical",
    weight: WEIGHT.critical,
    detail:
      exposed.length === 0
        ? "Every NEXT_PUBLIC_ name was checked against secret naming and value patterns."
        : `Affected names: ${exposed.map((item) => item.name).join(", ")}.`,
  });

  for (const item of exposed) {
    findings.push({
      id: `environment.exposed.${item.name}`,
      title: `Secret exposed to the browser: ${item.name}`,
      area: "secrets",
      severity: "critical",
      status: "fail",
      summary: `${item.name} is prefixed NEXT_PUBLIC_ and ${item.reason}.`,
      why: "Next.js inlines every NEXT_PUBLIC_ variable into the JavaScript bundle at build time. The value is therefore readable by anyone who loads the site, and it stays readable in every cached copy of that bundle until it is rebuilt and the secret rotated.",
      remediation: `Remove the NEXT_PUBLIC_ prefix from ${item.name} so it is read only on the server, rotate the exposed credential at its provider, and redeploy. If the browser genuinely needs the result, add a server route that uses the secret and returns only what the client may see.`,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Deliberate client exposure through next.config.ts                */
  /* ---------------------------------------------------------------- */

  findings.push({
    id: "environment.next-config-env",
    title: "Firebase browser config is exposed through next.config.ts",
    area: "secrets",
    severity: "info",
    status: "pass",
    summary:
      "next.config.ts inlines FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID and FIREBASE_APP_ID into the client bundle.",
    why: "This is correct and necessary: the browser Firebase SDK cannot initialise without them, and all four are public identifiers rather than secrets. Firebase protects the project with security rules and App Check, not by keeping these values hidden. Recorded here so the exposure is a documented decision rather than an unnoticed one. Note that the Admin credentials — FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY — are deliberately absent from that list.",
    remediation: "",
    reference: "next.config.ts",
  });

  return {
    checks,
    findings,
    configuration,
    environment: describeRuntime(origin),
  };
}

/**
 * Examine every NEXT_PUBLIC_ variable for a credential.
 *
 * The value is tested and dropped; only the variable name and the
 * category of match are kept.
 */
function findExposedPublicSecrets(): { name: string; reason: string }[] {
  const exposed: { name: string; reason: string }[] = [];

  for (const name of Object.keys(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;
    if (PUBLIC_BY_DESIGN.test(name)) continue;

    const value = process.env[name];
    if (typeof value !== "string" || value.trim().length === 0) continue;

    if (SECRET_NAME_PATTERN.test(name)) {
      exposed.push({ name, reason: "its name indicates a secret" });
      continue;
    }

    const matched = SECRET_VALUE_PATTERNS.find((candidate) =>
      candidate.pattern.test(value.trim()),
    );

    if (matched) {
      exposed.push({
        name,
        reason: `its value matches a ${matched.kind} pattern`,
      });
    }
  }

  return exposed;
}

/**
 * Safe runtime facts. No path, hostname or credential is included.
 */
function describeRuntime(origin: string): RuntimeEnvironment {
  const memory =
    typeof process.memoryUsage === "function"
      ? Math.round(process.memoryUsage().rss / (1024 * 1024))
      : null;

  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    deployEnv:
      process.env.VERCEL_ENV ??
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
    nodeVersion: process.version,
    platform: process.platform,
    region: process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? "local",
    processUptimeSeconds: Math.round(process.uptime()),
    memoryMb: memory,
    origin,
  };
}
