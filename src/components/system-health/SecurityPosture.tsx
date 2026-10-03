"use client";

import { Meter } from "./primitives";
import type { SystemHealthReport } from "./types";

/**
 * SECURITY POSTURE SCORE
 *
 * The scoring algorithm is published rather than described: the
 * deduction table and the resulting arithmetic are both shown, so the
 * number can be checked by hand against the findings list.
 */
export default function SecurityPosture({
  report,
}: {
  report: SystemHealthReport;
}) {
  const { security } = report;

  const status =
    security.score >= 90
      ? "healthy"
      : security.score >= 70
        ? "warning"
        : "critical";

  const problems = report.findings.filter(
    (finding) => finding.status === "fail" || finding.status === "warn",
  );

  const passes = report.findings.filter(
    (finding) => finding.status === "pass",
  ).length;

  return (
    <div className="dv-panel-body space-y-4">
      <div className="dv-status flex flex-wrap items-end gap-x-6 gap-y-3" data-status={status}>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="dv-mono text-4xl font-bold tabular-nums"
              style={{ color: "var(--c)" }}
            >
              {security.score}
            </span>
            <span className="dv-mono text-sm text-[var(--dv-dim)]">/ 100</span>
            <span
              className="dv-mono ml-2 rounded border px-2 py-0.5 text-sm font-bold"
              style={{
                color: "var(--c)",
                borderColor: "color-mix(in srgb, var(--c) 35%, transparent)",
                background: "var(--w)",
              }}
            >
              {security.grade}
            </span>
          </div>

          <div className="mt-2.5 w-48">
            <Meter
              value={security.score}
              status={status}
              label={`Security posture ${security.score} out of 100`}
            />
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-x-5 gap-y-1.5 sm:grid-cols-5">
          {(["critical", "high", "medium", "low", "info"] as const).map(
            (severity) => (
              <div key={severity}>
                <dt className="dv-mono text-[0.5625rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
                  {severity}
                </dt>
                <dd
                  className="dv-mono mt-0.5 text-base font-semibold tabular-nums"
                  style={{
                    color:
                      security.counts[severity] === 0
                        ? "var(--dv-dim)"
                        : severity === "critical"
                          ? "var(--dv-crit)"
                          : severity === "high"
                            ? "#ff9f6b"
                            : severity === "medium"
                              ? "var(--dv-warn)"
                              : "var(--dv-info)",
                  }}
                >
                  {security.counts[severity]}
                </dd>
              </div>
            ),
          )}
        </dl>
      </div>

      {/* Why this score ------------------------------------------- */}
      <div className="rounded-lg border border-[var(--dv-line)] bg-[var(--dv-inset)] p-3.5">
        <h3 className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-muted)]">
          Why this score
        </h3>

        <ul className="dv-mono mt-2 space-y-1 text-[0.75rem]">
          <li className="flex items-baseline justify-between gap-4 text-[var(--dv-muted)]">
            <span>Starting score</span>
            <span className="tabular-nums text-[var(--dv-text)]">100</span>
          </li>

          {security.deductions.length === 0 ? (
            <li className="flex items-baseline justify-between gap-4 text-[var(--dv-ok)]">
              <span>No deductions — nothing failed or warned</span>
              <span className="tabular-nums">−0</span>
            </li>
          ) : (
            security.deductions.map((deduction) => (
              <li
                key={deduction.label}
                className="flex items-baseline justify-between gap-4 text-[var(--dv-muted)]"
              >
                <span>{deduction.label}</span>
                <span className="tabular-nums text-[var(--dv-crit)]">
                  −{deduction.points}
                </span>
              </li>
            ))
          )}

          <li className="flex items-baseline justify-between gap-4 border-t border-[var(--dv-line)] pt-1.5 font-semibold text-[var(--dv-text)]">
            <span>Result{security.score === 0 ? " (floored at 0)" : ""}</span>
            <span className="tabular-nums">{security.score}</span>
          </li>
        </ul>

        <p className="mt-2.5 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
          Each failing or warning finding deducts by severity: critical −20,
          high −10, medium −5, low −2. Informational findings and passes deduct
          nothing, and the total never goes below zero. {passes} check
          {passes === 1 ? "" : "s"} passed and {problems.length} need attention —
          all of them listed in the findings panel below.
        </p>
      </div>
    </div>
  );
}
