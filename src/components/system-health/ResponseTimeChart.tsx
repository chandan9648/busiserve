"use client";

import { useEffect, useMemo, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js";

import { animationsEnabled, ensureChartsRegistered, SERIES_COLORS } from "./chart-setup";
import { NotAvailable } from "./primitives";
import type { HealthCheckResult, ScanSample } from "./types";

/**
 * API response time across this session's scans.
 *
 * The series is built from `samples`, which the controller keeps in
 * browser memory for the current page session only. The application
 * stores no telemetry, so there is no historical data to plot and
 * none is implied: the panel is labelled with the scan count and the
 * subtitle says where the numbers come from.
 */

/** Thresholds mirror the server's own classification bands. */
const BANDS = [
  { limit: 300, label: "Healthy", color: "rgba(61,214,140,0.05)" },
  { limit: 800, label: "Warning", color: "rgba(245,165,36,0.05)" },
  { limit: 2000, label: "Degraded", color: "rgba(255,138,76,0.05)" },
];

export default function ResponseTimeChart({
  samples,
  checks,
}: {
  samples: ScanSample[];
  checks: HealthCheckResult[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  /**
   * Plot the checks that actually measured a duration, ranked by
   * their slowest observation so the chart leads with what matters.
   */
  const series = useMemo(() => {
    const ids = new Set<string>();

    for (const sample of samples) {
      for (const id of Object.keys(sample.timings)) ids.add(id);
    }

    const labelFor = (id: string) =>
      checks.find((check) => check.id === id)?.service ?? id;

    return [...ids]
      .map((id) => ({
        id,
        label: labelFor(id),
        peak: Math.max(
          ...samples.map((sample) => sample.timings[id] ?? 0),
        ),
        points: samples.map((sample) => sample.timings[id] ?? null),
      }))
      .sort((a, b) => b.peak - a.peak)
      .slice(0, 8);
  }, [samples, checks]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || series.length === 0) return;

    ensureChartsRegistered();

    const labels = samples.map((_sample, index) =>
      index === samples.length - 1 ? "now" : `−${samples.length - 1 - index}`,
    );

    const configuration: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: series.map((entry, index) => ({
          label: entry.label,
          data: entry.points,
          borderColor: SERIES_COLORS[index % SERIES_COLORS.length],
          backgroundColor: `${SERIES_COLORS[index % SERIES_COLORS.length]}14`,
          borderWidth: 1.6,
          // Smooth, but not so loose that it invents values between points.
          tension: 0.34,
          pointRadius: samples.length > 12 ? 0 : 2,
          pointHoverRadius: 4,
          pointBackgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
          borderDash: index >= 4 ? [4, 3] : undefined,
          fill: false,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animationsEnabled() ? undefined : false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { color: "rgba(28,33,39,0.7)" },
            border: { color: "#1c2127" },
            ticks: { maxRotation: 0, autoSkipPadding: 12 },
            title: {
              display: true,
              text: "scans ago",
              color: "#5d656e",
              font: { size: 9 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(28,33,39,0.7)" },
            border: { color: "#1c2127" },
            ticks: { callback: (value) => `${value} ms` },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) =>
                `${item.dataset.label}: ${item.parsed.y?.toLocaleString() ?? "—"} ms`,
            },
          },
        },
      },
    };

    chartRef.current = new Chart(canvas, configuration);

    return () => {
      // Chart.js keeps a canvas registry; failing to destroy leaks it.
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [samples, series]);

  if (samples.length === 0) {
    return (
      <NotAvailable
        title="Awaiting first scan"
        reason="Response times appear once a scan has completed."
      />
    );
  }

  if (series.length === 0) {
    return (
      <NotAvailable
        reason="No check in this scan mode measured a response time. Run a full diagnostic or an infrastructure scan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {samples.length === 1 ? (
        <p className="dv-mono rounded-md border border-dashed border-[var(--dv-line-strong)] px-3 py-2 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
          CURRENT DIAGNOSTIC SNAPSHOT — one scan recorded. A trend appears from
          the second scan onward. No historical telemetry source exists, so
          this series covers only this browser session.
        </p>
      ) : null}

      <div className="relative h-[260px]">
        <canvas ref={canvasRef} role="img" aria-label="API response time per scan" />
      </div>

      {/* HTML legend and thresholds: selectable, and read by a screen reader. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--dv-line)] pt-3">
        {series.map((entry, index) => (
          <span
            key={entry.id}
            className="dv-mono flex items-center gap-1.5 text-[0.625rem] text-[var(--dv-muted)]"
          >
            <span
              className="h-0.5 w-4 flex-none rounded"
              style={{
                background: SERIES_COLORS[index % SERIES_COLORS.length],
              }}
              aria-hidden="true"
            />
            {entry.label}
            <span className="text-[var(--dv-dim)]">
              peak {entry.peak.toLocaleString()}ms
            </span>
          </span>
        ))}
      </div>

      <div className="dv-mono flex flex-wrap gap-x-4 gap-y-1 text-[0.5625rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
        {BANDS.map((band) => (
          <span key={band.label}>
            {band.label} ≤ {band.limit}ms
          </span>
        ))}
        <span>Critical &gt; 2000ms</span>
        <span className="text-[var(--dv-muted)]">
          Firebase, Razorpay and Resend carry wider budgets — they cross the
          public internet
        </span>
      </div>
    </div>
  );
}
