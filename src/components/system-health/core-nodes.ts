import type { HealthCheckResult, HealthStatus } from "./types";

/**
 * Derive the Devil Core's nodes from the scan's own checks.
 *
 * Kept in its own module so the dashboard can map nodes without
 * importing `DevilCore`, which is loaded on demand — a static import
 * of that component would pull its canvas renderer into the first
 * bundle and defeat the dynamic import.
 *
 * A subsystem with no matching check reports `unknown` rather than
 * healthy, so the core never shows a green node for something that
 * was never measured.
 */

export interface CoreNode {
  id: string;
  label: string;
  status: HealthStatus;
}

const RANK: Record<HealthStatus, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  offline: 3,
  critical: 4,
};

const SUBSYSTEMS: { id: string; label: string; prefixes: string[] }[] = [
  { id: "auth", label: "Auth", prefixes: ["firebase.auth"] },
  { id: "api", label: "API", prefixes: ["api."] },
  {
    id: "firebase",
    label: "Firebase",
    prefixes: ["firebase.admin", "firebase.configuration"],
  },
  { id: "database", label: "Firestore", prefixes: ["firebase.firestore"] },
  { id: "storage", label: "Storage", prefixes: ["firebase.storage"] },
  { id: "payment", label: "Payment", prefixes: ["external.razorpay"] },
  { id: "email", label: "Email", prefixes: ["external.resend"] },
];

export function coreNodesFrom(checks: HealthCheckResult[]): CoreNode[] {
  return SUBSYSTEMS.map((subsystem) => {
    const matching = checks.filter((check) =>
      subsystem.prefixes.some((prefix) => check.id.startsWith(prefix)),
    );

    const status: HealthStatus =
      matching.length === 0
        ? "unknown"
        : matching.reduce<HealthStatus>(
            (worst, check) =>
              RANK[check.status] > RANK[worst] ? check.status : worst,
            "healthy",
          );

    return { id: subsystem.id, label: subsystem.label, status };
  });
}
