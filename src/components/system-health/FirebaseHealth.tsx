"use client";

import { Database, HardDrive, KeyRound, Users } from "lucide-react";
import type { ComponentType } from "react";

import { Latency, NotAvailable, StatusBadge } from "./primitives";
import { STATUS_LABELS, type SystemHealthReport } from "./types";

/**
 * FIREBASE // CORE SERVICES
 *
 * Each service is reported from its own independent probe, so a
 * Firestore failure does not drag Authentication down with it.
 *
 * Collection figures are document counts obtained with server-side
 * COUNT aggregations. No document is read, so no customer data
 * reaches this panel.
 */

const SERVICE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "firebase.admin.init": KeyRound,
  "firebase.auth": Users,
  "firebase.firestore.read": Database,
  "firebase.firestore.count": Database,
  "firebase.storage": HardDrive,
  "firebase.configuration": KeyRound,
};

export default function FirebaseHealth({
  report,
}: {
  report: SystemHealthReport;
}) {
  const checks = report.checks.filter((check) =>
    check.id.startsWith("firebase."),
  );

  if (checks.length === 0) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason="Firebase checks are not part of this scan mode. Run a quick scan, full diagnostic or infrastructure scan." />
      </div>
    );
  }

  const counts = report.sections.firebase?.collectionCounts ?? [];

  const firebaseConfig = report.configuration.filter(
    (item) =>
      item.name.toLowerCase().includes("firebase") ||
      ["Project ID", "Service-account client email", "Service-account private key"].includes(
        item.name,
      ),
  );

  return (
    <div className="dv-panel-body space-y-5">
      {/* Service probes ------------------------------------------- */}
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => {
          const Icon = SERVICE_ICONS[check.id] ?? Database;

          return (
            <li
              key={check.id}
              className="dv-status rounded-lg border border-[var(--dv-line)] bg-[var(--dv-raised)] p-3"
              data-status={check.status}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-md border"
                  style={{
                    borderColor: "color-mix(in srgb, var(--c) 32%, transparent)",
                    background: "var(--w)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-[0.8125rem] font-semibold text-[var(--dv-text)]">
                      {check.service}
                    </h3>
                    <StatusBadge
                      status={check.status}
                      label={STATUS_LABELS[check.status]}
                    />
                  </div>

                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--dv-muted)]">
                    {check.message}
                  </p>

                  {check.detail ? (
                    <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
                      {check.detail}
                    </p>
                  ) : null}

                  <div className="mt-2 flex items-center gap-3 text-[0.625rem]">
                    <span className="dv-mono text-[var(--dv-dim)]">
                      Latency <Latency ms={check.responseTime} />
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Collection counts ---------------------------------------- */}
      {counts.length > 0 ? (
        <div>
          <h3 className="dv-mono mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
            Collection reachability
          </h3>

          <div className="overflow-x-auto rounded-lg border border-[var(--dv-line)]">
            <table className="dv-table">
              <caption className="sr-only">
                Document counts per Firestore collection
              </caption>
              <thead>
                <tr>
                  <th scope="col">Collection</th>
                  <th scope="col">Documents</th>
                  <th scope="col">Read method</th>
                </tr>
              </thead>
              <tbody>
                {counts.map((entry) => (
                  <tr key={entry.collection}>
                    <td className="dv-mono text-[var(--dv-text)]">
                      {entry.collection}
                    </td>
                    <td className="dv-mono tabular-nums">
                      {entry.count === null ? (
                        <span className="text-[var(--dv-crit)]">
                          unreachable
                        </span>
                      ) : (
                        entry.count.toLocaleString()
                      )}
                    </td>
                    <td className="text-[0.75rem]">
                      {entry.count === null
                        ? "The COUNT aggregation did not return."
                        : "Server-side COUNT aggregation — no document contents transferred."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Configuration presence ----------------------------------- */}
      {firebaseConfig.length > 0 ? (
        <div>
          <h3 className="dv-mono mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--dv-dim)]">
            Configuration — presence only, values never read
          </h3>

          <ul className="grid gap-1.5 sm:grid-cols-2">
            {firebaseConfig.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-2 rounded-md border border-[var(--dv-line)] bg-[var(--dv-inset)] px-2.5 py-2"
              >
                <span
                  className="dv-mono mt-px flex-none text-xs font-bold"
                  style={{
                    color: item.present
                      ? "var(--dv-ok)"
                      : item.required
                        ? "var(--dv-crit)"
                        : "var(--dv-dim)",
                  }}
                  aria-hidden="true"
                >
                  {item.present ? "✓" : item.required ? "✕" : "—"}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <code className="dv-mono text-[0.6875rem] text-[var(--dv-text)]">
                      {item.name}
                    </code>
                    <span
                      className="dv-mono text-[0.5625rem] uppercase tracking-[0.08em]"
                      style={{
                        color:
                          item.scope === "server"
                            ? "var(--dv-accent)"
                            : "var(--dv-info)",
                      }}
                    >
                      {item.scope === "server" ? "server-only" : "public"}
                    </span>
                  </div>

                  <div className="dv-mono mt-0.5 text-[0.625rem]">
                    <span
                      style={{
                        color: item.present
                          ? "var(--dv-ok)"
                          : item.required
                            ? "var(--dv-crit)"
                            : "var(--dv-dim)",
                      }}
                    >
                      {item.present
                        ? "CONFIGURED"
                        : item.required
                          ? "MISSING"
                          : "NOT SET"}
                    </span>
                  </div>

                  {item.note ? (
                    <p className="mt-1 text-[0.625rem] leading-snug text-[var(--dv-dim)]">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
