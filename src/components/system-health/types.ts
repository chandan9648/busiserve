/**
 * Client-side view of the diagnostic report.
 *
 * The shapes come from `@/lib/system-health/types`, which is a pure
 * type module with no server-only import, so there is one definition
 * of the contract rather than a duplicate kept in step by hand.
 */

import type {
  ApiAuditResult,
  ConfigItem,
  DependencyReport,
  DiagnosticReport,
  HealthCheckResult,
  HealthStatus,
  ScanLogEntry,
  ScanMode,
  SecretScanResult,
  SecurityArea,
  SecurityFinding,
  Severity,
} from "@/lib/system-health/types";

export type {
  ApiAuditResult,
  ConfigItem,
  DependencyReport,
  HealthCheckResult,
  HealthStatus,
  ScanLogEntry,
  ScanMode,
  SecretScanResult,
  SecurityArea,
  SecurityFinding,
  Severity,
};

/** Header entry, mirrored from the headers check module. */
export interface HeaderAuditEntry {
  header: string;
  verdict: "present" | "missing" | "misconfigured";
  value?: string;
  severity: Severity;
  risk: string;
  why: string;
  remediation: string;
}

export interface AuthProbe {
  label: string;
  path: string;
  adminOnly: boolean;
  statusCode: number;
  verdict: "refused" | "exposed" | "inconclusive";
  note: string;
}

export interface RazorpayStatus {
  configured: boolean;
  mode: "test" | "live" | "unknown";
  keyIdPresent: boolean;
  keySecretPresent: boolean;
  webhookSecretPresent: boolean;
  webhookSecretDistinct: boolean | null;
  reachable: "yes" | "no" | "unknown";
}

export interface UploadReport {
  available: boolean;
  unavailableReason?: string;
  uploadPathDetected: boolean;
  signals: string[];
  controls: { label: string; present: boolean }[];
  storageConfigured: boolean;
}

/** The exact payload `GET /api/admin/system-health` returns. */
export interface SystemHealthReport extends DiagnosticReport {
  sections: {
    firebase: {
      collectionCounts: { collection: string; count: number | null }[];
    } | null;
    api: {
      total: number;
      asExpected: number;
      unexpected: number;
      transportFailures: number;
      byClass: Record<string, number>;
    } | null;
    authSecurity: AuthProbe[] | null;
    headers: {
      available: boolean;
      unavailableReason?: string;
      statusCode: number;
      entries: HeaderAuditEntry[];
    } | null;
    external: {
      razorpay: RazorpayStatus;
      email: {
        configured: boolean;
        provider: string;
        reachable: "yes" | "no" | "unknown";
      };
    } | null;
    uploads: UploadReport | null;
  };
}

/**
 * One scan's response times, retained in the browser.
 *
 * The application stores no telemetry, so there is no historical
 * series to read. This series covers only the scans run in the
 * current page session, and every chart built from it is labelled
 * that way rather than presented as history.
 */
export interface ScanSample {
  scanId: string;
  at: number;
  mode: ScanMode;
  healthScore: number;
  securityScore: number;
  /** Response time per check id, for checks that measured one. */
  timings: Record<string, number>;
}

export const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  quick: "Quick scan",
  full: "Full diagnostic",
  security: "Security audit",
  infrastructure: "Infrastructure",
};

export const AREA_LABELS: Record<SecurityArea, string> = {
  authentication: "Authentication",
  authorization: "Authorization",
  secrets: "Secrets",
  api: "API security",
  headers: "Headers",
  firebase: "Firebase",
  uploads: "Uploads",
  payments: "Payments",
  dependencies: "Dependencies",
};

export const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: "Healthy",
  warning: "Degraded",
  critical: "Critical",
  offline: "Offline",
  unknown: "Unknown",
};
