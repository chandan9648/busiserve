"use client";

import type { ReactNode } from "react";

import {
  STATUS_LABELS,
  type HealthStatus,
  type Severity,
} from "./types";

/**
 * Shared building blocks for the console.
 *
 * Accessibility rule applied throughout: colour is never the only
 * carrier of meaning. Every dot and swatch is accompanied by its
 * status word, so the page reads correctly in greyscale and to a
 * screen reader.
 */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`dv-panel ${className}`} id={id} aria-label={title}>
      <header className="dv-panel-head">
        <div className="min-w-0">
          <h2 className="dv-panel-title">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-[0.6875rem] leading-snug text-[var(--dv-dim)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function StatusDot({
  status,
  live = false,
}: {
  status: HealthStatus;
  live?: boolean;
}) {
  return (
    <span className="dv-status" data-status={status}>
      <span className="dv-dot" data-live={live} />
    </span>
  );
}

export function StatusBadge({
  status,
  label,
  live = false,
}: {
  status: HealthStatus;
  label?: string;
  live?: boolean;
}) {
  return (
    <span className="dv-status dv-badge" data-status={status}>
      <span className="dv-dot" data-live={live} aria-hidden="true" />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span className="dv-sev" data-sev={severity}>
      {severity}
    </span>
  );
}

/**
 * A labelled figure. `hint` explains how the number was derived, so
 * no value on the page is unexplained.
 */
export function Metric({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: HealthStatus;
}) {
  return (
    <div className="dv-status min-w-0" data-status={status ?? "healthy"}>
      <div className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
        {label}
      </div>
      <div
        className="dv-mono mt-1.5 text-xl font-semibold tabular-nums"
        style={{ color: status ? "var(--c)" : "var(--dv-text)" }}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[0.6875rem] leading-snug text-[var(--dv-dim)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Meter({
  value,
  status,
  label,
}: {
  /** 0–100. */
  value: number;
  status?: HealthStatus;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="dv-status dv-meter"
      data-status={status ?? "healthy"}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

/**
 * The page's answer whenever something genuinely cannot be measured.
 *
 * It states the reason rather than showing a zero, an empty chart or
 * a placeholder figure.
 */
export function NotAvailable({
  reason,
  title = "Not available",
}: {
  reason?: string;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--dv-line-strong)] bg-[var(--dv-inset)] p-4">
      <div className="dv-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
        {title}
      </div>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
        {reason ?? "This measurement is not available in this environment."}
      </p>
    </div>
  );
}

export function Skeleton({
  className = "h-4 w-full",
}: {
  className?: string;
}) {
  return <div className={`dv-skeleton ${className}`} aria-hidden="true" />;
}

/** Response time with its own unit, or an explicit dash when unmeasured. */
export function Latency({ ms }: { ms?: number }) {
  if (typeof ms !== "number") {
    return (
      <span className="dv-mono text-[var(--dv-dim)]" title="Not measured">
        —
      </span>
    );
  }

  const tone =
    ms <= 300
      ? "var(--dv-ok)"
      : ms <= 800
        ? "var(--dv-warn)"
        : "var(--dv-crit)";

  return (
    <span className="dv-mono tabular-nums" style={{ color: tone }}>
      {ms.toLocaleString()}
      <span className="ml-0.5 text-[0.625rem] text-[var(--dv-dim)]">ms</span>
    </span>
  );
}

/** Local wall-clock time, which is what an operator is comparing against. */
export function Clock({ iso }: { iso: string }) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return <span className="dv-mono text-[var(--dv-dim)]">—</span>;
  }

  return (
    <time className="dv-mono tabular-nums" dateTime={iso} title={iso}>
      {date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}
    </time>
  );
}

export function SectionHeading({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-4">
      <h2 className="dv-eyebrow flex-1">{label}</h2>
      {children}
    </div>
  );
}
