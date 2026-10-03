"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js";

import { animationsEnabled, ensureChartsRegistered } from "./chart-setup";
import { NotAvailable } from "./primitives";
import { AREA_LABELS, STATUS_LABELS, type SystemHealthReport } from "./types";

/**
 * Security posture by area.
 *
 * Each point is `100 − Σ(severity deductions)` for the findings in
 * that area, computed server-side in `scoring.ts`.
 *
 * An area with no findings at all is plotted at zero and listed as
 * "not measured" rather than at 100 — a scan mode that skipped an
 * area must not read as a perfect result for it.
 */
export default function SecurityRadar({
  report,
}: {
  report: SystemHealthReport;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const areas = report.security.areas;
  const measured = areas.filter((area) => area.total > 0);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || measured.length < 3) return;

    ensureChartsRegistered();

    const configuration: ChartConfiguration<"radar"> = {
      type: "radar",
      data: {
        labels: measured.map((area) => AREA_LABELS[area.area]),
        datasets: [
          {
            label: "Posture",
            data: measured.map((area) => area.score),
            borderColor: "#e5484d",
            backgroundColor: "rgba(229,72,77,0.13)",
            borderWidth: 1.6,
            pointBackgroundColor: measured.map((area) =>
              area.status === "critical"
                ? "#ff5a5f"
                : area.status === "warning"
                  ? "#f5a524"
                  : "#3dd68c",
            ),
            pointBorderColor: "#0c0e11",
            pointBorderWidth: 1.5,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animationsEnabled() ? undefined : false,
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            angleLines: { color: "rgba(42,48,56,0.8)" },
            grid: { color: "rgba(28,33,39,0.9)" },
            pointLabels: {
              color: "#949ca6",
              font: { size: 9.5, weight: 600 },
            },
            ticks: {
              stepSize: 25,
              backdropColor: "transparent",
              color: "#3d444d",
              font: { size: 8 },
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => {
                const area = measured[item.dataIndex];

                return `${area.score}/100 — ${area.passed} of ${
                  area.total
                } checks passing (${STATUS_LABELS[area.status].toLowerCase()})`;
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
  }, [measured]);

  if (measured.length < 3) {
    return (
      <NotAvailable
        reason={`Only ${measured.length} security area${
          measured.length === 1 ? "" : "s"
        } were assessed in this scan mode, which is too few to plot. Run a security audit or a full diagnostic.`}
      />
    );
  }

  const unmeasured = areas.filter((area) => area.total === 0);

  return (
    <div className="space-y-3">
      <div className="relative h-[280px]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Security posture score by area"
        />
      </div>

      {/* The same figures as text, ordered worst first. */}
      <ul className="grid gap-1 sm:grid-cols-2">
        {[...measured]
          .sort((a, b) => a.score - b.score)
          .map((area) => (
            <li
              key={area.area}
              className="dv-status flex items-center gap-2 text-[0.6875rem]"
              data-status={area.status}
            >
              <span className="dv-dot" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[var(--dv-muted)]">
                {AREA_LABELS[area.area]}
              </span>
              <span className="dv-mono tabular-nums" style={{ color: "var(--c)" }}>
                {area.score}
              </span>
              <span className="dv-mono w-14 flex-none text-right text-[0.625rem] text-[var(--dv-dim)]">
                {area.passed}/{area.total}
              </span>
            </li>
          ))}
      </ul>

      {unmeasured.length > 0 ? (
        <p className="dv-mono border-t border-[var(--dv-line)] pt-2.5 text-[0.625rem] leading-relaxed text-[var(--dv-dim)]">
          NOT MEASURED:{" "}
          {unmeasured.map((area) => AREA_LABELS[area.area]).join(", ")}. These
          areas are not part of the {report.mode} scan and are excluded from the
          chart rather than scored.
        </p>
      ) : null}
    </div>
  );
}
