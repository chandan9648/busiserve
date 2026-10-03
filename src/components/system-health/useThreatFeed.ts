"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { portalAuth } from "@/lib/portal/client";

/**
 * =============================================================
 * LIVE THREAT FEED
 * =============================================================
 *
 * Polls the intrusion log every ten seconds and raises an alarm when
 * a signal arrives that was not present on the previous reading.
 *
 * The alarm fires on *new* events only. An attack that is already on
 * screen must not re-trigger the siren every ten seconds, or the
 * operator mutes it and stops reading the panel — which is how an
 * alarm becomes worse than no alarm.
 */

export type ThreatSeverity = "critical" | "high" | "medium";

export interface ThreatEvent {
  id: string;
  type: string;
  label: string;
  severity: ThreatSeverity;
  count: number;
  firstAt: number;
  lastAt: number;
  source: string;
  path: string;
  why: string;
  action: string;
}

const POLL_MS = 10_000;
const MUTE_KEY = "busiserve:devil-alarm-muted";

/**
 * The mute preference is an external store, not component state: it
 * lives in localStorage, survives a remount and can change in another
 * tab. Reading it through `useSyncExternalStore` renders the correct
 * value on the first client commit, which mirroring it into state from
 * an effect would not — that renders "unmuted" first and then corrects
 * itself, and on a muted console that first frame is an audible siren.
 *
 * `getServerSnapshot` returns false so server markup is stable.
 */
const muteListeners = new Set<() => void>();

function subscribeMute(onChange: () => void): () => void {
  muteListeners.add(onChange);
  window.addEventListener("storage", onChange);

  return () => {
    muteListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readMute(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // Blocked storage: default to audible, which is the safe default
    // for an alarm.
    return false;
  }
}

function serverMute(): boolean {
  return false;
}

function writeMute(next: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // The preference simply will not persist across reloads.
  }

  // `storage` does not fire in the tab that wrote it.
  for (const listener of muteListeners) listener();
}

export function useThreatFeed(enabled: boolean) {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Newly arrived events, cleared when the operator acknowledges. */
  const [alerting, setAlerting] = useState<ThreatEvent[]>([]);

  const muted = useSyncExternalStore(subscribeMute, readMute, serverMute);

  /** True when the browser refused to play audio without a gesture. */
  const [audioBlocked, setAudioBlocked] = useState(false);

  /** Signature of the last reading, to detect genuinely new activity. */
  const seenRef = useRef<Map<string, number>>(new Map());
  const firstReadRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);

  const toggleMute = useCallback(() => writeMute(!readMute()), []);

  /**
   * Two-tone siren, synthesised with the Web Audio API.
   *
   * Generated rather than loaded from an audio file: no asset to
   * ship, nothing to 404, and it works offline.
   */
  const sound = useCallback((severity: ThreatSeverity) => {
    try {
      const Context =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!Context) return;

      const context = audioRef.current ?? new Context();
      audioRef.current = context;

      /**
       * Browsers suspend audio until the page has been interacted
       * with. Surface that rather than failing silently, so the
       * operator knows the siren is armed but muzzled.
       */
      if (context.state === "suspended") {
        void context.resume().catch(() => undefined);

        if (context.state === "suspended") {
          setAudioBlocked(true);
          return;
        }
      }

      setAudioBlocked(false);

      // Critical gets three urgent cycles; lower severities get one.
      const cycles = severity === "critical" ? 3 : severity === "high" ? 2 : 1;
      const high = severity === "critical" ? 1180 : 940;
      const low = severity === "critical" ? 760 : 660;

      for (let index = 0; index < cycles * 2; index += 1) {
        const start = context.currentTime + index * 0.22;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(
          index % 2 === 0 ? high : low,
          start,
        );

        // Shaped envelope; a raw square wave clicks on start and stop.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(start);
        oscillator.stop(start + 0.21);
      }
    } catch {
      // Audio is a convenience; the visual alarm is the real signal.
    }
  }, []);

  /** Let the operator arm audio explicitly after a gesture. */
  const enableAudio = useCallback(() => {
    try {
      const Context =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!Context) return;

      const context = audioRef.current ?? new Context();
      audioRef.current = context;

      void context.resume().then(() => {
        setAudioBlocked(false);
        sound("medium");
      });
    } catch {
      // Nothing more to try.
    }
  }, [sound]);

  const acknowledge = useCallback(() => setAlerting([]), []);

  /* ---------------------------------------------------------------- */
  /* Polling                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void audioRef.current?.close().catch(() => undefined);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const auth = portalAuth();
        await auth.authStateReady();

        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();

        const response = await fetch("/api/admin/security-events", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (active && mountedRef.current) {
            setError(
              response.status === 403
                ? "Administrator access required for the threat feed."
                : "The threat feed is unavailable.",
            );
          }
          return;
        }

        const payload: unknown = await response.json();

        if (
          typeof payload !== "object" ||
          payload === null ||
          !Array.isArray((payload as { events?: unknown }).events)
        ) {
          return;
        }

        const incoming = (payload as { events: ThreatEvent[] }).events;

        if (!active || !mountedRef.current) return;

        setError(null);
        setEvents(incoming);
        setLoaded(true);

        /**
         * An event counts as new if its id was unseen, or if its
         * attempt counter has climbed since the last reading — the
         * second case is an attack still in progress inside the same
         * aggregation window.
         */
        const fresh = incoming.filter((event) => {
          const previous = seenRef.current.get(event.id);
          return previous === undefined || event.count > previous;
        });

        seenRef.current = new Map(
          incoming.map((event) => [event.id, event.count]),
        );

        // The first reading is history, not an incident. Showing the
        // backlog as a live alarm would cry wolf on every page load.
        if (firstReadRef.current) {
          firstReadRef.current = false;
          return;
        }

        if (fresh.length > 0) {
          setAlerting((previous) => {
            const merged = new Map(
              [...previous, ...fresh].map((event) => [event.id, event]),
            );
            return [...merged.values()];
          });
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        if (active && mountedRef.current) {
          setError("The threat feed could not be reached.");
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [enabled]);

  /**
   * Sound the alarm when the alerting set gains an event.
   *
   * Kept in its own effect so the siren is driven by state rather
   * than fired from inside the polling callback, which would make it
   * depend on the mute value captured when the poll began.
   */
  const lastSoundedRef = useRef(0);

  useEffect(() => {
    if (alerting.length === 0 || muted) return;
    if (alerting.length === lastSoundedRef.current) return;

    lastSoundedRef.current = alerting.length;

    const worst: ThreatSeverity = alerting.some(
      (event) => event.severity === "critical",
    )
      ? "critical"
      : alerting.some((event) => event.severity === "high")
        ? "high"
        : "medium";

    sound(worst);
  }, [alerting, muted, sound]);

  useEffect(() => {
    if (alerting.length === 0) lastSoundedRef.current = 0;
  }, [alerting.length]);

  return {
    events,
    alerting,
    loaded,
    error,
    muted,
    audioBlocked,
    toggleMute,
    enableAudio,
    acknowledge,
  };
}
