import "server-only";

import { WEIGHT } from "../config";
import { readProjectJson } from "../source";
import type {
  DependencyReport,
  HealthCheckResult,
  SecurityFinding,
} from "../types";

/**
 * =============================================================
 * DEPENDENCY INVENTORY
 * =============================================================
 *
 * `package.json` is read and described. Nothing is installed,
 * updated or written, and `npm audit` is never executed: shelling
 * out from a request handler would be slow, unavailable on a
 * read-only serverless filesystem, and a command-execution surface
 * on an endpoint that should have none.
 *
 * So the audit result is reported as NOT AVAILABLE with the reason,
 * rather than being guessed at.
 */

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Ranges that resolve to whatever is newest at install time. */
const UNPINNED_PATTERN = /^(?:latest|\*|next|canary)$/i;

export interface DependencyDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  report: DependencyReport;
}

export async function runDependencyAudit(): Promise<DependencyDiagnostics> {
  const manifest = await readProjectJson<PackageManifest>("package.json");

  if (!manifest) {
    const report: DependencyReport = {
      available: false,
      unavailableReason:
        "package.json is not readable in this runtime, which is expected on a bundled serverless deployment.",
      total: 0,
      runtime: 0,
      development: 0,
      unpinned: [],
      auditStatus: "not-available",
      auditNote:
        "npm audit is never run from a request handler. Run it in CI instead.",
    };

    return {
      checks: [
        {
          id: "dependencies.inventory",
          service: "Dependency inventory",
          category: "configuration",
          status: "unknown",
          message: "NOT AVAILABLE — package.json not readable.",
          checkedAt: new Date().toISOString(),
          severity: "low",
          weight: WEIGHT.low,
          detail: report.unavailableReason,
        },
      ],
      findings: [],
      report,
    };
  }

  const runtime = manifest.dependencies ?? {};
  const development = manifest.devDependencies ?? {};

  const unpinned = Object.entries({ ...runtime, ...development })
    .filter(([, range]) => UNPINNED_PATTERN.test(range.trim()))
    .map(([name, range]) => `${name}@${range}`)
    .sort();

  const report: DependencyReport = {
    available: true,
    total: Object.keys(runtime).length + Object.keys(development).length,
    runtime: Object.keys(runtime).length,
    development: Object.keys(development).length,
    unpinned,
    auditStatus: "not-available",
    auditNote:
      "npm audit is deliberately not executed from this endpoint: it needs a writable filesystem and network access, and running a package manager from a request handler would add a command-execution path to an admin API. Run `npm audit` in CI or locally.",
  };

  const findings: SecurityFinding[] = [];

  if (unpinned.length > 0) {
    findings.push({
      id: "dependencies.unpinned",
      title: `${unpinned.length} dependencies are not pinned to a version`,
      area: "dependencies",
      severity: unpinned.length >= 8 ? "medium" : "low",
      status: "warn",
      summary: `${unpinned
        .slice(0, 6)
        .join(", ")}${unpinned.length > 6 ? `, and ${unpinned.length - 6} more` : ""} use a floating range.`,
      why: "A floating range resolves to whatever version is newest when the lockfile is next regenerated, so two builds of the same commit can ship different code. For a package in the server's trust boundary — firebase-admin and next are both on this list — that also means a compromised or breaking release can enter the build without any change to the repository. package-lock.json pins the current resolution, which is what keeps today's builds reproducible, so this is a supply-chain and reproducibility concern rather than an active vulnerability.",
      remediation:
        "Replace each `latest` with the caret range of the version currently in package-lock.json, for example `^15.5.0`. Do this as a deliberate change with the test suite run afterwards; the scan does not modify package.json.",
      reference: "package.json",
    });
  } else {
    findings.push({
      id: "dependencies.pinned",
      title: "All dependencies declare a version range",
      area: "dependencies",
      severity: "info",
      status: "pass",
      summary: `${report.total} dependencies are declared with explicit ranges.`,
      why: "Explicit ranges keep builds reproducible and make a dependency change visible in review.",
      remediation: "",
    });
  }

  findings.push({
    id: "dependencies.audit",
    title: "Vulnerability audit is not run from this endpoint",
    area: "dependencies",
    severity: "info",
    status: "unknown",
    summary: "NOT AVAILABLE — no advisory data source is reachable from here.",
    why: report.auditNote,
    remediation:
      "Add `npm audit --audit-level=high` to the CI pipeline, or enable Dependabot or Renovate on the repository, so advisories are surfaced at review time rather than from a dashboard.",
  });

  return {
    checks: [
      {
        id: "dependencies.inventory",
        service: "Dependency inventory",
        category: "configuration",
        status: unpinned.length >= 8 ? "warning" : "healthy",
        message: `${report.total} dependencies declared (${report.runtime} runtime, ${report.development} development).`,
        checkedAt: new Date().toISOString(),
        severity: unpinned.length >= 8 ? "medium" : "info",
        weight: WEIGHT.low,
        detail:
          unpinned.length > 0
            ? `${unpinned.length} use a floating range such as "latest".`
            : "Every dependency declares an explicit range.",
      },
    ],
    findings,
    report,
  };
}
