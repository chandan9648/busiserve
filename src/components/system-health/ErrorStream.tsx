"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Clock } from "./primitives";
import { STATUS_LABELS, type HealthCheckResult } from "./types";

/**
 * SYSTEM // ERROR STREAM
 *
 * Derived from the scan's own checks, so every row is a real
 * observation with a timestamp. Passing authorisation probes are kept
 * in the stream rather than filtered out — "unauthorized access
 * correctly blocked" is a result worth seeing.
 */

type Severity = "all" | "critical" | "warning" | "pass";

export default function ErrorStream({
  checks,
}: {
  checks: HealthCheckResult[];
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity>("all");

  const rows = useMemo(() => {
    const ranked = [...checks].sort((a, b) => {
      const order: Record<string, number> = {
        critical: 0,
        offline: 1,
        warning: 2,
        unknown: 3,
        healthy: 4,
      };

      return order[a.status] - order[b.status];
    });

    const needle = query.trim().toLowerCase();

    return ranked.filter((check) => {
      if (severity === "critical" && check.status !== "critical" && check.status !== "offline") {
        return false;
      }

      if (severity === "warning" && check.status !== "warning") return false;
      if (severity === "pass" && check.status !== "healthy") return false;

      if (!needle) return true;

      return (
        check.service.toLowerCase().includes(needle) ||
        check.message.toLowerCase().includes(needle) ||
        check.id.toLowerCase().includes(needle) ||
        (check.detail ?? "").toLowerCase().includes(needle)
      );
    });
  }, [checks, query, severity]);

  return (
    <div className="dv-panel-body space-y-3">
      {/* Controls ------------------------------------------------- */}
      <div className="dv-no-print flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--dv-dim)]"
            aria-hidden="true"
          />
          <input
            type="search"
            className="dv-input pl-8"
            placeholder="Filter by service, message or check id"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search the error stream"
          />
        </div>

        <div className="flex gap-1" role="group" aria-label="Severity filter">
          {(
            [
              ["all", "All"],
              ["critical", "Critical"],
              ["warning", "Warning"],
              ["pass", "Pass"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="dv-btn"
              aria-pressed={severity === value}
              onClick={() => setSeverity(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stream --------------------------------------------------- */}
      <div
        className="dv-scroll max-h-[320px] overflow-y-auto rounded-lg border border-[var(--dv-line)] bg-[var(--dv-inset)]"
        data-lenis-prevent
      >
        {rows.length === 0 ? (
          <p className="p-4 text-center text-[0.8125rem] text-[var(--dv-muted)]">
            No entries match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--dv-line)_55%,transparent)]">
            {rows.map((check) => (
              <li
                key={check.id}
                className="dv-status grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[auto_120px_minmax(0,1fr)_auto]"
                data-status={check.status}
              >
                <span className="dv-mono text-[0.6875rem] tabular-nums text-[var(--dv-dim)]">
                  <Clock iso={check.checkedAt} />
                </span>

                <span className="dv-mono hidden truncate text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--dv-muted)] sm:block">
                  {categoryOf(check)}
                </span>

                <span className="col-span-2 text-[0.75rem] leading-relaxed text-[var(--dv-muted)] sm:col-span-1">
                  <strong className="font-semibold text-[var(--dv-text)]">
                    {check.service}
                  </strong>
                  {" — "}
                  {check.message}
                  {check.statusCode ? (
                    <span className="dv-mono text-[var(--dv-dim)]">
                      {" "}
                      [{check.statusCode}
                      {/* A refusal this probe asked for, not an error. */}
                      {check.status === "healthy" && check.statusCode >= 400
                        ? " expected"
                        : ""}
                      ]
                    </span>
                  ) : null}
                  {typeof check.responseTime === "number" ? (
                    <span className="dv-mono text-[var(--dv-dim)]">
                      {" "}
                      {check.responseTime}ms
                    </span>
                  ) : null}
                </span>

                <span
                  className="dv-mono col-span-2 text-[0.5625rem] font-bold uppercase tracking-[0.12em] sm:col-span-1 sm:text-right"
                  style={{ color: "var(--c)" }}
                >
                  {check.status === "healthy"
                    ? "PASS"
                    : check.status === "warning"
                      ? "WARNING"
                      : check.status === "unknown"
                        ? "UNKNOWN"
                        : "CRITICAL"}
                  <span className="sr-only">
                    {" "}
                    {STATUS_LABELS[check.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="dv-mono text-[0.625rem] text-[var(--dv-dim)]">
        {rows.length} of {checks.length} entries. Every row is an observation
        from this scan; the application keeps no persistent error log, so earlier
        scans are NOT AVAILABLE here.
      </p>
    </div>
  );
}

function categoryOf(check: HealthCheckResult): string {
  if (check.id.startsWith("firebase.")) return "Firebase";
  if (check.id.startsWith("api.")) return "API";
  if (check.id.startsWith("external.")) return "External";
  if (check.id.startsWith("runtime.")) return "Runtime";
  if (check.id.startsWith("environment.")) return "Config";
  if (check.id.startsWith("security.") || check.id.startsWith("secrets.")) {
    return "Security";
  }

  return "System";
}
