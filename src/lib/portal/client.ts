"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const APP_NAME = "busiserve-portal";

function getFirebaseConfig() {
  // Keep direct process.env references so Next.js can expose
  // these public variables to the browser.
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  };

  const required = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", config.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", config.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", config.appId],
  ] as const;

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase browser configuration: ${missing.join(", ")}. ` +
        "Check .env.local and restart the development server.",
    );
  }

  return config;
}

export function portalAuth() {
  const config = getFirebaseConfig();

  const existingApp = getApps().find(
    (item) => item.name === APP_NAME,
  );

  // Firebase may retain its initialized app during hot reload.
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

  const app =
    existingApp ?? initializeApp(config, APP_NAME);

  return getAuth(app);
}

export async function portalApi<T>(
  action: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const user = portalAuth().currentUser;

  if (!user) {
    throw new Error("Please sign in.");
  }

  const token = await user.getIdToken();
  const hasBody = body !== undefined;

  const response = await fetch(`/api/portal/${action}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data: unknown = await response.json().catch(() => {
    throw new Error(
      "The server returned an unexpected response. Check the terminal logs.",
    );
  });

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "The request failed.";

    throw new Error(message);
  }

  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}