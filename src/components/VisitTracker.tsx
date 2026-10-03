"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Records one site visit per browser session.
 *
 * Renders nothing and blocks nothing: the ping is fired after the
 * page has painted, failures are ignored, and no state is kept.
 *
 * Two layers keep the count honest. Here, a sessionStorage flag stops
 * the same session pinging on every navigation. On the server,
 * `recordVisit` counts a visitor at most once per day regardless of
 * how often it is called — which is the layer that actually holds,
 * since anything in the browser can be bypassed.
 *
 * Internal routes are excluded. Counting an administrator opening
 * their own dashboard as a site visit would make the figure
 * meaningless.
 */

const INTERNAL_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/register",
  "/forgot-password",
  "/checkout",
  "/payment",
];

const SESSION_KEY = "busiserve:visit-recorded";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;

      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode or blocked storage: fall through and ping. The
      // server-side daily guard still prevents a double count.
    }

    const controller = new AbortController();

    /**
     * Deferred to an idle moment so the ping never competes with
     * rendering or with the page's own data requests.
     */
    const send = () => {
      void fetch("/api/track/visit", {
        method: "POST",
        cache: "no-store",
        // Survives the page being closed mid-flight.
        keepalive: true,
        signal: controller.signal,
      }).catch(() => undefined);
    };

    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(send, { timeout: 3000 })
        : window.setTimeout(send, 1200);

    return () => {
      controller.abort();

      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle as number);
      } else {
        window.clearTimeout(idle as number);
      }
    };
  }, [pathname]);

  return null;
}
