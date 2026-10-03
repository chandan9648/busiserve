import "server-only";

import { WEIGHT } from "../config";
import { projectFileExists } from "../source";
import type { HealthCheckResult, RuntimeEnvironment } from "../types";

/**
 * =============================================================
 * RUNTIME & SERVER
 * =============================================================
 *
 * Facts about the process answering this request.
 *
 * `process.uptime()` is the lifetime of this server process, which
 * on a serverless platform is the lifetime of one warm instance, not
 * the application's availability. The dashboard labels it as such
 * rather than presenting it as an uptime figure.
 */

export function runRuntimeChecks(
  environment: RuntimeEnvironment,
): HealthCheckResult[] {
  const checks: HealthCheckResult[] = [];
  const at = new Date().toISOString();

  /* The handler executed, so the server is answering by definition. */
  checks.push({
    id: "runtime.server",
    service: "Next.js server",
    category: "runtime",
    status: "healthy",
    message: `Handling requests on Node ${environment.nodeVersion}.`,
    checkedAt: at,
    severity: "info",
    weight: WEIGHT.critical,
    detail: `Process has been warm for ${formatUptime(
      environment.processUptimeSeconds,
    )}. This is one instance's lifetime, not application uptime.`,
  });

  /* Node major version. firebase-admin requires a supported runtime. */
  const major = Number(environment.nodeVersion.replace(/^v/, "").split(".")[0]);

  checks.push({
    id: "runtime.node",
    service: "Node.js runtime",
    category: "runtime",
    status: !Number.isFinite(major)
      ? "unknown"
      : major >= 20
        ? "healthy"
        : major >= 18
          ? "warning"
          : "critical",
    message: !Number.isFinite(major)
      ? "Node version could not be parsed."
      : major >= 20
        ? `Node ${major} is a supported release.`
        : major >= 18
          ? `Node ${major} is approaching end of life.`
          : `Node ${major} is out of support.`,
    checkedAt: at,
    severity: major >= 20 ? "info" : major >= 18 ? "low" : "high",
    weight: WEIGHT.medium,
    detail:
      major >= 20
        ? "Receives security updates."
        : "An unsupported runtime stops receiving security patches, and firebase-admin may drop it.",
  });

  /* Memory headroom. */
  if (environment.memoryMb !== null) {
    checks.push({
      id: "runtime.memory",
      service: "Process memory",
      category: "runtime",
      status:
        environment.memoryMb > 900
          ? "warning"
          : environment.memoryMb > 1400
            ? "critical"
            : "healthy",
      message: `Resident set size is ${environment.memoryMb} MB.`,
      checkedAt: at,
      severity: environment.memoryMb > 900 ? "medium" : "info",
      weight: WEIGHT.low,
      detail:
        environment.memoryMb > 900
          ? "Approaching the 1024 MB default on many serverless plans. A function that exceeds its limit is terminated mid-request."
          : "Within a typical serverless allocation.",
    });
  }

  /* Build mode. */
  checks.push({
    id: "runtime.mode",
    service: "Build mode",
    category: "runtime",
    status: "healthy",
    message: `NODE_ENV is ${environment.nodeEnv}; deployment reports ${environment.deployEnv}.`,
    checkedAt: at,
    severity: "info",
    weight: WEIGHT.low,
    detail:
      environment.nodeEnv === "production"
        ? "React development warnings and detailed error overlays are disabled."
        : "Development mode serves unminified code and verbose errors. Expected locally; a finding if seen in production.",
  });

  return checks;
}

/**
 * Middleware presence, reported as a core-layer fact.
 */
export async function runMiddlewareCheck(): Promise<HealthCheckResult> {
  const present =
    (await projectFileExists("middleware.ts")) ||
    (await projectFileExists("src/middleware.ts")) ||
    (await projectFileExists("middleware.js"));

  return {
    id: "runtime.middleware",
    service: "Middleware",
    category: "core",
    status: present ? "healthy" : "unknown",
    message: present
      ? "Edge middleware is present."
      : "No middleware layer is configured.",
    checkedAt: new Date().toISOString(),
    severity: present ? "info" : "low",
    weight: WEIGHT.low,
    detail: present
      ? "Requests pass through middleware before reaching a route handler."
      : "By design: every guard runs inside its own route handler. Verified directly by the authorisation probes rather than inferred.",
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
