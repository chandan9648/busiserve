"use client";

import { CreditCard, Mail, Package } from "lucide-react";

import { NotAvailable } from "./primitives";
import type { DependencyReport, SystemHealthReport, UploadReport } from "./types";

/**
 * PAYMENTS // RAZORPAY, email delivery, uploads and dependencies.
 *
 * Razorpay is verified with a read-only payments list; no order,
 * payment or refund is created. Resend is verified by listing sending
 * domains; no email is sent. Neither credential is displayed.
 */
export default function ExternalServices({
  report,
}: {
  report: SystemHealthReport;
}) {
  const external = report.sections.external;

  return (
    <div className="dv-panel-body grid gap-3 lg:grid-cols-2">
      {/* Razorpay ------------------------------------------------- */}
      {external ? (
        <RazorpayPanel razorpay={external.razorpay} />
      ) : (
        <div className="lg:col-span-2">
          <NotAvailable reason="External service checks are not part of this scan mode. Run a full diagnostic or an infrastructure scan." />
        </div>
      )}

      {/* Email ---------------------------------------------------- */}
      {external ? (
        <div className="dv-card">
          <header className="flex items-center gap-2">
            <Mail className="h-4 w-4 flex-none text-[var(--dv-info)]" aria-hidden="true" />
            <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
              Email delivery
            </h3>
          </header>

          <dl className="mt-3 space-y-2">
            <Row
              label="Provider"
              value={external.email.provider}
              tone="neutral"
            />
            <Row
              label="API key"
              value={external.email.configured ? "CONFIGURED" : "NOT CONFIGURED"}
              tone={external.email.configured ? "ok" : "warn"}
            />
            <Row
              label="Reachable"
              value={
                external.email.reachable === "yes"
                  ? "YES"
                  : external.email.reachable === "no"
                    ? "NO"
                    : "UNKNOWN"
              }
              tone={
                external.email.reachable === "yes"
                  ? "ok"
                  : external.email.reachable === "no"
                    ? "crit"
                    : "neutral"
              }
            />
          </dl>

          <p className="mt-3 border-t border-[var(--dv-line)] pt-2.5 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
            Verified by listing verified sending domains. No message was
            composed, queued or sent by this check.
          </p>
        </div>
      ) : null}

      {/* Uploads -------------------------------------------------- */}
      <UploadPanel report={report.sections.uploads} />

      {/* Dependencies -------------------------------------------- */}
      <DependencyPanel report={report.dependencies} />
    </div>
  );
}

function RazorpayPanel({
  razorpay,
}: {
  razorpay: NonNullable<SystemHealthReport["sections"]["external"]>["razorpay"];
}) {
  return (
    <div className="dv-card">
      <header className="flex flex-wrap items-center gap-2">
        <CreditCard
          className="h-4 w-4 flex-none text-[var(--dv-accent)]"
          aria-hidden="true"
        />
        <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
          Razorpay
        </h3>

        {razorpay.mode !== "unknown" ? (
          <span
            className="dv-mono ml-auto rounded border px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em]"
            style={
              razorpay.mode === "live"
                ? {
                    color: "var(--dv-accent)",
                    borderColor: "rgb(229 72 77 / 35%)",
                    background: "rgb(229 72 77 / 10%)",
                  }
                : {
                    color: "var(--dv-info)",
                    borderColor: "rgb(88 166 255 / 35%)",
                    background: "rgb(88 166 255 / 10%)",
                  }
            }
          >
            {razorpay.mode} mode
          </span>
        ) : null}
      </header>

      <dl className="mt-3 space-y-2">
        <Row
          label="Key ID"
          value={razorpay.keyIdPresent ? "CONFIGURED" : "MISSING"}
          tone={razorpay.keyIdPresent ? "ok" : "crit"}
        />
        <Row
          label="API secret"
          value={razorpay.keySecretPresent ? "CONFIGURED" : "MISSING"}
          tone={razorpay.keySecretPresent ? "ok" : "crit"}
        />
        <Row
          label="Webhook secret"
          value={
            razorpay.webhookSecretPresent ? "CONFIGURED" : "NOT CONFIGURED"
          }
          tone={razorpay.webhookSecretPresent ? "ok" : "warn"}
        />
        <Row
          label="Webhook verification"
          value={
            !razorpay.webhookSecretPresent
              ? "FAIL — no secret"
              : razorpay.webhookSecretDistinct === false
                ? "PASS — but reuses API secret"
                : razorpay.webhookSecretDistinct === true
                  ? "PASS — distinct secret"
                  : "UNKNOWN"
          }
          tone={
            !razorpay.webhookSecretPresent
              ? "crit"
              : razorpay.webhookSecretDistinct === false
                ? "warn"
                : razorpay.webhookSecretDistinct === true
                  ? "ok"
                  : "neutral"
          }
        />
        <Row
          label="API reachable"
          value={
            razorpay.reachable === "yes"
              ? "YES — credentials accepted"
              : razorpay.reachable === "no"
                ? "NO"
                : "UNKNOWN"
          }
          tone={
            razorpay.reachable === "yes"
              ? "ok"
              : razorpay.reachable === "no"
                ? "crit"
                : "neutral"
          }
        />
      </dl>

      <p className="mt-3 border-t border-[var(--dv-line)] pt-2.5 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
        Verified with a read-only payments list. No order was created, no
        payment captured and no refund issued. Secret values are compared
        server-side for distinctness and are never returned.
      </p>
    </div>
  );
}

