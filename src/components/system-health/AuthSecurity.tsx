"use client";

import { Lock, ShieldCheck, ShieldX, Unlock } from "lucide-react";

import { NotAvailable } from "./primitives";
import type { AuthProbe } from "./types";

/**
 * AUTH // SECURITY STATUS
 *
 * Each row is the result of a real credential-free request to that
 * endpoint. "Refused" means the server answered 401 or 403 to a
 * caller carrying no token, which is the only evidence that actually
 * demonstrates a guard is enforced.
 */
export default function AuthSecurity({
  probes,
}: {
  probes: AuthProbe[] | null;
}) {
  if (!probes || probes.length === 0) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason="Authorisation probes are not part of this scan mode. Run a quick scan, security audit or full diagnostic." />
      </div>
    );
  }

  const exposed = probes.filter((probe) => probe.verdict === "exposed");
  const refused = probes.filter((probe) => probe.verdict === "refused");

  return (
    <div className="dv-panel-body space-y-4">
      {/* Verdict band -------------------------------------------- */}
      {exposed.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-[rgb(255_90_95_/_35%)] bg-[rgb(255_90_95_/_8%)] p-3.5">
          <ShieldX
            className="mt-0.5 h-4 w-4 flex-none text-[var(--dv-crit)]"
            aria-hidden="true"
          />
          <div>
            <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-crit)]">
              Security issue — protected endpoint accessible without
              authorisation
            </h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
              {exposed.length} endpoint{exposed.length === 1 ? "" : "s"}{" "}
              returned a success response to a request carrying no credentials.
              Treat this as live exposure of whatever that route serves.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-[rgb(61_214_140_/_28%)] bg-[rgb(61_214_140_/_6%)] p-3.5">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 flex-none text-[var(--dv-ok)]"
            aria-hidden="true"
          />
          <div>
            <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-ok)]">
              Enforcement verified
            </h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
              {refused.length} of {probes.length} protected endpoints refused an
              anonymous request. Verified by calling each one without an
              Authorization header and reading the status code back.
            </p>
          </div>
        </div>
      )}

      {/* Probe table --------------------------------------------- */}
      <div className="overflow-x-auto rounded-lg border border-[var(--dv-line)]">
        <table className="dv-table">
          <caption className="sr-only">
            Result of an unauthenticated request to each protected endpoint
          </caption>
          <thead>
            <tr>
              <th scope="col">Endpoint</th>
              <th scope="col">Guard</th>
              <th scope="col">Status</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {probes.map((probe) => (
              <tr key={probe.path}>
                <td>
                  <div className="font-medium text-[var(--dv-text)]">
                    {probe.label}
                  </div>
                  <code className="dv-mono text-[0.6875rem] text-[var(--dv-dim)]">
                    {probe.path}
                  </code>
                </td>

                <td>
                  <span
                    className="dv-mono inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.08em]"
                    style={{
                      color: probe.adminOnly
                        ? "var(--dv-accent)"
                        : "var(--dv-info)",
                    }}
                  >
                    {probe.adminOnly ? (
                      <Lock className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Unlock className="h-3 w-3" aria-hidden="true" />
                    )}
                    {probe.adminOnly ? "Admin" : "Session"}
                  </span>
                </td>

                <td className="dv-mono tabular-nums">
                  {probe.statusCode === 0 ? (
                    <span className="text-[var(--dv-dim)]">no response</span>
                  ) : (
                    <span
                      style={{
                        color:
                          probe.verdict === "exposed"
                            ? "var(--dv-crit)"
                            : probe.verdict === "refused"
                              ? "var(--dv-ok)"
                              : "var(--dv-warn)",
                      }}
                    >
                      {probe.statusCode}
                    </span>
                  )}
                </td>

                <td>
                  <span
                    className="dv-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      color:
                        probe.verdict === "exposed"
                          ? "var(--dv-crit)"
                          : probe.verdict === "refused"
                            ? "var(--dv-ok)"
                            : "var(--dv-warn)",
                    }}
                  >
                    {probe.verdict === "exposed"
                      ? "✕ Exposed"
                      : probe.verdict === "refused"
                        ? "✓ Refused"
                        : "⚠ Inconclusive"}
                  </span>
                  <p className="mt-1 text-[0.6875rem] leading-snug text-[var(--dv-dim)]">
                    {probe.note}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        These probes are defensive. The scan sends only credential-free GET
        requests and reads the status code; it never forges a token, replays a
        session, enumerates accounts or attempts to defeat a guard.
      </p>
    </div>
  );
}
