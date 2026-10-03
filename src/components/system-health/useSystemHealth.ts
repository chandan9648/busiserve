"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { portalAuth } from "@/lib/portal/client";

import type {
  ScanMode,
  ScanSample,
  SystemHealthReport,
} from "./types";

/**
 * =============================================================
 * SCAN CONTROLLER
 * =============================================================
 *
 * Owns the scan lifecycle: credentials, cancellation, auto-refresh
 * and the in-session sample series.
 *
 * The Firebase ID token comes from the portal's existing
 * `portalAuth()` client, so this hook adds no second Firebase app
 * and no second place where a credential is obtained.
 *
 * Overlap rule: `runningRef` is checked synchronously before a scan
 * starts, so a timer firing mid-scan, a double click and a mode
 * change cannot stack concurrent diagnostics onto the server.
 */

export type RefreshInterval = 0 | 10 | 30 | 60 | 300;

export const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 10, label: "10 sec" },
  { value: 30, label: "30 sec" },
  { value: 60, label: "60 sec" },
  { value: 300, label: "5 min" },
];

/** Enough to show a trend without unbounded growth. */
const MAX_SAMPLES = 20;

export interface ScanState {
  report: SystemHealthReport | null;
  samples: ScanSample[];
  scanning: boolean;
  /** Set when the last attempt failed; the previous report is kept. */
  error: string | null;
  /** 401 or 403 from the diagnostic endpoint. */
  denied: boolean;
  lastSuccessAt: number | null;
  mode: ScanMode;
  interval: RefreshInterval;
  /** Seconds until the next automatic scan, or null when off. */
  countdown: number | null;
}

