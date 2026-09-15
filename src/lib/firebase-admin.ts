import "server-only";

import { createPrivateKey } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "busiserve-portal-admin";
let firebaseAdminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

export class FirebaseConfigurationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

function clean(value: string | undefined): string {
  const text = (value ?? "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function privateKeyValue(value: string | undefined): string {
  return clean(value)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n");
}

function readSetting(
  name: string,
  alias: string,
  normalize: (value: string | undefined) => string = clean,
): string {
  const primary = normalize(process.env[name]);
  const secondary = normalize(process.env[alias]);
  if (primary && secondary && primary !== secondary) {
    throw new FirebaseConfigurationError(
      "FIREBASE_ENV_CONFLICT",
      `Conflicting configuration: ${name} and ${alias}. Keep one matching set.`,
    );
  }
  const value = primary || secondary;
  if (!value) {
    throw new FirebaseConfigurationError(
      "FIREBASE_ENV_MISSING",
      `Missing server environment variable: ${name}.`,
    );
  }
  return value;
}

function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    firebaseAdminApp = existing;
    return existing;
  }

  const projectId = readSetting("FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = readSetting("FIREBASE_CLIENT_EMAIL", "FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = readSetting(
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    privateKeyValue,
  );

  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== "rsa") throw new Error("RSA key required");
  } catch {
    // Do not attach the original parsing error: it may contain key material.
    throw new FirebaseConfigurationError(
      "FIREBASE_PRIVATE_KEY_INVALID",
      "FIREBASE_PRIVATE_KEY must contain the complete RSA private_key from the service account JSON.",
    );
  }

  firebaseAdminApp = initializeApp(
    { projectId, credential: cert({ projectId, clientEmail, privateKey }) },
    APP_NAME,
  );
  return firebaseAdminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(getFirebaseAdminApp());
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    const databaseId = clean(process.env.FIREBASE_DATABASE_ID) || "(default)";
    adminDb = getFirestore(getFirebaseAdminApp(), databaseId);
  }
  return adminDb;
}

export function getAdminApp(): App {
  return getFirebaseAdminApp();
}
