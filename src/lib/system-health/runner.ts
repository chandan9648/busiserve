import "server-only";

import { randomUUID } from "node:crypto";

import {
  SCAN_PLANS,
  SECTION_LABELS,
  type SectionPlan,
} from "./config";
import { resolveOrigin } from "./loopback";
import { rankFindings, scoreHealth, scoreSecurity } from "./scoring";
import { loadSourceTree, type SourceTree } from "./source";
import { elapsed, now } from "./probe";

import { runApiChecks, type ApiDiagnostics } from "./checks/api";
import { runApiAudit, type ApiAuditDiagnostics } from "./checks/api-audit";
import {
  runAuthSecurityChecks,
  type AuthSecurityDiagnostics,
} from "./checks/auth-security";
import {
  runDependencyAudit,
  type DependencyDiagnostics,
} from "./checks/dependencies";
import { runEnvironmentChecks } from "./checks/environment";
import { runExternalChecks, type ExternalDiagnostics } from "./checks/external";
import { runFirebaseChecks, type FirebaseDiagnostics } from "./checks/firebase";
import { runHeaderChecks, type HeaderAuditResult } from "./checks/headers";
import { runMiddlewareCheck, runRuntimeChecks } from "./checks/runtime";
import { runSecretScan, type SecretDiagnostics } from "./checks/secrets";
import { runUploadAudit, type UploadDiagnostics } from "./checks/uploads";

import type {
  ConfigItem,
  DiagnosticReport,
  HealthCheckResult,
  ScanLogEntry,
  ScanMode,
  SecurityFinding,
} from "./types";

/**
 * =============================================================
 * SCAN ORCHESTRATOR
 * =============================================================
 *
 * Runs the sections the requested mode calls for, collects results
 * into one normalised report, and scores it.
 *
 * The contract every caller depends on: a section that throws is
 * recorded as a failed section and the scan continues. One broken
 * dependency degrades its own panel and nothing else.
 */

/** The full report, plus the section payloads the UI renders. */
export interface ScanResult extends DiagnosticReport {
  sections: {
    firebase: Pick<FirebaseDiagnostics, "collectionCounts"> | null;
    api: ApiDiagnostics["summary"] | null;
    authSecurity: AuthSecurityDiagnostics["probes"] | null;
    headers: Omit<HeaderAuditResult, "findings"> | null;
    external: Pick<ExternalDiagnostics, "razorpay" | "email"> | null;
    uploads: UploadDiagnostics["report"] | null;
  };
}

