import "server-only";

import type {
  CheckCategory,
  HealthStatus,
  ScanMode,
  Severity,
} from "./types";

/**
 * =============================================================
 * DIAGNOSTIC CONFIGURATION
 * =============================================================
 *
 * Response-time thresholds, scoring weights and the per-mode
 * section map all live here so tuning never touches a probe.
 */

export interface Thresholds {
  /** At or below this, the service is healthy. */
  healthy: number;
  /** Above `healthy` and at or below this, a warning. */
  warning: number;
  /** Above `warning` and at or below this, degraded. Beyond it, critical. */
  degraded: number;
}

/**
 * Baseline for first-party work inside the same region.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  healthy: 300,
  warning: 800,
  degraded: 2000,
};

/**
 * Per-check overrides.
 *
 * A call that crosses the public internet to Google or Razorpay
 * cannot be judged against a same-region threshold, so each of
 * those probes carries a budget that reflects its real network
 * path instead of being flagged permanently slow.
 */
export const CHECK_THRESHOLDS: Record<string, Thresholds> = {
  "firebase.auth": { healthy: 600, warning: 1500, degraded: 3500 },
  "firebase.firestore.read": { healthy: 400, warning: 1200, degraded: 3000 },
  "firebase.firestore.count": { healthy: 600, warning: 1600, degraded: 3500 },
  "firebase.storage": { healthy: 800, warning: 2000, degraded: 4500 },
  "external.razorpay": { healthy: 700, warning: 1800, degraded: 4000 },
  "external.resend": { healthy: 700, warning: 1800, degraded: 4000 },
  // A loopback request re-enters the server and pays a second cold start.
  "api.loopback": { healthy: 500, warning: 1500, degraded: 3500 },
};

export function thresholdsFor(id: string): Thresholds {
  if (CHECK_THRESHOLDS[id]) return CHECK_THRESHOLDS[id];

  const prefixed = Object.keys(CHECK_THRESHOLDS).find((key) =>
    id.startsWith(`${key}.`),
  );

  return prefixed ? CHECK_THRESHOLDS[prefixed] : DEFAULT_THRESHOLDS;
}

/**
 * Classify a measured duration against its own budget.
 */
export function statusForDuration(
  id: string,
  durationMs: number,
): HealthStatus {
  const limits = thresholdsFor(id);

  if (durationMs <= limits.healthy) return "healthy";
  if (durationMs <= limits.warning) return "warning";
  if (durationMs <= limits.degraded) return "warning";

  return "critical";
}

/**
 * Weights for the overall health score.
 *
 * Losing Firestore stops every signed-in page; losing the invoice
 * mailer does not. The score has to say so.
 */
export const WEIGHT = {
  /** Credentials and the data path. */
  critical: 4,
  /** Request handling and authorisation. */
  high: 3,
  /** Revenue and transactional integrations. */
  medium: 2,
  /** Observability and informational probes. */
  low: 1,
} as const;

export const SEVERITY_DEDUCTION: Record<Severity, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

export const SCAN_TIMEOUT_MS = {
  /** One outbound or loopback probe. */
  probe: 8000,
  /** The whole scan, enforced by the route handler. */
  scan: 45000,
} as const;

export interface SectionPlan {
  runtime: boolean;
  firebase: boolean;
  api: boolean;
  authSecurity: boolean;
  headers: boolean;
  environment: boolean;
  secrets: boolean;
  apiAudit: boolean;
  external: boolean;
  dependencies: boolean;
  uploads: boolean;
}

/**
 * Which sections each mode runs.
 *
 * Anything a mode omits is reported as skipped rather than being
 * drawn as a passing check.
 */
export const SCAN_PLANS: Record<ScanMode, SectionPlan> = {
  quick: {
    runtime: true,
    firebase: true,
    api: true,
    authSecurity: true,
    headers: false,
    environment: true,
    secrets: false,
    apiAudit: false,
    external: false,
    dependencies: false,
    uploads: false,
  },
  full: {
    runtime: true,
    firebase: true,
    api: true,
    authSecurity: true,
    headers: true,
    environment: true,
    secrets: true,
    apiAudit: true,
    external: true,
    dependencies: true,
    uploads: true,
  },
  security: {
    runtime: false,
    firebase: false,
    api: false,
    authSecurity: true,
    headers: true,
    environment: true,
    secrets: true,
    apiAudit: true,
    external: false,
    dependencies: true,
    uploads: true,
  },
  infrastructure: {
    runtime: true,
    firebase: true,
    api: true,
    authSecurity: false,
    headers: false,
    environment: true,
    secrets: false,
    apiAudit: false,
    external: true,
    dependencies: false,
    uploads: false,
  },
};

export const SECTION_LABELS: Record<keyof SectionPlan, string> = {
  runtime: "Runtime & server",
  firebase: "Firebase core services",
  api: "API layer probes",
  authSecurity: "Authentication & authorisation",
  headers: "Security headers",
  environment: "Environment configuration",
  secrets: "Credential exposure scan",
  apiAudit: "API route static audit",
  external: "External services",
  dependencies: "Dependency inventory",
  uploads: "File upload security",
};

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  core: "Core",
  firebase: "Firebase",
  external: "External services",
  security: "Security",
  configuration: "Configuration",
  runtime: "Runtime",
};