export function useSystemHealth(initialMode: ScanMode = "quick") {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [samples, setSamples] = useState<ScanSample[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [interval, setIntervalSeconds] = useState<RefreshInterval>(30);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    tone: "ok" | "warn" | "error";
    text: string;
  } | null>(null);

  /** Guards against overlapping scans without waiting for a re-render. */
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // Cancel in flight work so no state update lands after unmount.
      abortRef.current?.abort();
    };
  }, []);

  const scan = useCallback(
    async (requestedMode?: ScanMode) => {
      if (runningRef.current) return;

      runningRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      const target = requestedMode ?? mode;

      setScanning(true);
      setError(null);

      try {
        const auth = portalAuth();

        // Wait for persisted sign-in to restore before deciding
        // there is no user.
        await auth.authStateReady();

        const user = auth.currentUser;

        if (!user) {
          setDenied(true);
          setError("Sign in with an administrator account to run diagnostics.");
          return;
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `/api/admin/system-health?mode=${target}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (response.status === 401 || response.status === 403) {
          setDenied(true);

          /**
           * A 403 carries the server's own explanation of which
           * authorisation gate refused the caller. Showing it beats a
           * generic line: the operator can see whether to fix their
           * UID allow-list, their email verification or the admins
           * collection, rather than guessing.
           */
          const detail = await readError(response);

          setError(
            response.status === 403
              ? detail
              : "Your session expired. Sign in again.",
          );
          return;
        }

        if (!response.ok) {
          const detail = await readError(response);
          setError(detail);
          setToast({ id: Date.now(), tone: "error", text: detail });
          return;
        }

        const payload: unknown = await response.json();

        if (!isReport(payload)) {
          setError("The diagnostic endpoint returned an unexpected shape.");
          return;
        }

        if (!mountedRef.current) return;

        setReport(payload);
        setDenied(false);
        setLastSuccessAt(Date.now());
        setSamples((previous) => appendSample(previous, payload));

        const criticalCount = payload.health.critical + payload.health.offline;

        setToast({
          id: Date.now(),
          tone: criticalCount > 0 ? "error" : payload.health.warnings > 0 ? "warn" : "ok",
          text:
            criticalCount > 0
              ? `Scan complete — ${criticalCount} critical ${
                  criticalCount === 1 ? "issue" : "issues"
                } detected.`
              : payload.health.warnings > 0
                ? `Scan complete — ${payload.health.warnings} warning${
                    payload.health.warnings === 1 ? "" : "s"
                  }.`
                : "Scan complete — all systems operational.",
        });
      } catch (caught) {
        // An aborted scan is a deliberate cancellation, not a failure.
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        if (!mountedRef.current) return;

        const text =
          caught instanceof Error && caught.message
            ? caught.message
            : "The diagnostic request could not be sent.";

        setError(text);
        setToast({ id: Date.now(), tone: "error", text });
      } finally {
        runningRef.current = false;

        if (mountedRef.current) setScanning(false);
      }
    },
    [mode],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    runningRef.current = false;
    setScanning(false);
  }, []);

  /**
   * Initial scan.
   *
   * Kicked off from a timer rather than the effect body, so the
   * first state update is not synchronous with mount. The ref guard
   * keeps it to one run: `scan` changes identity with `mode`, and a
   * mode change already triggers its own scan through `changeMode`.
   */
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;

    startedRef.current = true;

    const timer = window.setTimeout(() => void scan(), 0);

    return () => window.clearTimeout(timer);
  }, [scan]);

  /**
   * Auto-refresh.
   *
   * The remaining seconds are owned by a local variable and mirrored
   * into state from the tick, so the countdown the header shows can
   * never drift from the timer that fires the scan.
   */
  useEffect(() => {
    if (interval === 0) return;

    let remaining = interval;

    const timer = window.setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        remaining = interval;

        // Skipped silently while a scan is still running, so scans
        // can never overlap on the server.
        if (!runningRef.current) void scan();
      }

      setCountdown(remaining);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [interval, scan]);

  const changeMode = useCallback(
    (next: ScanMode) => {
      setMode(next);
      void scan(next);
    },
    [scan],
  );

  const state: ScanState = useMemo(
    () => ({
      report,
      samples,
      scanning,
      error,
      denied,
      lastSuccessAt,
      mode,
      interval,
      // Derived, so turning auto-refresh off clears the display
      // without an effect writing state to do it.
      countdown: interval === 0 ? null : countdown,
    }),
    [
      report,
      samples,
      scanning,
      error,
      denied,
      lastSuccessAt,
      mode,
      interval,
      countdown,
    ],
  );

  return {
    ...state,
    toast,
    dismissToast: useCallback(() => setToast(null), []),
    scan,
    cancel,
    changeMode,
    setInterval: setIntervalSeconds,
  };
}

/**
 * Keep a bounded series of this session's scans.
 *
 * Re-running the same scan id (a replayed response) replaces its
 * sample rather than adding a duplicate point.
 */
function appendSample(
  previous: ScanSample[],
  report: SystemHealthReport,
): ScanSample[] {
  const timings: Record<string, number> = {};

  for (const check of report.checks) {
    if (typeof check.responseTime === "number") {
      timings[check.id] = check.responseTime;
    }
  }

  const sample: ScanSample = {
    scanId: report.scanId,
    at: Date.parse(report.completedAt) || Date.now(),
    mode: report.mode,
    healthScore: report.health.score,
    securityScore: report.security.score,
    timings,
  };

  const withoutDuplicate = previous.filter(
    (item) => item.scanId !== sample.scanId,
  );

  return [...withoutDuplicate, sample].slice(-MAX_SAMPLES);
}

async function readError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // A function failure can return HTML rather than JSON.
  }

  return response.status === 504
    ? "The scan exceeded its time budget. Try a quick scan."
    : `The diagnostic endpoint returned ${response.status}.`;
}

/** Structural check, so a malformed payload cannot crash the console. */
function isReport(value: unknown): value is SystemHealthReport {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<SystemHealthReport>;

  return (
    typeof candidate.scanId === "string" &&
    Array.isArray(candidate.checks) &&
    Array.isArray(candidate.findings) &&
    typeof candidate.health === "object" &&
    candidate.health !== null &&
    typeof candidate.security === "object" &&
    candidate.security !== null
  );
}
