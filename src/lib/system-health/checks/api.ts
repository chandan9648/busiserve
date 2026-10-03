import "server-only";

import { loopback, type LoopbackResult } from "../loopback";
import { MONITORED_ENDPOINTS, type MonitoredEndpoint } from "../registry";
import { severityForStatus, statusForLoopback } from "../verdict";
import type { HealthCheckResult, SecurityFinding } from "../types";

/**
 * =============================================================
 * API LAYER PROBES
 * =============================================================
 *
 * Each registered endpoint receives one credential-free GET, and the
 * status code is compared against what a correct deployment owes an
 * anonymous caller. A route that answers 200 where 401 was expected
 * is reported as a security failure, not as a healthy service.
 *
 * Response bodies are tested for disclosure markers (stack traces,
 * absolute paths, credential shapes) and then discarded.
 */

export interface ApiDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  /** Raw results, reused by the authorisation section. */
  results: Map<string, LoopbackResult>;
  /** Aggregate counts for the request-health chart. */
  summary: {
    total: number;
    asExpected: number;
    unexpected: number;
    transportFailures: number;
    byClass: Record<string, number>;
  };
}

export async function runApiChecks(origin: string): Promise<ApiDiagnostics> {
  const checks: HealthCheckResult[] = [];
  const findings: SecurityFinding[] = [];
  const results = new Map<string, LoopbackResult>();

  /**
   * Probes run in parallel but in small groups. A serverless instance
   * answering its own requests has finite concurrency, so firing
   * fifteen at once can queue behind this very handler.
   */
  const groups = chunk(MONITORED_ENDPOINTS, 4);

  for (const group of groups) {
    const settled = await Promise.all(
      group.map(async (endpoint) => ({
        endpoint,
        result: await loopback(origin, endpoint.path, "GET"),
      })),
    );

    for (const { endpoint, result } of settled) {
      results.set(endpoint.id, result);
      checks.push(toCheck(endpoint, result));

      const disclosure = disclosureFinding(endpoint, result);
      if (disclosure) findings.push(disclosure);
    }
  }

  return { checks, findings, results, summary: summarise(results) };
}

function toCheck(
  endpoint: MonitoredEndpoint,
  result: LoopbackResult,
): HealthCheckResult {
  const verdict = statusForLoopback(endpoint, result);

  return {
    id: `api.${endpoint.id}`,
    service: endpoint.label,
    category: endpoint.kind === "availability" ? "core" : "security",
    status: verdict.status,
    responseTime: result.statusCode > 0 ? result.durationMs : undefined,
    statusCode: result.statusCode > 0 ? result.statusCode : undefined,
    message: verdict.message,
    checkedAt: new Date().toISOString(),
    severity: verdict.severity ?? severityForStatus(verdict.status),
    weight: endpoint.weight,
    detail: `${endpoint.purpose} Expected ${endpoint.expect.join(
      " or ",
    )}, received ${
      result.statusCode > 0
        ? result.statusCode
        : `no response (${result.transportError ?? "unknown"})`
    }.`,
  };
}

/**
 * Report a response body that disclosed internals.
 */
function disclosureFinding(
  endpoint: MonitoredEndpoint,
  result: LoopbackResult,
): SecurityFinding | null {
  if (result.statusCode === 0) return null;

  if (result.body.containsCredentialPattern) {
    return {
      id: `disclosure.credential.${endpoint.id}`,
      title: "Response body appears to contain a credential",
      area: "api",
      severity: "critical",
      status: "fail",
      summary: `${endpoint.label} returned a body matching a private-key or API-secret pattern.`,
      why: "A credential returned in an HTTP response is readable by anyone who can reach the route, and is cached by proxies and browsers. This is an immediate compromise of whatever that credential protects.",
      remediation: `Inspect the handler behind ${endpoint.path}, remove the credential from its response, and rotate the exposed secret. The scan deliberately does not record which value it matched.`,
      reference: endpoint.path,
    };
  }

  if (result.body.containsStackTrace) {
    return {
      id: `disclosure.stack.${endpoint.id}`,
      title: "Stack trace returned to the caller",
      area: "api",
      severity: "medium",
      status: "fail",
      summary: `${endpoint.label} returned a response containing a Node stack trace.`,
      why: "A stack trace reveals internal file layout, dependency versions and control flow, which shortens the work of finding an exploitable path. Production responses should carry a generic message and keep detail in server logs.",
      remediation: `Catch errors in the handler behind ${endpoint.path} and return a fixed message, following the pattern already used in src/app/api/portal/[action]/route.ts, which logs a requestId and returns only controlled text.`,
      reference: endpoint.path,
    };
  }

  if (result.body.containsFilesystemPath) {
    return {
      id: `disclosure.path.${endpoint.id}`,
      title: "Absolute server path returned to the caller",
      area: "api",
      severity: "low",
      status: "fail",
      summary: `${endpoint.label} returned a response containing an absolute filesystem path.`,
      why: "Deployment paths tell an attacker which platform and directory layout is in use, which helps target a traversal or misconfiguration attempt.",
      remediation: `Strip absolute paths from the response produced by ${endpoint.path}; report repository-relative paths instead if a location must be shown.`,
      reference: endpoint.path,
    };
  }

  return null;
}

function summarise(
  results: Map<string, LoopbackResult>,
): ApiDiagnostics["summary"] {
  const byClass: Record<string, number> = {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
    "no response": 0,
  };

  let asExpected = 0;
  let transportFailures = 0;

  for (const [id, result] of results) {
    const endpoint = MONITORED_ENDPOINTS.find((item) => item.id === id);

    if (result.statusCode === 0) {
      byClass["no response"] += 1;
      transportFailures += 1;
      continue;
    }

    const bucket = `${Math.floor(result.statusCode / 100)}xx`;
    if (bucket in byClass) byClass[bucket] += 1;

    if (endpoint && endpoint.expect.includes(result.statusCode)) {
      asExpected += 1;
    }
  }

  return {
    total: results.size,
    asExpected,
    unexpected: results.size - asExpected,
    transportFailures,
    byClass,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}
