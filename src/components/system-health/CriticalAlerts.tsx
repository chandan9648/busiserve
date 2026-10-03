"use client";

import { AlertTriangle, ShieldX } from "lucide-react";

import { SeverityChip } from "./primitives";
import type { HealthCheckResult, SecurityFinding } from "./types";

/**
 * Critical alerts.
 *
 * Shown only when a check actually failed or a critical/high finding
 * exists. With nothing wrong, the band is absent rather than showing
 * a reassuring empty state, so its presence always means something.
 */
export default function CriticalAlerts({
  checks,
  findings,
}: {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
}) {
  const failedChecks = checks.filter(
    (check) => check.status === "critical" || check.status === "offline",
  );

  const urgentFindings = findings.filter(
    (finding) =>
      (finding.status === "fail" || finding.status === "warn") &&
      (finding.severity === "critical" || finding.severity === "high"),
  );

  if (failedChecks.length === 0 && urgentFindings.length === 0) return null;

  const total = failedChecks.length + urgentFindings.length;

  return (
    <section
      className="dv-enter rounded-xl border border-[rgb(255_90_95_/_32%)] bg-[linear-gradient(180deg,rgb(255_90_95_/_7%),rgb(255_90_95_/_2%))]"
      aria-labelledby="dv-alerts-heading"
    >
      <header className="flex items-center gap-2.5 border-b border-[rgb(255_90_95_/_18%)] px-4 py-3">
        <ShieldX
          className="h-4 w-4 flex-none text-[var(--dv-crit)]"
          aria-hidden="true"
        />
        <h2
          id="dv-alerts-heading"
          className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[var(--dv-crit)]"
        >
          Critical alerts
        </h2>
        <span className="dv-mono ml-auto text-[0.6875rem] tabular-nums text-[var(--dv-muted)]">
          {total} requiring attention
        </span>
      </header>

      <ul className="divide-y divide-[rgb(255_90_95_/_12%)]">
        {failedChecks.map((check) => (
          <li
            key={check.id}
            className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3"
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--dv-crit)]"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="dv-mono text-[0.8125rem] font-semibold text-[var(--dv-text)]">
                  {check.service}
                </span>
                <span className="dv-badge dv-status" data-status={check.status}>
                  {check.status === "offline" ? "Unreachable" : "Failed"}
                </span>
                {check.statusCode ? (
                  <span className="dv-mono text-[0.6875rem] text-[var(--dv-dim)]">
                    HTTP {check.statusCode}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
                {check.message}
                {check.detail ? (
                  <span className="text-[var(--dv-dim)]"> {check.detail}</span>
                ) : null}
              </p>
            </div>
          </li>
        ))}

        {urgentFindings.map((finding) => (
          <li
            key={finding.id}
            className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3"
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--dv-warn)]"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.8125rem] font-semibold text-[var(--dv-text)]">
                  {finding.title}
                </span>
                <SeverityChip severity={finding.severity} />
                {finding.reference ? (
                  <code className="dv-mono text-[0.6875rem] text-[var(--dv-dim)]">
                    {finding.reference}
                  </code>
                ) : null}
              </div>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
                {finding.summary}
              </p>
              {finding.remediation ? (
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-dim)]">
                  <span className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-muted)]">
                    Fix:{" "}
                  </span>
                  {finding.remediation}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
