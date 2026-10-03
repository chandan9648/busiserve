import { NextResponse, type NextRequest } from "next/server";

import { recordThreat } from "@/lib/security/events";

/**
 * =============================================================
 * EXPLOIT PATH DETECTION (proxy)
 * =============================================================
 *
 * Automated scanners walk a fixed list of paths looking for an
 * exposed .env file, a readable .git directory, a WordPress panel or
 * a database admin tool. None of those exist here, so the requests
 * already 404 — but they are the clearest available signal that
 * someone is actively probing the site, which is exactly what the
 * security console needs to show.
 *
 * Why a proxy (middleware) rather than the 404 page: a scanner is curl or a Go
 * binary, not a browser. It never runs JavaScript, so any detection
 * that depends on the client executing code would miss precisely the
 * traffic worth catching. The proxy sees the raw request.
 *
 * Why this is safe to add: `config.matcher` below restricts
 * it to this explicit list of exploit paths. A normal
 * visitor, every real page and every API route bypass it entirely,
 * so this cannot add latency to legitimate traffic or take the site
 * down if it misbehaves.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`;
 * the API is unchanged.
 *
 * The request is not blocked. These paths have no route, so Next
 * answers 404 on its own; interfering would only risk breaking a
 * path that later becomes real.
 */

/**
 * No `runtime` is declared: a proxy file always runs on the Node.js
 * runtime, and Next rejects a route segment config here. That default
 * is what makes this work at all — `recordThreat` writes through the
 * Firebase Admin SDK, which needs Node APIs the edge runtime lacks.
 */
export const config = {
  matcher: [
    "/.env",
    "/.env.:suffix*",
    "/.git/:path*",
    "/.aws/:path*",
    "/.ssh/:path*",
    "/.vscode/:path*",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/wp-content/:path*",
    "/wp-includes/:path*",
    "/wordpress/:path*",
    "/xmlrpc.php",
    "/phpmyadmin/:path*",
    "/pma/:path*",
    "/administrator/:path*",
    "/admin.php",
    "/cgi-bin/:path*",
    "/vendor/:path*",
    "/actuator/:path*",
    "/server-status",
    "/config.json",
    "/config.php",
    "/backup.sql",
    "/dump.sql",
    "/.DS_Store",
  ],
};

export default function proxy(request: NextRequest) {
  /**
   * Fire and forget. The write is never awaited, so a slow or failing
   * Firestore cannot hold up the response, and `recordThreat` already
   * swallows its own errors.
   */
  void recordThreat("path-probe", request, request.nextUrl.pathname);

  // Let Next answer normally, which for these paths is a 404.
  return NextResponse.next();
}
