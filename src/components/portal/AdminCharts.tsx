"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

import type { AdminResponse } from "@/lib/portal/types";

function ChartPanel({
  title,
  type,
  labels,
  values,
}: {
  title: string;
  type: "bar" | "doughnut";
  labels: string[];
  values: number[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;

    const chart = new Chart(canvas.current, {
      type,
      data: {
        labels,
        datasets: [
          {
            label: type === "bar" ? "Captured payments (INR)" : "Active users",
            data: values,
            backgroundColor:
              type === "bar"
                ? "#ff8927"
                : ["#001b40", "#ff8927", "#5495c9"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === "doughnut" },
        },
        ...(type === "bar"
          ? {
              scales: {
                y: { beginAtZero: true },
              },
            }
          : {}),
      },
    });

    return () => chart.destroy();
  }, [labels, values, type]);

  return (
    <section className="min-w-0 rounded-2xl border bg-white p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>

      <div className="relative h-72">
        <canvas ref={canvas} role="img" aria-label={title} />
      </div>

      <ul className="sr-only">
        {labels.map((label, index) => (
          <li key={label}>
            {label}: {values[index]}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminCharts({
  data,
}: {
  data: AdminResponse;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartPanel
        title="Active users by plan"
        type="doughnut"
        labels={["Starter", "Growth", "Scale"]}
        values={data.planCounts}
      />

      <ChartPanel
        title="Captured payments — last six months"
        type="bar"
        labels={data.monthlyRevenue.map((item) => item.label)}
        values={data.monthlyRevenue.map((item) => item.amount / 100)}
      />
    </div>
  );
}