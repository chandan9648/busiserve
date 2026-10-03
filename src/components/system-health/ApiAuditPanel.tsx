"use client";

import { NotAvailable } from "./primitives";
import type { ApiAuditResult } from "./types";

/**
 * API SECURITY AUDIT — per-route guard matrix.
 *
 * Derived by reading the project's own route handlers. The audit is
 * pattern based, so a guard applied through an unrecognised helper
 * reads as absent; the caveat is stated below the table rather than
 * left for the reader to discover.
 */

const COLUMNS = [
  { key: "authenticated", label: "Auth", title: "Verifies a Firebase ID token" },
  { key: "adminGuarded", label: "Admin", title: "Checks administrator authorisation" },
  { key: "validated", label: "Schema", title: "Validates the body with Zod" },
  { key: "rateLimited", label: "Limit", title: "Applies a rate or throttle check" },
  { key: "signatureVerified", label: "HMAC", title: "Verifies a signature" },
  { key: "bodySizeLimited", label: "Size", title: "Bounds the request body" },
] as const;

export default function ApiAuditPanel({ audit }: { audit: ApiAuditResult }) {
  if (!audit.available) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason={audit.unavailableReason} />
      </div>
    );
  }

  if (audit.routes.length === 0) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason="No API route handlers were found under src/app/api." />
      </div>
    );
  }

  return (
    <div className="dv-panel-body space-y-3">
      <div className="overflow-x-auto rounded-lg border border-[var(--dv-line)]">
        <table className="dv-table">
          <caption className="sr-only">
            Security guards detected in each API route handler
          </caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Methods</th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" title={column.title}>
                  {column.label}
                </th>
              ))}
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {audit.routes.map((route) => {
              const mutating = route.methods.some((method) =>
                ["POST", "PUT", "PATCH", "DELETE"].includes(method),
              );

              return (
                <tr key={route.route}>
                  <td>
                    <code className="dv-mono break-all text-[0.75rem] text-[var(--dv-text)]">
                      {route.route}
                    </code>
                  </td>

                  <td>
                    <span className="dv-mono text-[0.625rem] text-[var(--dv-muted)]">
                      {route.methods.length > 0
                        ? route.methods.join(" ")
                        : "—"}
                    </span>
                  </td>

                  {COLUMNS.map((column) => {
                    const value = route[column.key];

                    /* Expectation differs per column, so the mark does too:
                       a read-only route needs no body size bound, and a
                       non-admin route needs no admin check. */
                    const expected =
                      column.key === "adminGuarded"
                        ? /\/admin(?:\/|$)/.test(route.route)
                        : column.key === "signatureVerified"
                          ? /webhook/.test(route.route)
                          : column.key === "rateLimited"
                            ? false
                            : mutating;

                    return (
                      <td key={column.key}>
                        <span
                          className="dv-mono text-xs font-bold"
                          title={
                            value
                              ? column.title
                              : expected
                                ? `Not detected — ${column.title.toLowerCase()}`
                                : "Not applicable to this route"
                          }
                          style={{
                            color: value
                              ? "var(--dv-ok)"
                              : expected
                                ? "var(--dv-crit)"
                                : "var(--dv-dim)",
                          }}
                        >
                          {value ? "✓" : expected ? "✕" : "·"}
                          <span className="sr-only">
                            {value
                              ? `${column.label} present`
                              : expected
                                ? `${column.label} missing`
                                : `${column.label} not applicable`}
                          </span>
                        </span>
                      </td>
                    );
                  })}

                  <td>
                    <span className="text-[0.6875rem] leading-snug text-[var(--dv-dim)]">
                      {route.leaksErrorDetail ? (
                        <strong className="text-[var(--dv-warn)]">
                          May return raw error detail.{" "}
                        </strong>
                      ) : null}
                      {route.notes.join(" ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        <span className="dv-mono text-[var(--dv-ok)]">✓</span> present ·{" "}
        <span className="dv-mono text-[var(--dv-crit)]">✕</span> expected but
        not detected · <span className="dv-mono">·</span> not applicable to this
        route. This is a static read of the handlers, so a guard applied through
        a helper the audit does not recognise will show as absent. Each finding
        names its file so the result can be confirmed by reading the code.
      </p>
    </div>
  );
}
