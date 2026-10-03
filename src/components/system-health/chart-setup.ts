"use client";

import {
  ArcElement,
  Chart,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

import { prefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Chart.js registration.
 *
 * Chart.js is already a dependency of this project but was not yet
 * imported anywhere, so only the controllers, elements and scales
 * these three charts actually use are registered. Registering the
 * whole library (`...registerables`) would pull in bar, pie, polar,
 * bubble and scatter for nothing.
 *
 * The legend plugin is deliberately omitted: every chart here has a
 * legend rendered as real HTML beside it, which is readable by a
 * screen reader and selectable as text, unlike a canvas legend.
 */

let registered = false;

export function ensureChartsRegistered(): void {
  if (registered) return;

  Chart.register(
    LineController,
    DoughnutController,
    RadarController,
    LineElement,
    PointElement,
    ArcElement,
    LinearScale,
    CategoryScale,
    RadialLinearScale,
    Filler,
    Tooltip,
  );

  /* Console defaults, applied once. */
  Chart.defaults.font.family =
    'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  Chart.defaults.font.size = 10;
  Chart.defaults.color = "#5d656e";
  Chart.defaults.animation = { duration: 450, easing: "easeOutQuart" };

  Chart.defaults.plugins.tooltip.backgroundColor = "#11141a";
  Chart.defaults.plugins.tooltip.borderColor = "#2a3038";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = "#e8ebef";
  Chart.defaults.plugins.tooltip.bodyColor = "#949ca6";
  Chart.defaults.plugins.tooltip.padding = 9;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxWidth = 8;
  Chart.defaults.plugins.tooltip.boxHeight = 8;

  registered = true;
}

/**
 * Series colours.
 *
 * Chosen so the lines stay distinguishable without relying on hue
 * alone: each series also differs in dash pattern where more than
 * four are shown at once.
 */
export const SERIES_COLORS = [
  "#e5484d",
  "#58a6ff",
  "#3dd68c",
  "#f5a524",
  "#8b5cf6",
  "#2dd4bf",
  "#f472b6",
  "#a3e635",
] as const;

/**
 * Honour the OS setting. Chart.js animates on its own schedule, so the
 * preference is read when a configuration is built rather than
 * subscribed to; a chart rebuilds on the next scan either way.
 */
export function animationsEnabled(): boolean {
  return !prefersReducedMotion();
}
