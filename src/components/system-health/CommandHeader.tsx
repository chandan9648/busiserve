"use client";

import Link from "next/link";
import {
  Activity,
  Download,
  LayoutDashboard,
  RotateCw,
  ShieldAlert,
  Square,
} from "lucide-react";

import { Clock } from "./primitives";
import { REFRESH_OPTIONS, type RefreshInterval } from "./useSystemHealth";
import {
  SCAN_MODE_LABELS,
  type ScanMode,
  type SystemHealthReport,
} from "./types";

/**
 * DEVIL // SYSTEM COMMAND CENTER — header and scan controls.
 *
 * Every figure shown here comes from the last completed scan. Before
 * the first scan returns, each reads as a dash rather than a zero.
 */

const MODES: ScanMode[] = ["quick", "full", "security", "infrastructure"];

export default function CommandHeader({
  report,
  scanning,
  mode,
  interval,
  countdown,
  lastSuccessAt,
  onScan,
  onCancel,
  onModeChange,
  onIntervalChange,
  onExport,
}: {
  report: SystemHealthReport | null;
  scanning: boolean;
  mode: ScanMode;
  interval: RefreshInterval;
  countdown: number | null;
  lastSuccessAt: number | null;
  onScan: () => void;
  onCancel: () => void;
  onModeChange: (mode: ScanMode) => void;
  onIntervalChange: (interval: RefreshInterval) => void;
  onExport: () => void;
}) {
  const environment = report?.environment;

  return (
    <header className="border-b border-[var(--dv-line)] bg-[color-mix(in_srgb,var(--dv-panel)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Identity ------------------------------------------------- */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="dv-status grid h-8 w-8 flex-none place-items-center rounded-md border"
                data-status={report?.health.status ?? "unknown"}
                style={{
                  borderColor: "color-mix(in srgb, var(--c) 40%, transparent)",
                  background: "var(--w)",
                }}
              >
                <ShieldAlert
                  className="h-4 w-4"
                  style={{ color: "var(--c)" }}
                  aria-hidden="true"
                />
              </span>

              <h1 className="dv-mono truncate text-sm font-bold tracking-[0.14em] text-[var(--dv-text)]">
                DEVIL
                <span className="mx-1.5 text-[var(--dv-accent)]">{"//"}</span>
                SYSTEM COMMAND CENTER
              </h1>
            </div>

            <div className="dv-mono mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] text-[var(--dv-dim)]">
              <span className="flex items-center gap-1.5">
                SYSTEM STATUS:
                {report ? (
                  <strong
                    className="dv-status font-semibold tracking-wide"
                    data-status={report.health.status}
                    style={{ color: "var(--c)" }}
                  >
                    {report.health.headline}
                  </strong>
                ) : (
                  <span className="text-[var(--dv-dim)]">AWAITING SCAN</span>
                )}
              </span>

              <span className="flex items-center gap-1.5">
                <span
                  className="dv-status"
                  data-status={scanning ? "warning" : "healthy"}
                >
                  <span className="dv-dot" data-live={scanning} />
                </span>
                {scanning ? "SCANNING" : interval > 0 ? "LIVE" : "MANUAL"}
              </span>

              <span>
                LAST SCAN:{" "}
                {report ? (
                  <Clock iso={report.completedAt} />
                ) : (
                  <span className="text-[var(--dv-dim)]">—</span>
                )}
                {lastSuccessAt ? (
                  <span className="ml-1 text-[var(--dv-dim)]">
                    ({relative(lastSuccessAt)})
                  </span>
                ) : null}
              </span>

              <span>
                INSTANCE UPTIME:{" "}
                <span className="text-[var(--dv-muted)]">
                  {environment
                    ? formatUptime(environment.processUptimeSeconds)
                    : "—"}
                </span>
              </span>

              <span>
                ENVIRONMENT:{" "}
                <span
                  className="font-semibold uppercase"
                  style={{
                    color:
                      environment?.deployEnv === "production"
                        ? "var(--dv-accent)"
                        : "var(--dv-muted)",
                  }}
                >
                  {environment?.deployEnv ?? "—"}
                </span>
              </span>

              {report ? (
                <span>
                  REGION:{" "}
                  <span className="text-[var(--dv-muted)]">
                    {report.environment.region}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Controls ------------------------------------------------- */}
          <div className="dv-no-print flex flex-wrap items-center gap-2">
            {/* Way back to the normal admin surface. The console takes
                over the whole viewport and hides the site header, so
                without this the only exit is the browser's back button. */}
            <Link href="/admin" className="dv-btn">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
              Admin dashboard
            </Link>

            {scanning ? (
              <button
                type="button"
                className="dv-btn"
                onClick={onCancel}
                data-variant="default"
              >
                <Square className="h-3 w-3" aria-hidden="true" />
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="dv-btn"
                data-variant="primary"
                onClick={onScan}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh scan
              </button>
            )}

            <label className="flex items-center gap-1.5">
              <span className="sr-only">Scan mode</span>
              <select
                className="dv-select"
                value={mode}
                disabled={scanning}
                onChange={(event) =>
                  onModeChange(event.target.value as ScanMode)
                }
              >
                {MODES.map((value) => (
                  <option key={value} value={value}>
                    {SCAN_MODE_LABELS[value].toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="dv-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
                Auto
              </span>
              <select
                className="dv-select"
                value={interval}
                onChange={(event) =>
                  onIntervalChange(Number(event.target.value) as RefreshInterval)
                }
                aria-label="Automatic diagnostic interval"
              >
                {REFRESH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            {countdown !== null && !scanning ? (
              <span
                className="dv-mono flex items-center gap-1.5 text-[0.625rem] tabular-nums text-[var(--dv-dim)]"
                aria-live="off"
              >
                <Activity className="h-3 w-3" aria-hidden="true" />
                NEXT {countdown}s
              </span>
            ) : null}

            <button
              type="button"
              className="dv-btn"
              onClick={onExport}
              disabled={!report}
              title={
                report
                  ? "Download this scan as JSON"
                  : "Run a scan before exporting"
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>

        {/* Live region: scan state for anyone not watching the pulse. */}
        <p className="sr-only" role="status" aria-live="polite">
          {scanning
            ? `Running ${SCAN_MODE_LABELS[mode]}.`
            : report
              ? `${SCAN_MODE_LABELS[report.mode]} complete. Health ${
                  report.health.score
                } percent. ${report.health.headline}. Security score ${
                  report.security.score
                } out of 100.`
              : "No scan has completed yet."}
        </p>
      </div>
    </header>
  );
}

function relative(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;

  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
