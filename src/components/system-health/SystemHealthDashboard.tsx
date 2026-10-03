"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, X } from "lucide-react";

import "./devil.css";

import ApiAuditPanel from "./ApiAuditPanel";
import AuthSecurity from "./AuthSecurity";
import CommandHeader from "./CommandHeader";
import CriticalAlerts from "./CriticalAlerts";
import EnvironmentAudit from "./EnvironmentAudit";
import ErrorStream from "./ErrorStream";
import ExternalServices from "./ExternalServices";
import FindingsList from "./FindingsList";
import FirebaseHealth from "./FirebaseHealth";
import HeadersAudit from "./HeadersAudit";
import SecretScan from "./SecretScan";
import SecurityPosture from "./SecurityPosture";
import ServiceHealthGrid from "./ServiceHealthGrid";
import SystemStatusHero from "./SystemStatusHero";
import TerminalLogs from "./TerminalLogs";
import { Panel, SectionHeading, Skeleton } from "./primitives";
import { coreNodesFrom } from "./core-nodes";
import { useSystemHealth } from "./useSystemHealth";
import { SCAN_MODE_LABELS } from "./types";

/**
 * =============================================================
 * DEVIL // SYSTEM COMMAND CENTER
 * =============================================================
 *
 * Composition root. All state lives in `useSystemHealth`; every panel
 * below is a pure function of the report it is handed, so one panel
 * cannot break another.
 *
 * The three heaviest panels are loaded on demand:
 *
 *   DevilCore           a requestAnimationFrame canvas renderer
 *   ResponseTimeChart   Chart.js line controller
 *   RequestHealthChart  Chart.js doughnut controller
 *   SecurityRadar       Chart.js radar controller
 *
 * Chart.js is roughly 70 KB after tree-shaking and is needed only
 * once a scan has data to plot, so it is kept out of the first paint.
 */

const DevilCore = dynamic(() => import("./DevilCore"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full sm:h-[340px]" />,
});

const ResponseTimeChart = dynamic(() => import("./ResponseTimeChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full" />,
});

const RequestHealthChart = dynamic(() => import("./RequestHealthChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[180px] w-full" />,
});

const SecurityRadar = dynamic(() => import("./SecurityRadar"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />,
});

