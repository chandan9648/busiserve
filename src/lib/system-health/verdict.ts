import "server-only";

import { statusForDuration } from "./config";
import type { LoopbackResult } from "./loopback";
import type { MonitoredEndpoint } from "./registry";
import { worstStatus } from "./probe";
import type { HealthStatus, Severity } from "./types";

export { severityForStatus, worstStatus } from "./probe";

/**
 * =============================================================
 * LOOPBACK VERDICTS
 * =============================================================
 *
 * Turning a status code into a health verdict is the step where a
 * monitoring dashboard most easily starts lying — a 200 looks like
 * success even when the endpoint owed the caller a 401.
 *
 * So the comparison is always against what this specific endpoint
 * is registered to return, never against "2xx is good".
 */

export interface Verdict {
  status: HealthStatus;
  message: string;
  severity?: Severity;
}

export function statusForLoopback(
  endpoint: MonitoredEndpoint,
  result: LoopbackResult,
): Verdict {
  /* No response at all. */
  if (result.statusCode === 0) {
    if (result.transportError === "origin-unresolved") {
      return {
        status: "unknown",
        message: "Could not determine this deployment's own origin.",
        severity: "low",
      };
    }

    if (result.transportError === "TimeoutError") {
      return {
        status: "critical",
        message: "Timed out before responding.",
        severity: "high",
      };
    }

    return {
      status: "offline",
      message: `Unreachable (${result.transportError ?? "no response"}).`,
      severity: "high",
    };
  }

  const expected = endpoint.expect.includes(result.statusCode);

  /* ---------------------------------------------------------------- */
  /* The case that matters most: a guard that did not hold.           */
  /* ---------------------------------------------------------------- */
  if (endpoint.kind === "protected" && !expected) {
    if (result.statusCode === 200) {
      return {
        status: "critical",
        message: "SECURITY ISSUE — responded 200 to an unauthenticated caller.",
        severity: "critical",
      };
    }

    // 404 means the route moved; the guard is not proven either way.
    if (result.statusCode === 404) {
      return {
        status: "warning",
        message: "Route not found, so its guard could not be verified.",
        severity: "medium",
      };
    }

    if (result.statusCode === 429) {
      return {
        status: "warning",
        message: "Rate limited, so the guard could not be verified this scan.",
        severity: "low",
      };
    }

    if (result.statusCode >= 500) {
      return {
        status: "critical",
        message: `Server error ${result.statusCode} instead of a rejection.`,
        severity: "high",
      };
    }

    return {
      status: "warning",
      message: `Rejected with ${result.statusCode} rather than ${endpoint.expect.join(
        " or ",
      )}.`,
      severity: "low",
    };
  }

  if (endpoint.kind === "protected" && expected) {
    return {
      status: durationStatus(result),
      message: `Correctly refused an anonymous request (${result.statusCode}).`,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Method guards.                                                   */
  /* ---------------------------------------------------------------- */
  if (endpoint.kind === "method-guard") {
    if (expected) {
      return {
        status: durationStatus(result),
        message: "Correctly refused an unsupported method (405).",
      };
    }

    if (result.statusCode === 401 || result.statusCode === 403) {
      // Authentication ran before method dispatch. Still a refusal.
      return {
        status: "healthy",
        message: `Refused before method dispatch (${result.statusCode}).`,
      };
    }

    if (result.statusCode === 200) {
      return {
        status: "critical",
        message: "Responded 200 to an unsupported method.",
        severity: "high",
      };
    }

    if (result.statusCode === 404) {
      return {
        status: "warning",
        message: "Route not found.",
        severity: "medium",
      };
    }

    return {
      status: "warning",
      message: `Returned ${result.statusCode} rather than 405.`,
      severity: "low",
    };
  }

  /* ---------------------------------------------------------------- */
  /* Public availability.                                             */
  /* ---------------------------------------------------------------- */
  if (expected) {
    return {
      status: durationStatus(result),
      message: `Serving traffic (${result.statusCode}).`,
    };
  }

  if (result.statusCode >= 500) {
    return {
      status: "critical",
      message: `Server error ${result.statusCode}.`,
      severity: "critical",
    };
  }

  if (result.statusCode === 404) {
    return {
      status: "critical",
      message: "Not found — this page should be publicly served.",
      severity: "high",
    };
  }

  if (result.statusCode >= 300 && result.statusCode < 400) {
    return {
      status: "warning",
      message: `Redirected (${result.statusCode}) instead of serving the page.`,
      severity: "low",
    };
  }

  return {
    status: "warning",
    message: `Unexpected status ${result.statusCode}.`,
    severity: "medium",
  };
}

/**
 * A correct status code that took too long is still a degradation.
 */
function durationStatus(result: LoopbackResult): HealthStatus {
  return worstStatus([
    "healthy",
    statusForDuration("api.loopback", result.durationMs),
  ]);
}
