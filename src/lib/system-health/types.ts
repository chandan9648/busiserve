/**
 * =============================================================
 * SYSTEM HEALTH — NORMALISED DIAGNOSTIC MODEL
 * =============================================================
 *
 * Every probe in `./checks` returns one of these shapes, so the
 * dashboard renders results it has never seen before and a new
 * check needs no UI change.
 *
 * Nothing in this module may ever carry a secret value, a user
 * record or a filesystem path outside the repository.
 */

export type HealthStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "offline"
  | "unknown";

export type Severity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ScanMode =
  | "quick"
  | "full"
  | "security"
  | "infrastructure";

export type CheckCategory =
  | "core"
  | "firebase"
  | "external"
  | "security"
  | "configuration"
  | "runtime";

export type SecurityArea =
  | "authentication"
  | "authorization"
  | "secrets"
  | "api"
  | "headers"
  | "firebase"
  | "uploads"
  | "payments"
  | "dependencies";

/** Outcome of a single service probe. */
export interface HealthCheckResult {
  id: string;
  service: string;
  category: CheckCategory;
  status: HealthStatus;
  /** Measured round trip in milliseconds, when the probe timed one. */
  responseTime?: number;
  statusCode?: number;
  /** Operator-facing summary. Always safe to display. */
  message: string;
  checkedAt: string;
  severity?: Severity;
  /** Extra safe context, such as an expected-versus-actual status. */
  detail?: string;
  /**
   * Contribution to the weighted health score. Credentials and data
   * paths weigh more than optional integrations.
   */
  weight: number;
}

/** One auditable security conclusion with its remediation. */
export interface SecurityFinding {
  id: string;
  title: string;
  area: SecurityArea;
  severity: Severity;
  status: "pass" | "warn" | "fail" | "unknown";
  summary: string;
  /** Why the finding matters, in operator language. */
  why: string;
  /** What to change. Empty string when the finding is a pass. */
  remediation: string;
  /** Repository-relative `file:line`, never an absolute path. */
  reference?: string;
}

/**
 * Presence-only view of one environment variable.
 * The value is never read into this object.
 */
export interface ConfigItem {
  name: string;
  present: boolean;
  scope: "public" | "server";
  required: boolean;
  note?: string;
}

export interface SecretMatch {
  /** Repository-relative path. */
  file: string;
  line: number;
  kind: string;
  severity: Severity;
  /** Heavily masked preview, or a plain notice. Never the secret. */
  preview: string;
}

export interface SecretScanResult {
  available: boolean;
  /** Why the scan could not run, when `available` is false. */
  unavailableReason?: string;
  filesScanned: number;
  matches: SecretMatch[];
}

export interface ApiRouteAudit {
  /** Public route path, for example `/api/portal/admin`. */
  route: string;
  /** Repository-relative source path. */
  file: string;
  methods: string[];
  authenticated: boolean;
  adminGuarded: boolean;
  validated: boolean;
  rateLimited: boolean;
  signatureVerified: boolean;
  bodySizeLimited: boolean;
  /** True when the handler can leak a raw error to the response. */
  leaksErrorDetail: boolean;
  /**
   * True when the handler declares itself deliberately anonymous with
   * a `@security:public` marker. Some endpoints must accept an
   * unauthenticated caller to do their job at all.
   */
  intentionallyPublic: boolean;
  /** The justification written beside that marker. */
  publicReason?: string;
  /** True when the handler reads a request body it could validate. */
  readsBody: boolean;
  notes: string[];
}

export interface ApiAuditResult {
  available: boolean;
  unavailableReason?: string;
  routes: ApiRouteAudit[];
}

export interface DependencyReport {
  available: boolean;
  unavailableReason?: string;
  total: number;
  runtime: number;
  development: number;
  /** Ranges that do not pin a version, such as `latest` or `*`. */
  unpinned: string[];
  /** `npm audit` is never executed from a request. */
  auditStatus: "not-available";
  auditNote: string;
}

export interface ScanLogEntry {
  at: string;
  label: string;
  outcome: "PASS" | "WARN" | "FAIL" | "INFO" | "SKIP";
  message: string;
}

export interface HealthSummary {
  /** Weighted percentage, 0–100, rounded to one decimal. */
  score: number;
  totalChecks: number;
  passed: number;
  warnings: number;
  critical: number;
  offline: number;
  unknown: number;
  status: HealthStatus;
  headline: string;
}

export interface SecurityScore {
  /** 0–100, never negative. */
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  deductions: { label: string; points: number }[];
  counts: Record<Severity, number>;
  /** Per-area posture used by the radar. */
  areas: {
    area: SecurityArea;
    score: number;
    status: HealthStatus;
    passed: number;
    total: number;
  }[];
}

export interface RuntimeEnvironment {
  nodeEnv: string;
  deployEnv: string;
  nodeVersion: string;
  platform: string;
  region: string;
  /** Lifetime of the current server process, not application uptime. */
  processUptimeSeconds: number;
  /** Resident set size in megabytes, when the runtime reports it. */
  memoryMb: number | null;
  origin: string;
}

export interface DiagnosticReport {
  scanId: string;
  mode: ScanMode;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  environment: RuntimeEnvironment;
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  configuration: ConfigItem[];
  secretScan: SecretScanResult;
  apiAudit: ApiAuditResult;
  dependencies: DependencyReport;
  logs: ScanLogEntry[];
  health: HealthSummary;
  security: SecurityScore;
  /** Sections this mode did not run, so the UI can label them honestly. */
  skipped: string[];
}
