"use client";

import { NotAvailable, SeverityChip } from "./primitives";
import type { HeaderAuditEntry } from "./types";

/**
 * SECURITY HEADERS AUDIT
 *
 * Read from a live response to the application's own root document.
 *
 * A missing optional header is reported at the severity its actual
 * exposure warrants in this application, with the reasoning shown.
 * Nothing here is called a vulnerability merely for being absent.
 */
export default function HeadersAudit({
  audit,
}: {
  audit: {
    available: boolean;
    unavailableReason?: string;
    statusCode: number;
    entries: HeaderAuditEntry[];
  } | null;
}) {
  if (!audit) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason="Header auditing is not part of this scan mode. Run a security audit or a full diagnostic." />
      </div>
    );
  }

  if (!audit.available) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason={audit.unavailableReason} />
      </div>
    );
  }

  const present = audit.entries.filter(
    (entry) => entry.verdict === "present",
  ).length;

  return (
    <div className="dv-panel-body space-y-3">
      <p className="dv-mono text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        {present} of {audit.entries.length} audited headers present. Read from a
        live GET of <code>/</code> which returned HTTP {audit.statusCode}.
      </p>

      <ul className="space-y-2">
        {audit.entries.map((entry) => {
          const tone =
            entry.verdict === "present"
              ? "healthy"
              : entry.severity === "info"
                ? "unknown"
                : entry.severity === "medium"
                  ? "warning"
                  : "warning";

          return (
            <li
              key={entry.header}
              className="dv-status rounded-lg border border-[var(--dv-line)] bg-[var(--dv-inset)] p-3"
              data-status={tone}
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span
                  className="dv-mono flex-none text-xs font-bold"
                  style={{ color: "var(--c)" }}
                  aria-hidden="true"
                >
                  {entry.verdict === "present"
                    ? "✓"
                    : entry.verdict === "missing"
                      ? "⚠"
                      : "✕"}
                </span>

                <code className="dv-mono text-[0.75rem] font-semibold text-[var(--dv-text)]">
                  {entry.header}
                </code>

                <span
                  className="dv-mono text-[0.5625rem] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "var(--c)" }}
                >
                  {entry.verdict}
                </span>

                {entry.severity !== "info" ? (
                  <SeverityChip severity={entry.severity} />
                ) : null}
              </div>

              {entry.value ? (
                <code className="dv-mono mt-1.5 block break-all rounded bg-[var(--dv-panel)] px-2 py-1 text-[0.625rem] text-[var(--dv-muted)]">
                  {entry.value}
                </code>
              ) : null}

              <dl className="mt-2 space-y-1.5 text-[0.75rem] leading-relaxed">
                {entry.verdict !== "present" ? (
                  <div>
                    <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-dim)]">
                      Risk{" "}
                    </dt>
                    <dd className="inline text-[var(--dv-muted)]">
                      {entry.risk}
                    </dd>
                  </div>
                ) : null}

                <div>
                  <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-dim)]">
                    Why it matters{" "}
                  </dt>
                  <dd className="inline text-[var(--dv-muted)]">{entry.why}</dd>
                </div>

                {entry.remediation ? (
                  <div>
                    <dt className="dv-mono inline text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-accent)]">
                      Recommended{" "}
                    </dt>
                    <dd className="inline text-[var(--dv-muted)]">
                      {entry.remediation}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
