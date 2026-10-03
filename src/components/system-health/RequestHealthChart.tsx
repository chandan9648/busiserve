"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js";

import { animationsEnabled, ensureChartsRegistered } from "./chart-setup";
import { NotAvailable } from "./primitives";
import type { SystemHealthReport } from "./types";

/**
 * Request health for the endpoints probed in this scan.
 *
 * This is explicitly a snapshot, not a daily figure. The application
 * keeps no request log, so a "requests today" breakdown cannot be
 * produced — inventing one would be the easiest way to make this
 * dashboard dishonest. What is charted is every probe this scan
 * actually issued, grouped by the status class it received.
 *
 * Note that a 4xx is a correct result for most of these endpoints:
 * a protected route is supposed to answer 401, so the chart is paired
 * with the expectation tally beside it.
 */

const CLASS_COLORS: Record<string, string> = {
  "2xx": "#3dd68c",
  "3xx": "#58a6ff",
  "4xx": "#f5a524",
  "5xx": "#ff5a5f",
  "no response": "#6e7681",
};

const CLASS_NOTES: Record<string, string> = {
  "2xx": "Served successfully",
  "3xx": "Redirected",
  "4xx": "Refused — expected for guarded routes",
  "5xx": "Server error",
  "no response": "Timeout or unreachable",
};

export default function RequestHealthChart({
  report,
}: {
  report: SystemHealthReport;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const summary = report.sections.api;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !summary) return;

    ensureChartsRegistered();

    const entries = Object.entries(summary.byClass).filter(
      ([, count]) => count > 0,
    );

    const configuration: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: entries.map(([label]) => label),
        datasets: [
          {
            data: entries.map(([, count]) => count),
            backgroundColor: entries.map(
              ([label]) => CLASS_COLORS[label] ?? "#6e7681",
            ),
            borderColor: "#0c0e11",
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        animation: animationsEnabled() ? undefined : false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => {
                const label = String(item.label);
                const count = Number(item.parsed);

                return `${label}: ${count} of ${summary.total} — ${
                  CLASS_NOTES[label] ?? ""
                }`;
              },
            },
          },
        },
      },
    };

    chartRef.current = new Chart(canvas, configuration);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [summary]);

  if (!summary) {
    return (
      <NotAvailable
        reason="API probes are not part of this scan mode. Run a quick scan, full diagnostic or infrastructure scan."
      />
    );
  }

  const correctness =
    summary.total > 0
      ? Math.round((summary.asExpected / summary.total) * 1000) / 10
      : 0;

  return (
    <div className="space-y-4">
      <p className="dv-mono rounded-md border border-dashed border-[var(--dv-line-strong)] px-3 py-2 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        CURRENT DIAGNOSTIC SNAPSHOT — {summary.total} probes issued by this
        scan. Not a daily request total: the application keeps no request log,
        so historical volume is NOT AVAILABLE.
      </p>

      <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[150px] w-[150px]">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Probe results by status class across ${summary.total} probes`}
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="dv-mono text-lg font-bold tabular-nums text-[var(--dv-text)]">
                {correctness}%
              </div>
              <div className="dv-mono text-[0.5rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
                as expected
              </div>
            </div>
          </div>
        </div>

        <ul className="space-y-1.5 self-center">
          {Object.entries(summary.byClass)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => (
              <li key={label} className="flex items-baseline gap-2.5">
                <span
                  className="mt-1.5 h-2 w-2 flex-none rounded-sm"
                  style={{ background: CLASS_COLORS[label] ?? "#6e7681" }}
                  aria-hidden="true"
                />
                <span className="dv-mono w-16 flex-none text-[0.6875rem] font-semibold uppercase text-[var(--dv-text)]">
                  {label}
                </span>
                <span className="dv-mono w-10 flex-none text-[0.6875rem] tabular-nums text-[var(--dv-muted)]">
                  {count}
                </span>
                <span className="text-[0.6875rem] leading-snug text-[var(--dv-dim)]">
                  {CLASS_NOTES[label]}
                </span>
              </li>
            ))}

          <li className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--dv-line)] pt-2.5">
            <span className="dv-mono text-[0.625rem] text-[var(--dv-muted)]">
              AS EXPECTED{" "}
              <strong className="text-[var(--dv-ok)]">
                {summary.asExpected}
              </strong>
            </span>
            <span className="dv-mono text-[0.625rem] text-[var(--dv-muted)]">
              UNEXPECTED{" "}
              <strong
                style={{
                  color:
                    summary.unexpected > 0
                      ? "var(--dv-warn)"
                      : "var(--dv-muted)",
                }}
              >
                {summary.unexpected}
              </strong>
            </span>
            <span className="dv-mono text-[0.625rem] text-[var(--dv-muted)]">
              NO RESPONSE{" "}
              <strong
                style={{
                  color:
                    summary.transportFailures > 0
                      ? "var(--dv-crit)"
                      : "var(--dv-muted)",
                }}
              >
                {summary.transportFailures}
              </strong>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
