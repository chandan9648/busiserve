"use client";

import { useEffect, useState } from "react";

export default function Countdown({
  expiresAt,
  serverNow,
  onExpire,
}: {
  expiresAt: number;
  serverNow: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const started = performance.now();
    let notified = false;

    function tick() {
      const now = serverNow + (performance.now() - started);
      const seconds = Math.max(
        0,
        Math.floor((expiresAt - now) / 1000),
      );

      setRemaining(seconds);

      if (seconds === 0 && !notified) {
        notified = true;
        onExpire?.();
      }
    }

    tick();

    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt, serverNow, onExpire]);

  if (remaining === null) {
    return <p className="mt-4">Calculating remaining time…</p>;
  }

  if (remaining === 0) {
    return <p className="mt-4 font-bold text-orange-200">Expired</p>;
  }

  const parts = [
    { label: "Days", value: Math.floor(remaining / 86400) },
    { label: "Hours", value: Math.floor((remaining % 86400) / 3600) },
    { label: "Minutes", value: Math.floor((remaining % 3600) / 60) },
    { label: "Seconds", value: remaining % 60 },
  ];

  return (
    <div
      className="mt-5 grid grid-cols-4 gap-2"
      aria-label="Time remaining on your subscription"
    >
      {parts.map((part) => (
        <div key={part.label} className="rounded-xl bg-white/10 p-3 text-center">
          <span className="block text-xl font-extrabold tabular-nums">
            {String(part.value).padStart(2, "0")}
          </span>
          <span className="mt-1 block text-xs text-slate-200">
            {part.label}
          </span>
        </div>
      ))}
    </div>
  );
}