import "server-only";

import { SCAN_TIMEOUT_MS } from "./config";
import { elapsed, errorCode, now } from "./probe";

/**
 * =============================================================
 * LOOPBACK REQUEST HELPER
 * =============================================================
 *
 * The only honest way to answer "is this endpoint actually
 * protected?" is to call it the way an anonymous visitor would and
 * read the status code back. These requests therefore carry no
 * Authorization header, no cookie and no scan token.
 *
 * Safety rules, enforced by `safeMethod` below:
 *
 *   - GET and HEAD only. The scan never sends a body.
 *   - No request can create an order, a user, a payment or an email.
 *   - A route that mutates is probed with GET precisely because the
 *     expected answer is 405, which is itself the check.
 */

export interface LoopbackResult {
  path: string;
  method: string;
  /** 0 when the request never produced a response. */
  statusCode: number;
  durationMs: number;
  ok: boolean;
  /** Transport failure category, when there was no response at all. */
  transportError?: string;
  headers: Record<string, string>;
  /**
   * Body characteristics only. The body itself is inspected for
   * disclosure markers and then discarded; it is never stored,
   * logged or returned.
   */
  body: {
    bytesInspected: number;
    looksLikeJson: boolean;
    containsStackTrace: boolean;
    containsFilesystemPath: boolean;
    /** True when a response body appears to carry a credential. */
    containsCredentialPattern: boolean;
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD"]);

/** Cap the body read so a large page cannot inflate the scan. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Markers of a leaked Node stack trace in a production response.
 */
const STACK_TRACE_PATTERN =
  /\bat\s+(?:async\s+)?[\w$.<>[\]]+\s*\((?:\/|[A-Za-z]:\\|webpack|node:)/;

/**
 * Absolute server paths, which disclose the deployment layout.
 */
const FILESYSTEM_PATH_PATTERN =
  /(?:\/var\/task\/|\/home\/[\w.-]+\/|[A-Za-z]:\\Users\\|\/usr\/src\/app\/)/;

/**
 * Credential shapes that must never appear in a response body.
 */
const CREDENTIAL_PATTERN =
  /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\brzp_(?:live|test)_[A-Za-z0-9]{10,}|\bre_[A-Za-z0-9]{20,}|"private_key"\s*:)/;

export function safeMethod(method: string): "GET" | "HEAD" {
  const upper = method.toUpperCase();

  if (!SAFE_METHODS.has(upper)) {
    throw new Error(
      `Loopback probes are restricted to GET and HEAD; refused ${upper}.`,
    );
  }

  return upper as "GET" | "HEAD";
}

/**
 * Resolve the origin this server is reachable on.
 *
 * Forwarded headers are preferred because behind a proxy the request
 * URL's own host can be an internal address that will not resolve.
 */
export function resolveOrigin(request: Request): string {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    (forwardedHost?.startsWith("localhost") ||
    forwardedHost?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (forwardedHost && /^[A-Za-z0-9.:_-]{1,255}$/.test(forwardedHost)) {
    return `${forwardedProto.split(",")[0].trim()}://${forwardedHost
      .split(",")[0]
      .trim()}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

/**
 * Issue one credential-free request against this application.
 *
 * Never throws: a transport failure is reported as `statusCode: 0`
 * with a category, so one unreachable route cannot end the scan.
 */
export async function loopback(
  origin: string,
  path: string,
  method: "GET" | "HEAD" = "GET",
  interestingHeaders: string[] = [],
): Promise<LoopbackResult> {
  const verb = safeMethod(method);
  const started = now();

  const empty: LoopbackResult["body"] = {
    bytesInspected: 0,
    looksLikeJson: false,
    containsStackTrace: false,
    containsFilesystemPath: false,
    containsCredentialPattern: false,
  };

  if (!origin) {
    return {
      path,
      method: verb,
      statusCode: 0,
      durationMs: 0,
      ok: false,
      transportError: "origin-unresolved",
      headers: {},
      body: empty,
    };
  }

  try {
    const response = await fetch(`${origin}${path}`, {
      method: verb,
      // A diagnostic must see live behaviour, never a cached answer.
      cache: "no-store",
      redirect: "manual",
      headers: {
        // Identify the scan in access logs so these requests are
        // never mistaken for real traffic.
        "user-agent": "BusiServe-SystemHealth/1.0 (internal diagnostic)",
        accept: "*/*",
      },
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS.probe),
    });

    const durationMs = elapsed(started);

    const headers: Record<string, string> = {};

    for (const name of interestingHeaders) {
      const value = response.headers.get(name);
      if (value !== null) headers[name.toLowerCase()] = value;
    }

    return {
      path,
      method: verb,
      statusCode: response.status,
      durationMs,
      ok: response.ok,
      headers,
      body: verb === "HEAD" ? empty : await inspectBody(response),
    };
  } catch (error) {
    return {
      path,
      method: verb,
      statusCode: 0,
      durationMs: elapsed(started),
      ok: false,
      transportError: errorCode(error),
      headers: {},
      body: empty,
    };
  }
}

/**
 * Read a bounded prefix of the body, test it for disclosure markers
 * and discard it.
 *
 * The text is deliberately never returned, so a leaked secret found
 * by this check cannot be forwarded to the browser by the finding
 * that reports it.
 */
async function inspectBody(
  response: Response,
): Promise<LoopbackResult["body"]> {
  if (!response.body) {
    return {
      bytesInspected: 0,
      looksLikeJson: false,
      containsStackTrace: false,
      containsFilesystemPath: false,
      containsCredentialPattern: false,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let text = "";
  let bytes = 0;

  try {
    while (bytes < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    // A truncated body is still worth testing against what arrived.
  } finally {
    // Release the connection instead of leaving the stream open.
    await reader.cancel().catch(() => undefined);
  }

  const trimmed = text.trimStart();

  return {
    bytesInspected: bytes,
    looksLikeJson: trimmed.startsWith("{") || trimmed.startsWith("["),
    containsStackTrace: STACK_TRACE_PATTERN.test(text),
    containsFilesystemPath: FILESYSTEM_PATH_PATTERN.test(text),
    containsCredentialPattern: CREDENTIAL_PATTERN.test(text),
  };
}
