"use client";

import { FileSearch, ShieldCheck } from "lucide-react";

import { NotAvailable, SeverityChip } from "./primitives";
import type { SecretScanResult } from "./types";

/**
 * SECRET / CREDENTIAL EXPOSURE SCAN
 *
 * The matched text never leaves the server. What appears here is the
 * file, the line, the pattern class and a masked stub, which is
 * enough to locate the line without this panel becoming a second
 * copy of the disclosure.
 */
export default function SecretScan({ scan }: { scan: SecretScanResult }) {
  if (!scan.available) {
    return (
      <div className="dv-panel-body">
        <NotAvailable title="Not available" reason={scan.unavailableReason} />
      </div>
    );
  }

  if (scan.matches.length === 0) {
    return (
      <div className="dv-panel-body">
        <div className="flex items-start gap-3 rounded-lg border border-[rgb(61_214_140_/_25%)] bg-[rgb(61_214_140_/_5%)] p-4">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 flex-none text-[var(--dv-ok)]"
            aria-hidden="true"
          />
          <div>
            <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-ok)]">
              No credential literals found
            </h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
              {scan.filesScanned.toLocaleString()} source files scanned for PEM
              keys, service-account JSON, Razorpay and Resend keys, cloud
              credentials, bearer tokens, JWTs, connection strings with embedded
              passwords, and literals assigned to secret-shaped identifiers.
            </p>
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
              Reading a secret from <code className="dv-mono">process.env</code>{" "}
              is correct configuration and is deliberately not reported.
              Placeholders in .env.example and type declarations are excluded
              too, so a clean result here means no literal credential, not an
              empty rule set.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dv-panel-body space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-[rgb(255_90_95_/_32%)] bg-[rgb(255_90_95_/_7%)] p-3.5">
        <FileSearch
          className="mt-0.5 h-4 w-4 flex-none text-[var(--dv-crit)]"
          aria-hidden="true"
        />
        <div>
          <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-crit)]">
            {scan.matches.length} potential credential
            {scan.matches.length === 1 ? "" : "s"} in source
          </h3>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
            Open each location and confirm. If a real credential is committed,
            rotate it at the provider before removing the line — deleting it
            leaves the value in git history.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--dv-line)]">
        <table className="dv-table">
          <caption className="sr-only">
            Potential credentials detected in source, by file and line
          </caption>
          <thead>
            <tr>
              <th scope="col">Location</th>
              <th scope="col">Type</th>
              <th scope="col">Severity</th>
              <th scope="col">Masked</th>
            </tr>
          </thead>
          <tbody>
            {scan.matches.map((match) => (
              <tr key={`${match.file}:${match.line}:${match.kind}`}>
                <td>
                  <code className="dv-mono break-all text-[0.75rem] text-[var(--dv-text)]">
                    {match.file}
                    <span className="text-[var(--dv-accent)]">:{match.line}</span>
                  </code>
                </td>
                <td className="text-[0.75rem]">{match.kind}</td>
                <td>
                  <SeverityChip severity={match.severity} />
                </td>
                <td>
                  <code className="dv-mono text-[0.6875rem] text-[var(--dv-dim)]">
                    {match.preview}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        Scanned {scan.filesScanned.toLocaleString()} files. Pattern detection
        produces false positives on fixtures and documentation; each row names a
        file and line precisely so it can be confirmed rather than acted on
        blindly.
      </p>
    </div>
  );
}
