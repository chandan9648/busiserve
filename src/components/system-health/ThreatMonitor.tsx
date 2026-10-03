"use client";

import { BellOff, BellRing, Siren, Volume2 } from "lucide-react";

import { Clock, NotAvailable, SeverityChip } from "./primitives";
import type { ThreatEvent } from "./useThreatFeed";

/**
 * THREAT MONITOR
 *
 * Live intrusion feed. Every row exists because one of the
 * application's own guards refused a real request — nothing here is
 * simulated, and an empty feed genuinely means nothing was detected
 * rather than that detection is switched off.
 */

export default function ThreatMonitor({
  events,
  alerting,
  loaded,
  error,
  muted,
  audioBlocked,
  onToggleMute,
  onEnableAudio,
  onAcknowledge,
}: {
  events: ThreatEvent[];
  alerting: ThreatEvent[];
  loaded: boolean;
  error: string | null;
  muted: boolean;
  audioBlocked: boolean;
  onToggleMute: () => void;
  onEnableAudio: () => void;
  onAcknowledge: () => void;
}) {
  const attacking = alerting.length > 0;

  const totalAttempts = events.reduce((sum, event) => sum + event.count, 0);

  return (
    <div className="dv-panel-body space-y-3">
      {/* Controls -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="dv-btn dv-no-print"
          aria-pressed={!muted}
          onClick={onToggleMute}
          title={
            muted
              ? "Alarm sound is off — turn it on"
              : "Alarm sound is on — mute it"
          }
        >
          {muted ? (
            <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Alarm {muted ? "off" : "on"}
        </button>

        {audioBlocked && !muted ? (
          <button
            type="button"
            className="dv-btn dv-no-print"
            data-variant="primary"
            onClick={onEnableAudio}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            Enable alarm sound
          </button>
        ) : null}

        {attacking ? (
          <button
            type="button"
            className="dv-btn dv-no-print"
            onClick={onAcknowledge}
          >
            Acknowledge
          </button>
        ) : null}

        <span className="dv-mono ml-auto text-[0.625rem] uppercase tracking-[0.1em] text-[var(--dv-dim)]">
          {loaded
            ? `${events.length} signal${events.length === 1 ? "" : "s"} · ${totalAttempts} attempt${totalAttempts === 1 ? "" : "s"}`
            : "Connecting…"}
        </span>
      </div>

      {audioBlocked && !muted ? (
        <p className="dv-mono rounded-md border border-dashed border-[var(--dv-line-strong)] px-3 py-2 text-[0.625rem] leading-relaxed text-[var(--dv-dim)]">
          The browser blocks sound until you interact with the page. The visual
          alarm still works; press &ldquo;Enable alarm sound&rdquo; once to arm
          the siren for this session.
        </p>
      ) : null}

      {/* Live alarm banner ---------------------------------------- */}
      {attacking ? (
        <div
          className="dv-enter rounded-lg border border-[rgb(255_90_95_/_45%)] bg-[rgb(255_90_95_/_10%)] p-3.5"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <Siren
              className="mt-0.5 h-5 w-5 flex-none animate-pulse text-[var(--dv-crit)]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="dv-mono text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-crit)]">
                ⚠ Attack in progress — {alerting.length} new signal
                {alerting.length === 1 ? "" : "s"}
              </h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
                {alerting
                  .map((event) => `${event.label} from ${event.source}`)
                  .slice(0, 3)
                  .join(" · ")}
                {alerting.length > 3 ? ` · and ${alerting.length - 3} more` : ""}
              </p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--dv-dim)]">
                Each of these was refused by the guard that detected it. Nothing
                below indicates a successful breach — it is a record of attempts
                that were blocked.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <NotAvailable title="Feed unavailable" reason={error} />
      ) : null}

      {/* Feed ------------------------------------------------------ */}
      {!loaded && !error ? (
        <p className="dv-mono py-6 text-center text-[0.75rem] text-[var(--dv-dim)]">
          Connecting to the intrusion log…
        </p>
      ) : events.length === 0 && !error ? (
        <div className="rounded-lg border border-[rgb(61_214_140_/_25%)] bg-[rgb(61_214_140_/_5%)] p-4">
          <p className="dv-mono text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-ok)]">
            ✓ No intrusion attempts recorded
          </p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--dv-muted)]">
            Nothing has tripped a guard. The monitor watches sign-in brute
            force, forged payment and webhook signatures, unauthorised admin
            access and exploit-path scanning.
          </p>
        </div>
      ) : (
        <ul
          className="dv-scroll max-h-[380px] space-y-2 overflow-y-auto"
          data-lenis-prevent
        >
          {events.map((event) => {
            const isNew = alerting.some((item) => item.id === event.id);

            return (
              <li
                key={event.id}
                className="dv-status rounded-lg border bg-[var(--dv-inset)] p-3"
                data-status={
                  event.severity === "critical"
                    ? "critical"
                    : event.severity === "high"
                      ? "warning"
                      : "unknown"
                }
                style={{
                  borderColor: isNew
                    ? "color-mix(in srgb, var(--c) 50%, transparent)"
                    : "var(--dv-line)",
                }}
              >
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span className="dv-dot" data-live={isNew} aria-hidden="true" />

                  <h3 className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-[var(--dv-text)]">
                    {event.label}
                  </h3>

                  {isNew ? (
                    <span className="dv-mono rounded bg-[rgb(255_90_95_/_18%)] px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[var(--dv-crit)]">
                      New
                    </span>
                  ) : null}

                  <SeverityChip severity={event.severity} />

                  <span className="dv-mono text-[0.625rem] tabular-nums text-[var(--dv-muted)]">
                    ×{event.count}
                  </span>
                </div>

                <dl className="mt-2 grid gap-x-4 gap-y-1 text-[0.6875rem] sm:grid-cols-[auto_minmax(0,1fr)]">
                  <dt className="dv-mono uppercase tracking-[0.08em] text-[var(--dv-dim)]">
                    Source
                  </dt>
                  <dd className="dv-mono text-[var(--dv-muted)]">
                    {event.source}
                    <span className="ml-1.5 text-[var(--dv-dim)]">
                      (masked to the network)
                    </span>
                  </dd>

                  <dt className="dv-mono uppercase tracking-[0.08em] text-[var(--dv-dim)]">
                    Latest target
                  </dt>
                  <dd className="dv-mono break-all text-[var(--dv-muted)]">
                    {event.path}
                    {event.count > 1 ? (
                      <span className="ml-1.5 text-[var(--dv-dim)]">
                        (most recent of {event.count}; a scanner walks many
                        paths per minute)
                      </span>
                    ) : null}
                  </dd>

                  <dt className="dv-mono uppercase tracking-[0.08em] text-[var(--dv-dim)]">
                    Last seen
                  </dt>
                  <dd className="text-[var(--dv-muted)]">
                    <Clock iso={new Date(event.lastAt).toISOString()} />
                  </dd>
                </dl>

                <p className="mt-2 border-t border-[color-mix(in_srgb,var(--dv-line)_60%,transparent)] pt-2 text-[0.75rem] leading-relaxed text-[var(--dv-muted)]">
                  {event.why}
                </p>

                <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--dv-dim)]">
                  <span className="dv-mono text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-accent)]">
                    Action{" "}
                  </span>
                  {event.action}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="dv-mono text-[0.625rem] leading-relaxed text-[var(--dv-dim)]">
        Polled every 10 seconds. Attempts are aggregated per minute per source,
        so a sustained attack shows as one row with a rising counter rather than
        thousands of rows. Source addresses are masked to their network.
      </p>
    </div>
  );
}
