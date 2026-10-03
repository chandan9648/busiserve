"use client";

import { Meter, Skeleton } from "./primitives";
import {
  SCAN_MODE_LABELS,
  STATUS_LABELS,
  type SystemHealthReport,
} from "./types";

/**
 * The hero figure.
 *
 * `health.score` is a weighted percentage computed server-side in
 * `scoring.ts` from the same checks listed further down the page, and
 * its composition is spelled out here so the number can be
 * reconciled rather than taken on trust.
 */
export default function SystemStatusHero({
  report,
  scanning,
  securityScore,
}: {
  report: SystemHealthReport | null;
  scanning: boolean;
  securityScore: number | null;
}) {
  if (!report) {
    return (
      <div className="dv-hero p-6 sm:p-8" data-scanning={scanning}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-20 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-4 lg:w-auto">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-16 w-full lg:w-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { health } = report;

  return (
    <div
      className="dv-hero dv-status p-6 sm:p-8"
      data-status={health.status}
      data-scanning={scanning}
    >
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Score ------------------------------------------------------- */}
        <div className="min-w-0">
          <p className="dv-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--dv-dim)]">
            System health
          </p>

          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="dv-score">
              {health.score.toFixed(1)}
              <span className="ml-1 text-[0.35em] font-semibold tracking-normal text-[var(--dv-dim)]">
                %
              </span>
            </span>

            <span
              className="dv-badge mb-2 text-xs"
              style={{ fontSize: "0.75rem" }}
            >
              <span className="dv-dot" data-live aria-hidden="true" />
              {health.headline}
            </span>
          </div>

          <div className="mt-4 max-w-md">
            <Meter
              value={health.score}
              status={health.status}
              label={`System health ${health.score} percent`}
            />
          </div>

          <p className="mt-3 max-w-xl text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
            Weighted across {health.totalChecks} checks from the{" "}
            {SCAN_MODE_LABELS[report.mode].toLowerCase()}, completed in{" "}
            <span className="dv-mono text-[var(--dv-text)]">
              {report.durationMs.toLocaleString()} ms
            </span>
            . Credential and data-path checks carry four times the weight of an
            informational one, and a check that could not be measured is
            excluded rather than counted as a pass.
          </p>
        </div>

        {/* Breakdown --------------------------------------------------- */}
        <div className="grid w-full gap-2.5 sm:grid-cols-4 lg:w-auto lg:grid-cols-2">
          <Tally
            label="Passed"
            value={health.passed}
            status="healthy"
            emphasis
          />
          <Tally
            label="Warnings"
            value={health.warnings}
            status="warning"
            emphasis={health.warnings > 0}
          />
          <Tally
            label="Critical"
            value={health.critical + health.offline}
            status="critical"
            emphasis={health.critical + health.offline > 0}
          />
          <Tally
            label="Unknown"
            value={health.unknown}
            status="unknown"
            emphasis={false}
          />

          {securityScore !== null ? (
            <div className="rounded-lg border border-[var(--dv-line)] bg-[var(--dv-inset)] p-3 sm:col-span-4 lg:col-span-2">
              <div className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
                Security posture
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="dv-mono text-2xl font-bold tabular-nums text-[var(--dv-text)]">
                  {securityScore}
                </span>
                <span className="dv-mono text-xs text-[var(--dv-dim)]">
                  / 100
                </span>
                <span className="dv-mono ml-auto text-xs font-bold text-[var(--dv-muted)]">
                  {report.security.grade}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Tally({
  label,
  value,
  status,
  emphasis,
}: {
  label: string;
  value: number;
  status: "healthy" | "warning" | "critical" | "unknown";
  emphasis: boolean;
}) {
  return (
    <div
      className="dv-status rounded-lg border p-3 lg:min-w-[112px]"
      data-status={status}
      style={{
        borderColor: emphasis
          ? "color-mix(in srgb, var(--c) 30%, transparent)"
          : "var(--dv-line)",
        background: emphasis ? "var(--w)" : "var(--dv-inset)",
      }}
    >
      <div className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
        {label}
      </div>
      <div
        className="dv-mono mt-1 text-2xl font-bold tabular-nums"
        style={{ color: emphasis ? "var(--c)" : "var(--dv-muted)" }}
      >
        {value}
      </div>
      <div className="sr-only">
        {value} checks {STATUS_LABELS[status].toLowerCase()}
      </div>
    </div>
  );
}
