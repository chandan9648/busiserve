"use client";

import { useMemo, useState } from "react";

import { SeverityChip } from "./primitives";
import { AREA_LABELS, type SecurityArea, type SecurityFinding } from "./types";

/**
 * RECOMMENDATION ENGINE
 *
 * Each finding carries its own issue, consequence, severity and fix,
 * authored by the check that produced it. Nothing is generated from a
 * generic template here — this component only presents and filters.
 */

type Filter = "problems" | "all" | "passes";

export default function FindingsList({
  findings,
}: {
  findings: SecurityFinding[];
}) {
  const [filter, setFilter] = useState<Filter>("problems");
  const [area, setArea] = useState<SecurityArea | "all">("all");

  const areas = useMemo(
    () => [...new Set(findings.map((finding) => finding.area))].sort(),
    [findings],
  );

  const visible = useMemo(
    () =>
      findings.filter((finding) => {
        if (area !== "all" && finding.area !== area) return false;

        if (filter === "problems") {
          return finding.status === "fail" || finding.status === "warn";
        }

        if (filter === "passes") return finding.status === "pass";

        return true;
      }),
    [findings, filter, area],
  );

  const problemCount = findings.filter(
    (finding) => finding.status === "fail" || finding.status === "warn",
  ).length;

  return (
    <div className="dv-panel-body space-y-3">
      {/* Filters -------------------------------------------------- */}
      <div className="dv-no-print flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="Finding filter">
          {(
            [
              ["problems", `Needs attention (${problemCount})`],
              ["passes", `Passing (${findings.length - problemCount})`],
              ["all", `All (${findings.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="dv-btn"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-1.5">
          <span className="sr-only">Filter by area</span>
          <select
            className="dv-select"
            value={area}
            onChange={(event) =>
              setArea(event.target.value as SecurityArea | "all")
            }
          >
            <option value="all">ALL AREAS</option>
            {areas.map((value) => (
              <option key={value} value={value}>
                {AREA_LABELS[value].toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* List ----------------------------------------------------- */}
      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--dv-line-strong)] p-4 text-center text-[0.8125rem] text-[var(--dv-muted)]">
          {filter === "problems"
            ? "Nothing requires attention in this scan."
            : "No findings match this filter."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((finding) => (
            <li
              key={finding.id}
              className="dv-status rounded-lg border bg-[var(--dv-inset)] p-3.5"
              data-status={
                finding.status === "fail"
                  ? finding.severity === "critical"
                    ? "critical"
                    : "warning"
                  : finding.status === "warn"
                    ? "warning"
                    : finding.status === "pass"
                      ? "healthy"
                      : "unknown"
              }
              style={{
                borderColor:
                  finding.status === "pass"
                    ? "var(--dv-line)"
                    : "color-mix(in srgb, var(--c) 28%, transparent)",
              }}
            >
              <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="dv-dot" aria-hidden="true" />

                <h3 className="min-w-0 flex-1 text-[0.875rem] font-semibold leading-snug text-[var(--dv-text)]">
                  {finding.title}
                </h3>

                <span
                  className="dv-mono text-[0.5625rem] font-bold uppercase tracking-[0.1em]"
                  style={{ color: "var(--c)" }}
                >
                  {finding.status === "pass"
                    ? "✓ Pass"
                    : finding.status === "fail"
                      ? "✕ Fail"
                      : finding.status === "warn"
                        ? "⚠ Warn"
                        : "? Unknown"}
                </span>

                <SeverityChip severity={finding.severity} />

                <span className="dv-mono rounded bg-[var(--dv-raised)] px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-[var(--dv-dim)]">
                  {AREA_LABELS[finding.area]}
                </span>
              </header>

              <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
                {finding.summary}
              </p>

              <dl className="mt-2.5 space-y-2 border-t border-[color-mix(in_srgb,var(--dv-line)_60%,transparent)] pt-2.5 text-[0.8125rem] leading-relaxed">
                <div>
                  <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
                    Why it matters{" "}
                  </dt>
                  <dd className="inline text-[var(--dv-muted)]">
                    {finding.why}
                  </dd>
                </div>

                {finding.remediation ? (
                  <div>
                    <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-accent)]">
                      Recommended fix{" "}
                    </dt>
                    <dd className="inline text-[var(--dv-muted)]">
                      {finding.remediation}
                    </dd>
                  </div>
                ) : null}

                {finding.reference ? (
                  <div>
                    <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
                      Reference{" "}
                    </dt>
                    <dd className="inline">
                      <code className="dv-mono break-all text-[0.75rem] text-[var(--dv-muted)]">
                        {finding.reference}
                      </code>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