export default function SystemHealthDashboard() {
  const {
    report,
    samples,
    scanning,
    error,
    denied,
    lastSuccessAt,
    mode,
    interval,
    countdown,
    toast,
    dismissToast,
    scan,
    cancel,
    changeMode,
    setInterval: setRefreshInterval,
  } = useSystemHealth("quick");

  /* Toast auto-dismiss. */
  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(dismissToast, 5000);

    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  const coreNodes = useMemo(
    () => (report ? coreNodesFrom(report.checks) : []),
    [report],
  );

  const exportReport = useCallback(() => {
    if (!report) return;

    /**
     * The report is serialised exactly as the server produced it. It
     * contains no environment values, secrets, user records or
     * absolute paths, so there is nothing to strip before download —
     * the exclusion happens at the source, in the check modules.
     */
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const stamp = report.completedAt.replace(/[:.]/g, "-");

    link.href = url;
    link.download = `busiserve-diagnostic-${report.mode}-${stamp}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [report]);

  /* ---------------------------------------------------------------- */
  /* Access refused                                                   */
  /* ---------------------------------------------------------------- */

  if (denied) {
    return (
      <div className="dv-root grid place-items-center px-4 py-20">
        <div className="dv-panel max-w-md p-7 text-center">
          <ShieldAlert
            className="mx-auto h-8 w-8 text-[var(--dv-accent)]"
            aria-hidden="true"
          />

          <h1 className="dv-mono mt-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--dv-text)]">
            Access refused
          </h1>

          <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--dv-muted)]">
            {error ??
              "This console is restricted to administrator accounts."}
          </p>

          <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--dv-dim)]">
            The diagnostic endpoint enforces this independently of the page, so
            no diagnostic data was returned.
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login" className="dv-btn" data-variant="primary">
              Sign in
            </Link>
            <Link href="/admin" className="dv-btn">
              Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const checks = report?.checks ?? [];

  return (
    <div className="dv-root pb-16">
      <CommandHeader
        report={report}
        scanning={scanning}
        mode={mode}
        interval={interval}
        countdown={countdown}
        lastSuccessAt={lastSuccessAt}
        onScan={() => void scan()}
        onCancel={cancel}
        onModeChange={changeMode}
        onIntervalChange={setRefreshInterval}
        onExport={exportReport}
      />

      <main className="mx-auto w-full max-w-[1600px] space-y-7 px-4 py-6 sm:px-6">
        {/* Transport error banner — the previous report stays visible. */}
        {error && !denied ? (
          <div
            className="flex flex-wrap items-center gap-3 rounded-lg border border-[rgb(245_165_36_/_32%)] bg-[rgb(245_165_36_/_7%)] px-4 py-3"
            role="alert"
          >
            <ShieldAlert
              className="h-4 w-4 flex-none text-[var(--dv-warn)]"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-[var(--dv-muted)]">
              {error}
              {report ? " Showing the last successful scan." : ""}
            </p>
            <button
              type="button"
              className="dv-btn dv-no-print"
              onClick={() => void scan()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* 1 — Overall health */}
        <SystemStatusHero
          report={report}
          scanning={scanning}
          securityScore={report?.security.score ?? null}
        />

        {/* 2 — Critical alerts */}
        {report ? (
          <CriticalAlerts checks={checks} findings={report.findings} />
        ) : null}

        {/* 3 — Core service grid */}
        <section>
          <SectionHeading label="Service health">
            {report?.skipped.length ? (
              <span className="dv-mono text-[0.625rem] text-[var(--dv-dim)]">
                {report.skipped.length} section
                {report.skipped.length === 1 ? "" : "s"} skipped in{" "}
                {SCAN_MODE_LABELS[report.mode].toLowerCase()}
              </span>
            ) : null}
          </SectionHeading>

          <ServiceHealthGrid checks={checks} loading={scanning && !report} />
        </section>

        {/* 4 — Devil Core + performance */}
        <section>
          <SectionHeading label="Infrastructure core" />

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Devil core"
              subtitle="Subsystem topology. Node colour follows the worst measured status for that subsystem; a subsystem with no matching check reads as unknown."
            >
              <div className="dv-panel-body">
                {report ? (
                  <DevilCore nodes={coreNodes} />
                ) : (
                  <Skeleton className="h-[300px] w-full sm:h-[340px]" />
                )}
              </div>
            </Panel>

            <Panel
              title="API response time"
              subtitle={`Session scans only — ${samples.length} recorded. No historical telemetry source exists.`}
            >
              <div className="dv-panel-body">
                <ResponseTimeChart samples={samples} checks={checks} />
              </div>
            </Panel>
          </div>
        </section>

        {/* 5 — Request health */}
        {report ? (
          <section>
            <SectionHeading label="Request health" />

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel
                title="Probe results"
                subtitle="Status class of every probe this scan issued."
              >
                <div className="dv-panel-body">
                  <RequestHealthChart report={report} />
                </div>
              </Panel>

              <Panel
                title="Security posture"
                subtitle="Per-area score, calculated from the findings below."
              >
                <div className="dv-panel-body">
                  <SecurityRadar report={report} />
                </div>
              </Panel>
            </div>
          </section>
        ) : null}

        {/* 6 — Firebase */}
        {report ? (
          <section>
            <SectionHeading label="Firebase // core services" />
            <Panel
              title="Firebase health"
              subtitle="Read-only probes. The scan never writes a document, creates a user or touches an object."
            >
              <FirebaseHealth report={report} />
            </Panel>
          </section>
        ) : null}

        {/* 7 — Auth & authorisation */}
        {report ? (
          <section>
            <SectionHeading label="Auth // security status" />
            <Panel
              title="Authorisation enforcement"
              subtitle="Each protected endpoint called without credentials, to confirm it refuses."
            >
              <AuthSecurity probes={report.sections.authSecurity} />
            </Panel>
          </section>
        ) : null}

        {/* 8 — Security posture and findings */}
        {report ? (
          <section>
            <SectionHeading label="Security posture" />

            <div className="space-y-4">
              <Panel
                title="Posture score"
                subtitle="Transparent scoring — the deduction table is shown in full."
              >
                <SecurityPosture report={report} />
              </Panel>

              <Panel
                title="Findings & recommendations"
                subtitle="Every issue with its consequence, severity and specific fix."
              >
                <FindingsList findings={report.findings} />
              </Panel>
            </div>
          </section>
        ) : null}

        {/* 9 — Configuration */}
        {report ? (
          <section>
            <SectionHeading label="Environment // configuration" />

            <div className="space-y-4">
              <Panel
                title="Environment variables"
                subtitle="Presence metadata only. No value is read, transmitted or exported."
              >
                <EnvironmentAudit configuration={report.configuration} />
              </Panel>

              <Panel
                title="Credential exposure scan"
                subtitle="Static pattern detection over the project's own source."
              >
                <SecretScan scan={report.secretScan} />
              </Panel>

              <Panel
                title="Security headers"
                subtitle="Read from a live response to this application's root document."
              >
                <HeadersAudit audit={report.sections.headers} />
              </Panel>

              <Panel
                title="API route audit"
                subtitle="Guards detected in each route handler under src/app/api."
              >
                <ApiAuditPanel audit={report.apiAudit} />
              </Panel>
            </div>
          </section>
        ) : null}

        {/* 10 — External services */}
        {report ? (
          <section>
            <SectionHeading label="Payments // external services" />
            <Panel
              title="Integrations"
              subtitle="Verified with read-only calls. No order, payment, refund or email is created by a scan."
            >
              <ExternalServices report={report} />
            </Panel>
          </section>
        ) : null}

        {/* 11 — Stream and terminal */}
        {report ? (
          <section>
            <SectionHeading label="Diagnostics output" />

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel
                title="Error stream"
                subtitle="Observations from this scan, worst first."
              >
                <ErrorStream checks={checks} />
              </Panel>

              <Panel
                title="Devil terminal"
                subtitle="The orchestrator's own section log, replayed in order."
              >
                <TerminalLogs
                  key={report.scanId}
                  report={report}
                  scanning={scanning}
                />
              </Panel>
            </div>
          </section>
        ) : null}

        {/* 12 — Scan metadata and export */}
        {report ? (
          <section>
            <SectionHeading label="Scan record" />

            <Panel
              title="This scan"
              action={
                <button
                  type="button"
                  className="dv-btn dv-no-print"
                  onClick={exportReport}
                >
                  Export JSON
                </button>
              }
            >
              <div className="dv-panel-body grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Scan ID" value={report.scanId} mono />
                <Fact label="Mode" value={SCAN_MODE_LABELS[report.mode]} />
                <Fact
                  label="Duration"
                  value={`${report.durationMs.toLocaleString()} ms`}
                  mono
                />
                <Fact
                  label="Completed"
                  value={new Date(report.completedAt).toLocaleString()}
                />
                <Fact label="Node" value={report.environment.nodeVersion} mono />
                <Fact label="Platform" value={report.environment.platform} mono />
                <Fact label="Region" value={report.environment.region} mono />
                <Fact
                  label="Memory (RSS)"
                  value={
                    report.environment.memoryMb === null
                      ? "not reported"
                      : `${report.environment.memoryMb} MB`
                  }
                  mono
                />

                {report.skipped.length > 0 ? (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="dv-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--dv-dim)]">
                      Not run in this mode
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--dv-muted)]">
                      {report.skipped.join(" · ")}. These sections report NOT
                      AVAILABLE rather than passing.
                    </p>
                  </div>
                ) : null}

                <p className="text-[0.6875rem] leading-relaxed text-[var(--dv-dim)] sm:col-span-2 lg:col-span-4">
                  The exported JSON is the server&rsquo;s response verbatim. It
                  carries no environment values, secrets, private keys, service
                  account data, user records, absolute paths or stack traces —
                  those are excluded at the source by each check module, not
                  filtered out here.
                </p>
              </div>
            </Panel>
          </section>
        ) : null}
      </main>

      {/* Toast ---------------------------------------------------- */}
      {toast ? (
        <div
          className="dv-enter dv-no-print fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg"
          role="status"
          aria-live="polite"
          style={{
            borderColor:
              toast.tone === "ok"
                ? "rgb(61 214 140 / 32%)"
                : toast.tone === "warn"
                  ? "rgb(245 165 36 / 32%)"
                  : "rgb(255 90 95 / 32%)",
            background:
              toast.tone === "ok"
                ? "rgb(10 24 18 / 97%)"
                : toast.tone === "warn"
                  ? "rgb(28 22 8 / 97%)"
                  : "rgb(30 12 13 / 97%)",
          }}
        >
          {toast.tone === "ok" ? (
            <CheckCircle2
              className="mt-px h-4 w-4 flex-none text-[var(--dv-ok)]"
              aria-hidden="true"
            />
          ) : (
            <ShieldAlert
              className="mt-px h-4 w-4 flex-none"
              style={{
                color:
                  toast.tone === "warn" ? "var(--dv-warn)" : "var(--dv-crit)",
              }}
              aria-hidden="true"
            />
          )}

          <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-[var(--dv-text)]">
            {toast.text}
          </p>

          <button
            type="button"
            onClick={dismissToast}
            className="flex-none text-[var(--dv-dim)] transition-colors hover:text-[var(--dv-text)]"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="dv-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--dv-dim)]">
        {label}
      </div>
      <div
        className={`mt-1 break-all text-[0.8125rem] text-[var(--dv-muted)] ${
          mono ? "dv-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
