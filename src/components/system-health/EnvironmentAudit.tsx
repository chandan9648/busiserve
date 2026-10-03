"use client";

import { useMemo, useState } from "react";
import { EyeOff } from "lucide-react";

import { NotAvailable } from "./primitives";
import type { ConfigItem } from "./types";

/**
 * ENVIRONMENT // CONFIGURATION
 *
 * Presence metadata only. The server never reads a value into the
 * response, so there is nothing here that could be revealed by a
 * toggle, an export or the browser devtools — the values simply are
 * not present in the payload.
 */
export default function EnvironmentAudit({
  configuration,
}: {
  configuration: ConfigItem[];
}) {
  const [scope, setScope] = useState<"all" | "server" | "public">("all");

  const grouped = useMemo(() => {
    const filtered =
      scope === "all"
        ? configuration
        : configuration.filter((item) => item.scope === scope);

    return {
      missing: filtered.filter((item) => item.required && !item.present),
      present: filtered.filter((item) => item.present),
      optional: filtered.filter((item) => !item.required && !item.present),
    };
  }, [configuration, scope]);

  if (configuration.length === 0) {
    return (
      <div className="dv-panel-body">
        <NotAvailable reason="The environment audit did not run in this scan." />
      </div>
    );
  }

  const serverCount = configuration.filter(
    (item) => item.scope === "server",
  ).length;

  return (
    <div className="dv-panel-body space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.6875rem] leading-relaxed text-[var(--dv-dim)]">
          <EyeOff className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          Values are never read, transmitted or exported — only whether each
          name is set. {serverCount} of {configuration.length} are server-only.
        </p>

        <div className="dv-no-print flex gap-1" role="group" aria-label="Scope filter">
          {(["all", "server", "public"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="dv-btn"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {grouped.missing.length > 0 ? (
        <Group
          title="Missing and required"
          tone="critical"
          items={grouped.missing}
        />
      ) : null}

      <Group title="Configured" tone="healthy" items={grouped.present} />

      {grouped.optional.length > 0 ? (
        <Group
          title="Not set — optional"
          tone="unknown"
          items={grouped.optional}
        />
      ) : null}
    </div>
  );
}

function Group({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "healthy" | "critical" | "unknown";
  items: ConfigItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3
        className="dv-status dv-mono mb-2 flex items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
        data-status={tone}
        style={{ color: "var(--c)" }}
      >
        <span className="dv-dot" aria-hidden="true" />
        {title}
        <span className="text-[var(--dv-dim)]">({items.length})</span>
      </h3>

      <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.name}
            className="dv-status rounded-md border border-[var(--dv-line)] bg-[var(--dv-inset)] px-2.5 py-2"
            data-status={tone}
          >
            <div className="flex items-baseline gap-2">
              <code className="dv-mono min-w-0 flex-1 break-all text-[0.6875rem] text-[var(--dv-text)]">
                {item.name}
              </code>

              <span
                className="dv-mono flex-none text-[0.625rem] font-semibold"
                style={{ color: "var(--c)" }}
              >
                {item.present ? "✓ PRESENT" : item.required ? "✕ MISSING" : "— UNSET"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span
                className="dv-mono rounded px-1.5 py-px text-[0.5625rem] uppercase tracking-[0.08em]"
                style={{
                  color:
                    item.scope === "server"
                      ? "var(--dv-accent)"
                      : "var(--dv-info)",
                  background:
                    item.scope === "server"
                      ? "rgb(229 72 77 / 10%)"
                      : "rgb(88 166 255 / 10%)",
                }}
              >
                {item.scope === "server" ? "server-only" : "client-exposed"}
              </span>

              {item.required ? (
                <span className="dv-mono text-[0.5625rem] uppercase tracking-[0.08em] text-[var(--dv-dim)]">
                  required
                </span>
              ) : null}
            </div>

            {item.note ? (
              <p className="mt-1.5 text-[0.625rem] leading-snug text-[var(--dv-dim)]">
                {item.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