export async function runScan(
  request: Request,
  mode: ScanMode,
): Promise<ScanResult> {
  const scanId = randomUUID();
  const startedWall = new Date();
  const startedAt = now();
  const plan = SCAN_PLANS[mode];
  const origin = resolveOrigin(request);

  const checks: HealthCheckResult[] = [];
  const findings: SecurityFinding[] = [];
  const configuration: ConfigItem[] = [];
  const logs: ScanLogEntry[] = [];
  const skipped: string[] = [];

  const sections: ScanResult["sections"] = {
    firebase: null,
    api: null,
    authSecurity: null,
    headers: null,
    external: null,
    uploads: null,
  };

  const log = (
    label: string,
    outcome: ScanLogEntry["outcome"],
    message: string,
  ) => {
    logs.push({ at: new Date().toISOString(), label, outcome, message });
  };

  log("Diagnostics", "INFO", `Initialising ${mode} scan ${scanId.slice(0, 8)}.`);

  /**
   * Record every section the mode does not run, so the UI can label
   * those panels rather than leaving them looking empty or passing.
   */
  for (const key of Object.keys(plan) as (keyof SectionPlan)[]) {
    if (!plan[key]) {
      skipped.push(SECTION_LABELS[key]);
      log(SECTION_LABELS[key], "SKIP", `Not part of the ${mode} scan.`);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Environment — always run; every other section reports against it */
  /* ---------------------------------------------------------------- */

  const env = await section(
    log,
    SECTION_LABELS.environment,
    () => Promise.resolve(runEnvironmentChecks(origin)),
  );

  const environment =
    env?.environment ??
    {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      deployEnv: "unknown",
      nodeVersion: process.version,
      platform: process.platform,
      region: "unknown",
      processUptimeSeconds: Math.round(process.uptime()),
      memoryMb: null,
      origin,
    };

  if (env && plan.environment) {
    checks.push(...env.checks);
    findings.push(...env.findings);
    configuration.push(...env.configuration);
  }

  /* ---------------------------------------------------------------- */
  /* Source tree — loaded once and shared by the static audits        */
  /* ---------------------------------------------------------------- */

  const needsSource = plan.secrets || plan.apiAudit || plan.uploads;

  const tree: SourceTree = needsSource
    ? ((await section(log, "Source tree", loadSourceTree)) ?? {
        available: false,
        unavailableReason: "The source tree could not be read.",
        root: "src",
        files: [],
        truncated: false,
      })
    : { available: false, unavailableReason: "Not requested.", root: "src", files: [], truncated: false };

  if (needsSource) {
    log(
      "Source tree",
      tree.available ? "PASS" : "WARN",
      tree.available
        ? `${tree.files.length} source files loaded${tree.truncated ? " (truncated at the scan limit)" : ""}.`
        : "Source not present in this runtime; static audits report NOT AVAILABLE.",
    );
  }

  /* ---------------------------------------------------------------- */
  /* Runtime                                                          */
  /* ---------------------------------------------------------------- */

  if (plan.runtime) {
    const runtime = await section(log, SECTION_LABELS.runtime, async () => [
      ...runRuntimeChecks(environment),
      await runMiddlewareCheck(),
    ]);

    if (runtime) checks.push(...runtime);
  }

  /* ---------------------------------------------------------------- */
  /* Firebase                                                         */
  /* ---------------------------------------------------------------- */

  if (plan.firebase) {
    const firebase = await section(
      log,
      SECTION_LABELS.firebase,
      runFirebaseChecks,
    );

    if (firebase) {
      checks.push(...firebase.checks);
      findings.push(...firebase.findings);

      // Firebase config entries supplement the environment list.
      for (const item of firebase.configuration) {
        if (!configuration.some((existing) => existing.name === item.name)) {
          configuration.push(item);
        }
      }

      sections.firebase = { collectionCounts: firebase.collectionCounts };
    }
  }

  /* ---------------------------------------------------------------- */
  /* API layer                                                        */
  /* ---------------------------------------------------------------- */

  let apiResults: ApiDiagnostics | null = null;

  if (plan.api) {
    apiResults = await section(log, SECTION_LABELS.api, () =>
      runApiChecks(origin),
    );

    if (apiResults) {
      checks.push(...apiResults.checks);
      findings.push(...apiResults.findings);
      sections.api = apiResults.summary;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Authentication & authorisation                                   */
  /* ---------------------------------------------------------------- */

  if (plan.authSecurity) {
    const auth = await section(log, SECTION_LABELS.authSecurity, () =>
      runAuthSecurityChecks(origin, apiResults?.results),
    );

    if (auth) {
      findings.push(...auth.findings);
      sections.authSecurity = auth.probes;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Security headers                                                 */
  /* ---------------------------------------------------------------- */

  if (plan.headers) {
    const headers = await section(log, SECTION_LABELS.headers, () =>
      runHeaderChecks(origin),
    );

    if (headers) {
      findings.push(...headers.findings);

      const { findings: _ignored, ...rest } = headers;
      sections.headers = rest;

      checks.push({
        id: "security.headers",
        service: "Security headers",
        category: "security",
        status: headers.available
          ? headers.findings.some((finding) => finding.severity === "medium")
            ? "warning"
            : "healthy"
          : "unknown",
        message: headers.available
          ? headers.findings.length === 0
            ? "All audited headers are present."
            : `${headers.findings.length} header recommendation(s).`
          : "NOT AVAILABLE — could not read the application's own headers.",
        checkedAt: new Date().toISOString(),
        severity: headers.findings.length === 0 ? "info" : "medium",
        weight: 2,
        detail: headers.unavailableReason,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Static audits                                                    */
  /* ---------------------------------------------------------------- */

  let secrets: SecretDiagnostics | null = null;

  if (plan.secrets) {
    secrets = await section(log, SECTION_LABELS.secrets, async () =>
      runSecretScan(tree),
    );

    if (secrets) {
      checks.push(...secrets.checks);
      findings.push(...secrets.findings);
    }
  }

  let apiAudit: ApiAuditDiagnostics | null = null;

  if (plan.apiAudit) {
    apiAudit = await section(log, SECTION_LABELS.apiAudit, () =>
      Promise.resolve(runApiAudit(tree)),
    );

    if (apiAudit) {
      checks.push(...apiAudit.checks);
      findings.push(...apiAudit.findings);
    }
  }

  if (plan.uploads) {
    const uploads = await section(log, SECTION_LABELS.uploads, () =>
      Promise.resolve(runUploadAudit(tree)),
    );

    if (uploads) {
      checks.push(...uploads.checks);
      findings.push(...uploads.findings);
      sections.uploads = uploads.report;
    }
  }

  /* ---------------------------------------------------------------- */
  /* External services                                                */
  /* ---------------------------------------------------------------- */

  if (plan.external) {
    const external = await section(
      log,
      SECTION_LABELS.external,
      runExternalChecks,
    );

    if (external) {
      checks.push(...external.checks);
      findings.push(...external.findings);
      sections.external = {
        razorpay: external.razorpay,
        email: external.email,
      };
    }
  }

  /* ---------------------------------------------------------------- */
  /* Dependencies                                                     */
  /* ---------------------------------------------------------------- */

  let dependencies: DependencyDiagnostics | null = null;

  if (plan.dependencies) {
    dependencies = await section(
      log,
      SECTION_LABELS.dependencies,
      runDependencyAudit,
    );

    if (dependencies) {
      checks.push(...dependencies.checks);
      findings.push(...dependencies.findings);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Score and close                                                  */
  /* ---------------------------------------------------------------- */

  const health = scoreHealth(checks);
  const ranked = rankFindings(findings);
  const security = scoreSecurity(findings);

  const durationMs = elapsed(startedAt);

  log(
    "Diagnostic complete",
    health.status === "healthy"
      ? "PASS"
      : health.status === "critical" || health.status === "offline"
        ? "FAIL"
        : "WARN",
    `${checks.length} checks, ${
      ranked.filter((item) => item.status === "fail" || item.status === "warn")
        .length
    } findings in ${durationMs} ms. Health ${health.score}%, security ${security.score}/100.`,
  );

  return {
    scanId,
    mode,
    startedAt: startedWall.toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    environment,
    checks,
    findings: ranked,
    configuration,
    secretScan:
      secrets?.scan ?? {
        available: false,
        unavailableReason: plan.secrets
          ? "The scan did not complete."
          : "Not part of this scan mode.",
        filesScanned: 0,
        matches: [],
      },
    apiAudit:
      apiAudit?.audit ?? {
        available: false,
        unavailableReason: plan.apiAudit
          ? "The audit did not complete."
          : "Not part of this scan mode.",
        routes: [],
      },
    dependencies:
      dependencies?.report ?? {
        available: false,
        unavailableReason: plan.dependencies
          ? "The audit did not complete."
          : "Not part of this scan mode.",
        total: 0,
        runtime: 0,
        development: 0,
        unpinned: [],
        auditStatus: "not-available",
        auditNote: "Not part of this scan mode.",
      },
    logs,
    health,
    security,
    skipped,
    sections,
  };
}

/**
 * Run one section with its own error boundary.
 *
 * Returning `null` tells the caller the section produced nothing,
 * which is always handled, so a thrown dependency error degrades one
 * panel instead of failing the scan.
 */
async function section<T>(
  log: (
    label: string,
    outcome: ScanLogEntry["outcome"],
    message: string,
  ) => void,
  label: string,
  body: () => Promise<T>,
): Promise<T | null> {
  try {
    const result = await body();
    log(label, "PASS", "Section completed.");
    return result;
  } catch (error) {
    // Only a category is logged; an SDK error can carry credentials.
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code).slice(0, 60)
        : error instanceof Error
          ? error.name
          : "unknown";

    log(label, "FAIL", `Section failed (${code}). Other sections continue.`);

    return null;
  }
}
