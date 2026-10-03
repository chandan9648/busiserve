import "server-only";

import { SEVERITY_DEDUCTION } from "./config";
import type {
  HealthCheckResult,
  HealthStatus,
  HealthSummary,
  SecurityArea,
  SecurityFinding,
  SecurityScore,
  Severity,
} from "./types";

/**
 * =============================================================
 * SCORING
 * =============================================================
 *
 * Both scores are deliberately transparent: every input is a check
 * or finding shown elsewhere on the page, and the security score
 * publishes its own deduction list so the number can be reconciled
 * by hand.
 *
 * Neither score is smoothed, floored at a flattering value, or
 * adjusted to look good.
 */

/**
 * Credit earned by a check, as a fraction of its weight.
 *
 * A degraded service has partial credit rather than none, because a
 * slow dependency is not equivalent to an absent one.
 */
const STATUS_CREDIT: Record<HealthStatus, number> = {
  healthy: 1,
  warning: 0.5,
  offline: 0,
  critical: 0,
  /**
   * An unmeasurable check earns full credit against a reduced weight
   * (see below), so "not available" neither rewards nor punishes.
   */
  unknown: 1,
};

/**
 * An `unknown` check cannot prove anything, so it is nearly removed
 * from the denominator instead of counting as a pass at full weight.
 */
const UNKNOWN_WEIGHT_FACTOR = 0.1;

export function scoreHealth(checks: HealthCheckResult[]): HealthSummary {
  const counted = checks.filter((check) => check.weight > 0);

  let earned = 0;
  let possible = 0;

  for (const check of counted) {
    const weight =
      check.status === "unknown"
        ? check.weight * UNKNOWN_WEIGHT_FACTOR
        : check.weight;

    possible += weight;
    earned += weight * STATUS_CREDIT[check.status];
  }

  const passed = counted.filter((check) => check.status === "healthy").length;
  const warnings = counted.filter((check) => check.status === "warning").length;
  const critical = counted.filter((check) => check.status === "critical").length;
  const offline = counted.filter((check) => check.status === "offline").length;
  const unknown = counted.filter((check) => check.status === "unknown").length;

  const score =
    possible === 0
      ? 0
      : Math.round((earned / possible) * 1000) / 10;

  /**
   * The headline follows the worst state present, not the score. A
   * 95% score with one dead credential path is not "operational".
   */
  const status: HealthStatus =
    critical > 0
      ? "critical"
      : offline > 0
        ? "offline"
        : warnings > 0
          ? "warning"
          : unknown === counted.length && counted.length > 0
            ? "unknown"
            : "healthy";

  return {
    score,
    totalChecks: counted.length,
    passed,
    warnings,
    critical,
    offline,
    unknown,
    status,
    headline: headlineFor(status, critical, offline, warnings),
  };
}

function headlineFor(
  status: HealthStatus,
  critical: number,
  offline: number,
  warnings: number,
): string {
  switch (status) {
    case "critical":
      return `${critical} CRITICAL ${critical === 1 ? "FAILURE" : "FAILURES"}`;
    case "offline":
      return `${offline} ${offline === 1 ? "SERVICE" : "SERVICES"} UNREACHABLE`;
    case "warning":
      return `DEGRADED — ${warnings} ${warnings === 1 ? "WARNING" : "WARNINGS"}`;
    case "unknown":
      return "STATUS UNKNOWN";
    default:
      return "ALL SYSTEMS OPERATIONAL";
  }
}

const AREAS: SecurityArea[] = [
  "authentication",
  "authorization",
  "secrets",
  "api",
  "headers",
  "firebase",
  "uploads",
  "payments",
  "dependencies",
];

export function scoreSecurity(findings: SecurityFinding[]): SecurityScore {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  /** Only an actual problem deducts; a pass never does. */
  const problems = findings.filter(
    (finding) => finding.status === "fail" || finding.status === "warn",
  );

  for (const finding of problems) {
    counts[finding.severity] += 1;
  }

  const deductions: SecurityScore["deductions"] = [];
  let score = 100;

  for (const severity of ["critical", "high", "medium", "low"] as const) {
    const count = counts[severity];
    if (count === 0) continue;

    const points = count * SEVERITY_DEDUCTION[severity];
    score -= points;

    deductions.push({
      label: `${count} ${severity} ${count === 1 ? "finding" : "findings"}`,
      points,
    });
  }

  // The score floors at zero; it is never negative.
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade:
      score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F",
    deductions,
    counts,
    areas: AREAS.map((area) => scoreArea(area, findings)),
  };
}

/**
 * Per-area posture for the radar.
 *
 * An area with no finding at all reports `unknown` rather than a
 * perfect score, because nothing was measured there.
 */
function scoreArea(
  area: SecurityArea,
  findings: SecurityFinding[],
): SecurityScore["areas"][number] {
  const relevant = findings.filter((finding) => finding.area === area);

  if (relevant.length === 0) {
    return { area, score: 0, status: "unknown", passed: 0, total: 0 };
  }

  const passed = relevant.filter((finding) => finding.status === "pass").length;

  let areaScore = 100;

  for (const finding of relevant) {
    if (finding.status === "fail" || finding.status === "warn") {
      areaScore -= SEVERITY_DEDUCTION[finding.severity];
    }
  }

  areaScore = Math.max(0, areaScore);

  const worst = relevant.reduce<Severity>((worstSoFar, finding) => {
    if (finding.status === "pass" || finding.status === "unknown") {
      return worstSoFar;
    }

    return SEVERITY_DEDUCTION[finding.severity] >
      SEVERITY_DEDUCTION[worstSoFar]
      ? finding.severity
      : worstSoFar;
  }, "info");

  return {
    area,
    score: areaScore,
    status:
      worst === "critical"
        ? "critical"
        : worst === "high" || worst === "medium"
          ? "warning"
          : "healthy",
    passed,
    total: relevant.length,
  };
}

/**
 * Order findings so the page leads with what must be fixed first.
 */
export function rankFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const statusRank = { fail: 0, warn: 1, unknown: 2, pass: 3 };

  return [...findings].sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }

    const bySeverity =
      SEVERITY_DEDUCTION[b.severity] - SEVERITY_DEDUCTION[a.severity];

    return bySeverity !== 0 ? bySeverity : a.title.localeCompare(b.title);
  });
}
