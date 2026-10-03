"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";

import { portalAuth } from "@/lib/portal/client";
import {
  evaluateSession,
  formatRemaining,
  SESSION_WARNING_MS,
  type SessionScope,
} from "@/lib/portal/session-policy";

/**
 * =============================================================
 * SESSION COUNTDOWN
 * =============================================================
 *
 * Signs the user out when their session reaches its limit:
 * 30 minutes for an administrator, 6 hours for a customer.
 *
 * This is the courtesy half of the policy, not the control. The
 * server enforces the same limit in `authenticate()`, which is what
 * actually ends the session — a timer in the browser can be paused by
 * a background tab, skipped by a cloned tab or edited outright.
 *
 * What it buys is a clean ending: a warning, then a real `signOut()`
 * and a redirect to the sign-in page, instead of the next click
 * failing with an unexplained error.
 *
 * Renders nothing.
 */

/** Checked often enough that a throttled background tab still lands close. */
const TICK_MS = 15_000;

export default function SessionTimer({ scope }: { scope: SessionScope }) {
  const router = useRouter();

  /** Ensures the warning toast appears once, not on every tick. */
  const warnedRef = useRef(false);
  /** Ensures sign-out runs once even if two ticks overlap. */
  const endingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const endSession = async () => {
      if (endingRef.current) return;
      endingRef.current = true;

      try {
        await signOut(portalAuth());
      } catch {
        // Even if sign-out fails locally, leave the page: the server
        // will refuse this session's next request anyway.
      }

      if (!active) return;

      toast.info(
        scope === "admin"
          ? "Administrator session ended after 30 minutes. Please sign in again."
          : "Your session ended after 6 hours. Please sign in again.",
      );

      router.replace("/login?expired=1");
    };

    const check = async () => {
      if (!active || endingRef.current) return;

      try {
        const auth = portalAuth();
        await auth.authStateReady();

        const user = auth.currentUser;

        // Nobody signed in: nothing to time out.
        if (!user) return;

        /**
         * `authTime` is when the account actually proved its identity.
         * Read from the cached token rather than forcing a refresh, so
         * this check costs no network request — a forced refresh every
         * 15 seconds would be far more traffic than the feature is
         * worth, and the value never changes between sign-ins anyway.
         */
        const result = await user.getIdTokenResult();
        const authTimeMs = Date.parse(result.authTime);

        const session = evaluateSession(
          Number.isNaN(authTimeMs) ? undefined : authTimeMs,
          scope,
        );

        if (session.expired) {
          await endSession();
          return;
        }

        if (session.remainingMs <= SESSION_WARNING_MS && !warnedRef.current) {
          warnedRef.current = true;

          toast.warn(
            `Your session ends in ${formatRemaining(
              session.remainingMs,
            )}. Save any changes.`,
            { autoClose: 10_000 },
          );
        }
      } catch {
        // A transient failure must not sign anyone out. The server
        // remains the authority on whether the session is still valid.
      }
    };

    void check();

    const timer = window.setInterval(() => void check(), TICK_MS);

    /**
     * A background tab has its timers throttled, so a session can pass
     * its limit while nothing is running. Re-check the moment the tab
     * is looked at again.
     */
    const onVisible = () => {
      if (!document.hidden) void check();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [scope, router]);

  return null;
}
