"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ScanLogEntry, SystemHealthReport } from "./types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * DEVIL TERMINAL
 *
 * Replays the orchestrator's own `logs` array, which the server
 * appends to as each section completes. Nothing is scripted: a line
 * exists because a section ran, and its outcome is that section's
 * real result.
 */

const OUTCOME_COLOR: Record<ScanLogEntry["outcome"], string> = {
  PASS: "var(--dv-ok)",
  WARN: "var(--dv-warn)",
  FAIL: "var(--dv-crit)",
  INFO: "var(--dv-info)",
  SKIP: "var(--dv-dim)",
};

export default function TerminalLogs({
  report,
  scanning,
}: {
  report: SystemHealthReport | null;
  scanning: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const logs = useMemo(() => report?.logs ?? [], [report]);

  /**
   * Reveal count.
   *
   * The dashboard remounts this panel per scan by keying it on the
   * scan id, so the counter starts from its initial value each time
   * rather than being reset from an effect — which would render the
   * previous scan's log once before correcting itself.
   *
   * With reduced motion the whole log is present from the first
   * render and no timer is ever started.
   */
  const [revealed, setRevealed] = useState(() =>
    reducedMotion ? logs.length : 0,
  );

  /**
   * Lines appear in sequence, which reads as a diagnostic running.
   * setState happens only inside the timer callback, never
   * synchronously in the effect body.
   */
  useEffect(() => {
    if (reducedMotion || logs.length === 0) return;

    let current = 0;

    const timer = window.setInterval(() => {
      current += 1;
      setRevealed(current);

      if (current >= logs.length) window.clearInterval(timer);
    }, 55);

    return () => window.clearInterval(timer);
  }, [logs, reducedMotion]);

  /** Follow the output as it arrives. */
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [revealed]);

  /** Reduced motion shows everything, including if toggled mid-session. */
  const shown = reducedMotion ? logs.length : revealed;
  const visible = logs.slice(0, shown);

  return (
    <div
      ref={scrollRef}
      className="dv-terminal dv-scroll"
      data-lenis-prevent
      role="log"
      aria-label="Diagnostic terminal output"
      aria-live="off"
    >
      {logs.length === 0 ? (
        <p className="text-[var(--dv-dim)]">
          {scanning
            ? "[ ] Initialising diagnostics..."
            : "[ ] Awaiting first scan."}
        </p>
      ) : (
        <>
          {visible.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="dv-terminal-line">
              <span className="text-[var(--dv-dim)]">
                [{time(entry.at)}]
              </span>

              <span className="dv-leader text-[var(--dv-muted)]">
                <span className="text-[var(--dv-text)]">{entry.label}</span>
              </span>

              <span
                className="font-semibold"
                style={{ color: OUTCOME_COLOR[entry.outcome] }}
                title={entry.message}
              >
                {entry.outcome}
              </span>
            </div>
          ))}

          {shown >= logs.length && report ? (
            <>
              <div className="my-2 border-t border-dashed border-[var(--dv-line)]" />

              <div className="dv-status" data-status={report.health.status}>
                <span className="text-[var(--dv-dim)]">SYSTEM STATUS: </span>
                <span className="font-bold" style={{ color: "var(--c)" }}>
                  {report.health.headline}
                </span>
              </div>

              <div className="mt-1 text-[var(--dv-dim)]">
                {report.checks.length} checks · {report.durationMs}ms ·{" "}
                scan {report.scanId.slice(0, 8)} · mode {report.mode}
              </div>

              {/* The last line is the detail of whatever ran last. */}
              <div className="mt-1 text-[var(--dv-muted)]">
                {logs[logs.length - 1]?.message}
              </div>
            </>
          ) : null}

          {scanning ? (
            <div className="mt-1 text-[var(--dv-accent)]">
              [·] Scanning...
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function time(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "--:--:--";

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
