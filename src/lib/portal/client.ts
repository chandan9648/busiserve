"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const APP_NAME = "busiserve-portal";

function getFirebaseConfig() {
  // These exact public variables are exposed by the existing next.config.ts.
  const config = {
    apiKey: process.env.FIREBASE_API_KEY?.trim(),
    authDomain: process.env.FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
    appId: process.env.FIREBASE_APP_ID?.trim(),
  };
  const required = [
    ["FIREBASE_API_KEY", config.apiKey],
    ["FIREBASE_AUTH_DOMAIN", config.authDomain],
    ["FIREBASE_PROJECT_ID", config.projectId],
    ["FIREBASE_APP_ID", config.appId],
  ] as const;
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase browser configuration: ${missing.join(", ")}. ` +
        "Check environment variables and rebuild/redeploy the application.",
    );
  }
  return config;
}

export function portalAuth() {
  const config = getFirebaseConfig();
  const existingApp = getApps().find((item) => item.name === APP_NAME);
  if (
    existingApp &&
    (existingApp.options.apiKey !== config.apiKey ||
      existingApp.options.authDomain !== config.authDomain ||
      existingApp.options.projectId !== config.projectId ||
      existingApp.options.appId !== config.appId)
  ) {
    throw new Error(
      "Firebase configuration changed after initialization. " +
        "Restart the development server and fully reload the browser.",
    );
  }
  return getAuth(existingApp ?? initializeApp(config, APP_NAME));
}

export async function portalApi<T>(
  action: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const auth = portalAuth();
  // Wait for persisted login restoration before deciding that no user exists.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");

  const requestMethod = method.toUpperCase();
  const hasBody = body !== undefined;
  const send = async (forceRefresh: boolean) => {
    const token = await user.getIdToken(forceRefresh);
    return fetch(`/api/portal/${action}`, {
      method: requestMethod,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  };

  let response = await send(false);
  // Retry only a read, once. Never replay payments or other mutations.
  if (response.status === 401 && requestMethod === "GET") {
    response = await send(true);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // A function startup failure can return HTML/plain text instead of JSON.
    }
  }

  if (!response.ok) {
    const payload =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : null;
    const requestId =
      typeof payload?.requestId === "string" &&
      /^[a-zA-Z0-9-]{1,80}$/.test(payload.requestId)
        ? payload.requestId
        : null;
    const message =
      typeof payload?.error === "string" && payload.error.length <= 300
        ? payload.error
        : response.status === 401
          ? "Session expired. Please sign in again."
          : response.status === 403
            ? "You do not have permission to perform this action."
            : "The server could not complete the request. Please try again later.";

    throw new Error(requestId ? `${message} Reference: ${requestId}` : message);
  }

  if (response.status === 204) return {} as T;
  if (data === null) {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export type LoginLimitState = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Login token bucket: "attempt" takes one of the five tokens before a
 * password is checked, "success" refills the bucket. The server owns the
 * counting; a guard that cannot answer must never block a real sign-in.
 */
export async function loginRateLimit(
  stage: "attempt" | "success",
  email: string,
): Promise<LoginLimitState> {
  const open: LoginLimitState = { allowed: true, remaining: 0, retryAfterMs: 0 };

  try {
    const response = await fetch("/api/auth/login-rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, email }),
      cache: "no-store",
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // A function startup failure can return HTML instead of JSON.
    }

    const payload =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : null;

    const count = (value: unknown, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : fallback;

    if (response.status === 429) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: count(payload?.retryAfterMs, 15 * 60 * 1000),
      };
    }

    if (!response.ok) return open;

    return {
      allowed: payload?.allowed !== false,
      remaining: count(payload?.remaining, 0),
      retryAfterMs: count(payload?.retryAfterMs, 0),
    };
  } catch {
    return open;
  }
}