function UploadPanel({ report }: { report: UploadReport | null }) {
  if (!report) {
    return (
      <div className="dv-card">
        <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
          Upload security
        </h3>
        <div className="mt-3">
          <NotAvailable reason="Upload auditing is not part of this scan mode." />
        </div>
      </div>
    );
  }

  if (!report.available) {
    return (
      <div className="dv-card">
        <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
          Upload security
        </h3>
        <div className="mt-3">
          <NotAvailable reason={report.unavailableReason} />
        </div>
      </div>
    );
  }

  return (
    <div className="dv-card">
      <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
        Upload security
      </h3>

      {!report.uploadPathDetected ? (
        <>
          <p className="dv-mono mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--dv-ok)]">
            ✓ No upload surface
          </p>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--dv-muted)]">
            No multipart parsing, File or Blob handling, Storage upload or file
            input exists in the source. There are no upload controls to assess,
            so none are listed — reporting a passing checklist for a feature
            that does not exist would be inventing a result.
          </p>
          {report.storageConfigured ? (
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
              A storage bucket is configured and reachable but unused. Its
              security rules should be reviewed before the first upload path is
              added.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="dv-mono mt-3 text-[0.6875rem] text-[var(--dv-muted)]">
            Detected: {report.signals.join(", ")}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {report.controls.map((control) => (
              <li
                key={control.label}
                className="flex items-center gap-2 text-[0.75rem]"
              >
                <span
                  className="dv-mono flex-none text-xs font-bold"
                  style={{
                    color: control.present ? "var(--dv-ok)" : "var(--dv-warn)",
                  }}
                  aria-hidden="true"
                >
                  {control.present ? "✓" : "⚠"}
                </span>
                <span className="text-[var(--dv-muted)]">{control.label}</span>
                <span className="dv-mono ml-auto text-[0.625rem] uppercase text-[var(--dv-dim)]">
                  {control.present ? "present" : "not detected"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DependencyPanel({ report }: { report: DependencyReport }) {
  return (
    <div className="dv-card">
      <header className="flex items-center gap-2">
        <Package className="h-4 w-4 flex-none text-[var(--dv-info)]" aria-hidden="true" />
        <h3 className="dv-mono text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-text)]">
          Dependencies
        </h3>
      </header>

      {!report.available ? (
        <div className="mt-3">
          <NotAvailable reason={report.unavailableReason} />
        </div>
      ) : (
        <>
          <dl className="mt-3 space-y-2">
            <Row label="Total declared" value={String(report.total)} tone="neutral" />
            <Row label="Runtime" value={String(report.runtime)} tone="neutral" />
            <Row
              label="Development"
              value={String(report.development)}
              tone="neutral"
            />
            <Row
              label="Unpinned ranges"
              value={String(report.unpinned.length)}
              tone={report.unpinned.length > 0 ? "warn" : "ok"}
            />
            <Row label="Vulnerability audit" value="NOT AVAILABLE" tone="neutral" />
          </dl>

          {report.unpinned.length > 0 ? (
            <details className="mt-3">
              <summary className="dv-mono cursor-pointer text-[0.625rem] uppercase tracking-[0.1em] text-[var(--dv-warn)]">
                Show {report.unpinned.length} unpinned
              </summary>
              <ul className="dv-mono mt-2 grid gap-0.5 text-[0.625rem] text-[var(--dv-dim)]">
                {report.unpinned.map((entry) => (
                  <li key={entry} className="break-all">
                    {entry}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <p className="mt-3 border-t border-[var(--dv-line)] pt-2.5 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
            {report.auditNote}
          </p>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "crit" | "neutral";
}) {
  const color =
    tone === "ok"
      ? "var(--dv-ok)"
      : tone === "warn"
        ? "var(--dv-warn)"
        : tone === "crit"
          ? "var(--dv-crit)"
          : "var(--dv-muted)";

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color-mix(in_srgb,var(--dv-line)_55%,transparent)] pb-1.5 last:border-0 last:pb-0">
      <dt className="dv-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--dv-dim)]">
        {label}
      </dt>
      <dd
        className="dv-mono text-right text-[0.6875rem] font-semibold"
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  );
}
