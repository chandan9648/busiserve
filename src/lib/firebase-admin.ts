import "server-only";

import { createPrivateKey } from "node:crypto";
import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

const APP_NAME = "busiserve-portal-admin";

let firebaseAdminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

export class FirebaseConfigurationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

/**
 * Remove surrounding quotes and trim whitespace.
 */
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

/**
 * Firebase service-account private keys are commonly stored
 * in environment variables with escaped newline characters:
 *
 * -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
 *
 * Convert those escaped newlines back to actual newlines.
 */
function privateKeyValue(value: string | undefined): string {
  return clean(value)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n");
}

/**
 * Read a required Firebase Admin environment variable.
 *
 * Primary:
 *   FIREBASE_ADMIN_*
 *
 * Legacy/fallback:
 *   FIREBASE_*
 *
 * This keeps compatibility with the existing local configuration.
 */
function readSetting(
  adminName: string,
  fallbackName: string,
  normalize: (value: string | undefined) => string = clean,
): string {
  const adminValue = normalize(process.env[adminName]);
  const fallbackValue = normalize(process.env[fallbackName]);

  if (
    adminValue &&
    fallbackValue &&
    adminValue !== fallbackValue
  ) {
    throw new FirebaseConfigurationError(
      "FIREBASE_ENV_CONFLICT",
      `Conflicting Firebase configuration: ${adminName} and ${fallbackName} contain different values.`,
    );
  }

  const value = adminValue || fallbackValue;

  if (!value) {
    throw new FirebaseConfigurationError(
      "FIREBASE_ENV_MISSING",
      `Missing server environment variable: ${adminName}.`,
    );
  }

  return value;
}

/**
 * Initialize Firebase Admin exactly once.
 */
function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  /**
   * Reuse an already initialized app when Next.js
   * reloads modules during development.
   */
  const existing = getApps().find(
    (app) => app.name === APP_NAME,
  );

  if (existing) {
    firebaseAdminApp = existing;
    return existing;
  }

  /**
   * IMPORTANT:
   * These are SERVER-SIDE Firebase Admin credentials.
   */
  const projectId = readSetting(
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
  );

  const clientEmail = readSetting(
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_CLIENT_EMAIL",
  );

  const privateKey = readSetting(
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "FIREBASE_PRIVATE_KEY",
    privateKeyValue,
  );

  /**
   * Validate the private key before initializing Firebase.
   *
   * We deliberately do not expose the original crypto error,
   * because it could potentially contain sensitive key details.
   */
  try {
    const key = createPrivateKey(privateKey);

    if (key.asymmetricKeyType !== "rsa") {
      throw new Error("RSA key required");
    }
  } catch {
    throw new FirebaseConfigurationError(
      "FIREBASE_PRIVATE_KEY_INVALID",
      "FIREBASE_ADMIN_PRIVATE_KEY must contain the complete RSA private_key from the Firebase service-account JSON.",
    );
  }

  try {
    firebaseAdminApp = initializeApp(
      {
        projectId,
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      APP_NAME,
    );

    return firebaseAdminApp;
  } catch {
    /**
     * Never expose the actual Firebase credential/configuration
     * error to the browser.
     */
    throw new FirebaseConfigurationError(
      "FIREBASE_ADMIN_INIT_FAILED",
      "Firebase Admin SDK could not be initialized. Check the production Firebase Admin configuration.",
    );
  }
}

/**
 * Firebase Admin Authentication.
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getFirebaseAdminApp());
  }

  return adminAuth;
}

/**
 * Firebase Admin Firestore.
 *
 * FIREBASE_DATABASE_ID is optional.
 * If it is not configured, the default Firestore database is used.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const databaseId =
      clean(process.env.FIREBASE_DATABASE_ID) || "(default)";

    adminDb = getFirestore(
      getFirebaseAdminApp(),
      databaseId,
    );
  }

  return adminDb;
}

/**
 * Expose the initialized Admin App when required by
 * other server-side Firebase functionality.
 */
export function getAdminApp(): App {
  return getFirebaseAdminApp();
}