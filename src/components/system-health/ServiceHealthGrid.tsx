"use client";

import { Clock, Latency, Panel, Skeleton, StatusBadge } from "./primitives";
import { STATUS_LABELS, type HealthCheckResult } from "./types";

/**
 * Service health grid, grouped by the category each check declares.
 *
 * Groups are rendered from the data, so a check added to a new
 * category appears here without a change to this component.
 */

const GROUP_ORDER = [
  { key: "core", label: "Core" },
  { key: "runtime", label: "Runtime" },
  { key: "firebase", label: "Firebase" },
  { key: "external", label: "External services" },
  { key: "security", label: "Security" },
  { key: "configuration", label: "Configuration" },
] as const;

export default function ServiceHealthGrid({
  checks,
  loading,
}: {
  checks: HealthCheckResult[];
  loading: boolean;
}) {
  if (loading && checks.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-[132px] w-full" />
        ))}
      </div>
    );
  }

  const groups = GROUP_ORDER.map((group) => ({
    ...group,
    items: checks.filter((check) => check.category === group.key),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <Panel
          key={group.key}
          title={group.label}
          subtitle={`${group.items.length} ${
            group.items.length === 1 ? "check" : "checks"
          }`}
          action={
            <span className="dv-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
              {summarise(group.items)}
            </span>
          }
        >
          <div className="dv-panel-body grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((check) => (
              <ServiceCard key={check.id} check={check} />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ServiceCard({ check }: { check: HealthCheckResult }) {
  return (
    <article
      className="dv-card dv-status flex flex-col"
      data-status={check.status}
      style={{
        borderLeft: "2px solid var(--c)",
      }}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[0.8125rem] font-semibold leading-snug text-[var(--dv-text)]">
          {check.service}
        </h3>
        <StatusBadge
          status={check.status}
          label={STATUS_LABELS[check.status]}
          live={check.status !== "healthy"}
        />
      </header>

      <p className="mt-2 flex-1 text-[0.75rem] leading-relaxed text-[var(--dv-muted)]">
        {check.message}
      </p>

      {check.detail ? (
        <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
          {check.detail}
        </p>
      ) : null}

      <footer className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--dv-line)] pt-2.5">
        <div>
          <div className="dv-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--dv-dim)]">
            Response
          </div>
          <div className="mt-0.5 text-xs">
            <Latency ms={check.responseTime} />
          </div>
        </div>

        <div>
          <div className="dv-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--dv-dim)]">
            Checked
          </div>
          <div className="mt-0.5 text-xs text-[var(--dv-muted)]">
            <Clock iso={check.checkedAt} />
          </div>
        </div>

        {check.statusCode ? (
          <div className="col-span-2">
            <div className="dv-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--dv-dim)]">
              HTTP status
            </div>
            <div className="dv-mono mt-0.5 text-xs text-[var(--dv-muted)]">
              {check.statusCode}
              {/*
                A healthy check with a 4xx code is not a failure: these
                probes expect a refusal. 401 proves a guard holds, 405
                proves a mutating route rejects the wrong method. Saying
                so inline stops a green card with a red-looking number
                from reading as a fault.
              */}
              {check.status === "healthy" && check.statusCode >= 400 ? (
                <span className="ml-1.5 text-[var(--dv-ok)]">
                  · expected
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

function summarise(items: HealthCheckResult[]): string {
  const failed = items.filter(
    (item) => item.status === "critical" || item.status === "offline",
  ).length;

  const warnings = items.filter((item) => item.status === "warning").length;

  if (failed > 0) return `${failed} failing`;
  if (warnings > 0) return `${warnings} degraded`;

  const unknown = items.filter((item) => item.status === "unknown").length;

  return unknown === items.length ? "not measured" : "all nominal";
}
