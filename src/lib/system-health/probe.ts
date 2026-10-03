import "server-only";

import {
  SCAN_TIMEOUT_MS,
  statusForDuration,
  thresholdsFor,
} from "./config";
import type { HealthCheckResult, HealthStatus, Severity } from "./types";

/**
 * =============================================================
 * PROBE PRIMITIVES
 * =============================================================
 *
 * A diagnostic must never be able to fail the scan that runs it.
 * Everything here converts a thrown error into a reportable
 * result, and strips anything that could disclose internals.
 */

/** Monotonic clock, so a clock adjustment cannot produce a negative duration. */
export function now(): number {
  return Math.round(performance.now());
}

export function elapsed(from: number): number {
  return Math.max(0, now() - from);
}

/**
 * Reduce an unknown thrown value to a short, non-identifying code.
 *
 * Raw SDK errors can embed credentials, key fragments, bucket names
 * and absolute paths, so the message itself is never propagated.
 */
export function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;

    if (typeof code === "number" && Number.isFinite(code)) {
      return String(code);
    }

    if (typeof code === "string" && /^[A-Za-z0-9/_.-]{1,60}$/.test(code)) {
      return code;
    }
  }

  if (error instanceof Error && /^[A-Za-z]{1,40}Error$/.test(error.name)) {
    return error.name;
  }

  return "unknown";
}

/**
 * Translate a transport failure into an operator-facing category.
 */
export function failureCategory(error: unknown): {
  status: HealthStatus;
  category: string;
} {
  const code = errorCode(error);

  if (
    code === "TimeoutError" ||
    code === "AbortError" ||
    code === "23" ||
    code === "ETIMEDOUT"
  ) {
    return { status: "critical", category: "timeout" };
  }

  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH"
  ) {
    return { status: "offline", category: "network" };
  }

  if (
    code === "permission-denied" ||
    code === "PERMISSION_DENIED" ||
    code === "7" ||
    code === "auth/insufficient-permission"
  ) {
    return { status: "critical", category: "permission" };
  }

  if (code === "unavailable" || code === "14" || code === "deadline-exceeded") {
    return { status: "critical", category: "unavailable" };
  }

  return { status: "critical", category: `error (${code})` };
}

export interface ProbeDefinition {
  id: string;
  service: string;
  category: HealthCheckResult["category"];
  weight: number;
  /** Severity applied when the probe fails. */
  failureSeverity?: Severity;
}

export interface ProbeOutcome {
  status?: HealthStatus;
  statusCode?: number;
  message: string;
  detail?: string;
  severity?: Severity;
  /** Set when the probe measures something other than its own duration. */
  responseTime?: number;
  /** Skip response-time classification, for checks where it is meaningless. */
  ignoreDuration?: boolean;
}

/**
 * Run one probe under a wall-clock budget and normalise the result.
 *
 * The returned status is the worse of what the probe reported and
 * what its measured duration implies, so a succeeding-but-slow
 * dependency still surfaces.
 */
export async function runProbe(
  definition: ProbeDefinition,
  body: () => Promise<ProbeOutcome>,
): Promise<HealthCheckResult> {
  const started = now();

  const base = {
    id: definition.id,
    service: definition.service,
    category: definition.category,
    weight: definition.weight,
  };

  try {
    const outcome = await withTimeout(body(), SCAN_TIMEOUT_MS.probe);
    const duration = outcome.responseTime ?? elapsed(started);

    const reported = outcome.status ?? "healthy";
    const byDuration = outcome.ignoreDuration
      ? "healthy"
      : statusForDuration(definition.id, duration);

    const status = worstStatus([reported, byDuration]);

    const detail =
      status === "warning" && reported === "healthy" && !outcome.ignoreDuration
        ? `Responded in ${duration} ms, above this service's ${
            thresholdLabel(definition.id)
          } budget.`
        : outcome.detail;

    return {
      ...base,
      status,
      responseTime: outcome.ignoreDuration ? undefined : duration,
      statusCode: outcome.statusCode,
      message: outcome.message,
      checkedAt: new Date().toISOString(),
      severity: outcome.severity ?? severityForStatus(status),
      detail,
    };
  } catch (error) {
    const { status, category } = failureCategory(error);

    return {
      ...base,
      status,
      responseTime: elapsed(started),
      message: `Check failed: ${category}.`,
      checkedAt: new Date().toISOString(),
      severity: definition.failureSeverity ?? severityForStatus(status),
      detail: "The probe did not complete. See the error stream for the stage.",
    };
  }
}

function thresholdLabel(id: string): string {
  return `${thresholdsFor(id).healthy} ms`;
}

export function severityForStatus(status: HealthStatus): Severity {
  switch (status) {
    case "healthy":
      return "info";
    case "warning":
      return "medium";
    case "critical":
      return "critical";
    case "offline":
      return "high";
    default:
      return "low";
  }
}

const STATUS_RANK: Record<HealthStatus, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  offline: 3,
  critical: 4,
};

export function worstStatus(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>(
    (worst, candidate) =>
      STATUS_RANK[candidate] > STATUS_RANK[worst] ? candidate : worst,
    "healthy",
  );
}

/**
 * Bound any promise, including SDK calls that ignore AbortSignal.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Probe timed out.");
          error.name = "TimeoutError";
          reject(error);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Present an environment variable without reading its value into
 * anything that leaves the server.
 */
export function isPresent(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}
