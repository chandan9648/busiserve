import type { Metadata } from "next";

import SystemHealthDashboard from "@/components/system-health/SystemHealthDashboard";

/**
 * /admin/system-health — DEVIL // SYSTEM COMMAND CENTER
 *
 * The page is a thin shell. Authorisation that matters is enforced by
 * GET /api/admin/system-health, which verifies the Firebase ID token
 * and the administrator allow-list before running anything, so an
 * unauthorised visitor who loads this route receives no diagnostic
 * data — the console renders its access-refused state instead.
 *
 * Hiding the UI is never treated as the control; the endpoint is.
 */

export const metadata: Metadata = {
  title: "System Health",
  description:
    "Internal system health and security monitoring console for BusiServe.",

  /**
   * An internal console must never be indexed or cached by a crawler,
   * and its URL must not leak through a referrer.
   */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },

  referrer: "no-referrer",
};

/** Diagnostics are live by definition; never prerender this route. */
export const dynamic = "force-dynamic";

export default function SystemHealthPage() {
  return <SystemHealthDashboard />;
}
