"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to the OS reduced-motion preference.
 *
 * `useSyncExternalStore` is the right primitive here: the media query
 * is an external store, so React reads it during render and
 * resubscribes itself. Mirroring it into state from an effect would
 * render once with the wrong value and then cascade a second render
 * to correct it.
 *
 * The server snapshot is `false` so markup matches on hydration; the
 * real value is read on the client's first commit.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * One-shot read, for code outside a component such as a Chart.js
 * configuration factory.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  return window.matchMedia(QUERY).matches;
}
